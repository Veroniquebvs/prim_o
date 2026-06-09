const sequelize = require('../config/database');

// 1. Import everything
const { Company, initCompany } = require('./Company');
const { User, initUser } = require('./User');
const { TokenTransaction, initTokenTransaction } = require('./TokenTransaction');
const { Voucher, initVoucher } = require('./Voucher');
const { Redemption, initRedemption } = require('./Redemption');
const { Favorite, initFavorite } = require('./Favorite');

// 2. Initialize everything with the database instance
initCompany(sequelize);
initUser(sequelize);
initTokenTransaction(sequelize);
initVoucher(sequelize);
initRedemption(sequelize);
initFavorite(sequelize);

// 3. Define associations
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

User.hasMany(Redemption, { foreignKey: 'user_id', as: 'redemptions' });
Redemption.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Voucher.hasMany(Redemption, { foreignKey: 'voucher_id', as: 'redemptions' });
Redemption.belongsTo(Voucher, { foreignKey: 'voucher_id', as: 'voucher' });

Company.hasMany(TokenTransaction, { foreignKey: 'company_id', as: 'token_transactions' });
TokenTransaction.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

User.hasMany(TokenTransaction, { foreignKey: 'sender_id', as: 'sent_transactions' });
TokenTransaction.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

User.hasMany(TokenTransaction, { foreignKey: 'receiver_id', as: 'received_transactions' });
TokenTransaction.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

User.hasMany(Favorite, { foreignKey: 'user_id', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Voucher.hasMany(Favorite, { foreignKey: 'voucher_id', as: 'favorites' });
Favorite.belongsTo(Voucher, { foreignKey: 'voucher_id', as: 'voucher' });

module.exports = {
  sequelize,
  Company,
  User,
  TokenTransaction,
  Voucher,
  Redemption,
  Favorite,
};
