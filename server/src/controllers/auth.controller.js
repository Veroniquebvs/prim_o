/**
 * auth.controller.js — HTTP handlers for authentication routes.
 *
 * Thin layer between the Express router and AuthService. Each handler extracts the relevant
 * data from the request, delegates to the service, and formats the response. All errors are
 * forwarded to the centralised error handler via next(err).
 */
const authService = require('../services/auth.service');

/** Registers a new user account. Responds 201 with the created user and both tokens. */
const register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Authenticates by email and password. Responds 200 with the user profile and both tokens. */
const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Logs out the authenticated user. Stateless — simply confirms success so the client discards tokens. */
const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

/** Returns the full profile of the currently authenticated user (identified from the JWT). */
const me = async (req, res, next) => {
  try {
    const data = await authService.getProfile(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** Issues a new access token given a valid refresh token supplied in req.body.refreshToken. */
const refresh = async (req, res, next) => {
  try {
    const data = await authService.refreshToken(req.body.refreshToken);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, me, refresh };
