/**
 * auth.service.js — Business logic for authentication and session management.
 *
 * Handles user registration, login, profile retrieval, and JWT refresh. Password hashing
 * uses bcrypt with 12 rounds. Access tokens (short-lived, 7 days by default) and refresh
 * tokens (long-lived, 30 days by default) are both signed with HS256. Logout is stateless
 * in the MVP — the client is responsible for discarding both tokens since there is no
 * server-side token revocation list.
 *
 * The safeUser helper strips the password_hash from every user object before it leaves the
 * service layer, ensuring the hash is never exposed in API responses.
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const BCRYPT_ROUNDS = 12;

/**
 * Creates a plain Error object with an HTTP status code attached.
 * message is the human-readable error description.
 * status is the HTTP status code (e.g. 401, 403, 404, 409).
 * Returns an Error instance with err.status set, ready for next(err) in a controller.
 */
const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * Signs a short-lived JWT access token for the given user.
 * The token payload includes the user's id, role, and company_id.
 * Expiry is controlled by the JWT_EXPIRES_IN environment variable (default 7d).
 */
const createAccessToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, company_id: user.company_id ?? null },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

/**
 * Signs a long-lived JWT refresh token for the given user.
 * The payload contains only the user's id. Clients send this token to /auth/refresh
 * to obtain a new access token without re-entering their password.
 * Expiry is controlled by the JWT_REFRESH_EXPIRES_IN environment variable (default 30d).
 */
const createRefreshToken = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

/**
 * Extracts only the safe, non-sensitive fields from a User instance.
 * Returns an object without password_hash, so this can be sent directly in API responses.
 */
const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  first_name: user.first_name,
  email: user.email,
  role: user.role,
  token_balance: user.token_balance,
  company_id: user.company_id ?? null,
});

/**
 * Registers a new user account. Throws 409 if the email is already taken.
 * name is the user's last name, first_name their given name, email must be unique,
 * password is hashed before storage (never stored in plain text), role must be
 * 'employer', 'employee', or 'admin', and company_id optionally links the user to a company.
 * Returns the safe user profile plus a freshly issued access token and refresh token.
 */
const register = async ({ name, first_name, email, password, role, company_id }) => {
  const { User } = require('../models');
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw httpError('Email already in use', 409);
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.create({
    name,
    first_name,
    email,
    password_hash,
    role,
    token_balance: 0,
    ...(company_id ? { company_id } : {}),
  });

  return {
    user: safeUser(user),
    accessToken: createAccessToken(user),
    refreshToken: createRefreshToken(user),
  };
};

/**
 * Authenticates a user by email and password. Throws 401 with the generic message
 * 'Invalid credentials' for both wrong-email and wrong-password cases to avoid
 * leaking which field was incorrect. Returns the safe user profile plus both tokens.
 */
const login = async ({ email, password }) => {
  const { User, Company, Team } = require('../models');
  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    include: [{ model: Company, as: 'company' }],
  });
  if (!user) {
    throw httpError('Invalid credentials', 401);
  }
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw httpError('Invalid credentials', 401);
  }

  const { password_hash: _, ...safeUser } = user.toJSON();

  if (safeUser.role === 'manager') {
    const team = await Team.findOne({ where: { manager_id: user.id, dissolved_at: null } });
    safeUser.team_token_balance = team ? team.token_balance : 0;
  }

  return {
    user: safeUser,
    accessToken: createAccessToken(user),
    refreshToken: createRefreshToken(user),
  };
};

// Stateless logout — no refresh_tokens table in MVP schema.
// Client is responsible for discarding tokens.
const logout = async (_userId) => {};

/**
 * Fetches the full profile of the currently authenticated user, excluding the password hash.
 * userId is the authenticated user's id from the JWT payload.
 * Throws 404 if no user with that id exists (should not happen in practice for valid tokens).
 */
const getProfile = async (userId) => {
  const { User, Team } = require('../models');
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password_hash'] },
  });
  if (!user) {
    throw httpError('User not found', 404);
  }
  const userData = user.toJSON();
  if (userData.role === 'manager') {
    const team = await Team.findOne({ where: { manager_id: user.id, dissolved_at: null } });
    userData.team_token_balance = team ? team.token_balance : 0;
  }
  return userData;
};

/**
 * Issues a new access token using a valid refresh token.
 * token is the refresh JWT string sent by the client.
 * Throws 400 if no token was provided, 401 if the token is invalid or expired,
 * and 404 if the user referenced by the token no longer exists.
 * Returns an object containing only the new accessToken string.
 */
const refreshToken = async (token) => {
  const { User } = require('../models');
  if (!token) {
    throw httpError('Refresh token required', 400);
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    const msg =
      err.name === 'TokenExpiredError' ? 'Refresh token expired' : 'Invalid refresh token';
    throw httpError(msg, 401);
  }

  const user = await User.findByPk(payload.id);
  if (!user) {
    throw httpError('User not found', 404);
  }

  return { accessToken: createAccessToken(user) };
};

module.exports = { register, login, logout, getProfile, refreshToken };
