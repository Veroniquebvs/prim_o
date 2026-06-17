const bcrypt = require('bcrypt');
const sequelize = require('../config/database');
const { User, Team, TeamMember, TokenTransaction, ScheduledAllocation } = require('../models');

const BCRYPT_ROUNDS = 12;

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const getTeam = async (managerId) => {
  const team = await Team.findOne({
    where: { manager_id: managerId, dissolved_at: null },
    include: [
      {
        model: TeamMember,
        as: 'members',
        where: { left_at: null },
        required: false,
        include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }],
      },
    ],
  });
  if (!team) throw httpError('No active team found', 404);
  return team;
};

const createEmployee = async (manager, { email, first_name, name, password }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw httpError('Email already in use', 409);

  const team = await Team.findOne({
    where: { manager_id: manager.id, dissolved_at: null },
  });
  if (!team) throw httpError('No active team found', 404);

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const t = await sequelize.transaction();
  try {
    const employee = await User.create(
      {
        email,
        first_name,
        name,
        password_hash,
        role: 'employee',
        company_id: manager.company_id,
        token_balance: 0,
        status: 'active',
      },
      { transaction: t }
    );

    await TeamMember.create(
      { team_id: team.id, user_id: employee.id, joined_at: new Date() },
      { transaction: t }
    );

    await t.commit();

    const { password_hash: _, ...safe } = employee.toJSON();
    return safe;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const addTeamMember = async (manager, { employee_id }) => {
  const team = await Team.findOne({
    where: { manager_id: manager.id, dissolved_at: null },
  });
  if (!team) throw httpError('No active team found', 404);

  const employee = await User.findOne({
    where: { id: employee_id, company_id: manager.company_id },
  });
  if (!employee) throw httpError('Employee not found in your company', 404);

  const existingMembership = await TeamMember.findOne({
    where: { user_id: employee_id, left_at: null },
  });
  if (existingMembership) throw httpError('Employee already belongs to a team', 409);

  await TeamMember.create({ team_id: team.id, user_id: employee_id, joined_at: new Date() });

  return { team_id: team.id, user_id: employee_id };
};

const giveTokens = async (manager, { employee_id, amount }) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw httpError('amount must be a positive integer', 400);
  }

  const t = await sequelize.transaction();
  try {
    const managerUser = await User.findByPk(manager.id, { lock: true, transaction: t });
    if (!managerUser || managerUser.token_balance < amount) {
      throw httpError('Insufficient token balance', 402);
    }

    const employee = await User.findByPk(employee_id, { lock: true, transaction: t });
    if (!employee) throw httpError('Employee not found', 404);

    await managerUser.decrement('token_balance', { by: amount, transaction: t });
    await employee.increment('token_balance', { by: amount, transaction: t });

    const tx = await TokenTransaction.create(
      {
        sender_id: manager.id,
        receiver_id: employee_id,
        company_id: manager.company_id,
        amount,
        type: 'manager_to_employee',
      },
      { transaction: t }
    );

    await t.commit();
    return tx;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const getUnassignedCollaborators = async (manager) => {
  const { Op } = require('sequelize');
  const assignedIds = await TeamMember.findAll({
    where: { left_at: null },
    include: [{
      model: Team,
      as: 'team',
      where: { company_id: manager.company_id, dissolved_at: null },
      required: true,
    }],
    attributes: ['user_id'],
  }).then((rows) => rows.map((r) => r.user_id));

  return User.findAll({
    where: {
      company_id: manager.company_id,
      role: 'employee',
      id: { [Op.notIn]: assignedIds.length ? assignedIds : ['00000000-0000-0000-0000-000000000000'] },
    },
    attributes: { exclude: ['password_hash'] },
    order: [['first_name', 'ASC']],
  });
};

const getBalance = async (managerId) => {
  const user = await User.findByPk(managerId, { attributes: ['id', 'token_balance'] });
  if (!user) throw httpError('User not found', 404);
  return { userId: user.id, token_balance: user.token_balance };
};

function computeNextRun(dayOfMonth, frequency, month) {
  const now = new Date();
  const day = dayOfMonth || 1;
  if (frequency === 'annual') {
    const candidate = new Date(Date.UTC(now.getUTCFullYear(), (month || 1) - 1, day, 9, 0, 0));
    if (candidate <= now) candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
    return candidate;
  }
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 9, 0, 0));
  if (candidate <= now) candidate.setUTCMonth(candidate.getUTCMonth() + 1);
  return candidate;
}

const listScheduled = async (managerId) => {
  return ScheduledAllocation.findAll({
    where: { sender_id: managerId },
    include: [{ model: User, as: 'receiver', attributes: { exclude: ['password_hash'] } }],
    order: [['created_at', 'DESC']],
  });
};

const createScheduled = async (manager, { receiver_id, amount, frequency, day_of_month, month, label }) => {
  const membership = await TeamMember.findOne({
    where: { user_id: receiver_id, left_at: null },
    include: [{
      model: Team,
      as: 'team',
      where: { manager_id: manager.id, dissolved_at: null },
      required: true,
    }],
  });
  if (!membership) throw httpError('Employee not in your team', 403);

  return ScheduledAllocation.create({
    sender_id: manager.id,
    receiver_id,
    company_id: manager.company_id,
    amount,
    frequency: frequency || 'monthly',
    day_of_month: day_of_month || 1,
    month: month || null,
    label: label || 'manager_to_employee',
    next_run_at: computeNextRun(day_of_month, frequency, month),
    active: true,
    excluded_user_ids: [],
  });
};

const toggleScheduled = async (manager, id) => {
  const alloc = await ScheduledAllocation.findOne({ where: { id, sender_id: manager.id } });
  if (!alloc) throw httpError('Allocation not found', 404);
  alloc.active = !alloc.active;
  await alloc.save();
  return alloc;
};

const deleteScheduled = async (manager, id) => {
  const alloc = await ScheduledAllocation.findOne({ where: { id, sender_id: manager.id } });
  if (!alloc) throw httpError('Allocation not found', 404);
  await alloc.destroy();
};

module.exports = { getTeam, createEmployee, addTeamMember, giveTokens, getBalance, getUnassignedCollaborators, listScheduled, createScheduled, toggleScheduled, deleteScheduled };
