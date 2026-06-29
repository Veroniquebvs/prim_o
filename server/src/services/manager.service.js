/**
 * manager.service.js — Business logic for manager-level team and token operations.
 *
 * Managers sit between employers and employees: they receive a token budget from the employer
 * and redistribute it to the employees in their team. This service provides everything a
 * manager needs: viewing and populating their team, creating employee accounts, distributing
 * tokens, and managing their own recurring allocation rules (scheduled allocations).
 *
 * Token transfers from manager to employee use the manager's personal token_balance, which is
 * funded by 'employer_to_manager' allocations. All balance changes are wrapped in atomic
 * PostgreSQL transactions with row-level locks.
 */
const bcrypt = require('bcrypt');
const sequelize = require('../config/database');
const { User, Team, TeamMember, TokenTransaction, ScheduledAllocation } = require('../models');

const BCRYPT_ROUNDS = 12;

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * Returns the manager's active team along with all currently active members.
 * managerId is the UUID of the authenticated manager.
 * Each member entry includes the full user record (without password hash).
 * Throws 404 if the manager has no active (non-dissolved) team.
 */
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

/**
 * Creates a new employee account and immediately adds them to the manager's active team.
 * manager is the authenticated manager user object. email must be unique across all users.
 * first_name, name, and password are required. The password is hashed before storage.
 * The employee is created with status 'active' and role 'employee'.
 * The User creation and TeamMember record are committed atomically.
 * Throws 409 if the email is already taken, 404 if the manager has no active team.
 * Returns the created employee object without the password hash.
 */
const createEmployee = async (manager, { email, first_name, name, password, entry_date }) => {
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
        entry_date: entry_date || null,
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

/**
 * Adds an existing employee (from the same company) to the manager's active team.
 * manager is the authenticated manager. employee_id is the UUID of the employee to add.
 * Throws 404 if the manager has no active team or the employee is not found in the company.
 * Throws 409 if the employee already belongs to an active team.
 * Returns an object confirming the team_id and user_id that were linked.
 */
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

/**
 * Transfers tokens from the team balance to an employee, then credits the manager with a
 * retribution bonus (team.retribution_rate % of the distributed amount).
 * The total debit from the team is: amount + retribution. Both the employee credit and the
 * manager retribution credit are committed atomically with row-level locks.
 * Throws 403 if the manager tries to allocate tokens to themselves.
 * Throws 402 if the team balance is insufficient to cover amount + retribution.
 */
const giveTokens = async (manager, { employee_id, amount, reason }) => {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw httpError('amount must be a positive number', 400);
  }

  if (employee_id === manager.id) {
    throw httpError('Vous ne pouvez pas vous attribuer des tokens directement', 403);
  }

  const t = await sequelize.transaction();
  try {
    const team = await Team.findOne({ where: { manager_id: manager.id, dissolved_at: null }, lock: true, transaction: t });
    if (!team) throw httpError('No active team found', 404);

    const retributionRate = parseFloat(team.retribution_rate) || 0;
    const retribution = parseFloat((amount * retributionRate / 100).toFixed(2));
    const totalDebit = parseFloat((amount + retribution).toFixed(2));

    if (parseFloat(team.token_balance) < totalDebit) {
      throw httpError('Insufficient team token balance', 402);
    }

    const employee = await User.findByPk(employee_id, { lock: true, transaction: t });
    if (!employee) throw httpError('Employee not found', 404);

    const managerUser = retribution > 0
      ? await User.findByPk(manager.id, { lock: true, transaction: t })
      : null;

    await team.decrement('token_balance', { by: totalDebit, transaction: t });
    await employee.increment('token_balance', { by: amount, transaction: t });

    const tx = await TokenTransaction.create(
      {
        sender_id: manager.id,
        receiver_id: employee_id,
        company_id: manager.company_id,
        amount,
        type: 'manager_to_employee',
        reason: reason || null,
      },
      { transaction: t }
    );

    if (retribution > 0 && managerUser) {
      await managerUser.increment('token_balance', { by: retribution, transaction: t });
      await TokenTransaction.create(
        {
          sender_id: null,
          receiver_id: manager.id,
          company_id: manager.company_id,
          amount: retribution,
          type: 'manager_retribution',
          reason: `Rétribution ${retributionRate}% sur distribution`,
        },
        { transaction: t }
      );
    }

    await t.commit();
    return tx;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * Returns all employees in the manager's company who are not currently assigned to any active team.
 * manager is the authenticated manager user object (used to scope to the same company).
 * Results are ordered by first name. This is used to populate the "add member" picker in the UI.
 */
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

/**
 * Returns the manager's current token balance.
 * managerId is the UUID of the authenticated manager.
 * Throws 404 if the user does not exist.
 */
const getBalance = async (managerId) => {
  const user = await User.findByPk(managerId, { attributes: ['id', 'token_balance'] });
  if (!user) throw httpError('User not found', 404);
  const team = await Team.findOne({ where: { manager_id: managerId, dissolved_at: null } });
  return { userId: user.id, token_balance: user.token_balance, team_token_balance: team ? team.token_balance : 0 };
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

/**
 * Returns all scheduled allocation rules created by the given manager, including the
 * receiver (employee) details. Results are ordered newest first.
 * managerId is the UUID of the authenticated manager.
 */
const listScheduled = async (managerId) => {
  return ScheduledAllocation.findAll({
    where: { sender_id: managerId },
    include: [{ model: User, as: 'receiver', attributes: { exclude: ['password_hash'] } }],
    order: [['created_at', 'DESC']],
  });
};

/**
 * Creates a recurring token allocation rule from this manager to a specific employee in their team.
 * manager is the authenticated manager. receiver_id must be a UUID of an employee who is an
 * active member of the manager's team. Throws 403 if the employee is not in the team.
 * amount, frequency ('monthly' or 'annual'), and day_of_month define the schedule.
 * month is required when frequency is 'annual'. label defaults to 'manager_to_employee'.
 * Returns the created ScheduledAllocation record.
 */
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

/**
 * Toggles the active flag of a scheduled allocation rule (pause ↔ resume).
 * manager is the authenticated manager. id is the UUID of the rule to toggle.
 * Throws 404 if the rule is not found or does not belong to this manager.
 * Returns the updated ScheduledAllocation record.
 */
const toggleScheduled = async (manager, id) => {
  const alloc = await ScheduledAllocation.findOne({ where: { id, sender_id: manager.id } });
  if (!alloc) throw httpError('Allocation not found', 404);
  alloc.active = !alloc.active;
  await alloc.save();
  return alloc;
};

/**
 * Permanently deletes a scheduled allocation rule.
 * manager is the authenticated manager. id is the UUID of the rule to delete.
 * Throws 404 if the rule is not found or does not belong to this manager.
 */
const deleteScheduled = async (manager, id) => {
  const alloc = await ScheduledAllocation.findOne({ where: { id, sender_id: manager.id } });
  if (!alloc) throw httpError('Allocation not found', 404);
  await alloc.destroy();
};

module.exports = { getTeam, createEmployee, addTeamMember, giveTokens, getBalance, getUnassignedCollaborators, listScheduled, createScheduled, toggleScheduled, deleteScheduled };
