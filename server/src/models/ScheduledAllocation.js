const { Model, DataTypes } = require('sequelize');

class ScheduledAllocation extends Model {}

const initScheduledAllocation = (sequelize) => {
  ScheduledAllocation.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      label: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // 'monthly' | 'annual'
      frequency: {
        type: DataTypes.ENUM('monthly', 'annual'),
        allowNull: false,
      },
      // Jour du mois (1-28), utilisé pour monthly ET annual
      day_of_month: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Mois (1-12), utilisé uniquement pour annual
      month: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Prochaine exécution calculée
      next_run_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      // UUIDs des employés exclus quand receiver_id est null (tous les employés)
      excluded_user_ids: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ScheduledAllocation',
      tableName: 'scheduled_allocations',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return ScheduledAllocation;
};

module.exports = { ScheduledAllocation, initScheduledAllocation };
