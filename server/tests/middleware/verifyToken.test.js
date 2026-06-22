/**
 * tests/middleware/verifyToken.test.js — Unit tests for the verifyToken middleware.
 *
 * Tests cover:
 * - Valid Bearer token: calls next() and attaches decoded payload to req.user
 * - Missing Authorization header: returns 401 with error message
 * - Malformed token (not valid JWT): returns 401
 * - Expired token: returns 401
 */
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../../src/middleware/verifyToken');

process.env.JWT_SECRET = 'test_secret';

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('verifyToken middleware', () => {
  it('calls next() with valid token', () => {
    const token = jwt.sign({ id: 1, role: 'employee' }, 'test_secret', { algorithm: 'HS256' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 1, role: 'employee' });
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access token required', code: 401 });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is malformed', () => {
    const req = { headers: { authorization: 'Bearer not.a.token' } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token', code: 401 });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with "Token expired" when token is expired', () => {
    const token = jwt.sign({ id: 1 }, 'test_secret', { algorithm: 'HS256', expiresIn: -1 });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired', code: 401 });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is signed with wrong secret', () => {
    const token = jwt.sign({ id: 1 }, 'wrong_secret', { algorithm: 'HS256' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token', code: 401 });
    expect(next).not.toHaveBeenCalled();
  });
});
