const { Model, DataTypes } = require('sequelize');

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
      // 3. Company Email Address (Required)
      email: {
        type: DataTypes.STRING,
        allowNull: false,
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
      // 5. SIRET Number (Optional, but must be exactly 14 characters if provided)
      siret: {
        type: DataTypes.STRING(14), // Limits the database column to 14 characters maximum
        allowNull: true,
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
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return Company;
};

module.exports = { Company, initCompany };
