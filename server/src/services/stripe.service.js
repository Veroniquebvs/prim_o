/**
 * stripe.service.js — Integration with the Stripe payments API.
 *
 * Manages two concerns: subscription lifecycle and webhook processing.
 *
 * Subscription flow:
 *   1. The employer picks a plan (starter / growth / scale).
 *   2. createOrUpdateSubscription creates a Stripe Customer if needed, cancels any existing
 *      subscription, then creates a new monthly subscription and returns its PaymentIntent
 *      client_secret so the frontend can render the card form via Stripe.js.
 *   3. On successful payment, Stripe sends an invoice.payment_succeeded event to the webhook.
 *   4. handleWebhook verifies the Stripe signature (to prevent spoofed events), finds the
 *      company by stripe_subscription_id, credits the plan's token amount atomically, and
 *      records a TokenTransaction for auditability.
 *
 * getSubscription syncs the live Stripe subscription status back into the Company record
 * so the UI always reflects the current billing state.
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sequelize = require('../config/database');
const { Company, TokenTransaction } = require('../models');

/**
 * Available subscription plans. Each plan maps a Stripe plan ID to the number of tokens
 * credited per billing cycle and the monthly price in euros.
 */
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

/**
 * Processes an inbound Stripe webhook event. Verifies the signature using
 * STRIPE_WEBHOOK_SECRET to guard against spoofed requests. Only processes
 * 'invoice.payment_succeeded' events tied to subscriptions. On a valid payment,
 * finds the company by stripe_subscription_id, credits its token balance, and
 * records a 'purchase' TokenTransaction — all in a single atomic DB transaction.
 * Throws 400 if the signature is invalid, 404 if no company matches the subscription.
 */
const handleWebhook = async (req) => {
  console.log('--- RECEIVED STRIPE WEBHOOK ---');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log(`Webhook Event Type: ${event.type}`);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    throw httpError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  const targetEvents = ['invoice.payment_succeeded', 'invoice.paid', 'invoice_payment.paid'];
  if (!targetEvents.includes(event.type)) {
    console.log(`Skipping event type: ${event.type}`);
    return;
  }

  let invoice = event.data.object;
  
  // Si on reçoit un objet 'invoice_payment' (spécifique à l'API 2026.dahlia de Stripe CLI),
  // on récupère la facture complète via l'API.
  if (invoice.object === 'invoice_payment' && invoice.invoice) {
    console.log(`Received invoice_payment object. Retrieving full invoice ${invoice.invoice}...`);
    try {
      invoice = await stripe.invoices.retrieve(invoice.invoice);
      console.log(`Retrieved invoice keys: ${Object.keys(invoice).join(', ')}`);
    } catch (err) {
      console.error(`Failed to retrieve invoice ${invoice.invoice}:`, err);
      throw httpError(`Failed to retrieve invoice: ${err.message}`, 500);
    }
  }

  console.log(`Invoice keys: ${Object.keys(invoice).join(', ')}`);
  console.log(`Invoice parent field: ${JSON.stringify(invoice.parent)}`);

  let subscriptionId = typeof invoice.subscription === 'object' && invoice.subscription
    ? invoice.subscription.id
    : invoice.subscription;

  // Support pour la nouvelle API Stripe (2025+) où 'subscription' est déplacé sous 'parent'
  if (!subscriptionId && invoice.parent) {
    if (invoice.parent.type === 'subscription_details') {
      subscriptionId = invoice.parent.subscription_details && invoice.parent.subscription_details.subscription;
    } else if (typeof invoice.parent.subscription === 'string') {
      subscriptionId = invoice.parent.subscription;
    } else if (invoice.parent.subscription && typeof invoice.parent.subscription === 'object') {
      subscriptionId = invoice.parent.subscription.id;
    }
  }

  console.log(`Subscription ID from invoice: ${subscriptionId}`);
  if (!subscriptionId) {
    console.log('No subscription ID found in invoice, exiting.');
    return;
  }

  const company = await Company.findOne({ where: { stripe_subscription_id: subscriptionId } });
  if (!company) {
    console.error(`Company not found in DB for subscription: ${subscriptionId}`);
    throw httpError('Company not found for subscription', 404);
  }
  console.log(`Company found: ${company.name} (ID: ${company.id})`);

  const plan = PLANS[company.subscription_plan];
  if (!plan) {
    console.error(`Unknown plan ${company.subscription_plan} for company ${company.name}`);
    throw httpError('Unknown plan for subscription', 400);
  }
  console.log(`Plan found: ${company.subscription_plan} (${plan.tokens} tokens)`);

  const paymentIntentId = (event.data.object.object === 'invoice_payment' && event.data.object.payment && event.data.object.payment.payment_intent)
    || invoice.payment_intent 
    || invoice.id;

  console.log(`Payment / Invoice ID used for idempotence: ${paymentIntentId}`);

  if (!paymentIntentId) {
    console.error('Could not determine a unique payment or invoice ID, exiting.');
    return;
  }

  // Idempotence — if this payment/invoice was already processed, ignore the Stripe retry
  const existingTx = await TokenTransaction.findOne({
    where: { stripe_payment_id: paymentIntentId, type: 'purchase' },
  });
  if (existingTx) {
    console.log(`Payment intent ${paymentIntentId} already processed, skipping.`);
    return;
  }

  console.log(`Incrementing balance for company ${company.name} by ${plan.tokens} tokens...`);
  const t = await sequelize.transaction();
  try {
    await company.increment('token_balance', { by: plan.tokens, transaction: t });
    await TokenTransaction.create(
      { company_id: company.id, amount: plan.tokens, type: 'purchase', stripe_payment_id: paymentIntentId },
      { transaction: t }
    );
    await t.commit();
    console.log(`SUCCESS: Credited ${plan.tokens} tokens to ${company.name}!`);
  } catch (err) {
    await t.rollback();
    console.error('Failed to credit tokens:', err);
    throw err;
  }
};

/**
 * Creates a new Stripe subscription for the company, replacing any existing one.
 * company is the Company model instance for the authenticated employer.
 * planId must be one of 'starter', 'growth', or 'scale'; throws 400 otherwise.
 * Creates a Stripe Customer for the company on first call. Cancels any currently active
 * subscription before creating the new one to avoid billing both at once.
 * Returns the PaymentIntent client_secret needed by the frontend to render the payment form,
 * plus the new subscription ID. Also updates the company record with the new Stripe IDs and
 * billing date.
 */
const createOrUpdateSubscription = async (company, planId) => {
  const plan = PLANS[planId];
  if (!plan) throw httpError('Invalid plan', 400);

  // Créer le customer Stripe si inexistant ou invalide pour le compte actuel
  let customerId = company.stripe_customer_id;
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId);
    } catch {
      // Si le customer n'existe pas sur ce compte Stripe (changement de clé), on force la recréation
      customerId = null;
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name,
      metadata: { company_id: company.id },
    });
    customerId = customer.id;
    await company.update({ stripe_customer_id: customerId, stripe_subscription_id: null });
  }

  // Annuler l'abonnement existant si différent
  if (company.stripe_subscription_id) {
    try {
      const existing = await stripe.subscriptions.retrieve(company.stripe_subscription_id);
      if (existing.status !== 'canceled') {
        await stripe.subscriptions.cancel(company.stripe_subscription_id);
      }
    } catch (err) {
      // Ignorer si l'abonnement n'existe pas sur ce compte Stripe
      console.warn(`Could not retrieve/cancel existing subscription: ${err.message}`);
    }
  }

  // Créer le produit sur Stripe
  const product = await stripe.products.create({
    name: `PRIM'O ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
  });

  // Créer le nouvel abonnement
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{
      price_data: {
        currency: 'eur',
        product: product.id,
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

/**
 * Retrieves the current subscription status from Stripe and syncs it back to the company record.
 * company is the Company model instance. Returns null if the company has no subscription.
 * On success, refreshes subscription_status and subscription_next_billing in the database
 * and returns an object with plan, status, and next_billing fields.
 * Silently returns null if the Stripe API call fails (e.g. subscription was deleted in Stripe).
 */
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
