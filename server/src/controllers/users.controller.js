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
    const data = await usersService.getById(req.params.id, req.user.company_id);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await usersService.update(req.params.id, req.body, req.user.company_id);
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

const activateUser = async (req, res, next) => {
  try {
    const data = await usersService.activateUser(
      req.params.id,
      req.user.company_id,
      req.body.entry_date
    );

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

// retrieve only employees who are on standby
const getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await User.findAll({
      where: {
        company_id: req.user.company_id,
        status: 'pending',
        role: 'employee',
      },
    });

    res.json(pendingUsers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateEntryDate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { entry_date } = req.body;

    const user = await User.findOne({
      where: {
        id,
        company_id: req.user.company_id,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.role !== 'employer') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    user.entry_date = entry_date || null;
    await user.save();

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getById,
  update,
  remove,
  history,
  activateUser,
  getPendingUsers,
  updateEntryDate,
};
