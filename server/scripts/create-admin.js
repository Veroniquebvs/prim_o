/**
 * scripts/create-admin.js — One-off script to bootstrap the first admin user.
 *
 * Expects the DATABASE_URL as the first command-line argument.
 * Syncs the schema (alter), then creates a single admin account with a hardcoded
 * password that should be changed immediately after first use.
 *
 * Usage: node scripts/create-admin.js postgresql://user:pass@host/db
 */
const bcrypt = require('bcrypt');

const DATABASE_URL = process.argv[2];
if (!DATABASE_URL) {
  console.error('Usage: node scripts/create-admin.js <DATABASE_URL>');
  process.exit(1);
}

process.env.DATABASE_URL = DATABASE_URL;
process.env.NODE_ENV = 'production';

const { sequelize, User } = require('../src/models');

async function main() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  const hash = await bcrypt.hash('admin123456789', 12);
  const user = await User.create({
    email: 'admin123@admin.com',
    password_hash: hash,
    role: 'admin',
    name: 'Admin Primo',
    first_name: 'Admin',
    last_name: 'Primo',
    token_balance: 0,
  });
  console.log('Admin créé :', user.email);
  await sequelize.close();
}

main().catch(err => { console.error(err); process.exit(1); });
