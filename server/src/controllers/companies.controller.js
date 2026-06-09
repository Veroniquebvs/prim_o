const companiesService = require('../services/companies.service');

const create = async (req, res, next) => {
  try {
    const data = await companiesService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await companiesService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const data = await companiesService.list();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await companiesService.update(
      req.params.id,
      req.body,
      req.user.id,
      req.user.role
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await companiesService.remove(req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};

const grantTokens = async (req, res, next) => {
  try {
    const amount = parseInt(req.body.amount, 10);
    const data = await companiesService.grantTokens(req.params.id, amount);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getById, list, update, remove, grantTokens };
