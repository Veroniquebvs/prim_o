const managerService = require('../services/manager.service');

const getTeam = async (req, res, next) => {
  try {
    const data = await managerService.getTeam(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    const data = await managerService.createEmployee(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const addTeamMember = async (req, res, next) => {
  try {
    const data = await managerService.addTeamMember(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const giveTokens = async (req, res, next) => {
  try {
    const data = await managerService.giveTokens(req.user, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getBalance = async (req, res, next) => {
  try {
    const data = await managerService.getBalance(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getUnassignedCollaborators = async (req, res, next) => {
  try {
    const data = await managerService.getUnassignedCollaborators(req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const listScheduled = async (req, res, next) => {
  try {
    const data = await managerService.listScheduled(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const createScheduled = async (req, res, next) => {
  try {
    const data = await managerService.createScheduled(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const toggleScheduled = async (req, res, next) => {
  try {
    const data = await managerService.toggleScheduled(req.user, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const deleteScheduled = async (req, res, next) => {
  try {
    await managerService.deleteScheduled(req.user, req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};

module.exports = { getTeam, createEmployee, addTeamMember, giveTokens, getBalance, getUnassignedCollaborators, listScheduled, createScheduled, toggleScheduled, deleteScheduled };
