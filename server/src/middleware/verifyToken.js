/**
 * verifyToken.js — Middleware that authenticates every protected API request.
 *
 * Reads the JWT from the Authorization header (Bearer scheme), verifies it against
 * JWT_SECRET using HS256, and attaches the decoded payload to req.user so downstream
 * handlers know who is making the request (id, role, company_id). Returns 401 if the
 * token is missing, expired, or invalid.
 */
const jwt = require('jsonwebtoken');

/**
 * Express middleware that validates the Bearer JWT in the Authorization header.
 * Attaches the decoded token payload to req.user on success and calls next().
 * Responds with 401 if the token is absent, malformed, or expired.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7);

  if (!token) {
    return res.status(401).json({ error: 'Access token required', code: 401 });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 401 });
    }
    return res.status(401).json({ error: 'Invalid token', code: 401 });
  }
};

module.exports = { verifyToken };
