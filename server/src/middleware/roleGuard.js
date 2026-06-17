const roleGuard = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', code: 403 });
    }
    next();
  };
};

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
