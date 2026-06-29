/**
 * token.service.js — Business logic for token allocation and balance management.
 *
 * All write operations that modify balances (allocate, adminDeduct) use explicit PostgreSQL
 * transactions with row-level locks (SELECT FOR UPDATE) to prevent race conditions where
 * two concurrent requests might overdraw a balance. Any failure rolls back the entire
 * transaction so balances can never become inconsistent.
 *
 * Responsibilities:
 *   - allocate: employer transfers tokens to an employee within the same company
 *   - getBalance: reads a user's current token balance
 *   - listTransactions / getTransaction: query the transaction ledger with optional filters
 *   - adminDeduct: admin forcibly removes tokens from a company or employee
 */
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { User, Company, TokenTransaction, TeamMember, Team } = require('../models');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * Transfers tokens from the sender's company balance to an employee's personal balance.
 * sender is the authenticated employer user object (must have company_id set).
 * receiver_id is the UUID of the employee who will receive the tokens.
 * amount must be a positive integer; throws 400 otherwise.
 * reason is an optional string describing the performance being recognised.
 * Throws 402 if the company has insufficient balance, 404 if the company or receiver is not found.
 * All balance changes and the transaction ledger entry are committed atomically.
 * Returns the created TokenTransaction record on success.
 */
const { resolveTargets } = require('./targetResolver.service');
const allocate = async (sender, { target_type, receiver_id, target_team_id, excluded_user_ids, amount, reason, target_account }) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw httpError('amount must be a positive integer', 400);
  }

  const targets = await resolveTargets({
    company_id: sender.company_id,
    target_type,
    receiver_id,
    target_team_id,
    excluded_user_ids: Array.isArray(excluded_user_ids) ? excluded_user_ids : [],
  });

  if (targets.length === 0) {
    throw httpError('Aucun destinataire trouvé', 404);
  }

  const totalAmount = amount * targets.length;

  const t = await sequelize.transaction();
  try {
    const company = await Company.findOne({
      where: { id: sender.company_id },
      lock: true,
      transaction: t,
    });
    if (!company) throw httpError('Company not found', 404);
    if (company.token_balance < totalAmount) throw httpError('Insufficient token balance', 402);

    await company.decrement('token_balance', { by: totalAmount, transaction: t });

    for (const receiver of targets) {
      // Refresh receiver to get a lock
      const lockedReceiver = await User.findOne({
        where: { id: receiver.id },
        lock: true,
        transaction: t,
      });

      if (lockedReceiver) {
        let txType = 'employer_to_employee';
        if (lockedReceiver.role === 'manager') {
          txType = target_account === 'team' ? 'employer_to_team' : 'employer_to_manager';
        }

        if (target_account === 'team' && lockedReceiver.role === 'manager') {
          let team = await Team.findOne({ where: { manager_id: lockedReceiver.id, dissolved_at: null }, lock: true, transaction: t });
          if (!team) {
            team = await Team.create({
              name: `Équipe de ${lockedReceiver.first_name || lockedReceiver.name || 'Manager'}`,
              company_id: lockedReceiver.company_id,
              manager_id: lockedReceiver.id,
              token_balance: 0
            }, { transaction: t });
          }
          await team.increment('token_balance', { by: amount, transaction: t });
          txType = 'employer_to_team';
        } else {
          await lockedReceiver.increment('token_balance', { by: amount, transaction: t });
        }

        await TokenTransaction.create(
          {
            sender_id: sender.id,
            receiver_id: lockedReceiver.id,
            company_id: sender.company_id,
            amount,
            type: txType,
            reason: reason || (txType === 'employer_to_team' ? "Enveloppe de token pour l'équipe" : null),
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    return { success: true, count: targets.length, total: totalAmount };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * Returns the current token balance for a given user.
 * userId is the UUID of the user whose balance is requested.
 * Throws 404 if the user does not exist.
 * Returns an object with userId and token_balance fields.
 */
const getBalance = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'token_balance'],
  });
  if (!user) throw httpError('User not found', 404);
  return { userId: user.id, token_balance: user.token_balance };
};

/**
 * Lists token transactions with optional filters.
 * userId, when provided, returns only transactions where the user was sender or receiver.
 * date (ISO 8601 date string) filters to transactions created on that calendar day.
 * type filters to a specific transaction type label.
 * Results are ordered newest first and include sender and receiver user details.
 */
const listTransactions = async ({ company_id, userId, date, type, managerTeamId } = {}) => {
  const where = {};
  if (company_id !== undefined) {
    where.company_id = company_id;
  }

  if (userId) {
    where[Op.or] = [
      { sender_id: userId },
      { receiver_id: userId }
    ];
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.created_at = {
      [Op.gte]: start,
      [Op.lte]: end
    };
  }

  if (type) {
    where.type = type;
  }

  if (managerTeamId) {
    const team = await Team.findByPk(managerTeamId);
    const teamMembers = await TeamMember.findAll({ where: { team_id: managerTeamId } });
    const userIds = teamMembers.map(tm => tm.user_id);
    if (team && team.manager_id) {
      userIds.push(team.manager_id);
    }
    where[Op.or] = [
      { sender_id: { [Op.in]: userIds } },
      { receiver_id: { [Op.in]: userIds } }
    ];
  }

  const txs = await TokenTransaction.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: [
      { model: User, as: 'sender', attributes: ['id', 'name', 'first_name', 'email'] },
      { 
        model: User, 
        as: 'receiver', 
        attributes: ['id', 'name', 'first_name', 'email'],
        include: [{
          model: TeamMember,
          as: 'team_memberships',
          attributes: ['team_id']
        }]
      },
      { model: Company, as: 'company', attributes: ['id', 'name'] },
    ],
  });

  return txs.map(tx => {
    const plain = tx.get({ plain: true });
    if (plain.receiver && plain.receiver.team_memberships && plain.receiver.team_memberships.length > 0) {
      plain.receiver.team_id = plain.receiver.team_memberships[0].team_id;
      delete plain.receiver.team_memberships;
    }
    return plain;
  });
};

/**
 * Fetches a single transaction by its UUID, including sender and receiver user details.
 * id is the UUID of the transaction to retrieve.
 * Throws 404 if no transaction with that id exists.
 */
const getTransaction = async (id) => {
  const tx = await TokenTransaction.findByPk(id, {
    include: [
      { model: User, as: 'sender', attributes: ['id', 'name', 'first_name', 'email'] },
      { model: User, as: 'receiver', attributes: ['id', 'name', 'first_name', 'email'] },
    ],
  });
  if (!tx) throw httpError('Transaction not found', 404);
  return tx;
};

/**
 * Admin-only operation that forcibly removes tokens from a company or a specific employee.
 * target must be 'company' or 'employee'; throws 400 for any other value.
 * company_id identifies the company being acted on. user_id is required when target is 'employee'.
 * amount must be a positive integer; throws 402 if the target has insufficient balance.
 * reason is an optional label stored in the transaction record.
 * The balance deduction and the ledger entry are committed atomically.
 */
const adminDeduct = async (_adminUser, { target, company_id, user_id, amount, reason }) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw httpError('amount must be a positive integer', 400);
  }

  const t = await sequelize.transaction();
  try {
    if (target === 'company') {
      const company = await Company.findByPk(company_id, { lock: true, transaction: t });
      if (!company) throw httpError('Company not found', 404);
      if (company.token_balance < amount) throw httpError('Insufficient token balance', 402);

      await company.decrement('token_balance', { by: amount, transaction: t });
      await TokenTransaction.create(
        { sender_id: null, receiver_id: null, company_id, amount, type: reason || 'admin_deduct' },
        { transaction: t }
      );
    } else if (target === 'employee') {
      const user = await User.findOne({
        where: { id: user_id, company_id },
        lock: true,
        transaction: t,
      });
      if (!user) throw httpError('User not found in this company', 404);
      if (user.token_balance < amount) throw httpError('Insufficient token balance', 402);

      await user.decrement('token_balance', { by: amount, transaction: t });
      await TokenTransaction.create(
        { sender_id: user_id, receiver_id: null, company_id, amount, type: reason || 'admin_deduct' },
        { transaction: t }
      );
    } else {
      throw httpError('target must be "company" or "employee"', 400);
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { allocate, getBalance, listTransactions, getTransaction, adminDeduct };
