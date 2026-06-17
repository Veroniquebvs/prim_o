/**
 * companies.service.js — Business logic for company management.
 *
 * A company is the top-level entity in the PRIM'O hierarchy. This service handles creation,
 * retrieval, updating, and deletion of companies, as well as the admin-only token grant
 * operation. The remove function cascades the deletion to all associated users, redemptions,
 * and transactions to maintain referential integrity without relying on DB-level cascades.
 *
 * The update function enforces that non-admin callers can only modify their own company.
 * The getPublicById function exposes only the company name and is used unauthenticated
 * during the QR-code employee registration flow.
 */
const { Op } = require('sequelize');
const { Company } = require('../models');
const sequelize = require('../config/database');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * Creates a new company record. Throws 409 if another company already uses the same email.
 * name, street, zip_code, city, and siret are required. email is optional but unique when present.
 * Returns the created Company instance.
 */
const create = async ({ name, email, street, zip_code, city, siret }) => {
  if (email) {
    const existing = await Company.findOne({ where: { email } });
    if (existing) throw httpError('A company with this email already exists', 409);
  }
  return Company.create({
    name,
    email,
    street,
    zip_code,
    city,
    siret,
  });
};

/**
 * Fetches a company by its UUID. Throws 404 if the company does not exist.
 * Returns the full Company record including Stripe subscription fields.
 */
const getById = async (id) => {
  const company = await Company.findByPk(id);
  if (!company) throw httpError('Company not found', 404);
  return company;
};

/**
 * Fetches minimal public information about a company — only its id and name.
 * Used unauthenticated in the QR-code registration flow so an employee can confirm they are
 * joining the right company before creating their account.
 * Throws 404 if the company does not exist.
 */
const getPublicById = async (id) => {
  const company = await Company.findByPk(id, { attributes: ['id', 'name'] });
  if (!company) throw httpError('Company not found', 404);
  return { id: company.id, name: company.name };
};

/**
 * Returns all companies ordered alphabetically by name. Admin-only operation.
 */
const list = async () => Company.findAll({ order: [['name', 'ASC']] });

/**
 * Updates a company's editable fields. Accessible by admins (any company) or employers (own company only).
 * id is the UUID of the company to update. body may contain name, email, street, zip_code,
 * city, siret, and feedback_enabled. requesterId and requesterRole are used to authorise
 * non-admin updates — if the requester is not an admin, they must belong to the target company.
 * Throws 404 if the company does not exist, 403 if a non-admin tries to modify another company.
 * Returns the updated Company instance.
 */
const update = async (id, body, requesterId, requesterRole) => {
  const company = await Company.findByPk(id);
  if (!company) throw httpError('Company not found', 404);

  if (requesterRole !== 'admin') {
    const { User } = require('../models');
    const requester = await User.findByPk(requesterId);
    if (!requester || String(requester.company_id) !== String(id)) {
      throw httpError('Forbidden', 403);
    }
  }

  const allowed = ['name', 'email', 'street', 'zip_code', 'city', 'siret', 'feedback_enabled'];
  allowed.forEach((key) => {
    if (body[key] !== undefined) company[key] = body[key];
  });

  await company.save();
  return company;
};

/**
 * Permanently deletes a company and all its associated data. Admin-only operation.
 * id is the UUID of the company to delete. Throws 404 if it does not exist.
 * Cascades deletion to: all redemptions made by company users, all token transactions
 * involving company users or the company itself, all user records for the company, and finally
 * the company record. The deletion order respects foreign-key constraints.
 */
const remove = async (id) => {
  const { User, TokenTransaction, Redemption } = require('../models');
  const company = await Company.findByPk(id);
  if (!company) throw httpError('Company not found', 404);

  const users = await User.findAll({ where: { company_id: id } });
  const userIds = users.map((u) => u.id);

  if (userIds.length > 0) {
    await Redemption.destroy({ where: { user_id: userIds } });
    await TokenTransaction.destroy({
      where: { [Op.or]: [{ sender_id: userIds }, { receiver_id: userIds }] },
    });
    await User.destroy({ where: { company_id: id } });
  }

  await TokenTransaction.destroy({ where: { company_id: id } });
  await company.destroy();
};

/**
 * Admin-only operation that adds tokens directly to a company's balance without a Stripe payment.
 * companyId is the UUID of the company to top up. amount must be a positive integer.
 * The balance increment and the corresponding 'admin_grant' TokenTransaction are committed
 * atomically. Throws 404 if the company does not exist.
 * Returns an object with company_id, the granted amount, and the new balance.
 */
const grantTokens = async (companyId, amount) => {
  const { TokenTransaction } = require('../models');

  if (!Number.isInteger(amount) || amount <= 0) {
    throw httpError('amount must be a positive integer', 400);
  }

  const t = await sequelize.transaction();
  try {
    const company = await Company.findByPk(companyId, { transaction: t, lock: true });
    if (!company) throw httpError('Company not found', 404);

    await company.increment('token_balance', { by: amount, transaction: t });

    await TokenTransaction.create(
      { company_id: companyId, amount, type: 'admin_grant', sender_id: null, receiver_id: null },
      { transaction: t }
    );

    await t.commit();
    return { company_id: companyId, amount, new_balance: company.token_balance + amount };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { create, getById, getPublicById, list, update, remove, grantTokens };
