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
jest.mock('../../src/config/database', () => ({
  authenticate: jest.fn().mockResolvedValue(undefined),
  sync: jest.fn().mockResolvedValue(undefined),
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
  password_hash: bcrypt.hashSync('password123', 10),
  toJSON() {
    const { toJSON, ...plain } = this;
    return plain;
  },
};

jest.mock('../../src/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Team: {
    findOne: jest.fn(),
  },
  Company: {},
}));

const { User } = require('../../src/models');
const app = require('../../server');

beforeEach(() => jest.clearAllMocks());

describe('Auth Integration Routes', () => {
  describe('POST /api/auth/register', () => {
    it('successfully registers a new user', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(fakeUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Doe',
          first_name: 'John',
          email: 'john@example.com',
          password: 'password123',
          role: 'employee',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe('john@example.com');
      expect(res.body.data.user).not.toHaveProperty('password_hash');
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'john@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 409 when email is already in use', async () => {
      User.findOne.mockResolvedValue(fakeUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Doe',
          first_name: 'John',
          email: 'john@example.com',
          password: 'password123',
          role: 'employee',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already in use');
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
