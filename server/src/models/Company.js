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
      // 5. SIRET Number (Optional, but must be exactly 14 characters if provided)
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
        type: DataTypes.INTEGER, // Set to INTEGER for whole numbers
        allowNull: false,
        defaultValue: 0, // A company starts with 0 tokens by default
      },
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
