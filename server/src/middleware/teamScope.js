const { TeamMember, Team } = require('../models');

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
