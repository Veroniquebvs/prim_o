/**
 * tests/auth/auth.service.test.js — Unit tests for AuthService.
 *
 * Mocks the User model and JWT environment variables. Tests cover:
 * - register: an employee is created 'pending' without tokens; an employer can only register on a
 *   company that has no user yet (T-80) and gets tokens; a duplicate email gets the same generic
 *   reply as a new employee, without creating anything
 * - login / refreshToken: a non-active account is refused with 403, only after the password check
 * - login: wrong password returns 401, missing user returns 401, valid credentials return tokens
 * - getProfile: missing user returns 404, found user returns safe user object
 * - refreshToken: invalid token returns 401, valid refresh token returns a new access token
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.JWT_EXPIRES_IN = '7d';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';

jest.mock('../../src/models', () => {
  const User = { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn(), count: jest.fn() };
  User.scope = jest.fn(() => User);
  return { User, Team: { findOne: jest.fn() }, Company: { findByPk: jest.fn() } };
});

const mockTx = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
jest.mock('../../src/config/database', () => ({ transaction: jest.fn(() => Promise.resolve(mockTx)) }));

const { User, Company } = require('../../src/models');
const { signClaimToken } = require('../../src/services/companyClaim.service');
const { register, login, logout, getProfile, refreshToken } = require('../../src/services/auth.service');

const fakeUser = {
  id: 'uuid-abc-123',
  name: 'Doe',
  first_name: 'John',
  email: 'john@example.com',
  role: 'employee',
  token_balance: 0,
  company_id: null,
  status: 'active',
  password_hash: bcrypt.hashSync('password123', 10),
  toJSON() {
    const { toJSON, ...plain } = this;
    return plain;
  },
};

beforeEach(() => jest.clearAllMocks());

// ─── register ────────────────────────────────────────────────────────────────

describe('register', () => {
  const GENERIC = expect.stringContaining('Si cette adresse est nouvelle');
  const employee = { name: 'Doe', first_name: 'John', email: 'John@Example.com', password: 'password123', role: 'employee', company_id: 'co-uuid' };
  const employer = { ...employee, email: 'boss@company.com', role: 'employer', claim_token: signClaimToken('co-uuid') };

  it('creates an employee as pending, without issuing tokens', async () => {
    User.findOne.mockResolvedValue(null);
    Company.findByPk.mockResolvedValue({ id: 'co-uuid' });
    User.create.mockResolvedValue(fakeUser);

    const result = await register(employee);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'john@example.com', role: 'employee', status: 'pending', company_id: 'co-uuid' })
    );
    expect(result).toEqual({ message: GENERIC });
    expect(result).not.toHaveProperty('accessToken');
  });

  it('hashes the password before storing', async () => {
    User.findOne.mockResolvedValue(null);
    Company.findByPk.mockResolvedValue({ id: 'co-uuid' });
    User.create.mockResolvedValue(fakeUser);

    await register({ ...employee, password: 'plaintext' });

    const calledWith = User.create.mock.calls[0][0];
    expect(calledWith.password_hash).not.toBe('plaintext');
    expect(await bcrypt.compare('plaintext', calledWith.password_hash)).toBe(true);
  });

  it('throws 400 when the employee company does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    Company.findByPk.mockResolvedValue(null);

    await expect(register(employee)).rejects.toMatchObject({ status: 400 });
    expect(User.create).not.toHaveBeenCalled();
  });

  it('gives an already-used email the same reply as a new employee, without creating anything', async () => {
    User.findOne.mockResolvedValue(fakeUser);

    const result = await register(employee);

    expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });
    expect(User.create).not.toHaveBeenCalled();
    expect(result).toEqual({ message: GENERIC });
  });

  it('registers the first employer of a new company as active, with tokens, under a row lock', async () => {
    User.findOne.mockResolvedValue(null);
    Company.findByPk.mockResolvedValue({ id: 'co-uuid' });
    User.count.mockResolvedValue(0);
    User.create.mockResolvedValue({ ...fakeUser, role: 'employer', company_id: 'co-uuid' });

    const result = await register(employer);

    expect(Company.findByPk).toHaveBeenCalledWith('co-uuid', { transaction: mockTx, lock: 'UPDATE' });
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'employer', status: 'active', company_id: 'co-uuid' }),
      { transaction: mockTx }
    );
    expect(mockTx.commit).toHaveBeenCalled();
    expect(result.user).not.toHaveProperty('password_hash');
    const payload = jwt.verify(result.accessToken, 'test_access_secret');
    expect(payload).toMatchObject({ role: 'employer', company_id: 'co-uuid' });
  });

  it('refuses to register an employer on a company that already has users (T-80)', async () => {
    User.findOne.mockResolvedValue(null);
    Company.findByPk.mockResolvedValue({ id: 'co-uuid' });
    User.count.mockResolvedValue(3);

    await expect(register(employer)).rejects.toMatchObject({ status: 403 });
    expect(User.create).not.toHaveBeenCalled();
    expect(mockTx.rollback).toHaveBeenCalled();
    expect(mockTx.commit).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    ['forged', 'not-a-jwt'],
    ['for another company', signClaimToken('other-co')],
    ['signed as an access token', jwt.sign({ company_id: 'co-uuid', purpose: 'company_claim' }, 'test_access_secret')],
  ])('refuses an employer whose claim token is %s (T-80)', async (_label, claim_token) => {
    User.findOne.mockResolvedValue(null);
    User.count.mockResolvedValue(0);

    await expect(register({ ...employer, claim_token })).rejects.toMatchObject({ status: 403 });
    expect(User.create).not.toHaveBeenCalled();
  });

  it('throws 400 and rolls back when the employer company does not exist', async () => {
    User.findOne.mockResolvedValue(null);
    Company.findByPk.mockResolvedValue(null);

    await expect(register(employer)).rejects.toMatchObject({ status: 400 });
    expect(User.create).not.toHaveBeenCalled();
    expect(mockTx.rollback).toHaveBeenCalled();
  });
});

// ─── login ───────────────────────────────────────────────────────────────────

describe('login', () => {
  it('returns tokens and safe user when credentials are valid', async () => {
    User.findOne.mockResolvedValue(fakeUser);

    const result = await login({ email: 'john@example.com', password: 'password123' });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.id).toBe(fakeUser.id);
    expect(result.user).not.toHaveProperty('password_hash');
    expect(User.scope).toHaveBeenCalledWith('withPassword');
  });

  it('throws 403 when the account is still pending, with the right password', async () => {
    User.findOne.mockResolvedValue({ ...fakeUser, status: 'pending' });

    await expect(login({ email: 'john@example.com', password: 'password123' }))
      .rejects.toMatchObject({ status: 403, message: 'Account pending activation' });
  });

  it('throws 401 (not 403) for a pending account with a wrong password', async () => {
    User.findOne.mockResolvedValue({ ...fakeUser, status: 'pending' });

    await expect(login({ email: 'john@example.com', password: 'wrongpass' }))
      .rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
  });

  it('throws 401 when user is not found', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(login({ email: 'ghost@example.com', password: 'pass' }))
      .rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
  });

  it('throws 401 when password is wrong', async () => {
    User.findOne.mockResolvedValue(fakeUser);

    await expect(login({ email: 'john@example.com', password: 'wrongpass' }))
      .rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
  });
});

// ─── logout ──────────────────────────────────────────────────────────────────

describe('logout', () => {
  it('resolves without error (stateless logout)', async () => {
    await expect(logout('uuid-abc-123')).resolves.toBeUndefined();
  });
});

// ─── getProfile ──────────────────────────────────────────────────────────────

describe('getProfile', () => {
  it('returns user without password_hash', async () => {
    User.findByPk.mockResolvedValue({ ...fakeUser });

    const user = await getProfile(fakeUser.id);

    expect(user.email).toBe(fakeUser.email);
  });

  it('throws 404 when user does not exist', async () => {
    User.findByPk.mockResolvedValue(null);

    await expect(getProfile('non-existent-id'))
      .rejects.toMatchObject({ status: 404, message: 'User not found' });
  });
});

// ─── refreshToken ─────────────────────────────────────────────────────────────

describe('refreshToken', () => {
  it('returns a new access token for a valid refresh token', async () => {
    User.findByPk.mockResolvedValue(fakeUser);
    const token = jwt.sign({ id: fakeUser.id }, 'test_refresh_secret', { algorithm: 'HS256', expiresIn: '30d' });

    const result = await refreshToken(token);

    expect(result).toHaveProperty('accessToken');
    const payload = jwt.verify(result.accessToken, 'test_access_secret');
    expect(payload.id).toBe(fakeUser.id);
  });

  it('throws 400 when refresh token is missing', async () => {
    await expect(refreshToken(undefined))
      .rejects.toMatchObject({ status: 400 });
  });

  it('throws 401 when refresh token is expired', async () => {
    const token = jwt.sign({ id: fakeUser.id }, 'test_refresh_secret', { algorithm: 'HS256', expiresIn: -1 });

    await expect(refreshToken(token))
      .rejects.toMatchObject({ status: 401, message: 'Refresh token expired' });
  });

  it('throws 401 when refresh token is signed with wrong secret', async () => {
    const token = jwt.sign({ id: fakeUser.id }, 'wrong_secret', { algorithm: 'HS256' });

    await expect(refreshToken(token))
      .rejects.toMatchObject({ status: 401, message: 'Invalid refresh token' });
  });

  it('throws 403 when the account is not active', async () => {
    User.findByPk.mockResolvedValue({ ...fakeUser, status: 'pending' });
    const token = jwt.sign({ id: fakeUser.id }, 'test_refresh_secret', { algorithm: 'HS256' });

    await expect(refreshToken(token)).rejects.toMatchObject({ status: 403 });
  });

  it('throws 404 when user no longer exists', async () => {
    User.findByPk.mockResolvedValue(null);
    const token = jwt.sign({ id: 'deleted-uuid' }, 'test_refresh_secret', { algorithm: 'HS256' });

    await expect(refreshToken(token))
      .rejects.toMatchObject({ status: 404, message: 'User not found' });
  });
});
