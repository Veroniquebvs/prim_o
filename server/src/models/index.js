const Company = require("./Company");
const User = require("./User");
const TokenTransaction = require("./TokenTransaction");
const Voucher = require("./Voucher");
const Redemption = require("./Redemption");

// ==========================================
// RELATION LOGIC & ASSOCIATIONS
// ==========================================

// 1. Companies <-> Users (One-to-Many)
// One company has multiple users (employers/employees)
Company.hasMany(User, { foreignKey: "company_id", as: "users" });
User.belongsTo(Company, { foreignKey: "company_id", as: "company" });

// 2. Users <-> Redemptions (One-to-Many)
// One employee can redeem multiple vouchers
User.hasMany(Redemption, { foreignKey: "user_id", as: "redemptions" });
Redemption.belongsTo(User, { foreignKey: "user_id", as: "user" });

// 3. Vouchers <-> Redemptions (One-to-Many)
// One voucher type can be redeemed multiple times by different users
Voucher.hasMany(Redemption, { foreignKey: "voucher_id", as: "redemptions" });
Redemption.belongsTo(Voucher, { foreignKey: "voucher_id", as: "voucher" });

// 4. Companies <-> TokenTransactions (One-to-Many)
// A company is linked to its token purchase or movement records
Company.hasMany(TokenTransaction, {
  foreignKey: "company_id",
  as: "token_transactions",
});
TokenTransaction.belongsTo(Company, {
  foreignKey: "company_id",
  as: "company",
});

// 5. Users <-> TokenTransactions (One-to-Many for Full Auditability)
// A user can be either the sender (employer) or the receiver (employee)
User.hasMany(TokenTransaction, {
  foreignKey: "sender_id",
  as: "sent_transactions",
});
TokenTransaction.belongsTo(User, { foreignKey: "sender_id", as: "sender" });

User.hasMany(TokenTransaction, {
  foreignKey: "receiver_id",
  as: "received_transactions",
});
TokenTransaction.belongsTo(User, { foreignKey: "receiver_id", as: "receiver" });

// ==========================================
// EXPORT ALL MODELS
// ==========================================
module.exports = {
  Company,
  User,
  TokenTransaction,
  Voucher,
  Redemption,
};
