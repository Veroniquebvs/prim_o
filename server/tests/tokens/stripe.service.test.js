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
const mockCompany = { token_balance: 0, increment: jest.fn().mockResolvedValue(undefined) };
jest.mock('../../src/models', () => ({
  Company: { findByPk: jest.fn() },
  TokenTransaction: { create: jest.fn() },
}));

const { Company, TokenTransaction } = require('../../src/models');
const { handleWebhook } = require('../../src/services/stripe.service');

const makeReq = (overrides = {}) => ({
  headers: { 'stripe-signature': 'sig_test' },
  body: Buffer.from('raw_body'),
  ...overrides,
});

const makeEvent = (type, metadata = { company_id: 'co-uuid', token_amount: '50' }) => ({
  type,
  data: { object: { id: 'pi_test', metadata } },
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
  it('does nothing for non-payment_intent.succeeded events', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('payment_intent.created'));

    await expect(handleWebhook(makeReq())).resolves.toBeUndefined();
    expect(Company.findByPk).not.toHaveBeenCalled();
  });
});

// ─── payment_intent.succeeded ─────────────────────────────────────────────────

describe('handleWebhook — payment_intent.succeeded', () => {
  beforeEach(() => {
    mockConstructEvent.mockReturnValue(makeEvent('payment_intent.succeeded'));
    Company.findByPk.mockResolvedValue(mockCompany);
    TokenTransaction.create.mockResolvedValue({});
  });

  it('credits company token_balance and records a purchase transaction', async () => {
    await handleWebhook(makeReq());

    expect(mockCompany.increment).toHaveBeenCalledWith('token_balance', { by: 50, transaction: mockTx });
    expect(TokenTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: 'co-uuid', amount: 50, type: 'purchase', stripe_payment_id: 'pi_test' }),
      { transaction: mockTx }
    );
    expect(mockTx.commit).toHaveBeenCalled();
    expect(mockTx.rollback).not.toHaveBeenCalled();
  });

  it('throws 400 when metadata is missing company_id', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('payment_intent.succeeded', { token_amount: '50' }));

    await expect(handleWebhook(makeReq())).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when metadata is missing token_amount', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('payment_intent.succeeded', { company_id: 'co-uuid' }));

    await expect(handleWebhook(makeReq())).rejects.toMatchObject({ status: 400 });
  });

  it('throws 400 when token_amount is not a valid number', async () => {
    mockConstructEvent.mockReturnValue(makeEvent('payment_intent.succeeded', { company_id: 'co-uuid', token_amount: 'abc' }));

    await expect(handleWebhook(makeReq())).rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 and rolls back when company does not exist', async () => {
    Company.findByPk.mockResolvedValue(null);

    await expect(handleWebhook(makeReq())).rejects.toMatchObject({ status: 404 });
    expect(mockTx.rollback).toHaveBeenCalled();
    expect(mockTx.commit).not.toHaveBeenCalled();
  });

  it('rolls back on unexpected DB error', async () => {
    mockCompany.increment.mockRejectedValueOnce(new Error('DB down'));

    await expect(handleWebhook(makeReq())).rejects.toThrow('DB down');
    expect(mockTx.rollback).toHaveBeenCalled();
  });
});
