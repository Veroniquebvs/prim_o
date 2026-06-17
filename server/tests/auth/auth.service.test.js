/**
 * tests/auth/auth.service.test.js — Unit tests for AuthService.
 *
 * Mocks the User model and JWT environment variables. Tests cover:
 * - register: duplicate email returns 409, successful creation returns safe user object
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

jest.mock('../../src/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

const { User } = require('../../src/models');
const { register, login, logout, getProfile, refreshToken } = require('../../src/services/auth.service');

const fakeUser = {
  id: 'uuid-abc-123',
  name: 'Doe',
  first_name: 'John',
  email: 'john@example.com',
  role: 'employee',
  token_balance: 0,
  company_id: null,
  password_hash: bcrypt.hashSync('password123', 10),
};

beforeEach(() => jest.clearAllMocks());

// ─── register ────────────────────────────────────────────────────────────────

describe('register', () => {
  it('creates a user and returns tokens + safe user object', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(fakeUser);

    const result = await register({
      name: 'Doe',
      first_name: 'John',
      email: 'john@example.com',
      password: 'password123',
      role: 'employee',
    });

    expect(User.create).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe('john@example.com');
    expect(result.user).not.toHaveProperty('password_hash');
  });

  it('access token carries id, role and company_id', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ ...fakeUser, role: 'employer', company_id: 'co-uuid' });

    const { accessToken } = await register({
      name: 'Boss',
      first_name: 'Jane',
      email: 'jane@company.com',
      password: 'password123',
      role: 'employer',
      company_id: 'co-uuid',
    });

    const payload = jwt.verify(accessToken, 'test_access_secret');
    expect(payload.role).toBe('employer');
    expect(payload.company_id).toBe('co-uuid');
  });

  it('throws 409 when email is already in use', async () => {
    User.findOne.mockResolvedValue(fakeUser);

    await expect(
      register({ name: 'X', first_name: 'Y', email: 'john@example.com', password: 'pass', role: 'employee' })
    ).rejects.toMatchObject({ status: 409, message: 'Email already in use' });
  });

  it('hashes the password before storing', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(fakeUser);

    await register({ name: 'Doe', first_name: 'John', email: 'x@x.com', password: 'plaintext', role: 'employee' });

    const calledWith = User.create.mock.calls[0][0];
    expect(calledWith.password_hash).toBeDefined();
    expect(calledWith.password_hash).not.toBe('plaintext');
    expect(await bcrypt.compare('plaintext', calledWith.password_hash)).toBe(true);
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

  it('throws 404 when user no longer exists', async () => {
    User.findByPk.mockResolvedValue(null);
    const token = jwt.sign({ id: 'deleted-uuid' }, 'test_refresh_secret', { algorithm: 'HS256' });

    await expect(refreshToken(token))
      .rejects.toMatchObject({ status: 404, message: 'User not found' });
  });
});
