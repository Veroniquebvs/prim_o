/**
 * tests/tokens/tokens.integration.test.js — Integration tests for token routes.
 *
 * Covers:
 * - POST /api/tokens/allocate
 * - GET /api/tokens/balance/:userId
 * - GET /api/tokens/transactions
 * - POST /api/tokens/admin/deduct
 */
process.env.PORT = 0;
process.env.JWT_SECRET = 'test_access_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Valid mock UUIDs to satisfy isUUID() validators
const MOCK_EMPLOYER_ID = 'e1c183a2-2900-4b2a-8742-10f845a75cf7';
const MOCK_RECEIVER_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const MOCK_COMPANY_ID = '4a3f3b6c-2f88-4663-9977-84a123bc4567';
const MOCK_TX_ID = '7b76251b-1559-4d6f-bf3a-cd43a9f029bc';
const MOCK_EMPLOYEE_ID = 'd8b16f3e-4f80-4b6d-8761-71e9882236b4';
const MOCK_ADMIN_ID = 'c0f993d0-3e28-4ef7-86c2-bfbe78f35ef9';

// Mock Sequelize configuration and connection
const mockTx = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../../src/config/database', () => ({
  authenticate: jest.fn().mockResolvedValue(undefined),
  sync: jest.fn().mockResolvedValue(undefined),
  transaction: jest.fn().mockResolvedValue(mockTx),
  LOCK: { UPDATE: 'UPDATE' },
  fn: jest.fn(),
  col: jest.fn(),
}));

// Mock Sequelize models
const mockCompany = {
  id: MOCK_COMPANY_ID,
  token_balance: 100,
  decrement: jest.fn().mockResolvedValue(undefined),
};
const mockReceiver = {
  id: MOCK_RECEIVER_ID,
  company_id: MOCK_COMPANY_ID,
  status: 'active',
  role: 'employee',
  token_balance: 10,
  increment: jest.fn().mockResolvedValue(undefined),
};
const mockTxRecord = {
  id: MOCK_TX_ID,
  amount: 20,
  type: 'employer_to_employee',
  get: function(options) {
    if (options && options.plain) {
      const { get, ...plain } = this;
      return plain;
    }
    return this;
  }
};

jest.mock('../../src/models', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Company: { findOne: jest.fn(), findByPk: jest.fn() },
  TokenTransaction: { create: jest.fn(), findAll: jest.fn(), findByPk: jest.fn() },
  Team: { findOne: jest.fn(), findByPk: jest.fn() },
  TeamMember: { findAll: jest.fn() },
}));

const { User, Company, TokenTransaction } = require('../../src/models');
const app = require('../../server');

beforeEach(() => jest.clearAllMocks());

describe('Tokens Integration Routes', () => {
  const employerToken = jwt.sign({ id: MOCK_EMPLOYER_ID, role: 'employer', company_id: MOCK_COMPANY_ID }, 'test_access_secret');
  const employeeToken = jwt.sign({ id: MOCK_EMPLOYEE_ID, role: 'employee', company_id: MOCK_COMPANY_ID }, 'test_access_secret');
  const adminToken = jwt.sign({ id: MOCK_ADMIN_ID, role: 'admin' }, 'test_access_secret');

  describe('POST /api/tokens/allocate', () => {
    it('successfully allocates tokens to an employee as an employer', async () => {
      Company.findOne.mockResolvedValue(mockCompany);
      User.findByPk.mockResolvedValue(mockReceiver);
      User.findOne.mockResolvedValue(mockReceiver);
      TokenTransaction.create.mockResolvedValue(mockTxRecord);

      const res = await request(app)
        .post('/api/tokens/allocate')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          receiver_id: MOCK_RECEIVER_ID,
          amount: 20,
          reason: 'Outstanding work',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.total).toBe(20);
      expect(res.body.data.count).toBe(1);
    });

    it('returns 403 when trying to allocate as an employee', async () => {
      const res = await request(app)
        .post('/api/tokens/allocate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          receiver_id: MOCK_RECEIVER_ID,
          amount: 20,
        });

      expect(res.status).toBe(403);
    });

    it('returns 400 when amount is not a positive integer', async () => {
      const res = await request(app)
        .post('/api/tokens/allocate')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          receiver_id: MOCK_RECEIVER_ID,
          amount: -5,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tokens/balance/:userId', () => {
    it('returns token balance of a user', async () => {
      User.findByPk.mockResolvedValue({ id: MOCK_RECEIVER_ID, token_balance: 42 });

      const res = await request(app)
        .get(`/api/tokens/balance/${MOCK_RECEIVER_ID}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token_balance).toBe(42);
    });

    it('returns 400 for invalid UUID format', async () => {
      const res = await request(app)
        .get('/api/tokens/balance/invalid-uuid')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tokens/transactions', () => {
    it('lists transactions with company scoping', async () => {
      TokenTransaction.findAll.mockResolvedValue([mockTxRecord]);

      const res = await request(app)
        .get('/api/tokens/transactions')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].amount).toBe(20);
    });
  });

  describe('POST /api/tokens/admin/deduct', () => {
    it('successfully deducts tokens from a company as an admin', async () => {
      Company.findByPk.mockResolvedValue(mockCompany);
      TokenTransaction.create.mockResolvedValue(mockTxRecord);

      const res = await request(app)
        .post('/api/tokens/admin/deduct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          target: 'company',
          company_id: MOCK_COMPANY_ID,
          amount: 15,
          reason: 'Correction',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 403 when trying to deduct as an employer', async () => {
      const res = await request(app)
        .post('/api/tokens/admin/deduct')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          target: 'company',
          company_id: MOCK_COMPANY_ID,
          amount: 15,
        });

      expect(res.status).toBe(403);
    });

    it('returns 403 when trying to deduct as an employee', async () => {
      const res = await request(app)
        .post('/api/tokens/admin/deduct')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          target: 'company',
          company_id: MOCK_COMPANY_ID,
          amount: 15,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Stripe Subscriptions Security', () => {
    it('returns 403 when trying to subscribe as an employee', async () => {
      const res = await request(app)
        .post('/api/tokens/subscribe')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ planId: 'starter' });

      expect(res.status).toBe(403);
    });

    it('returns 403 when trying to fetch subscription details as an employee', async () => {
      const res = await request(app)
        .get('/api/tokens/subscription')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });
});
