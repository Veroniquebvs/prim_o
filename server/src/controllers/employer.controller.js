const employerService = require('../services/employer.service');

const changeRole = async (req, res, next) => {
  try {
    const data = await employerService.changeRole(req.user, req.params.id, req.body.role);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const createAllocation = async (req, res, next) => {
  try {
    const data = await employerService.createAllocation(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const listAllocations = async (req, res, next) => {
  try {
    const data = await employerService.listAllocations(req.user.company_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const updateAllocation = async (req, res, next) => {
  try {
    const data = await employerService.updateAllocation(req.user, req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getManagerTeam = async (req, res, next) => {
  try {
    const data = await employerService.getManagerTeam(req.user, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { changeRole, createAllocation, listAllocations, updateAllocation, getManagerTeam };
