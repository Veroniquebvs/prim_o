const { Model, DataTypes } = require('sequelize');

class Favorite extends Model {}

const initFavorite = (sequelize) => {
  Favorite.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false },
      voucher_id: { type: DataTypes.UUID, allowNull: false },
    },
    {
      sequelize,
      modelName: 'Favorite',
      tableName: 'favorites',
      timestamps: true,
      underscored: true,
      updatedAt: false,
      indexes: [{ unique: true, fields: ['user_id', 'voucher_id'] }],
    }
  );
  return Favorite;
};

module.exports = { Favorite, initFavorite };
