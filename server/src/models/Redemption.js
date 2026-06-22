/**
 * models/Redemption.js — Sequelize model for the redemptions table.
 *
 * Records every instance of an employee (or employer) exchanging tokens for a voucher.
 * The promo_code is copied from the voucher at the time of redemption so the employee retains
 * access to it even if the voucher record is later modified or deleted. The user_id and
 * voucher_id foreign keys link back to the user who redeemed and the voucher that was claimed.
 *
 * A redemption row is always created inside a PostgreSQL transaction together with the
 * token deduction, so a redemption can never exist without the corresponding balance change.
 */
const { Model, DataTypes } = require('sequelize');

/**
 * Redemption model class. The initRedemption function must be called with the Sequelize
 * instance before the model can be used for database queries.
 */
class Redemption extends Model {
  // Space for future custom methods
}

const initRedemption = (sequelize) => {
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
      sequelize,
      modelName: 'Redemption',
      tableName: 'redemptions',
      timestamps: true, // Automatically handles created_at (mapping to your redeemed_at timestamp)
      underscored: true, // Converted to snake_case format (promo_code, created_at)
    }
  );
  return Redemption;
};

module.exports = { Redemption, initRedemption };
