const { Model, DataTypes } = require('sequelize');

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
