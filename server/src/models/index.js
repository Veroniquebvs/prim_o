const sequelize = require('../config/database');

// 1. Import everything
const { Company, initCompany } = require('./Company');
const { User, initUser } = require('./User');
const { TokenTransaction, initTokenTransaction } = require('./TokenTransaction');
const { Voucher, initVoucher } = require('./Voucher');
const { Redemption, initRedemption } = require('./Redemption');
const { Favorite, initFavorite } = require('./Favorite');
const { ScheduledAllocation, initScheduledAllocation } = require('./ScheduledAllocation');
const { Team, initTeam } = require('./Team');
const { TeamMember, initTeamMember } = require('./TeamMember');

// 2. Initialize everything with the database instance
initCompany(sequelize);
initUser(sequelize);
initTokenTransaction(sequelize);
initVoucher(sequelize);
initRedemption(sequelize);
initFavorite(sequelize);
initScheduledAllocation(sequelize);
initTeam(sequelize);
initTeamMember(sequelize);

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

Company.hasMany(ScheduledAllocation, { foreignKey: 'company_id', as: 'scheduled_allocations' });
ScheduledAllocation.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

User.hasMany(ScheduledAllocation, { foreignKey: 'sender_id', as: 'sent_scheduled_allocations' });
ScheduledAllocation.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

User.hasMany(ScheduledAllocation, { foreignKey: 'receiver_id', as: 'received_scheduled_allocations' });
ScheduledAllocation.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

// Team associations
Company.hasMany(Team, { foreignKey: 'company_id', as: 'teams' });
Team.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Team.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });
User.hasMany(Team, { foreignKey: 'manager_id', as: 'managed_teams' });

Team.hasMany(TeamMember, { foreignKey: 'team_id', as: 'members' });
TeamMember.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

TeamMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(TeamMember, { foreignKey: 'user_id', as: 'team_memberships' });

module.exports = {
  sequelize,
  Company,
  User,
  TokenTransaction,
  Voucher,
  Redemption,
  Favorite,
  ScheduledAllocation,
  Team,
  TeamMember,
};
