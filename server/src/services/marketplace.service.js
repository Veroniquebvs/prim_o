/**
 * marketplace.service.js — Business logic for the voucher marketplace.
 *
 * Manages the full lifecycle of vouchers (create, read, update, delete by admin) and handles
 * the critical voucher redemption flow. Redemption is a multi-step operation — check
 * availability, debit the buyer's balance, flip the voucher to unavailable, create a
 * Redemption record, and return the promo code — all inside a single PostgreSQL transaction.
 * A failure at any step rolls back the entire operation so no token is ever lost without a
 * corresponding redemption.
 *
 * The listItems function intentionally excludes promo_code from the public voucher list.
 * The promo code is only included in getItem when the caller is an admin, and returned to
 * the employee only through the redeem endpoint after a successful redemption.
 */
// randomUUID no longer needed — promo codes are supplied by the partner at creation time
const sequelize = require('../config/database');
const { User, Voucher, Redemption, Company, TeamMember } = require('../models');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * Returns all available vouchers (available = true) with their aggregated favourite count.
 * The promo_code field is stripped from each voucher so it cannot be read without redemption.
 * Results are ordered newest first. Favourite counts are computed in a single extra query and
 * merged, rather than loading them for each voucher individually.
 */
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

/**
 * Fetches a single voucher by its UUID.
 * id is the UUID of the voucher to retrieve.
 * includePromoCode controls whether the promo_code field is included in the returned object;
 * it should only be true for admin callers. Throws 404 if the voucher does not exist.
 */
const getItem = async (id, { includePromoCode = false } = {}) => {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw httpError('Voucher not found', 404);
  if (includePromoCode) return voucher;
  const { promo_code, ...rest } = voucher.toJSON();
  return rest;
};

/**
 * Creates a new voucher in the marketplace. Admin-only operation.
 * title is the display name, partner is the brand or merchant name, promo_code is the unique
 * redemption code supplied by the partner (whitespace is trimmed before storage), token_cost
 * is the number of tokens required to claim the voucher.
 * category must match one of the predefined values or be omitted. images is an array of
 * relative URL paths; if omitted, an empty array is stored.
 * Throws 400 if any of title, partner, promo_code, or token_cost is missing.
 * Returns the created Voucher instance.
 */
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

/**
 * Updates an existing voucher. Admin-only operation.
 * id is the UUID of the voucher to update. body may contain any subset of the allowed fields:
 * title, partner, promo_code, token_cost, available, category, images, is_featured, is_weekly.
 * Throws 404 if no voucher with that id exists.
 * Returns the updated Voucher instance.
 */
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

/**
 * Permanently deletes a voucher from the marketplace. Admin-only operation.
 * id is the UUID of the voucher to delete. Throws 404 if it does not exist.
 */
const deleteItem = async (id) => {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw httpError('Voucher not found', 404);
  await voucher.destroy();
};

/**
 * Redeems a voucher for the given user inside an atomic PostgreSQL transaction.
 * userId is the UUID of the employee or employer performing the redemption.
 * voucherId is the UUID of the voucher to claim.
 *
 * For employees: deducts the token cost from the user's personal token_balance.
 * For employers: deducts from the company's token_balance instead.
 *
 * Throws 403 if the voucher is not available or the balance is insufficient.
 * Throws 404 if the user or company does not exist.
 *
 * On success: marks the voucher as unavailable, creates a Redemption record, commits the
 * transaction, and returns the redemption record along with the revealed promo code.
 * On any failure: rolls back all changes so no balance is lost without a redemption.
 */
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

/**
 * Returns all past redemptions for a specific user, newest first.
 * userId is the UUID of the user whose redemption history is requested.
 * Each redemption includes a summary of the associated voucher (id, title, partner, token_cost).
 */
const listOrders = async (userId) =>
  Redemption.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
    include: [{ model: Voucher, as: 'voucher', attributes: ['id', 'title', 'partner', 'token_cost'] }],
  });

/**
 * Returns all vouchers (available or not) for admin management views.
 * Unlike listItems, includes unavailable vouchers and the promo_code field.
 * Each voucher includes a count of its associated redemption records so the admin can
 * see which vouchers have been claimed.
 */
const adminListVouchers = async () =>
  Voucher.findAll({
    order: [['created_at', 'DESC']],
    include: [{ model: Redemption, as: 'redemptions', attributes: ['id'] }],
  });

/**
 * Returns the full redemption history across all users and vouchers for admin reporting.
 * Results are ordered newest first and include the user's name and email as well as the
 * voucher's partner name, title, and token cost.
 */
const adminHistory = async () =>
  Redemption.findAll({
    order: [['created_at', 'DESC']],
    include: [
      { model: User,    as: 'user',    attributes: ['id', 'first_name', 'name', 'email'] },
      { model: Voucher, as: 'voucher', attributes: ['id', 'partner', 'title', 'token_cost'] },
    ],
  });

const listCompanyOrders = async (companyId) => {
  return Redemption.findAll({
    order: [['created_at', 'DESC']],
    include: [
      { model: Voucher, as: 'voucher', attributes: ['id', 'title', 'partner', 'token_cost'] },
      { 
        model: User, 
        as: 'user', 
        attributes: ['id', 'name', 'first_name', 'email'],
        where: { company_id: companyId }
      }
    ],
  });
};

const listTeamOrders = async (teamId) => {
  return Redemption.findAll({
    order: [['created_at', 'DESC']],
    include: [
      { model: Voucher, as: 'voucher', attributes: ['id', 'title', 'partner', 'token_cost'] },
      { 
        model: User, 
        as: 'user', 
        attributes: ['id', 'name', 'first_name', 'email'],
        include: [{
          model: TeamMember,
          as: 'team_memberships',
          where: { team_id: teamId },
          attributes: []
        }]
      }
    ],
  });
};

module.exports = {
  listItems, getItem, createItem, updateItem, deleteItem, redeem,
  listOrders, adminListVouchers, adminHistory,
  listCompanyOrders, listTeamOrders,
};
