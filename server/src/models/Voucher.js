const { Model, DataTypes } = require("sequelize");

class Voucher extends Model {
  // Space for future custom methods
}

Voucher.init(
  {
    // 1. Unique Identifier (Primary Key)
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    // 2. Title of the voucher (Required, e.g., "Gift Card 20€")
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    // 3. Partner brand name (Required, e.g., "Fnac", "Amazon")
    partner: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    // 4. Cost of the voucher in tokens (Required, Integer)
    token_cost: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0, // A voucher cannot have a negative token cost
      },
    },
    // 5. Availability status (Required, Boolean)
    available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // By default, a new voucher is available
    },
  },
  {
    sequelize: require("../config/database"),
    modelName: "Voucher",
    tableName: "vouchers",
    timestamps: true, // Automatically manages created_at and updated_at
    underscored: true, // Converted to snake_case (token_cost)
  },
);

module.exports = Voucher;
