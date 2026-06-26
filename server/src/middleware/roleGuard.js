/**
 * roleGuard.js — Role-based access control middleware.
 *
 * Provides two guards:
 *   - roleGuard(...roles): allows any request whose JWT role is in the provided list.
 *   - requireManager: additionally checks that the authenticated manager has an active
 *     (non-dissolved) team, and attaches that team to req.managerTeam for use in handlers.
 *
 * Both guards rely on verifyToken having already run and populated req.user.
 */

/**
 * Returns an Express middleware that restricts access to users whose role matches
 * at least one of the provided role strings. Responds with 403 if the role does not match.
 * roles is a rest parameter accepting one or more role strings (e.g. 'employer', 'admin').
 */
const roleGuard = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', code: 403 });
    }
    next();
  };
};

/**
 * Express middleware that verifies the authenticated user is a manager with at least one
 * active (non-dissolved) team. Attaches the found team to req.managerTeam. Responds with
 * 403 if the user is not a manager or has no active team.
 */
// Verifies the authenticated user is a manager with an active team (dissolved_at IS NULL).
const requireManager = async (req, res, next) => {
  if (!req.user || req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Forbidden', code: 403 });
  }
  try {
    const { Team } = require('../models');
    const team = await Team.findOne({
      where: { manager_id: req.user.id, dissolved_at: null },
    });
    if (!team) {
      return res.status(403).json({ error: 'No active team found', code: 403 });
    }
    req.managerTeam = team;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { roleGuard, requireManager };
