const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sequelize = require('../config/database');
const { Company, TokenTransaction } = require('../models');

const PLANS = {
  starter: { tokens: 500,  priceEuros: 29  },
  growth:  { tokens: 1500, priceEuros: 79  },
  scale:   { tokens: 4000, priceEuros: 179 },
};

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/* ── Webhook ─────────────────────────────────────────────── */
const handleWebhook = async (req) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw httpError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  if (event.type !== 'invoice.payment_succeeded') return;

  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const company = await Company.findOne({ where: { stripe_subscription_id: subscriptionId } });
  if (!company) throw httpError('Company not found for subscription', 404);

  const plan = PLANS[company.subscription_plan];
  if (!plan) throw httpError('Unknown plan for subscription', 400);

  const t = await sequelize.transaction();
  try {
    await company.increment('token_balance', { by: plan.tokens, transaction: t });
    await TokenTransaction.create(
      { company_id: company.id, amount: plan.tokens, type: 'purchase', stripe_payment_id: invoice.payment_intent },
      { transaction: t }
    );
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/* ── Créer ou mettre à jour un abonnement ────────────────── */
const createOrUpdateSubscription = async (company, planId) => {
  const plan = PLANS[planId];
  if (!plan) throw httpError('Invalid plan', 400);

  // Créer le customer Stripe si inexistant
  let customerId = company.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name,
      metadata: { company_id: company.id },
    });
    customerId = customer.id;
    await company.update({ stripe_customer_id: customerId });
  }

  // Annuler l'abonnement existant si différent
  if (company.stripe_subscription_id) {
    const existing = await stripe.subscriptions.retrieve(company.stripe_subscription_id);
    if (existing.status !== 'canceled') {
      await stripe.subscriptions.cancel(company.stripe_subscription_id);
    }
  }

  // Créer le nouvel abonnement
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: `PRIM'O ${planId.charAt(0).toUpperCase() + planId.slice(1)}` },
        unit_amount: plan.priceEuros * 100,
        recurring: { interval: 'month' },
      },
    }],
    payment_behavior: 'default_incomplete',
    payment_settings: { payment_method_types: ['card'], save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: { company_id: company.id, plan: planId },
  });

  const nextBilling = new Date(subscription.current_period_end * 1000);

  await company.update({
    stripe_subscription_id: subscription.id,
    subscription_plan: planId,
    subscription_status: subscription.status,
    subscription_next_billing: nextBilling,
  });

  return {
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    subscriptionId: subscription.id,
  };
};

/* ── Récupérer l'abonnement actuel ───────────────────────── */
const getSubscription = async (company) => {
  if (!company.stripe_subscription_id) return null;
  try {
    const sub = await stripe.subscriptions.retrieve(company.stripe_subscription_id);
    await company.update({
      subscription_status: sub.status,
      subscription_next_billing: new Date(sub.current_period_end * 1000),
    });
    return {
      plan: company.subscription_plan,
      status: sub.status,
      next_billing: new Date(sub.current_period_end * 1000),
    };
  } catch {
    return null;
  }
};

module.exports = { handleWebhook, createOrUpdateSubscription, getSubscription };
