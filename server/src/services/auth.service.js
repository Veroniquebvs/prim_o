const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const BCRYPT_ROUNDS = 12;

const httpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const createAccessToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, company_id: user.company_id ?? null },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const createRefreshToken = (user) =>
  jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  first_name: user.first_name,
  email: user.email,
  role: user.role,
  token_balance: user.token_balance,
  company_id: user.company_id ?? null,
});

const register = async ({ name, first_name, email, password, role, company_id }) => {
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

const login = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw httpError('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw httpError('Invalid credentials', 401);
  }

  return {
    user: safeUser(user),
    accessToken: createAccessToken(user),
    refreshToken: createRefreshToken(user),
  };
};

// Stateless logout — no refresh_tokens table in MVP schema.
// Client is responsible for discarding tokens.
const logout = async (_userId) => {};

const getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password_hash'] },
  });
  if (!user) {
    throw httpError('User not found', 404);
  }
  return user;
};

const refreshToken = async (token) => {
  if (!token) {
    throw httpError('Refresh token required', 400);
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Refresh token expired' : 'Invalid refresh token';
    throw httpError(msg, 401);
  }

  const user = await User.findByPk(payload.id);
  if (!user) {
    throw httpError('User not found', 404);
  }

  return { accessToken: createAccessToken(user) };
};

module.exports = { register, login, logout, getProfile, refreshToken };
