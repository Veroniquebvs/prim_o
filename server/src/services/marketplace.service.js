const { randomUUID } = require('crypto');
const sequelize = require('../config/database');
const { User, Voucher, Redemption } = require('../models');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const listItems = async () =>
  Voucher.findAll({ where: { available: true }, order: [['created_at', 'DESC']] });

const getItem = async (id) => {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw httpError('Voucher not found', 404);
  return voucher;
};

const createItem = async ({ title, partner, token_cost, available }) => {
  if (!title || !partner || token_cost == null) {
    throw httpError('title, partner and token_cost are required', 400);
  }
  return Voucher.create({ title, partner, token_cost, available: available ?? true });
};

const updateItem = async (id, body) => {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw httpError('Voucher not found', 404);

  const allowed = ['title', 'partner', 'token_cost', 'available'];
  allowed.forEach((key) => {
    if (body[key] !== undefined) voucher[key] = body[key];
  });

  await voucher.save();
  return voucher;
};

const deleteItem = async (id) => {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw httpError('Voucher not found', 404);
  await voucher.destroy();
};

const redeem = async (userId, voucherId) => {
  const t = await sequelize.transaction();
  try {
    const voucher = await Voucher.findOne({
      where: { id: voucherId, available: true },
      lock: true,
      transaction: t,
    });
    if (!voucher) throw httpError('Voucher not available', 403);

    const user = await User.findOne({
      where: { id: userId },
      lock: true,
      transaction: t,
    });
    if (!user) throw httpError('User not found', 404);
    if (user.token_balance < voucher.token_cost) throw httpError('Insufficient token balance', 403);

    await user.decrement('token_balance', { by: voucher.token_cost, transaction: t });
    await voucher.update({ available: false }, { transaction: t });

    const promo_code = randomUUID();
    const redemption = await Redemption.create(
      { user_id: userId, voucher_id: voucherId, promo_code },
      { transaction: t }
    );

    await t.commit();
    return { redemption, promo_code };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const listOrders = async (userId) =>
  Redemption.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    include: [{ model: Voucher, as: 'voucher', attributes: ['id', 'title', 'partner', 'token_cost'] }],
  });

module.exports = { listItems, getItem, createItem, updateItem, deleteItem, redeem, listOrders };
