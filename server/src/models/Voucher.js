const { Model, DataTypes } = require('sequelize');

class Voucher extends Model {
  // Space for future custom methods
}

const initVoucher = (sequelize) => {
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
      // 6. Category
      category: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [['sport', 'voyage', 'culture', 'nourriture', 'loisirs', 'tech', 'services', 'shopping', 'bien-être']],
        },
      },
      // 7. Images — array of relative URLs served from /uploads
      images: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false,
        defaultValue: [],
      },
      // 8. Promo code provided by the partner — revealed to the employee on redemption
      promo_code: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      // 9. Admin-curated featured flag — appears in Favoris carousel regardless of heart count
      is_featured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Voucher',
      tableName: 'vouchers',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return Voucher;
};

module.exports = { Voucher, initVoucher };
