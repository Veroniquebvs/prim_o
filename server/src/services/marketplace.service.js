// randomUUID no longer needed — promo codes are supplied by the partner at creation time
const sequelize = require('../config/database');
const { User, Voucher, Redemption, Company } = require('../models');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const listItems = async () => {
  const { Favorite } = require('../models');

  const [vouchers, favCounts] = await Promise.all([
    Voucher.findAll({ where: { available: true }, order: [['created_at', 'DESC']] }),
    Favorite.findAll({
      attributes: ['voucher_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['voucher_id'],
    }),
  ]);

  const countMap = {};
  for (const f of favCounts) {
    countMap[f.voucher_id] = parseInt(f.getDataValue('count'), 10);
  }

  return vouchers.map((v) => {
    const { promo_code, ...rest } = v.toJSON();
    return { ...rest, favorite_count: countMap[v.id] ?? 0 };
  });
};

const getItem = async (id, { includePromoCode = false } = {}) => {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw httpError('Voucher not found', 404);
  if (includePromoCode) return voucher;
  const { promo_code, ...rest } = voucher.toJSON();
  return rest;
};

const createItem = async ({ title, partner, promo_code, token_cost, available, category, images }) => {
  if (!title || !partner || !promo_code || token_cost == null) {
    throw httpError('title, partner, promo_code and token_cost are required', 400);
  }
  return Voucher.create({
    title, partner, promo_code: promo_code.trim(),
    token_cost,
    available: available ?? true,
    category: category ?? null,
    images: Array.isArray(images) ? images : [],
  });
};

const updateItem = async (id, body) => {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw httpError('Voucher not found', 404);

  const allowed = ['title', 'partner', 'promo_code', 'token_cost', 'available', 'category', 'images', 'is_featured', 'is_weekly'];
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

    if (user.role === 'employer') {
      if (!user.company_id) throw httpError('Company not found', 404);
      const company = await Company.findOne({
        where: { id: user.company_id },
        lock: true,
        transaction: t,
      });
      if (!company) throw httpError('Company not found', 404);
      if (company.token_balance < voucher.token_cost) throw httpError('Insufficient token balance', 403);

      await company.decrement('token_balance', { by: voucher.token_cost, transaction: t });
    } else {
      if (user.token_balance < voucher.token_cost) throw httpError('Insufficient token balance', 403);

      await user.decrement('token_balance', { by: voucher.token_cost, transaction: t });
    }

    const promo_code = voucher.promo_code;
    await voucher.update({ available: false }, { transaction: t });

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

const adminListVouchers = async () =>
  Voucher.findAll({
    order: [['created_at', 'DESC']],
    include: [{ model: Redemption, as: 'redemptions', attributes: ['id'] }],
  });

const adminHistory = async () =>
  Redemption.findAll({
    order: [['created_at', 'DESC']],
    include: [
      { model: User,    as: 'user',    attributes: ['id', 'first_name', 'name', 'email'] },
      { model: Voucher, as: 'voucher', attributes: ['id', 'partner', 'title', 'token_cost'] },
    ],
  });

module.exports = {
  listItems, getItem, createItem, updateItem, deleteItem, redeem,
  listOrders, adminListVouchers, adminHistory,
};
