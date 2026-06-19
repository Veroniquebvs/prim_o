const { Model, DataTypes } = require('sequelize');

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
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return Redemption;
};

module.exports = { Redemption, initRedemption };
