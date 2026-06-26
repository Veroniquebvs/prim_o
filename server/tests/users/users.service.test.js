/**
 * tests/users/users.service.test.js — Unit tests for UsersService.
 *
 * Mocks the User and TokenTransaction models. Tests cover:
 * - list: returns all users matching the provided filter options
 * - getById: returns the user or throws 404 if not found
 * - update: applies only whitelisted fields; strips password_hash from the response
 * - remove: calls user.destroy(); returns 404 if user not found
 * - history: returns the user's token transaction history
 */
jest.mock('../../src/models', () => ({
  User: { findAll: jest.fn(), findByPk: jest.fn() },
  TokenTransaction: { findAll: jest.fn() },
}));

const { User, TokenTransaction } = require('../../src/models');
const { list, getById, update, remove, history } = require('../../src/services/users.service');

const fakeUser = {
  id: 'user-uuid',
  name: 'Doe',
  first_name: 'John',
  email: 'john@example.com',
  role: 'employee',
  token_balance: 10,
  company_id: 'co-uuid',
  password_hash: 'hashed',
  save: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  toJSON: jest.fn().mockReturnValue({
    id: 'user-uuid', name: 'Doe', first_name: 'John', email: 'john@example.com',
    role: 'employee', token_balance: 10, company_id: 'co-uuid', password_hash: 'hashed',
  }),
};

beforeEach(() => jest.clearAllMocks());

// ─── list ─────────────────────────────────────────────────────────────────────

describe('list', () => {
  it('returns all users when no filters', async () => {
    User.findAll.mockResolvedValue([fakeUser]);
    const result = await list({});
    expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    expect(result).toHaveLength(1);
  });

  it('filters by role', async () => {
    User.findAll.mockResolvedValue([]);
    await list({ role: 'employer' });
    expect(User.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'employer' } })
    );
  });

  it('filters by companyId', async () => {
    User.findAll.mockResolvedValue([]);
    await list({ companyId: 'co-uuid' });
    expect(User.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { company_id: 'co-uuid' } })
    );
  });

  it('combines role and companyId filters', async () => {
    User.findAll.mockResolvedValue([]);
    await list({ role: 'employee', companyId: 'co-uuid' });
    expect(User.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'employee', company_id: 'co-uuid' } })
    );
  });

  it('excludes password_hash from attributes', async () => {
    User.findAll.mockResolvedValue([]);
    await list({});
    const call = User.findAll.mock.calls[0][0];
    expect(call.attributes.exclude).toContain('password_hash');
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('getById', () => {
  it('returns the user without password_hash', async () => {
    User.findByPk.mockResolvedValue(fakeUser);
    const result = await getById('user-uuid');
    expect(result).toBe(fakeUser);
    const call = User.findByPk.mock.calls[0];
    expect(call[1].attributes.exclude).toContain('password_hash');
  });

  it('throws 404 when user does not exist', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(getById('ghost-uuid')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('update', () => {
  it('updates allowed fields and strips password_hash from response', async () => {
    const user = { ...fakeUser, save: jest.fn().mockResolvedValue(undefined), toJSON: fakeUser.toJSON };
    User.findByPk.mockResolvedValue(user);

    const result = await update('user-uuid', { name: 'Smith', first_name: 'Jane' });

    expect(user.name).toBe('Smith');
    expect(user.first_name).toBe('Jane');
    expect(user.save).toHaveBeenCalled();
    expect(result).not.toHaveProperty('password_hash');
  });

  it('ignores sensitive fields (role, token_balance, company_id, password_hash)', async () => {
    const user = { ...fakeUser, save: jest.fn().mockResolvedValue(undefined), toJSON: fakeUser.toJSON };
    User.findByPk.mockResolvedValue(user);

    await update('user-uuid', { role: 'admin', token_balance: 9999, password_hash: 'evil' });

    expect(user.role).toBe('employee');
    expect(user.token_balance).toBe(10);
    expect(user.password_hash).toBe('hashed');
  });

  it('throws 404 when user does not exist', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(update('ghost-uuid', { name: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('destroys the user', async () => {
    const user = { ...fakeUser, destroy: jest.fn().mockResolvedValue(undefined) };
    User.findByPk.mockResolvedValue(user);

    await remove('user-uuid');

    expect(user.destroy).toHaveBeenCalled();
  });

  it('throws 404 when user does not exist', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(remove('ghost-uuid')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── history ──────────────────────────────────────────────────────────────────

describe('history', () => {
  it('returns transactions where user is sender or receiver', async () => {
    const { Op } = require('sequelize');
    User.findByPk.mockResolvedValue({ id: 'user-uuid' });
    TokenTransaction.findAll.mockResolvedValue([{ id: 'tx-1' }]);

    const result = await history('user-uuid');

    const call = TokenTransaction.findAll.mock.calls[0][0];
    expect(call.where[Op.or]).toEqual(
      expect.arrayContaining([{ sender_id: 'user-uuid' }, { receiver_id: 'user-uuid' }])
    );
    expect(result).toHaveLength(1);
  });

  it('throws 404 when user does not exist', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(history('ghost-uuid')).rejects.toMatchObject({ status: 404 });
  });
});
