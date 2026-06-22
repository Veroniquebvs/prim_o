/**
 * teamScope.js — Middleware that enforces team membership boundaries for manager routes.
 *
 * Prevents a manager from allocating tokens to or viewing employees who are not part of
 * their own active team. This is a data-scoping guard that sits between roleGuard/requireManager
 * and the controller, ensuring managers can only act on their direct reports.
 */
const { TeamMember, Team } = require('../models');

/**
 * Express middleware that checks whether the employee targeted by the current request
 * (identified by body.employee_id or params.id) is an active member of the authenticated
 * manager's active team. Responds with 403 if the employee is not found in the team or
 * with 400 if no employee identifier was provided in the request. Calls next() on success.
 */
// Verifies that the targeted employee (body.employee_id or params.id)
// is an active member of the authenticated manager's active team.
const requireTeamScope = async (req, res, next) => {
  try {
    const employeeId = req.body.employee_id || req.params.id;
    if (!employeeId) {
      return res.status(400).json({ error: 'employee_id required', code: 400 });
    }

    const membership = await TeamMember.findOne({
      where: { user_id: employeeId, left_at: null },
      include: [
        {
          model: Team,
          as: 'team',
          where: { manager_id: req.user.id, dissolved_at: null },
          required: true,
        },
      ],
    });

    if (!membership) {
      return res.status(403).json({ error: 'Forbidden: employee not in your team', code: 403 });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireTeamScope };
