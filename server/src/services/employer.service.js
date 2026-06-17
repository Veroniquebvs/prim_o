const sequelize = require('../config/database');
const { User, Team, TeamMember, TokenTransaction, ScheduledAllocation, Company } = require('../models');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
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

const changeRole = async (employer, targetId, newRole) => {
  const target = await User.findOne({
    where: { id: targetId, company_id: employer.company_id },
  });
  if (!target) throw httpError('User not found in your company', 404);

  const t = await sequelize.transaction();
  try {
    if (newRole === 'employee' && target.role === 'manager') {
      // Dissolve the team and free all members
      const team = await Team.findOne({
        where: { manager_id: targetId, dissolved_at: null },
        transaction: t,
      });
      if (team) {
        await team.update({ dissolved_at: new Date() }, { transaction: t });
        await TeamMember.update(
          { left_at: new Date() },
          { where: { team_id: team.id, left_at: null }, transaction: t }
        );
      }
      // Deactivate all scheduled allocations targeting this manager
      await ScheduledAllocation.update(
        { active: false },
        { where: { receiver_id: targetId, active: true }, transaction: t }
      );
    }

    if (newRole === 'manager' && target.role === 'employee') {
      // Auto-create an active team for the new manager
      await Team.create(
        {
          name: `Équipe de ${target.first_name}`,
          company_id: target.company_id,
          manager_id: targetId,
        },
        { transaction: t }
      );
    }

    await target.update({ role: newRole }, { transaction: t });
    await t.commit();

    const { password_hash: _, ...safe } = target.toJSON();
    return { ...safe, role: newRole };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const createAllocation = async (employer, { receiver_id, amount, day_of_month, frequency, month, immediate }) => {
  const manager = await User.findOne({
    where: { id: receiver_id, company_id: employer.company_id, role: 'manager' },
  });
  if (!manager) throw httpError('Manager not found in your company', 404);

  const alloc = await ScheduledAllocation.create({
    sender_id: employer.id,
    receiver_id,
    company_id: employer.company_id,
    amount,
    frequency: frequency || 'monthly',
    day_of_month: day_of_month || 1,
    month: month || null,
    label: 'employer_to_manager',
    next_run_at: computeNextRun(day_of_month, frequency, month),
    active: true,
    excluded_user_ids: [],
  });

  if (immediate) {
    const t = await sequelize.transaction();
    try {
      const company = await Company.findByPk(employer.company_id, { lock: true, transaction: t });
      if (company && company.token_balance >= amount) {
        await company.decrement('token_balance', { by: amount, transaction: t });
        await manager.increment('token_balance', { by: amount, transaction: t });
        await TokenTransaction.create(
          {
            sender_id: employer.id,
            receiver_id,
            company_id: employer.company_id,
            amount,
            type: 'employer_to_manager',
          },
          { transaction: t }
        );
        await t.commit();
      } else {
        await t.rollback();
      }
    } catch {
      await t.rollback();
    }
  }

  return alloc;
};

const listAllocations = async (company_id) => {
  return ScheduledAllocation.findAll({
    where: { company_id, label: 'employer_to_manager' },
    include: [{ model: User, as: 'receiver', attributes: { exclude: ['password_hash'] } }],
    order: [['created_at', 'DESC']],
  });
};

const updateAllocation = async (employer, id, body) => {
  const alloc = await ScheduledAllocation.findOne({
    where: { id, company_id: employer.company_id, label: 'employer_to_manager' },
  });
  if (!alloc) throw httpError('Allocation not found', 404);

  const allowed = ['amount', 'active', 'day_of_month'];
  allowed.forEach((key) => {
    if (body[key] !== undefined) alloc[key] = body[key];
  });
  await alloc.save();
  return alloc;
};

const getManagerTeam = async (employer, managerId) => {
  const manager = await User.findOne({
    where: { id: managerId, company_id: employer.company_id, role: 'manager' },
    attributes: { exclude: ['password_hash'] },
  });
  if (!manager) throw httpError('Manager not found in your company', 404);

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

  return { manager, team: team || null };
};

module.exports = { changeRole, createAllocation, listAllocations, updateAllocation, getManagerTeam };
