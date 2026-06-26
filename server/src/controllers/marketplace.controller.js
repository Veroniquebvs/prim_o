/**
 * marketplace.controller.js — HTTP handlers for marketplace routes.
 *
 * Handles voucher browsing, CRUD (admin), and the redemption flow. Passes req.user.role
 * to the service layer so getItem can decide whether to include the promo_code field.
 */
const marketplaceService = require('../services/marketplace.service');

/** Returns all available vouchers without promo codes, with their favourite counts. */
const listItems = async (req, res, next) => {
  try {
    const data = await marketplaceService.listItems();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns a single voucher. Includes promo_code only for admin callers. */
const getItem = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const data = await marketplaceService.getItem(req.params.id, { includePromoCode: isAdmin });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Admin-only: creates a new voucher. Responds 201 with the created record. */
const createItem = async (req, res, next) => {
  try {
    const data = await marketplaceService.createItem(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Admin-only: updates an existing voucher's fields. */
const updateItem = async (req, res, next) => {
  try {
    const data = await marketplaceService.updateItem(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Admin-only: permanently deletes a voucher by its UUID. */
const deleteItem = async (req, res, next) => {
  try {
    await marketplaceService.deleteItem(req.params.id);
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    next(err);
  }
};

/** Redeems a voucher for the authenticated user. Returns the promo code on success. */
const redeem = async (req, res, next) => {
  try {
    const data = await marketplaceService.redeem(req.user.id, req.body.voucher_id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns the redemption history for the currently authenticated user. */
const listOrders = async (req, res, next) => {
  try {
    const data = await marketplaceService.listOrders(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Admin-only: returns all vouchers (including unavailable ones and promo codes) with redemption counts. */
const adminListVouchers = async (req, res, next) => {
  try {
    const data = await marketplaceService.adminListVouchers();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

/** Admin-only: returns the full redemption history across all users and vouchers. */
const adminHistory = async (req, res, next) => {
  try {
    const data = await marketplaceService.adminHistory();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const companyOrders = async (req, res, next) => {
  try {
    let data = [];
    if (req.user.role === 'employer') {
      data = await marketplaceService.listCompanyOrders(req.user.company_id);
    } else if (req.user.role === 'manager') {
      const { Team } = require('../models');
      const team = await Team.findOne({ where: { manager_id: req.user.id } });
      if (team) {
        data = await marketplaceService.listTeamOrders(team.id);
      }
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listItems, getItem, createItem, updateItem, deleteItem, redeem,
  listOrders, adminListVouchers, adminHistory, companyOrders,
};
