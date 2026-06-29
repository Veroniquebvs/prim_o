/**
 * employer.controller.js — HTTP handlers for employer-only management routes.
 * Covers role changes, scheduled allocation CRUD, and manager team inspection.
 * All handlers delegate to EmployerService.
 */
const employerService = require('../services/employer.service');

/** Changes the role of an employee within the employer's company (promote to manager or demote to employee). */
const changeRole = async (req, res, next) => {
  try {
    const data = await employerService.changeRole(req.user, req.params.id, req.body.role, req.body.teamName);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Creates a recurring 'employer_to_manager' token allocation rule. Responds 201. */
const createAllocation = async (req, res, next) => {
  try {
    const data = await employerService.createAllocation(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns all 'employer_to_manager' allocation rules for the authenticated employer's company. */
const listAllocations = async (req, res, next) => {
  try {
    const data = await employerService.listAllocations(req.user.company_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Updates an existing allocation rule (amount, active flag, or day_of_month). */
const updateAllocation = async (req, res, next) => {
  try {
    const data = await employerService.updateAllocation(req.user, req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns a manager's profile and their active team members. The manager must belong to the employer's company. */
const getManagerTeam = async (req, res, next) => {
  try {
    const data = await employerService.getManagerTeam(req.user, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const listTeams = async (req, res, next) => {
  try {
    const data = await employerService.listTeams(req.user.company_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Updates the retribution rate (%) for a team. Rate must be between 0 and 100. */
const updateRetributionRate = async (req, res, next) => {
  try {
    const data = await employerService.updateRetributionRate(req.user, req.params.teamId, req.body.rate);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { changeRole, createAllocation, listAllocations, updateAllocation, getManagerTeam, listTeams, updateRetributionRate };
