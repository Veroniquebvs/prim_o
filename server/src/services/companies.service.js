const { Op } = require('sequelize');
const { Company } = require('../models');
const sequelize = require('../config/database');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

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

const getById = async (id) => {
  const company = await Company.findByPk(id);
  if (!company) throw httpError('Company not found', 404);
  return company;
};

const list = async () => Company.findAll({ order: [['name', 'ASC']] });

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

  const allowed = ['name', 'email', 'street', 'zip_code', 'city', 'siret'];
  allowed.forEach((key) => {
    if (body[key] !== undefined) company[key] = body[key];
  });

  await company.save();
  return company;
};

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

module.exports = { create, getById, list, update, remove, grantTokens };
