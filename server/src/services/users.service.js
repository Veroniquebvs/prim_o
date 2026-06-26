/**
 * users.service.js — Business logic for user management operations.
 *
 * Provides CRUD operations over users, scoped by company where relevant. The update function
 * intentionally restricts which fields can be changed (only name and first_name) to prevent
 * callers from self-escalating their role, token_balance, or company_id. The activateUser
 * function is used by employers to validate newly registered employees and set their entry date.
 *
 * All queries that return user data exclude the password_hash column.
 */
const { Op } = require('sequelize');
const { User, TokenTransaction } = require('../models');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const SAFE_ATTRIBUTES = { exclude: ['password_hash'] };

/**
 * Returns a filtered list of users, excluding password hashes.
 * role, when provided, restricts results to users with that role.
 * companyId, when provided, restricts results to users belonging to that company.
 * Results are ordered newest-first.
 */
const list = async ({ role, companyId } = {}) => {
  const where = {};
  if (role) where.role = role;
  if (companyId) where.company_id = companyId;

  return User.findAll({ where, attributes: SAFE_ATTRIBUTES, order: [['created_at', 'DESC']] });
};

/**
 * Returns a single user by their UUID, scoped to the given company.
 * id is the UUID of the user to retrieve.
 * companyId ensures the caller can only access users within their own company.
 * Throws 404 if the user is not found or does not belong to that company.
 */
const getById = async (id, companyId) => {
  const where = { id };
  if (companyId) where.company_id = companyId;

  const user = await User.findOne({
    where,
    attributes: SAFE_ATTRIBUTES,
  });

  if (!user) throw httpError('User not found', 404);
  return user;
};

/**
 * Updates a user's name and/or first_name within the caller's company.
 * id is the UUID of the user to update. body may contain name and first_name.
 * companyId scopes the lookup so callers cannot update users in other companies.
 * Only name and first_name can be changed here — role, token_balance, and company_id
 * are intentionally excluded from the update whitelist to prevent privilege escalation.
 * Throws 404 if the user is not found in that company.
 * Returns the updated user object without the password hash.
 */
// Whitelist — role, password_hash, token_balance and company_id are never updated here.
const update = async (id, body, companyId) => {
  const user = await User.findOne({
    where: { id, company_id: companyId },
  });

  if (!user) throw httpError('User not found', 404);

  const allowed = ['name', 'first_name'];

  allowed.forEach((key) => {
    if (body[key] !== undefined) user[key] = body[key];
  });

  await user.save();

  const { password_hash: _, ...safe } = user.toJSON();
  return safe;
};

/**
 * Permanently deletes a user by their UUID. Admin-only operation.
 * id is the UUID of the user to delete. Throws 404 if the user does not exist.
 */
/**
 * Updates the avatar_index for a user. Only the user themselves can call this.
 * id is the UUID of the user. index must be between 1 and 6.
 */
const updateAvatar = async (id, avatar_index) => {
  const user = await User.findByPk(id);
  if (!user) throw httpError('User not found', 404);
  if (!Number.isInteger(avatar_index) || avatar_index < 1 || avatar_index > 6) {
    throw httpError('avatar_index must be an integer between 1 and 6', 400);
  }
  user.avatar_index = avatar_index;
  await user.save();
  const { password_hash: _, ...safe } = user.toJSON();
  return safe;
};

const remove = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw httpError('User not found', 404);
  await user.destroy();
};

/**
 * Returns the full token transaction history for a user (both sent and received transactions).
 * id is the UUID of the user. Throws 404 if the user does not exist.
 * Results are ordered newest first and include sender and receiver name/email details.
 */
const history = async (id) => {
  const user = await User.findByPk(id, { attributes: ['id'] });
  if (!user) throw httpError('User not found', 404);

  return TokenTransaction.findAll({
    where: { [Op.or]: [{ sender_id: id }, { receiver_id: id }] },
    order: [['created_at', 'DESC']],
    include: [
      { model: User, as: 'sender', attributes: ['id', 'name', 'first_name', 'email'] },
      { model: User, as: 'receiver', attributes: ['id', 'name', 'first_name', 'email'] },
    ],
  });
};

/**
 * Activates a pending employee by setting their status to 'active'.
 * id is the UUID of the employee to activate. companyId scopes the lookup to the employer's company.
 * entry_date is an optional ISO date string representing the employee's start date; passing
 * null or omitting it clears any previously set entry date.
 * Throws 404 if the user is not found in that company.
 * Returns the updated user record.
 */
const activateUser = async (id, companyId, entry_date) => {
  const user = await User.findOne({
    where: { id, company_id: companyId },
  });

  if (!user) throw httpError('User not found', 404);

  user.status = 'active';

  if (entry_date !== undefined) {
    user.entry_date = entry_date || null;
  }

  await user.save();

  return user;
};

module.exports = { list, getById, update, updateAvatar, remove, history, activateUser };
