/**
 * users.controller.js — HTTP handlers for user management routes.
 *
 * Covers listing, fetching, updating, and deleting users, plus activation of pending
 * employees and entry date management. All handlers are thin delegates to UsersService
 * except getPendingUsers and updateEntryDate which perform their DB queries inline.
 */
const usersService = require('../services/users.service');
const { User } = require('../models');

/** Returns users filtered by optional query parameters role and companyId. */
const list = async (req, res, next) => {
  try {
    const data = await usersService.list(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns a single user scoped to the requester's company. */
const getById = async (req, res, next) => {
  try {
    const data = await usersService.getById(req.params.id, req.user.company_id);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Updates the name and/or first_name of a user within the requester's company. */
const update = async (req, res, next) => {
  try {
    const data = await usersService.update(req.params.id, req.body, req.user.company_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Admin-only: permanently deletes a user. */
const remove = async (req, res, next) => {
  try {
    await usersService.remove(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

/** Returns the full token transaction history for a user (sent and received). */
const history = async (req, res, next) => {
  try {
    const data = await usersService.history(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Activates a pending employee and optionally sets their entry date. Employer or admin only. */
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

/** Returns all employees with status 'pending' for the requester's company. Used by the employer dashboard. */
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

/**
 * Updates only the entry_date field for a user within the requester's company.
 * The requester must be an employer; passing null clears the entry date.
 * Used when an employer wants to correct an employee's start date without a full profile update.
 */
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
