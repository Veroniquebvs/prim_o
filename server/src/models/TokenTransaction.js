const { Model, DataTypes } = require('sequelize');

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
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );
  return TokenTransaction;
};

module.exports = { TokenTransaction, initTokenTransaction };
