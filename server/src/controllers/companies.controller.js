/**
 * companies.controller.js — HTTP handlers for company management routes.
 * Thin delegates to CompaniesService for create, read, update, delete, and token grant operations.
 */
const companiesService = require('../services/companies.service');

/** Creates a new company. Public endpoint used during employer self-onboarding. Responds 201. */
const create = async (req, res, next) => {
  try {
    const data = await companiesService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns a company's full details including Stripe subscription fields. */
const getById = async (req, res, next) => {
  try {
    const data = await companiesService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns minimal public company info (id, name only) for the QR-code registration flow. */
const getPublicById = async (req, res, next) => {
  try {
    const data = await companiesService.getPublicById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Admin-only: returns all companies alphabetically. */
const list = async (req, res, next) => {
  try {
    const data = await companiesService.list();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Updates a company's editable fields. Accessible by the company's employer or an admin. */
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

/** Admin-only: permanently deletes a company and all its associated users and transactions. */
const remove = async (req, res, next) => {
  try {
    await companiesService.remove(req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin-only: credits a token amount to a company's balance without a Stripe payment.
 * Parses req.body.amount as an integer before passing it to the service.
 */
const grantTokens = async (req, res, next) => {
  try {
    const amount = parseInt(req.body.amount, 10);
    const data = await companiesService.grantTokens(req.params.id, amount);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin-only: Creates a new company and its associated employer user atomically.
 * Responds 201 with the created company and employer details.
 */
const adminCreate = async (req, res, next) => {
  try {
    const data = await companiesService.adminCreate(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getById, getPublicById, list, update, remove, grantTokens, adminCreate };
