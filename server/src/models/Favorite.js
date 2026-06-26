/**
 * models/Favorite.js — Sequelize model for the favorites table.
 *
 * Records which vouchers a user has marked as a favourite. The combination of user_id and
 * voucher_id is unique (enforced by a database index) so each user can only favourite any
 * given voucher once. The favourite count per voucher is aggregated at query time in
 * MarketplaceService.listItems() to avoid denormalisation. The updatedAt timestamp is
 * disabled because favourite records are only created or destroyed, never updated.
 */
const { Model, DataTypes } = require('sequelize');

/**
 * Favorite model class. The initFavorite function must be called with the Sequelize instance
 * before the model can be used for database queries.
 */
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
