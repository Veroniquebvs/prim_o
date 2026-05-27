const usersService = require('../services/users.service');

const list = async (req, res, next) => {
  try {
    const data = await usersService.list(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await usersService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await usersService.update(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await usersService.remove(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

const history = async (req, res, next) => {
  try {
    const data = await usersService.history(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, update, remove, history };
