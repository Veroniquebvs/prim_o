/**
 * tokens.controller.js — HTTP handlers for token management and Stripe subscription routes.
 *
 * Covers: employer token allocation, balance queries, transaction listing, Stripe webhook
 * processing, subscription creation/retrieval, and admin token deduction. Each handler is
 * a thin delegate to TokenService or StripeService.
 */
const tokenService = require('../services/token.service');
const stripeService = require('../services/stripe.service');
const { Company } = require('../models');

/** Handles token allocation from an employer to an employee. Responds 201 with the transaction record. */
const allocate = async (req, res, next) => {
  try {
    const data = await tokenService.allocate(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns the token balance for the user identified by req.params.userId. */
const getBalance = async (req, res, next) => {
  try {
    const data = await tokenService.getBalance(req.params.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Lists token transactions, filtered by optional query parameters (userId, date, type). */
const listTransactions = async (req, res, next) => {
  try {
    const query = { ...req.query };
    if (req.user.role !== 'admin') {
      query.company_id = req.user.company_id;
    }
    
    // Un employé ne peut voir que ses propres transactions
    if (req.user.role === 'employee') {
      query.userId = req.user.id;
    } else if (req.user.role === 'manager') {
      const { Team } = require('../models');
      const team = await Team.findOne({ where: { manager_id: req.user.id } });
      if (team) {
        query.managerTeamId = team.id;
      }
    }
    
    const data = await tokenService.listTransactions(query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Returns a single transaction record by its UUID. */
const getTransaction = async (req, res, next) => {
  try {
    const data = await tokenService.getTransaction(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Receives and processes Stripe webhook events. Verifies the Stripe signature before acting. */
const stripeWebhook = async (req, res, next) => {
  try {
    await stripeService.handleWebhook(req);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

/** Creates or replaces the employer's Stripe subscription for the plan specified in req.body.planId. */
const subscribe = async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.user.company_id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const result = await stripeService.createOrUpdateSubscription(company, req.body.planId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/** Returns the employer's current Stripe subscription status, synced from the Stripe API. */
const getSubscription = async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.user.company_id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const subscription = await stripeService.getSubscription(company);
    res.json({ subscription });
  } catch (err) {
    next(err);
  }
};

/** Admin-only: deducts tokens from a company or employee balance as specified in req.body. */
const adminDeduct = async (req, res, next) => {
  try {
    await tokenService.adminDeduct(req.user, req.body);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  allocate,
  getBalance,
  listTransactions,
  getTransaction,
  stripeWebhook,
  subscribe,
  getSubscription,
  adminDeduct,
};
