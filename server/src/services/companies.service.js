const { Company } = require('../models');

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

module.exports = { create, getById, list, update };
