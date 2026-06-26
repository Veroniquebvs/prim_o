/**
 * models/TokenTransaction.js — Sequelize model for the token_transactions table.
 *
 * Records every token movement in the system. Each row captures the sender (nullable for
 * company-level operations such as Stripe top-ups or admin grants), the receiver (nullable
 * for admin deductions), the company involved, the amount, and a type label that describes
 * the business reason.
 *
 * Common type values:
 *   'allocation'          — employer directly credits an employee
 *   'employer_to_manager' — employer credits a manager's budget
 *   'manager_to_employee' — manager credits an employee from their own budget
 *   'purchase'            — Stripe subscription payment credited to company balance
 *   'admin_grant'         — admin manually tops up a company
 *   'admin_deduct'        — admin manually deducts from a company or employee
 *   'scheduled_allocation'— automated allocation triggered by the cron job
 *
 * stripe_payment_id is only set for 'purchase' type rows.
 */
const { Model, DataTypes } = require('sequelize');

/**
 * TokenTransaction model class. The initTokenTransaction function must be called with the
 * Sequelize instance before the model can be used for database queries.
 */
class TokenTransaction extends Model {
  // Space for future custom methods
}

const initTokenTransaction = (sequelize) => {
  TokenTransaction.init(
    {
      // 1. Unique Identifier (Primary Key)
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      // 2. Amount of tokens transferred (Required)
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // 3. Transaction Type (Restricted to specific internal system values)
      type: {
        type: DataTypes.STRING, // Or DataTypes.ENUM('credit', 'distribution', 'refund') if strictly defined
        allowNull: false,
      },
      // 3.5. Reason for transaction
      reason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // 4. Stripe Reference (Optional - only for external payments made by companies)
      stripe_payment_id: {
        type: DataTypes.STRING,
        allowNull: true, // Optional because internal distributions don't use Stripe
      },
    },
    {
      sequelize,
      modelName: 'TokenTransaction',
      tableName: 'token_transactions',
      timestamps: true, // Automatically handles created_at (timestamp from your image)
      underscored: true, // Matches the snake_case format (stripe_payment_id, created_at)
    }
  );
  return TokenTransaction;
};

module.exports = { TokenTransaction, initTokenTransaction };
