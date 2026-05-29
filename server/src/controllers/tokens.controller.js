const tokenService = require('../services/token.service');
const stripeService = require('../services/stripe.service');

const allocate = async (req, res, next) => {
  try {
    const data = await tokenService.allocate(req.user, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getBalance = async (req, res, next) => {
  try {
    const data = await tokenService.getBalance(req.params.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const listTransactions = async (req, res, next) => {
  try {
    const data = await tokenService.listTransactions(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getTransaction = async (req, res, next) => {
  try {
    const data = await tokenService.getTransaction(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const stripeWebhook = async (req, res, next) => {
  try {
    await stripeService.handleWebhook(req);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

const createPurchaseIntent = async (req, res, next) => {
  try {
    // On appelle un nouveau service pour créer l'intention
    const { clientSecret } = await stripeService.createPaymentIntent(
      req.user.company_id,
      req.body.amount
    );
    res.json({ clientSecret });
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
  createPurchaseIntent,
};
