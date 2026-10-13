/**
 * tests/auth/auth.integration.test.js — Integration tests for authentication routes.
 *
 * Tests:
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - GET /api/auth/profile
 * - POST /api/auth/refresh
 */
process.env.PORT = 0; // Use random ephemeral port to avoid EADDRINUSE conflicts
process.env.JWT_SECRET = 'test_access_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Mock Sequelize configuration and connection
const mockTx = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
jest.mock('../../src/config/database', () => ({
  authenticate: jest.fn().mockResolvedValue(undefined),
  sync: jest.fn().mockResolvedValue(undefined),
  transaction: jest.fn(() => Promise.resolve(mockTx)),
}));

// Mock Sequelize models
const fakeUser = {
  id: 'user-uuid',
  name: 'Doe',
  first_name: 'John',
  email: 'john@example.com',
  role: 'employee',
  token_balance: 10,
  company_id: null,
  status: 'active',
  password_hash: bcrypt.hashSync('password123', 10),
  toJSON() {
    const { toJSON, ...plain } = this;
    return plain;
  },
};

jest.mock('../../src/models', () => {
  const User = { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn(), count: jest.fn() };
  User.scope = jest.fn(() => User);
  return { User, Team: { findOne: jest.fn() }, Company: { findByPk: jest.fn() } };
});

const { User, Company } = require('../../src/models');
const { signClaimToken } = require('../../src/services/companyClaim.service');
const COMPANY_ID = '4a3f3b6c-2f88-4663-9977-84a123bc4567';
const app = require('../../server');

beforeEach(() => jest.clearAllMocks());

describe('Auth Integration Routes', () => {
  describe('POST /api/auth/register', () => {
    const employee = { name: 'Doe', first_name: 'John', email: 'john@example.com', password: 'password123', role: 'employee', company_id: COMPANY_ID };

    it('registers an employee as pending: 201 with a message and no tokens', async () => {
      User.findOne.mockResolvedValue(null);
      Company.findByPk.mockResolvedValue({ id: COMPANY_ID });
      User.create.mockResolvedValue(fakeUser);

      const res = await request(app).post('/api/auth/register').send(employee);

      expect(res.status).toBe(201);
      expect(res.body.data).not.toHaveProperty('accessToken');
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    });

    it('answers an already-used email exactly like a new employee', async () => {
      User.findOne.mockResolvedValue(null);
      Company.findByPk.mockResolvedValue({ id: COMPANY_ID });
      User.create.mockResolvedValue(fakeUser);
      const fresh = await request(app).post('/api/auth/register').send(employee);

      User.findOne.mockResolvedValue(fakeUser);
      const taken = await request(app).post('/api/auth/register').send(employee);

      expect(taken.status).toBe(fresh.status);
      expect(taken.body).toEqual(fresh.body);
    });

    it('returns 403 when registering as employer of a company that already has users', async () => {
      User.findOne.mockResolvedValue(null);
      Company.findByPk.mockResolvedValue({ id: COMPANY_ID });
      User.count.mockResolvedValue(2);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...employee, email: 'attacker@evil.com', role: 'employer', claim_token: signClaimToken(COMPANY_ID) });

      expect(res.status).toBe(403);
      expect(res.body).not.toHaveProperty('data');
      expect(User.create).not.toHaveBeenCalled();
    });

    it('returns 403 for an employer without the claim token of the company (QR code id only)', async () => {
      User.findOne.mockResolvedValue(null);
      Company.findByPk.mockResolvedValue({ id: COMPANY_ID });
      User.count.mockResolvedValue(0);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...employee, email: 'attacker@evil.com', role: 'employer' });

      expect(res.status).toBe(403);
      expect(User.create).not.toHaveBeenCalled();
    });

    it('registers the first employer of a new company with tokens', async () => {
      User.findOne.mockResolvedValue(null);
      Company.findByPk.mockResolvedValue({ id: COMPANY_ID });
      User.count.mockResolvedValue(0);
      User.create.mockResolvedValue({ ...fakeUser, role: 'employer', company_id: COMPANY_ID });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...employee, email: 'boss@company.com', role: 'employer', claim_token: signClaimToken(COMPANY_ID) });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user).not.toHaveProperty('password_hash');
    });

    it('returns 400 when company_id is missing', async () => {
      const { company_id: _, ...withoutCompany } = employee;

      const res = await request(app).post('/api/auth/register').send(withoutCompany);

      expect(res.status).toBe(400);
      expect(User.create).not.toHaveBeenCalled();
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'john@example.com' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('successfully logs in with correct credentials', async () => {
      User.findOne.mockResolvedValue(fakeUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.id).toBe(fakeUser.id);
    });

    it('returns 401 with wrong credentials', async () => {
      User.findOne.mockResolvedValue(fakeUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('returns 403 without tokens for a pending account', async () => {
      User.findOne.mockResolvedValue({ ...fakeUser, status: 'pending' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body).not.toHaveProperty('data');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns profile of authenticated user', async () => {
      const { password_hash, ...safeUser } = fakeUser;
      User.findByPk.mockResolvedValue({
        ...safeUser,
        toJSON() {
          const { toJSON, ...plain } = this;
          return plain;
        }
      });
      const token = jwt.sign({ id: fakeUser.id, role: fakeUser.role }, 'test_access_secret');

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(fakeUser.email);
      expect(res.body.data).not.toHaveProperty('password_hash');
    });

    it('returns 401 without authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Access token required');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns a new access token when refresh token is valid', async () => {
      User.findByPk.mockResolvedValue(fakeUser);
      const refreshToken = jwt.sign({ id: fakeUser.id }, 'test_refresh_secret', { expiresIn: '7d' });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('returns 401 when refresh token is expired', async () => {
      const refreshToken = jwt.sign({ id: fakeUser.id }, 'test_refresh_secret', { expiresIn: -10 });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Refresh token expired');
    });
  });
});
