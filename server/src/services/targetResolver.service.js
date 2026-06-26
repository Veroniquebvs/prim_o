const { Op } = require('sequelize');
const { User, Team, TeamMember } = require('../models');

async function resolveTargets({ company_id, target_type, receiver_id, target_team_id, excluded_user_ids = [] }) {
  const excluded = Array.isArray(excluded_user_ids) ? excluded_user_ids : [];
  let targets = [];

  if (target_type === 'user' && receiver_id) {
    const receiver = await User.findByPk(receiver_id);
    if (receiver && receiver.company_id === company_id && receiver.status === 'active' && !excluded.includes(receiver.id)) {
      targets = [receiver];
    }
  } else if (target_type === 'all_company') {
    targets = await User.findAll({
      where: {
        company_id,
        status: 'active',
        ...(excluded.length > 0 ? { id: { [Op.notIn]: excluded } } : {}),
      },
    });
  } else if (target_type === 'all_employees') {
    targets = await User.findAll({
      where: {
        company_id,
        role: 'employee',
        status: 'active',
        ...(excluded.length > 0 ? { id: { [Op.notIn]: excluded } } : {}),
      },
    });
  } else if (target_type === 'all_managers') {
    targets = await User.findAll({
      where: {
        company_id,
        role: 'manager',
        status: 'active',
        ...(excluded.length > 0 ? { id: { [Op.notIn]: excluded } } : {}),
      },
    });
  } else if (['team', 'team_and_manager'].includes(target_type) && target_team_id) {
    const team = await Team.findByPk(target_team_id, {
      include: [{ model: TeamMember, as: 'members', include: [{ model: User, as: 'user' }] }]
    });
    if (team && team.company_id === company_id) {
      team.members.forEach(m => {
        if (m.user && m.user.status === 'active' && !excluded.includes(m.user.id)) {
          targets.push(m.user);
        }
      });
      if (target_type === 'team_and_manager' && team.manager_id && !excluded.includes(team.manager_id)) {
        const manager = await User.findByPk(team.manager_id);
        if (manager && manager.status === 'active') {
          targets.push(manager);
        }
      }
    }
  } else if (!target_type) {
    // Fallback for old records
    if (receiver_id) {
      const receiver = await User.findByPk(receiver_id);
      if (receiver && receiver.company_id === company_id && receiver.status === 'active' && !excluded.includes(receiver.id)) {
        targets = [receiver];
      }
    } else {
      targets = await User.findAll({
        where: {
          company_id,
          role: 'employee',
          status: 'active',
          ...(excluded.length > 0 ? { id: { [Op.notIn]: excluded } } : {}),
        },
      });
    }
  }

  return targets;
}

module.exports = { resolveTargets };
