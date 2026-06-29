/**
 * tests/marketplace/marketplace.integration.test.js — Integration tests for marketplace routes.
 *
 * Covers:
 * - GET /api/marketplace/items
 * - GET /api/marketplace/items/:id
 * - POST /api/marketplace/items
 * - PUT /api/marketplace/items/:id
 * - DELETE /api/marketplace/items/:id
 * - POST /api/marketplace/redeem
 * - GET /api/marketplace/orders
 */
process.env.PORT = 0;
process.env.JWT_SECRET = 'test_access_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Valid mock UUIDs to satisfy isUUID() validators
const MOCK_VOUCHER_ID = '123e4567-e89b-41d3-a456-426614174000';
const MOCK_USER_ID = '88888888-8888-4888-8888-888888888888';
const MOCK_COMPANY_ID = '33333333-3333-4333-8333-333333333333';
const MOCK_ADMIN_ID = '66666666-6666-4666-8666-666666666666';
const MOCK_REDEMPTION_ID = '987f6543-e21b-41d3-a456-426614174000';

// Mock Sequelize configuration and connection
const mockTx = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../../src/config/database', () => ({
  authenticate: jest.fn().mockResolvedValue(undefined),
  sync: jest.fn().mockResolvedValue(undefined),
  transaction: jest.fn().mockResolvedValue(mockTx),
  fn: jest.fn(),
  col: jest.fn(),
}));

// Mock Sequelize models
const mockVoucher = {
  id: MOCK_VOUCHER_ID,
  title: 'Fnac 20€',
  partner: 'Fnac',
  token_cost: 20,
  available: true,
  promo_code: 'TESTPROMO123',
  update: jest.fn().mockResolvedValue(undefined),
  save: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  toJSON() {
    const { toJSON, update, save, destroy, ...plain } = this;
    return plain;
  }
};
const mockUser = {
  id: MOCK_USER_ID,
  token_balance: 50,
  decrement: jest.fn().mockResolvedValue(undefined),
};
const mockRedemption = { id: MOCK_REDEMPTION_ID, promo_code: 'TESTPROMO123', user_id: MOCK_USER_ID, voucher_id: MOCK_VOUCHER_ID };

jest.mock('../../src/models', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Voucher: { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  Redemption: { findAll: jest.fn(), create: jest.fn() },
  Company: { findOne: jest.fn(), findByPk: jest.fn() },
  Favorite: { findAll: jest.fn() },
  Team: { findOne: jest.fn(), findByPk: jest.fn() },
  TeamMember: { findAll: jest.fn() },
}));

const { User, Voucher, Redemption, Company, Favorite } = require('../../src/models');
const app = require('../../server');

beforeEach(() => jest.clearAllMocks());

describe('Marketplace Integration Routes', () => {
  const employeeToken = jwt.sign({ id: MOCK_USER_ID, role: 'employee', company_id: MOCK_COMPANY_ID }, 'test_access_secret');
  const adminToken = jwt.sign({ id: MOCK_ADMIN_ID, role: 'admin' }, 'test_access_secret');

  describe('GET /api/marketplace/items', () => {
    it('returns only available vouchers', async () => {
      Voucher.findAll.mockResolvedValue([mockVoucher]);
      Favorite.findAll.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/marketplace/items')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Fnac 20€');
      expect(res.body.data[0]).not.toHaveProperty('promo_code');
    });
  });

  describe('GET /api/marketplace/items/:id', () => {
    it('returns a single voucher by id', async () => {
      Voucher.findByPk.mockResolvedValue(mockVoucher);

      const res = await request(app)
        .get(`/api/marketplace/items/${MOCK_VOUCHER_ID}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Fnac 20€');
      expect(res.body.data).not.toHaveProperty('promo_code');
    });

    it('returns 404 when voucher does not exist', async () => {
      Voucher.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/marketplace/items/${MOCK_VOUCHER_ID}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/marketplace/items', () => {
    it('successfully creates a voucher as admin', async () => {
      Voucher.create.mockResolvedValue(mockVoucher);

      const res = await request(app)
        .post('/api/marketplace/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Fnac 20€',
          partner: 'Fnac',
          promo_code: 'TESTPROMO123',
          token_cost: 20,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Fnac 20€');
    });

    it('returns 403 when creating as employee', async () => {
      const res = await request(app)
        .post('/api/marketplace/items')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Fnac 20€',
          partner: 'Fnac',
          promo_code: 'TESTPROMO123',
          token_cost: 20,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/marketplace/redeem', () => {
    it('successfully redeems a voucher', async () => {
      Voucher.findOne.mockResolvedValue(mockVoucher);
      User.findOne.mockResolvedValue(mockUser);
      Redemption.create.mockResolvedValue(mockRedemption);

      const res = await request(app)
        .post('/api/marketplace/redeem')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          voucher_id: MOCK_VOUCHER_ID,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.promo_code).toBe('TESTPROMO123');
    });

    it('returns 403 when voucher is unavailable', async () => {
      Voucher.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/marketplace/redeem')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          voucher_id: MOCK_VOUCHER_ID,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/marketplace/orders', () => {
    it('lists own redemption history', async () => {
      Redemption.findAll.mockResolvedValue([mockRedemption]);

      const res = await request(app)
        .get('/api/marketplace/orders')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Marketplace Administrative Security', () => {
    const employerToken = jwt.sign({ id: 'employer-uuid', role: 'employer', company_id: MOCK_COMPANY_ID }, 'test_access_secret');

    it('returns 403 when creating a voucher as employer', async () => {
      const res = await request(app)
        .post('/api/marketplace/items')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Fnac 20€',
          partner: 'Fnac',
          promo_code: 'TESTPROMO123',
          token_cost: 20,
        });

      expect(res.status).toBe(403);
    });

    it('returns 403 when updating a voucher as employer', async () => {
      const res = await request(app)
        .put(`/api/marketplace/items/${MOCK_VOUCHER_ID}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(403);
    });

    it('returns 403 when updating a voucher as employee', async () => {
      const res = await request(app)
        .put(`/api/marketplace/items/${MOCK_VOUCHER_ID}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(403);
    });

    it('returns 403 when deleting a voucher as employer', async () => {
      const res = await request(app)
        .delete(`/api/marketplace/items/${MOCK_VOUCHER_ID}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 when deleting a voucher as employee', async () => {
      const res = await request(app)
        .delete(`/api/marketplace/items/${MOCK_VOUCHER_ID}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 when listing all vouchers (admin catalog) as employer', async () => {
      const res = await request(app)
        .get('/api/marketplace/admin/vouchers')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 when listing all vouchers (admin catalog) as employee', async () => {
      const res = await request(app)
        .get('/api/marketplace/admin/vouchers')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 when viewing global redemption history as employer', async () => {
      const res = await request(app)
        .get('/api/marketplace/admin/history')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 403 when viewing global redemption history as employee', async () => {
      const res = await request(app)
        .get('/api/marketplace/admin/history')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });
});
