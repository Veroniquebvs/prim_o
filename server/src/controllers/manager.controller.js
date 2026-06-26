/**
 * manager.controller.js — HTTP handlers for manager-only routes.
 * Covers team management, employee creation, token distribution, and scheduled allocation CRUD.
 * All handlers delegate to ManagerService.
 */
const managerService = require('../services/manager.service');

/** Returns the manager's active team and all current members. */
const getTeam = async (req, res, next) => {
  try {
    const data = await managerService.getTeam(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Creates a new employee account and adds them to the manager's active team. Responds 201. */
const createEmployee = async (req, res, next) => {
  try {
    const data = await managerService.createEmployee(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Adds an existing unassigned employee to the manager's team. Responds 201. */
const addTeamMember = async (req, res, next) => {
  try {
    const data = await managerService.addTeamMember(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Transfers tokens from the manager's personal balance to an employee in their team. */
const giveTokens = async (req, res, next) => {
  try {
    const data = await managerService.giveTokens(req.user, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns the manager's current token balance. */
const getBalance = async (req, res, next) => {
  try {
    const data = await managerService.getBalance(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns employees in the manager's company who do not yet belong to any active team. */
const getUnassignedCollaborators = async (req, res, next) => {
  try {
    const data = await managerService.getUnassignedCollaborators(req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

/** Lists all scheduled allocation rules created by the authenticated manager. */
const listScheduled = async (req, res, next) => {
  try {
    const data = await managerService.listScheduled(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

/** Creates a new recurring allocation rule from this manager to an employee in their team. Responds 201. */
const createScheduled = async (req, res, next) => {
  try {
    const data = await managerService.createScheduled(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

/** Toggles a scheduled allocation rule between active and paused. */
const toggleScheduled = async (req, res, next) => {
  try {
    const data = await managerService.toggleScheduled(req.user, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

/** Permanently deletes a scheduled allocation rule belonging to the authenticated manager. */
const deleteScheduled = async (req, res, next) => {
  try {
    await managerService.deleteScheduled(req.user, req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};

module.exports = { getTeam, createEmployee, addTeamMember, giveTokens, getBalance, getUnassignedCollaborators, listScheduled, createScheduled, toggleScheduled, deleteScheduled };
