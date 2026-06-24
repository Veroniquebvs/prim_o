/**
 * models/Company.js — Sequelize model for the companies table.
 *
 * Represents an SME registered on the platform. A company is the top-level organisational
 * unit: it has its own token balance (topped up via Stripe subscriptions) and owns a set of
 * users (employer, manager, employee). Token allocations always debit the company balance first
 * when an employer sends tokens directly, ensuring the company never overspends.
 *
 * The Stripe fields (stripe_customer_id, stripe_subscription_id, subscription_plan,
 * subscription_status, subscription_next_billing) are populated by StripeService when the
 * employer subscribes to a plan. They are nullable because companies may exist before any
 * payment has been made.
 *
 * The feedback_enabled flag controls whether the public feedback feed is visible to employees.
 */
const { Model, DataTypes } = require('sequelize');

/**
 * Company model class. The initCompany function must be called with the Sequelize instance
 * before the model can be used for database queries.
 */
class Company extends Model {
  // Space for future custom methods
}
const initCompany = (sequelize) => {
  Company.init(
    {
      // 1. Unique Identifier (Required, automatically managed)
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      // 2. Company Name (Required)
      name: {
        type: DataTypes.STRING,
        allowNull: false, // SQL NOT NULL equivalent
        validate: {
          notEmpty: true, // Prevents validation of empty strings ""
        },
      },
      // 3. Company Email Address (optional for MVP self-onboarding)
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      // 4 Instead of a single 'address' field, we split it:
      street: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      zip_code: {
        type: DataTypes.STRING(5),
        allowNull: false,
        validate: {
          isNumeric: true,
          len: [5, 5],
        },
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // 5. SIRET Number (Required, must be exactly 14 characters)
      siret: {
        type: DataTypes.STRING(14), // Limits the database column to 14 characters maximum
        allowNull: false,
        validate: {
          isNumeric: true, // Ensures the string contains only numbers
          len: [14, 14], // Forces the length to be exactly 14 characters
        },
      },
      // 6. Token Balance (Required, Integer)
      token_balance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // 7. Feedback feed visibility for employees
      feedback_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      // 8. Stripe subscription fields
      stripe_customer_id: { type: DataTypes.STRING, allowNull: true },
      stripe_subscription_id: { type: DataTypes.STRING, allowNull: true },
      subscription_plan: { type: DataTypes.STRING, allowNull: true },
      subscription_status: { type: DataTypes.STRING, allowNull: true },
      subscription_next_billing: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Company',
      tableName: 'companies',
      timestamps: true,
      underscored: true,
    }
  );
  return Company;
};

module.exports = { Company, initCompany };
