const authService = require('../services/auth.service');

const register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const data = await authService.getProfile(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const data = await authService.refreshToken(req.body.refreshToken);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, me, refresh };
