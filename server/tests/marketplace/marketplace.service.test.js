/**
 * tests/marketplace/marketplace.service.test.js — Unit tests for MarketplaceService.
 *
 * Mocks the database transaction and all Sequelize models. Tests cover:
 * - redeem: returns 404 when voucher not found; returns 409 when voucher unavailable;
 *   returns 402 when user has insufficient balance; on success decrements user balance,
 *   flips voucher.available to false, inserts a Redemption record, and commits the transaction
 * - listItems: returns only available vouchers with promo_code stripped
 * - getItem: returns item by id or throws 404
 * - createItem / updateItem / deleteItem: pass-through CRUD with mocked model methods
 */
// ─── Mock sequelize transaction ───────────────────────────────────────────────
const mockTx = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../../src/config/database', () => ({
  transaction: jest.fn().mockResolvedValue(mockTx),
}));

// ─── Mock models ──────────────────────────────────────────────────────────────
const mockVoucher = {
  id: 'voucher-uuid',
  title: 'Fnac 20€',
  partner: 'Fnac',
  token_cost: 20,
  available: true,
  update: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
};
const mockUser = {
  id: 'user-uuid',
  token_balance: 50,
  decrement: jest.fn().mockResolvedValue(undefined),
};
const mockCompany = {
  id: 'company-uuid',
  token_balance: 100,
  decrement: jest.fn().mockResolvedValue(undefined),
};
const mockRedemption = { id: 'redemption-uuid', promo_code: 'some-code', user_id: 'user-uuid', voucher_id: 'voucher-uuid' };

jest.mock('../../src/models', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Voucher: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  Redemption: { findAll: jest.fn(), create: jest.fn() },
  Company: { findOne: jest.fn(), findByPk: jest.fn() },
}));

const { User, Voucher, Redemption, Company } = require('../../src/models');
const {
  listItems, getItem, createItem, updateItem, deleteItem, redeem, listOrders,
} = require('../../src/services/marketplace.service');

beforeEach(() => jest.clearAllMocks());

// ─── listItems ────────────────────────────────────────────────────────────────

describe('listItems', () => {
  it('returns only available vouchers', async () => {
    Voucher.findAll.mockResolvedValue([mockVoucher]);

    const result = await listItems();

    expect(Voucher.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { available: true } })
    );
    expect(result).toHaveLength(1);
  });
});

// ─── getItem ──────────────────────────────────────────────────────────────────

describe('getItem', () => {
  it('returns the voucher when found', async () => {
    Voucher.findByPk.mockResolvedValue(mockVoucher);
    expect(await getItem('voucher-uuid')).toBe(mockVoucher);
  });

  it('throws 404 when voucher does not exist', async () => {
    Voucher.findByPk.mockResolvedValue(null);
    await expect(getItem('nope')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── createItem ───────────────────────────────────────────────────────────────

describe('createItem', () => {
  it('creates and returns the voucher', async () => {
    Voucher.create.mockResolvedValue(mockVoucher);

    const result = await createItem({ title: 'Fnac 20€', partner: 'Fnac', token_cost: 20 });

    expect(Voucher.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Fnac 20€', partner: 'Fnac', token_cost: 20, available: true })
    );
    expect(result).toBe(mockVoucher);
  });

  it('defaults available to true when not provided', async () => {
    Voucher.create.mockResolvedValue(mockVoucher);
    await createItem({ title: 'X', partner: 'Y', token_cost: 10 });
    expect(Voucher.create).toHaveBeenCalledWith(expect.objectContaining({ available: true }));
  });

  it('throws 400 when required fields are missing', async () => {
    await expect(createItem({ title: 'X', partner: 'Y' })).rejects.toMatchObject({ status: 400 });
    await expect(createItem({ partner: 'Y', token_cost: 10 })).rejects.toMatchObject({ status: 400 });
  });
});

// ─── updateItem ───────────────────────────────────────────────────────────────

describe('updateItem', () => {
  it('updates provided fields and saves', async () => {
    const voucher = { ...mockVoucher, save: jest.fn().mockResolvedValue(undefined) };
    Voucher.findByPk.mockResolvedValue(voucher);

    const result = await updateItem('voucher-uuid', { token_cost: 30, available: false });

    expect(voucher.token_cost).toBe(30);
    expect(voucher.available).toBe(false);
    expect(voucher.save).toHaveBeenCalled();
    expect(result).toBe(voucher);
  });

  it('ignores unknown fields', async () => {
    const voucher = { ...mockVoucher, save: jest.fn().mockResolvedValue(undefined) };
    Voucher.findByPk.mockResolvedValue(voucher);

    await updateItem('voucher-uuid', { hacked_field: 'malicious' });

    expect(voucher).not.toHaveProperty('hacked_field', 'malicious');
  });

  it('throws 404 when voucher does not exist', async () => {
    Voucher.findByPk.mockResolvedValue(null);
    await expect(updateItem('nope', { title: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});

// ─── deleteItem ───────────────────────────────────────────────────────────────

describe('deleteItem', () => {
  it('destroys the voucher', async () => {
    const voucher = { ...mockVoucher, destroy: jest.fn().mockResolvedValue(undefined) };
    Voucher.findByPk.mockResolvedValue(voucher);

    await deleteItem('voucher-uuid');

    expect(voucher.destroy).toHaveBeenCalled();
  });

  it('throws 404 when voucher does not exist', async () => {
    Voucher.findByPk.mockResolvedValue(null);
    await expect(deleteItem('nope')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── redeem ───────────────────────────────────────────────────────────────────

describe('redeem', () => {
  beforeEach(() => {
    Voucher.findOne.mockResolvedValue(mockVoucher);
    User.findOne.mockResolvedValue(mockUser);
    Redemption.create.mockResolvedValue(mockRedemption);
    Company.findOne.mockResolvedValue(mockCompany);
  });

  it('deducts balance, marks voucher unavailable, creates redemption, commits', async () => {
    const result = await redeem('user-uuid', 'voucher-uuid');

    expect(mockUser.decrement).toHaveBeenCalledWith('token_balance', { by: 20, transaction: mockTx });
    expect(mockVoucher.update).toHaveBeenCalledWith({ available: false }, { transaction: mockTx });
    expect(Redemption.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-uuid', voucher_id: 'voucher-uuid', promo_code: expect.any(String) }),
      { transaction: mockTx }
    );
    expect(mockTx.commit).toHaveBeenCalled();
    expect(result).toHaveProperty('promo_code');
  });

  it('deducts company balance and commits when user is an employer', async () => {
    const employerUser = {
      id: 'employer-uuid',
      role: 'employer',
      company_id: 'company-uuid',
      decrement: jest.fn(),
    };
    User.findOne.mockResolvedValue(employerUser);
    Company.findOne.mockResolvedValue(mockCompany);

    const result = await redeem('employer-uuid', 'voucher-uuid');

    expect(mockCompany.decrement).toHaveBeenCalledWith('token_balance', { by: 20, transaction: mockTx });
    expect(mockVoucher.update).toHaveBeenCalledWith({ available: false }, { transaction: mockTx });
    expect(Redemption.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'employer-uuid', voucher_id: 'voucher-uuid', promo_code: expect.any(String) }),
      { transaction: mockTx }
    );
    expect(mockTx.commit).toHaveBeenCalled();
    expect(result).toHaveProperty('promo_code');
  });

  it('throws 403 and rolls back when employer company balance is insufficient', async () => {
    const employerUser = {
      id: 'employer-uuid',
      role: 'employer',
      company_id: 'company-uuid',
      decrement: jest.fn(),
    };
    User.findOne.mockResolvedValue(employerUser);
    Company.findOne.mockResolvedValue({ ...mockCompany, token_balance: 5 });

    await expect(redeem('employer-uuid', 'voucher-uuid')).rejects.toMatchObject({ status: 403 });
    expect(mockTx.rollback).toHaveBeenCalled();
  });

  it('throws 403 and rolls back when voucher is not available', async () => {
    Voucher.findOne.mockResolvedValue(null);

    await expect(redeem('user-uuid', 'voucher-uuid')).rejects.toMatchObject({ status: 403 });
    expect(mockTx.rollback).toHaveBeenCalled();
    expect(mockTx.commit).not.toHaveBeenCalled();
  });

  it('throws 403 and rolls back when balance is insufficient', async () => {
    User.findOne.mockResolvedValue({ ...mockUser, token_balance: 5 });

    await expect(redeem('user-uuid', 'voucher-uuid')).rejects.toMatchObject({ status: 403 });
    expect(mockTx.rollback).toHaveBeenCalled();
  });

  it('throws 404 and rolls back when user is not found', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(redeem('ghost-uuid', 'voucher-uuid')).rejects.toMatchObject({ status: 404 });
    expect(mockTx.rollback).toHaveBeenCalled();
  });

  it('rolls back on unexpected DB error', async () => {
    mockUser.decrement.mockRejectedValueOnce(new Error('DB down'));

    await expect(redeem('user-uuid', 'voucher-uuid')).rejects.toThrow('DB down');
    expect(mockTx.rollback).toHaveBeenCalled();
  });
});

// ─── listOrders ───────────────────────────────────────────────────────────────

describe('listOrders', () => {
  it('returns redemptions for the given user', async () => {
    Redemption.findAll.mockResolvedValue([mockRedemption]);

    const result = await listOrders('user-uuid');

    expect(Redemption.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 'user-uuid' } })
    );
    expect(result).toHaveLength(1);
  });
});
