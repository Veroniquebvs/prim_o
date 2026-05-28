const { roleGuard } = require('../../src/middleware/roleGuard');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('roleGuard middleware', () => {
  describe('single role', () => {
    it('calls next() when user has the required role (employer)', () => {
      const req = { user: { id: 1, role: 'employer' } };
      const res = mockRes();
      const next = jest.fn();

      roleGuard('employer')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('calls next() when user has the required role (employee)', () => {
      const req = { user: { id: 2, role: 'employee' } };
      const res = mockRes();
      const next = jest.fn();

      roleGuard('employee')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('calls next() when user has the required role (admin)', () => {
      const req = { user: { id: 3, role: 'admin' } };
      const res = mockRes();
      const next = jest.fn();

      roleGuard('admin')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user role does not match', () => {
      const req = { user: { id: 2, role: 'employee' } };
      const res = mockRes();
      const next = jest.fn();

      roleGuard('employer')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden', code: 403 });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when employee tries to access admin route', () => {
      const req = { user: { id: 2, role: 'employee' } };
      const res = mockRes();
      const next = jest.fn();

      roleGuard('admin')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden', code: 403 });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when employer tries to access employee-only route', () => {
      const req = { user: { id: 1, role: 'employer' } };
      const res = mockRes();
      const next = jest.fn();

      roleGuard('employee')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden', code: 403 });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('multiple roles', () => {
    it('calls next() when user role is in the allowed list', () => {
      const req = { user: { id: 1, role: 'employer' } };
      const res = mockRes();
      const next = jest.fn();

      roleGuard('admin', 'employer')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('calls next() for admin when multiple roles are allowed', () => {
      const req = { user: { id: 3, role: 'admin' } };
      const res = mockRes();
      const next = jest.fn();

      roleGuard('admin', 'employer')(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user role is not in the allowed list', () => {
      const req = { user: { id: 2, role: 'employee' } };
      const res = mockRes();
      const next = jest.fn();

      roleGuard('admin', 'employer')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden', code: 403 });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('missing authentication', () => {
    it('returns 403 when req.user is undefined (verifyToken not called)', () => {
      const req = {};
      const res = mockRes();
      const next = jest.fn();

      roleGuard('employer')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden', code: 403 });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when req.user has no role property', () => {
      const req = { user: { id: 1 } };
      const res = mockRes();
      const next = jest.fn();

      roleGuard('employer')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden', code: 403 });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
