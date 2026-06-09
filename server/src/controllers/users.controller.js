const usersService = require('../services/users.service');
const { User } = require('../models');

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

// server/src/controllers/user.controller.js

const activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the requester is an employer
    if (req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Validate the account
    user.status = 'active';
    await user.save();

    res.status(200).json({ message: 'User activated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// retrieve only employees who are on standby
const getPendingUsers = async (req, res) => {
  const { companyId } = req.query;
  const pendingUsers = await User.findAll({
    where: { company_id: companyId, status: 'pending', role: 'employee' },
  });
  res.json(pendingUsers);
};

module.exports = { list, getById, update, remove, history, activateUser, getPendingUsers };
