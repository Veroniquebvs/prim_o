/**
 * models/TeamMember.js — Sequelize model for the team_members join table.
 *
 * Represents the membership of an employee in a team. An employee can belong to at most one
 * active team at a time (left_at IS NULL). When an employee leaves a team or the team is
 * dissolved, left_at is set to the current timestamp rather than deleting the row, preserving
 * historical membership records. joined_at records the date the employee was added.
 *
 * This model has no surrogate primary key — team_id and user_id together identify the active
 * membership row. Timestamps are disabled because joined_at and left_at serve that purpose.
 */
const { Model, DataTypes } = require('sequelize');

/**
 * TeamMember model class. The initTeamMember function must be called with the Sequelize
 * instance before the model can be used for database queries.
 */
class TeamMember extends Model {}

const initTeamMember = (sequelize) => {
  TeamMember.init(
    {
      joined_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      left_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      modelName: 'TeamMember',
      tableName: 'team_members',
      timestamps: false,
      underscored: true,
    }
  );
  return TeamMember;
};

module.exports = { TeamMember, initTeamMember };
