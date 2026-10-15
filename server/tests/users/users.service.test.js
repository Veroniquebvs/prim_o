/**
 * tests/users/users.service.test.js — Unit tests for UsersService.
 *
 * Mocks the User and TokenTransaction models. Tests cover:
 * - list: returns all users matching the provided filter options
 * - getById: returns the user or throws 404 if not found
 * - update: applies only whitelisted fields; strips password_hash from the response
 * - remove: calls user.destroy(); returns 404 if user not found/out of scope, 403 if an
 *   employer targets another employer/admin
 * - history: returns the user's token transaction history
 */
jest.mock('../../src/models', () => {
  const User = { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn() };
  User.scope = jest.fn(() => User);
  return { User, TokenTransaction: { findAll: jest.fn() } };
});

const { User, TokenTransaction } = require('../../src/models');
const { list, getById, update, remove, history, changePassword } = require('../../src/services/users.service');

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
    User.findOne.mockResolvedValue(fakeUser);
    const result = await getById('user-uuid');
    expect(result).toBe(fakeUser);
    const call = User.findOne.mock.calls[0];
    expect(call[0].attributes.exclude).toContain('password_hash');
  });

  it('throws 404 when user does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(getById('ghost-uuid')).rejects.toMatchObject({ status: 404 });
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('update', () => {
  it('updates allowed fields and strips password_hash from response', async () => {
    const user = { ...fakeUser, save: jest.fn().mockResolvedValue(undefined), toJSON: fakeUser.toJSON };
    User.findOne.mockResolvedValue(user);

    const result = await update('user-uuid', { name: 'Smith', first_name: 'Jane' });

    expect(user.name).toBe('Smith');
    expect(user.first_name).toBe('Jane');
    expect(user.save).toHaveBeenCalled();
    expect(result).not.toHaveProperty('password_hash');
  });

  it('ignores sensitive fields (role, token_balance, company_id, password_hash)', async () => {
    const user = { ...fakeUser, save: jest.fn().mockResolvedValue(undefined), toJSON: fakeUser.toJSON };
    User.findOne.mockResolvedValue(user);

    await update('user-uuid', { role: 'admin', token_balance: 9999, password_hash: 'evil' });

    expect(user.role).toBe('employee');
    expect(user.token_balance).toBe(10);
    expect(user.password_hash).toBe('hashed');
  });

  it('throws 404 when user does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(update('ghost-uuid', { name: 'X' })).rejects.toMatchObject({ status: 404 });
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('allows an admin to destroy any user', async () => {
    const user = { ...fakeUser, destroy: jest.fn().mockResolvedValue(undefined) };
    User.findByPk.mockResolvedValue(user);

    await remove('user-uuid', { role: 'admin', company_id: null });

    expect(user.destroy).toHaveBeenCalled();
  });

  it('throws 404 when the admin target does not exist', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(remove('ghost-uuid', { role: 'admin', company_id: null })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('allows an employer to destroy an employee in their own company', async () => {
    const user = { ...fakeUser, destroy: jest.fn().mockResolvedValue(undefined) };
    User.findOne.mockResolvedValue(user);

    await remove('user-uuid', { role: 'employer', company_id: 'co-uuid' });

    expect(User.findOne).toHaveBeenCalledWith({
      where: { id: 'user-uuid', company_id: 'co-uuid' },
    });
    expect(user.destroy).toHaveBeenCalled();
  });

  it('throws 404 when the target is not in the employer company', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(
      remove('ghost-uuid', { role: 'employer', company_id: 'co-uuid' })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('throws 403 when an employer targets another employer', async () => {
    const user = { ...fakeUser, role: 'employer', destroy: jest.fn() };
    User.findOne.mockResolvedValue(user);

    await expect(
      remove('user-uuid', { role: 'employer', company_id: 'co-uuid' })
    ).rejects.toMatchObject({ status: 403 });
    expect(user.destroy).not.toHaveBeenCalled();
  });

  it('throws 403 when an employer targets an admin', async () => {
    const user = { ...fakeUser, role: 'admin', destroy: jest.fn() };
    User.findOne.mockResolvedValue(user);

    await expect(
      remove('user-uuid', { role: 'employer', company_id: 'co-uuid' })
    ).rejects.toMatchObject({ status: 403 });
    expect(user.destroy).not.toHaveBeenCalled();
  });
});

// ─── history ──────────────────────────────────────────────────────────────────

describe('history', () => {
  it('returns transactions where user is sender or receiver', async () => {
    const { Op } = require('sequelize');
    User.findOne.mockResolvedValue({ id: 'user-uuid' });
    TokenTransaction.findAll.mockResolvedValue([{ id: 'tx-1' }]);

    const result = await history('user-uuid');

    const call = TokenTransaction.findAll.mock.calls[0][0];
    expect(call.where[Op.or]).toEqual(
      expect.arrayContaining([{ sender_id: 'user-uuid' }, { receiver_id: 'user-uuid' }])
    );
    expect(result).toHaveLength(1);
  });

  it('throws 404 when user does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(history('ghost-uuid')).rejects.toMatchObject({ status: 404 });
    expect(TokenTransaction.findAll).not.toHaveBeenCalled();
  });

  it('throws 404 for a user of another company (company scoping)', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(history('user-uuid', 'company-b')).rejects.toMatchObject({ status: 404 });
    expect(User.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-uuid', company_id: 'company-b' } })
    );
    expect(TokenTransaction.findAll).not.toHaveBeenCalled();
  });
});

// ─── changePassword ───────────────────────────────────────────────────────────

describe('changePassword', () => {
  const bcrypt = require('bcrypt');

  it('loads the hash through the withPassword scope and stores a new bcrypt hash', async () => {
    const user = { password_hash: bcrypt.hashSync('old-password', 4), save: jest.fn() };
    User.findByPk.mockResolvedValue(user);

    await changePassword('user-uuid', { current_password: 'old-password', password: 'new-password' });

    expect(User.scope).toHaveBeenCalledWith('withPassword');
    expect(await bcrypt.compare('new-password', user.password_hash)).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });

  it('throws 401 when the current password is wrong', async () => {
    User.findByPk.mockResolvedValue({ password_hash: bcrypt.hashSync('old-password', 4), save: jest.fn() });

    await expect(changePassword('user-uuid', { current_password: 'nope', password: 'new-password' }))
      .rejects.toMatchObject({ status: 401 });
  });
});
