/**
 * scripts/mark-migrations-done.js — One-off recovery script for Sequelize CLI migration state.
 *
 * Used when a database's schema was already brought up to date via sequelize.sync({ alter: true })
 * (the dev auto-sync) before the corresponding migration file existed in migrations/, so running
 * `sequelize-cli db:migrate` would fail trying to re-apply changes that are already present.
 *
 * Creates the SequelizeMeta tracking table if missing, then inserts rows for the given migration
 * filenames so the CLI treats them as already run, without executing their `up()` again.
 * Uses DATABASE_URL from .env; enables SSL automatically for non-local hosts.
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const dbUrl = process.env.DATABASE_URL || '';
const isRemote = !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,
  ...(isRemote ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } } : {}),
});

(async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
      name VARCHAR(255) NOT NULL UNIQUE PRIMARY KEY
    );
  `);

  await sequelize.query(`
    INSERT INTO "SequelizeMeta" (name) VALUES
      ('20260610135048-add-entry-date-to-users.js'),
      ('20260619000000-add-target-types-to-scheduled-allocations.js')
    ON CONFLICT DO NOTHING;
  `);

  console.log('Done — migrations marquées comme exécutées.');
  await sequelize.close();
})();
