/**
 * models/Team.js — Sequelize model for the teams table.
 *
 * Represents a group of employees managed by a single manager within a company. A team is
 * created automatically when an employer promotes an employee to the manager role. When a
 * manager is demoted back to employee, the team's dissolved_at timestamp is set and all
 * TeamMember records have their left_at timestamp set, effectively archiving the team without
 * deleting historical data. A manager can only have one active (non-dissolved) team at a time.
 */
const { Model, DataTypes } = require('sequelize');

/**
 * Team model class. The initTeam function must be called with the Sequelize instance before
 * the model can be used for database queries.
 */
class Team extends Model {}

const initTeam = (sequelize) => {
  Team.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      dissolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      token_balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      retribution_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Team',
      tableName: 'teams',
      timestamps: true,
      underscored: true,
    }
  );
  return Team;
};

module.exports = { Team, initTeam };
