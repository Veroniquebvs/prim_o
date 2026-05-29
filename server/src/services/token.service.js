const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { User, Company, TokenTransaction } = require('../models');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

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

const getBalance = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'token_balance'],
  });
  if (!user) throw httpError('User not found', 404);
  return { userId: user.id, token_balance: user.token_balance };
};

const listTransactions = async ({ userId, date } = {}) => {
  const where = {};

  if (userId) {
    where[Op.or] = [{ sender_id: userId }, { receiver_id: userId }];
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

module.exports = { allocate, getBalance, listTransactions, getTransaction };
