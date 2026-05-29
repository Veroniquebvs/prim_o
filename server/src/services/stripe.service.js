const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const sequelize = require('../config/database');
const { Company, TokenTransaction } = require('../models');

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const handleWebhook = async (req) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw httpError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  if (event.type !== 'payment_intent.succeeded') return;

  const intent = event.data.object;
  const { company_id, token_amount } = intent.metadata ?? {};

  if (!company_id || !token_amount) {
    throw httpError('Missing PaymentIntent metadata: company_id or token_amount', 400);
  }

  const tokens = parseInt(token_amount, 10);
  if (!Number.isFinite(tokens) || tokens <= 0) {
    throw httpError('Invalid token_amount in metadata', 400);
  }

  const t = await sequelize.transaction();
  try {
    const company = await Company.findByPk(company_id, { lock: true, transaction: t });
    if (!company) throw httpError('Company not found', 404);

    await company.increment('token_balance', { by: tokens, transaction: t });

    await TokenTransaction.create(
      {
        company_id,
        amount: tokens,
        type: 'purchase',
        stripe_payment_id: intent.id,
      },
      { transaction: t }
    );

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

module.exports = { handleWebhook };
