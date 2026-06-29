/**
 * tests/tokens/stripe.service.test.js — Unit tests for StripeService.
 *
 * Mocks the Stripe SDK, the database transaction, and the Company/TokenTransaction models.
 * Tests cover:
 * - handleWebhook: invalid signature throws 400; unknown event type is silently ignored;
 *   invoice.payment_succeeded credits company token_balance and inserts a TokenTransaction
 *   and commits the transaction
 */
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

// ─── Mock stripe ──────────────────────────────────────────────────────────────
const mockConstructEvent = jest.fn();
jest.mock('stripe', () =>
  jest.fn().mockReturnValue({
    webhooks: { constructEvent: mockConstructEvent },
  })
);

// ─── Mock sequelize transaction ───────────────────────────────────────────────
const mockTx = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../../src/config/database', () => ({
  transaction: jest.fn().mockResolvedValue(mockTx),
}));

// ─── Mock models ──────────────────────────────────────────────────────────────
const mockCompany = {
  id: 'co-uuid',
  token_balance: 0,
  subscription_plan: 'starter',
  increment: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../../src/models', () => ({
  Company: { findOne: jest.fn() },
  TokenTransaction: { create: jest.fn() },
}));

const { Company, TokenTransaction } = require('../../src/models');
const { handleWebhook } = require('../../src/services/stripe.service');

const makeReq = (overrides = {}) => ({
  headers: { 'stripe-signature': 'sig_test' },
  body: Buffer.from('raw_body'),
  ...overrides,
});

const makeEvent = (type, invoiceOverrides = {}) => ({
  type,
  data: {
    object: {
      id: 'in_test',
      subscription: 'sub_test',
      payment_intent: 'pi_test',
      ...invoiceOverrides,
    },
  },
});

beforeEach(() => jest.clearAllMocks());

// ─── signature verification ───────────────────────────────────────────────────

describe('handleWebhook — signature', () => {
  it('throws 400 when Stripe signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('No signatures found'); });

    await expect(handleWebhook(makeReq())).rejects.toMatchObject({ status: 400 });
    expect(mockTx.commit).not.toHaveBeenCalled();
  });
});

// ─── unhandled event types ────────────────────────────────────────────────────

describe('handleWebhook — ignored events', () => {
  it('does nothing for non-invoice.payment_succeeded events', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('payment_intent.created'));

    await expect(handleWebhook(makeReq())).resolves.toBeUndefined();
    expect(Company.findOne).not.toHaveBeenCalled();
  });

  it('does nothing if invoice has no subscription ID', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('invoice.payment_succeeded', { subscription: null }));

    await expect(handleWebhook(makeReq())).resolves.toBeUndefined();
    expect(Company.findOne).not.toHaveBeenCalled();
  });
});

// ─── invoice.payment_succeeded ─────────────────────────────────────────────────

describe('handleWebhook — invoice.payment_succeeded', () => {
  beforeEach(() => {
    mockConstructEvent.mockReturnValue(makeEvent('invoice.payment_succeeded'));
    Company.findOne.mockResolvedValue(mockCompany);
    TokenTransaction.create.mockResolvedValue({});
  });

  it('credits company token_balance and records a purchase transaction', async () => {
    await handleWebhook(makeReq());

    expect(Company.findOne).toHaveBeenCalledWith({ where: { stripe_subscription_id: 'sub_test' } });
    expect(mockCompany.increment).toHaveBeenCalledWith('token_balance', { by: 500, transaction: mockTx });
    expect(TokenTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 'co-uuid', amount: 500, type: 'purchase', stripe_payment_id: 'pi_test' }),
      { transaction: mockTx }
    );
    expect(mockTx.commit).toHaveBeenCalled();
    expect(mockTx.rollback).not.toHaveBeenCalled();
  });

  it('throws 404 and rolls back when company does not exist for subscription', async () => {
    Company.findOne.mockResolvedValue(null);

    await expect(handleWebhook(makeReq())).rejects.toMatchObject({ status: 404 });
    expect(mockTx.rollback).not.toHaveBeenCalled();
    expect(mockTx.commit).not.toHaveBeenCalled();
  });

  it('throws 400 when subscription plan is unknown/invalid', async () => {
    Company.findOne.mockResolvedValue({
      id: 'co-uuid',
      subscription_plan: 'invalid-plan',
    });

    await expect(handleWebhook(makeReq())).rejects.toMatchObject({ status: 400 });
  });

  it('rolls back on unexpected DB error', async () => {
    mockCompany.increment.mockRejectedValueOnce(new Error('DB down'));

    await expect(handleWebhook(makeReq())).rejects.toThrow('DB down');
    expect(mockTx.rollback).toHaveBeenCalled();
  });
});
