process.env.JWT_SECRET = 'test_secret';

// ─── Mock sequelize transaction ───────────────────────────────────────────────
const mockTx = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../../src/config/database', () => ({
  transaction: jest.fn().mockResolvedValue(mockTx),
  LOCK: { UPDATE: 'UPDATE' },
}));

// ─── Mock models ──────────────────────────────────────────────────────────────
const mockCompany = { token_balance: 100, decrement: jest.fn().mockResolvedValue(undefined) };
const mockReceiver = { token_balance: 0, increment: jest.fn().mockResolvedValue(undefined) };
const mockTxRecord = { id: 'tx-uuid', amount: 20, type: 'allocation' };

jest.mock('../../src/models', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Company: { findOne: jest.fn(), findByPk: jest.fn() },
  TokenTransaction: { create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() },
}));

const { User, Company, TokenTransaction } = require('../../src/models');
const { allocate, getBalance, listTransactions, getTransaction } = require('../../src/services/token.service');

const sender = { id: 'sender-uuid', role: 'employer', company_id: 'company-uuid' };

beforeEach(() => jest.clearAllMocks());

// ─── allocate ─────────────────────────────────────────────────────────────────

describe('allocate', () => {
  beforeEach(() => {
    Company.findOne.mockResolvedValue(mockCompany);
    User.findOne.mockResolvedValue(mockReceiver);
    TokenTransaction.create.mockResolvedValue(mockTxRecord);
  });

  it('deducts from company, credits employee, records transaction, commits', async () => {
    const result = await allocate(sender, { receiver_id: 'receiver-uuid', amount: 20 });

    expect(mockCompany.decrement).toHaveBeenCalledWith('token_balance', { by: 20, transaction: mockTx });
    expect(mockReceiver.increment).toHaveBeenCalledWith('token_balance', { by: 20, transaction: mockTx });
    expect(TokenTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ sender_id: sender.id, receiver_id: 'receiver-uuid', amount: 20, type: 'allocation' }),
      { transaction: mockTx }
    );
    expect(mockTx.commit).toHaveBeenCalled();
    expect(mockTx.rollback).not.toHaveBeenCalled();
    expect(result).toBe(mockTxRecord);
  });

  it('uses provided reason as type', async () => {
    await allocate(sender, { receiver_id: 'r-uuid', amount: 5, reason: 'performance' });
    expect(TokenTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'performance' }),
      expect.anything()
    );
  });

  it('throws 402 and rolls back when company balance is insufficient', async () => {
    Company.findOne.mockResolvedValue({ ...mockCompany, token_balance: 5 });

    await expect(allocate(sender, { receiver_id: 'r-uuid', amount: 20 }))
      .rejects.toMatchObject({ status: 402 });
    expect(mockTx.rollback).toHaveBeenCalled();
    expect(mockTx.commit).not.toHaveBeenCalled();
  });

  it('throws 404 and rolls back when company is not found', async () => {
    Company.findOne.mockResolvedValue(null);

    await expect(allocate(sender, { receiver_id: 'r-uuid', amount: 10 }))
      .rejects.toMatchObject({ status: 404, message: 'Company not found' });
    expect(mockTx.rollback).toHaveBeenCalled();
  });

  it('throws 404 and rolls back when receiver is not in company', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(allocate(sender, { receiver_id: 'unknown-uuid', amount: 10 }))
      .rejects.toMatchObject({ status: 404, message: 'Employee not found in your company' });
    expect(mockTx.rollback).toHaveBeenCalled();
  });

  it('throws 400 for non-positive amount', async () => {
    await expect(allocate(sender, { receiver_id: 'r-uuid', amount: 0 }))
      .rejects.toMatchObject({ status: 400 });
    await expect(allocate(sender, { receiver_id: 'r-uuid', amount: -5 }))
      .rejects.toMatchObject({ status: 400 });
  });
});

// ─── getBalance ───────────────────────────────────────────────────────────────

describe('getBalance', () => {
  it('returns userId and token_balance', async () => {
    User.findByPk.mockResolvedValue({ id: 'u-uuid', token_balance: 42 });

    const result = await getBalance('u-uuid');

    expect(result).toEqual({ userId: 'u-uuid', token_balance: 42 });
  });

  it('throws 404 when user does not exist', async () => {
    User.findByPk.mockResolvedValue(null);

    await expect(getBalance('ghost-uuid')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── listTransactions ─────────────────────────────────────────────────────────

describe('listTransactions', () => {
  it('returns all transactions when no filters are given', async () => {
    TokenTransaction.findAll.mockResolvedValue([mockTxRecord]);

    const result = await listTransactions({});

    expect(TokenTransaction.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    expect(result).toHaveLength(1);
  });

  it('filters by userId using OR on sender_id / receiver_id', async () => {
    const { Op } = require('sequelize');
    TokenTransaction.findAll.mockResolvedValue([]);

    await listTransactions({ userId: 'some-uuid' });

    const call = TokenTransaction.findAll.mock.calls[0][0];
    expect(call.where[Op.or]).toEqual(
      expect.arrayContaining([{ sender_id: 'some-uuid' }, { receiver_id: 'some-uuid' }])
    );
  });

  it('filters by date', async () => {
    TokenTransaction.findAll.mockResolvedValue([]);

    await listTransactions({ date: '2026-05-28' });

    const call = TokenTransaction.findAll.mock.calls[0][0];
    expect(call.where.created_at).toBeDefined();
  });
});

// ─── getTransaction ───────────────────────────────────────────────────────────

describe('getTransaction', () => {
  it('returns the transaction when found', async () => {
    TokenTransaction.findByPk.mockResolvedValue(mockTxRecord);

    const result = await getTransaction('tx-uuid');

    expect(result).toBe(mockTxRecord);
  });

  it('throws 404 when transaction does not exist', async () => {
    TokenTransaction.findByPk.mockResolvedValue(null);

    await expect(getTransaction('nope-uuid')).rejects.toMatchObject({ status: 404 });
  });
});
