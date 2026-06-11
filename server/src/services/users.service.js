const { Op } = require('sequelize');
const { User, TokenTransaction } = require('../models');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const SAFE_ATTRIBUTES = { exclude: ['password_hash'] };

const list = async ({ role, companyId } = {}) => {
  const where = {};
  if (role) where.role = role;
  if (companyId) where.company_id = companyId;

  return User.findAll({ where, attributes: SAFE_ATTRIBUTES, order: [['created_at', 'DESC']] });
};

const getById = async (id, companyId) => {
  const user = await User.findOne({
    where: {
      id,
      company_id: companyId,
    },
    attributes: SAFE_ATTRIBUTES,
  });

  if (!user) throw httpError('User not found', 404);
  return user;
};

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

const remove = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw httpError('User not found', 404);
  await user.destroy();
};

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

module.exports = { list, getById, update, remove, history, activateUser };
