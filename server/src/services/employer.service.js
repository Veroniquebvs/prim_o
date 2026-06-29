/**
 * employer.service.js — Business logic for employer-level management operations.
 *
 * Provides the features that are unique to the employer role: changing user roles within the
 * company, and managing scheduled (recurring) token allocations to managers.
 *
 * Role change rules:
 *   - Promoting an employee to manager auto-creates an empty active team for them.
 *   - Demoting a manager back to employee dissolves their team and removes all team members,
 *     and deactivates any scheduled allocations targeting them to prevent orphaned transfers.
 *
 * Scheduled allocations here are 'employer_to_manager' rules — the employer sets up a
 * recurring budget transfer to a manager, separate from the 'scheduled_allocations' routes
 * which handle employer-to-all-employees rules.
 */
const sequelize = require('../config/database');
const { User, Team, TeamMember, TokenTransaction, ScheduledAllocation, Company } = require('../models');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * Computes the next scheduled run date for a recurring allocation rule.
 * dayOfMonth is the day of the month on which the transfer should execute (1–28).
 * frequency is either 'monthly' or 'annual'.
 * month is the calendar month (1–12, only used when frequency is 'annual').
 * Returns a Date object set to 09:00 UTC on the next valid occurrence after now.
 */
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
 * Changes the role of an employee within the employer's company.
 * employer is the authenticated employer user object.
 * targetId is the UUID of the user whose role will change.
 * newRole must be 'manager' or 'employee'.
 *
 * When promoting to manager: automatically creates an active team named after the user.
 * When demoting to employee: dissolves the manager's active team (sets dissolved_at),
 *   closes all team memberships (sets left_at), and deactivates any scheduled allocations
 *   targeting this manager so they stop receiving recurring budget transfers.
 *
 * All changes are committed atomically. Throws 404 if the target user is not found in
 * the employer's company. Returns the updated user object without the password hash.
 */
const changeRole = async (employer, targetId, newRole, teamName) => {
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
          name: teamName || `Équipe de ${target.first_name}`,
          company_id: target.company_id,
          manager_id: targetId,
        },
        { transaction: t }
      );
    }

    await target.update({ role: newRole }, { transaction: t });

    await TokenTransaction.create(
      {
        sender_id: employer.id,
        receiver_id: targetId,
        company_id: employer.company_id,
        amount: 0,
        type: 'role_change',
        reason: newRole,
      },
      { transaction: t }
    );

    await t.commit();

    const { password_hash: _, ...safe } = target.toJSON();
    return { ...safe, role: newRole };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * Creates a recurring token allocation rule from the employer to a specific manager.
 * employer is the authenticated employer user. receiver_id must be the UUID of a manager
 * within the same company. amount, day_of_month, frequency, and optionally month define the
 * schedule. If immediate is true, also executes an instant one-time transfer right now
 * (silently skips if the company has insufficient balance). Returns the created rule record.
 */
const createAllocation = async (employer, { receiver_id, amount, day_of_month, frequency, month, immediate, target_account }) => {
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
    target_account: target_account || 'personal',
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
        
        if (target_account === 'team') {
          let team = await Team.findOne({ where: { manager_id: manager.id, dissolved_at: null }, lock: true, transaction: t });
          if (!team) {
            team = await Team.create({
              name: `Équipe de ${manager.first_name || manager.name || 'Manager'}`,
              company_id: manager.company_id,
              manager_id: manager.id,
              token_balance: 0
            }, { transaction: t });
          }
          await team.increment('token_balance', { by: amount, transaction: t });

        } else {
          await manager.increment('token_balance', { by: amount, transaction: t });
        }

        await TokenTransaction.create(
          {
            sender_id: employer.id,
            receiver_id,
            company_id: employer.company_id,
            amount,
            type: target_account === 'team' ? 'employer_to_team' : 'employer_to_manager',
            reason: target_account === 'team' ? "Enveloppe de token pour l'équipe" : null,
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

/**
 * Returns all 'employer_to_manager' scheduled allocation rules for a given company.
 * company_id is the UUID of the company. Results are ordered newest first and include
 * the manager (receiver) user details.
 */
const listAllocations = async (company_id) => {
  return ScheduledAllocation.findAll({
    where: { company_id, label: 'employer_to_manager' },
    include: [{ model: User, as: 'receiver', attributes: { exclude: ['password_hash'] } }],
    order: [['created_at', 'DESC']],
  });
};


const listTeams = async (company_id) => {
  return Team.findAll({
    where: { company_id, dissolved_at: null },
    include: [
      { model: User, as: 'manager', attributes: { exclude: ['password_hash'] } },
      { 
        model: TeamMember, 
        as: 'members', 
        where: { left_at: null }, 
        required: false,
        include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }]
      }
    ],
    order: [['name', 'ASC']]
  });
};

/**
 * Updates an existing 'employer_to_manager' scheduled allocation rule.
 * employer is the authenticated employer. id is the UUID of the rule to update.
 * body may contain amount, active (boolean to pause/resume), and day_of_month.
 * Throws 404 if the rule is not found within the employer's company.
 * Returns the updated rule record.
 */
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

/**
 * Returns a manager's profile and their currently active team (with all active members).
 * employer is the authenticated employer. managerId is the UUID of the manager to look up.
 * The manager must belong to the employer's company.
 * Returns an object with manager (the User record) and team (the active Team record with members,
 * or null if the manager has no active team yet).
 * Throws 404 if the manager is not found in the employer's company.
 */
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

/**
 * Updates the retribution rate for a team within the employer's company.
 * employer is the authenticated employer. teamId is the UUID of the active team to update.
 * rate must be between 0 and 100 (percentage of each distribution credited back to the manager).
 * Throws 404 if the team is not found in the employer's company.
 * Returns the updated Team record.
 */
const updateRetributionRate = async (employer, teamId, rate) => {
  const team = await Team.findOne({
    where: { id: teamId, company_id: employer.company_id, dissolved_at: null },
  });
  if (!team) throw httpError('Team not found', 404);
  await team.update({ retribution_rate: rate });
  return team;
};

module.exports = { changeRole, createAllocation, listAllocations, updateAllocation, getManagerTeam, listTeams, updateRetributionRate };
