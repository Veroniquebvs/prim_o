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
const { User, Company, TokenTransaction } = require('../models');

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
const allocate = async (sender, { receiver_id, amount, reason }) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw httpError('amount must be a positive integer', 400);
  }

  const t = await sequelize.transaction();
  try {
    const company = await Company.findOne({
      where: { id: sender.company_id },
      lock: true,
      transaction: t,
    });
    if (!company) throw httpError('Company not found', 404);
    if (company.token_balance < amount) throw httpError('Insufficient token balance', 402);

    const receiver = await User.findOne({
      where: { id: receiver_id, company_id: sender.company_id },
      lock: true,
      transaction: t,
    });
    if (!receiver) throw httpError('Employee not found in your company', 404);

    await company.decrement('token_balance', { by: amount, transaction: t });
    await receiver.increment('token_balance', { by: amount, transaction: t });

    const tx = await TokenTransaction.create(
      {
        sender_id: sender.id,
        receiver_id,
        company_id: sender.company_id,
        amount,
        type: reason || 'allocation',
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
const listTransactions = async ({ userId, date, type } = {}) => {
  const where = {};

  if (userId) {
    where[Op.or] = [{ sender_id: userId }, { receiver_id: userId }];
  }

  if (type) {
    where.type = type;
  }

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.created_at = { [Op.gte]: start, [Op.lt]: end };
  }

  return TokenTransaction.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: [
      { model: User, as: 'sender', attributes: ['id', 'name', 'first_name', 'email'] },
      { model: User, as: 'receiver', attributes: ['id', 'name', 'first_name', 'email'] },
    ],
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
