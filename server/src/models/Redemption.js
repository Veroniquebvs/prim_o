const { Model, DataTypes } = require("sequelize");

class Redemption extends Model {
  // Space for future custom methods
}

Redemption.init(
  {
    // 1. Unique Identifier (Primary Key)
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    // 2. The Partner Promo Code / Voucher Code delivered to the employee (Required)
    promo_code: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
  },
  {
    sequelize: require("../config/database"),
    modelName: "Redemption",
    tableName: "redemptions",
    timestamps: true, // Automatically handles created_at (mapping to your redeemed_at timestamp)
    underscored: true, // Converted to snake_case format (promo_code, created_at)
  },
);

module.exports = Redemption;
