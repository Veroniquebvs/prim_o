/**
 * tests/users/users.integration.test.js — Integration tests for user management routes.
 *
 * Covers security checks:
 * - Role-Based Access Control (RBAC)
 * - Multi-tenant isolation (Cross-company boundaries)
 * - Self-only constraints (Avatar updates)
 */
process.env.PORT = 0;
process.env.JWT_SECRET = 'test_access_secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Valid mock UUIDs
const MOCK_COMPANY_A_ID = '4a3f3b6c-2f88-4663-9977-84a123bc4567';
const MOCK_COMPANY_B_ID = '33333333-3333-4333-8333-333333333333';

const MOCK_EMPLOYEE_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const MOCK_EMPLOYER_ID = 'e1c183a2-2900-4b2a-8742-10f845a75cf7';
const MOCK_MANAGER_ID = '7b76251b-1559-4d6f-bf3a-cd43a9f029bc';

const MOCK_OTHER_EMPLOYEE_ID = 'd8b16f3e-4f80-4b6d-8761-71e9882236b4';
const MOCK_ADMIN_ID = 'c0f993d0-3e28-4ef7-86c2-bfbe78f35ef9';

// Mock Sequelize configuration and connection
jest.mock('../../src/config/database', () => ({
  authenticate: jest.fn().mockResolvedValue(undefined),
  sync: jest.fn().mockResolvedValue(undefined),
}));

// Mock user instances with helper methods
const createMockUserInstance = (data) => ({
  ...data,
  save: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  toJSON() {
    const { toJSON, save, destroy, ...plain } = this;
    return plain;
  },
});

const mockEmployee = createMockUserInstance({
  id: MOCK_EMPLOYEE_ID,
  name: 'Employee A',
  first_name: 'John',
  email: 'employee.a@company-a.com',
  role: 'employee',
  status: 'active',
  token_balance: 50,
  company_id: MOCK_COMPANY_A_ID,
  entry_date: '2026-01-01',
});

const mockOtherEmployee = createMockUserInstance({
  id: MOCK_OTHER_EMPLOYEE_ID,
  name: 'Employee B',
  first_name: 'Alice',
  email: 'employee.b@company-b.com',
  role: 'employee',
  status: 'active',
  token_balance: 10,
  company_id: MOCK_COMPANY_B_ID,
  entry_date: '2026-02-01',
});

jest.mock('../../src/models', () => ({
  User: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  TokenTransaction: {
    findAll: jest.fn(),
  },
}));

const { User, TokenTransaction } = require('../../src/models');
const app = require('../../server');

beforeEach(() => jest.clearAllMocks());

describe('Users Integration Routes - Security & Isolation', () => {
  // Signed JWTs for testing different roles and companies
  const employeeToken = jwt.sign({ id: MOCK_EMPLOYEE_ID, role: 'employee', company_id: MOCK_COMPANY_A_ID }, 'test_access_secret');
  const employerToken = jwt.sign({ id: MOCK_EMPLOYER_ID, role: 'employer', company_id: MOCK_COMPANY_A_ID }, 'test_access_secret');
  const managerToken = jwt.sign({ id: MOCK_MANAGER_ID, role: 'manager', company_id: MOCK_COMPANY_A_ID }, 'test_access_secret');
  const otherEmployerToken = jwt.sign({ id: 'other-employer-id', role: 'employer', company_id: MOCK_COMPANY_B_ID }, 'test_access_secret');
  const adminToken = jwt.sign({ id: MOCK_ADMIN_ID, role: 'admin' }, 'test_access_secret');

  describe('GET /api/users (list)', () => {
    it('allows access to employers', async () => {
      User.findAll.mockResolvedValue([mockEmployee]);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('allows access to admins', async () => {
      User.findAll.mockResolvedValue([mockEmployee]);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('denies access to employees (403)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users/pending (pending list)', () => {
    it('allows access to employers', async () => {
      User.findAll.mockResolvedValue([mockEmployee]);

      const res = await request(app)
        .get('/api/users/pending')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(res.status).toBe(200);
    });

    it('denies access to employees (403)', async () => {
      const res = await request(app)
        .get('/api/users/pending')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users/:id (read user)', () => {
    it('allows same-company employee access', async () => {
      User.findOne.mockResolvedValue(mockEmployee);

      const res = await request(app)
        .get(`/api/users/${MOCK_EMPLOYEE_ID}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(MOCK_EMPLOYEE_ID);
    });

    it('denies cross-company access by returning 404 (multi-tenant boundary)', async () => {
      // Scoping query to employer's company (Company B) returns no user
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/users/${MOCK_EMPLOYEE_ID}`) // Employee A (Company A)
        .set('Authorization', `Bearer ${otherEmployerToken}`); // Employer (Company B)

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });
  });

  describe('PUT /api/users/:id (update user)', () => {
    it('allows same-company update', async () => {
      User.findOne.mockResolvedValue(mockEmployee);

      const res = await request(app)
        .put(`/api/users/${MOCK_EMPLOYEE_ID}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('denies cross-company update by returning 404 (multi-tenant boundary)', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .put(`/api/users/${MOCK_EMPLOYEE_ID}`) // Employee A (Company A)
        .set('Authorization', `Bearer ${otherEmployerToken}`) // Employer (Company B)
        .send({ name: 'Malicious Update' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/users/:id (delete user)', () => {
    it('allows admins to delete a user', async () => {
      User.findByPk.mockResolvedValue(mockEmployee);

      const res = await request(app)
        .delete(`/api/users/${MOCK_EMPLOYEE_ID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockEmployee.destroy).toHaveBeenCalled();
    });

    it('denies employers from deleting a user (403)', async () => {
      const res = await request(app)
        .delete(`/api/users/${MOCK_EMPLOYEE_ID}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(res.status).toBe(403);
    });

    it('denies employees from deleting a user (403)', async () => {
      const res = await request(app)
        .delete(`/api/users/${MOCK_EMPLOYEE_ID}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/users/:id/activate (activate user)', () => {
    it('allows same-company activation by employer', async () => {
      User.findOne.mockResolvedValue(mockEmployee);

      const res = await request(app)
        .patch(`/api/users/${MOCK_EMPLOYEE_ID}/activate`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ entry_date: '2026-06-01' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('denies cross-company activation by returning 404 (multi-tenant boundary)', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/users/${MOCK_EMPLOYEE_ID}`) // Employee A (Company A)
        .set('Authorization', `Bearer ${otherEmployerToken}`) // Employer (Company B)
        .send({ entry_date: '2026-06-01' });

      expect(res.status).toBe(404);
    });

    it('denies employee from activating another employee (403)', async () => {
      const res = await request(app)
        .patch(`/api/users/${MOCK_EMPLOYEE_ID}/activate`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/users/:id/entry-date (update entry date)', () => {
    it('allows same-company managers, employers, and admins to update entry date', async () => {
      User.findOne.mockResolvedValue(mockEmployee);

      const res = await request(app)
        .patch(`/api/users/${MOCK_EMPLOYEE_ID}/entry-date`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ entry_date: '2026-05-01' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('denies employee from updating entry date (403)', async () => {
      const res = await request(app)
        .patch(`/api/users/${MOCK_EMPLOYEE_ID}/entry-date`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ entry_date: '2026-05-01' });

      expect(res.status).toBe(403);
    });

    it('denies cross-company entry date update by returning 404', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/users/${MOCK_EMPLOYEE_ID}/entry-date`)
        .set('Authorization', `Bearer ${otherEmployerToken}`)
        .send({ entry_date: '2026-05-01' });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/users/:id/avatar (update avatar)', () => {
    it('allows a user to update their own avatar', async () => {
      User.findByPk.mockResolvedValue(mockEmployee);

      const res = await request(app)
        .patch(`/api/users/${MOCK_EMPLOYEE_ID}/avatar`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ avatar_index: 3 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('denies a user from updating another user\'s avatar (self-only constraint)', async () => {
      const res = await request(app)
        .patch(`/api/users/${MOCK_OTHER_EMPLOYEE_ID}/avatar`) // Employee B
        .set('Authorization', `Bearer ${employeeToken}`) // Employee A Token
        .send({ avatar_index: 3 });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });
});
