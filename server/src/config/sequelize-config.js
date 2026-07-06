/**
 * config/sequelize-config.js — Configuration consumed by the Sequelize CLI (sequelize-cli),
 * referenced via server/.sequelizerc for `db:migrate` / `db:seed` commands.
 *
 * This is separate from src/config/database.js: that file builds the live Sequelize instance
 * used by the running app, while this one only feeds the CLI so it can connect to run
 * migrations from the ../migrations directory. SSL is enabled automatically whenever
 * DATABASE_URL points at a non-local host (e.g. Render).
 */
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
const isRemote = dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

const sslOptions = isRemote
  ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
  : {};

module.exports = {
  development: {
    url: dbUrl,
    dialect: 'postgres',
    ...sslOptions,
  },
  test: {
    url: dbUrl,
    dialect: 'postgres',
  },
  production: {
    url: dbUrl,
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  },
};
