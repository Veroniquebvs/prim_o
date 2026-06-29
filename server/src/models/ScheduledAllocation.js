/**
 * models/ScheduledAllocation.js — Sequelize model for the scheduled_allocations table.
 *
 * Defines a recurring token allocation rule. The daily cron job (cron.service.js) queries
 * all active rules whose next_run_at timestamp has passed, executes the transfer atomically,
 * and advances next_run_at to the next occurrence.
 *
 * A rule can target either a specific user (receiver_id is set) or all active employees in
 * the company (receiver_id is null). When targeting all employees, excluded_user_ids lists
 * employees who should be skipped for that run.
 *
 * The label field describes the business context: 'employer_to_manager' for budgets pushed
 * from employer to manager, 'manager_to_employee' for the manager distributing to their team.
 *
 * Frequency: 'monthly' (runs on day_of_month each month) | 'annual' (runs on day_of_month
 * of the specified month each year).
 */
const { Model, DataTypes } = require('sequelize');

/**
 * ScheduledAllocation model class. The initScheduledAllocation function must be called with
 * the Sequelize instance before the model can be used for database queries.
 */
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
      target_type: {
        type: DataTypes.ENUM('user', 'all_company', 'all_employees', 'all_managers', 'team', 'team_and_manager'),
        defaultValue: 'all_company',
        allowNull: false,
      },
      target_team_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      target_account: {
        type: DataTypes.ENUM('personal', 'team'),
        defaultValue: 'personal',
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
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
    }
  );
  return ScheduledAllocation;
};

module.exports = { ScheduledAllocation, initScheduledAllocation };
