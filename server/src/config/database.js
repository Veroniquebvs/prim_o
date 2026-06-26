/**
 * database.js — Sequelize instance connected to the PostgreSQL database.
 *
 * Reads the connection string from the DATABASE_URL environment variable and throws
 * immediately if it is missing. The connection pool is sized for concurrent API traffic
 * (2 to 10 connections). SSL is enforced in production with self-signed certificate support
 * enabled (rejectUnauthorized: false) to accommodate managed cloud databases such as Render.
 * SQL logging is enabled only in development so production logs stay clean.
 */
const { Sequelize } = require('sequelize');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false, // eslint-disable-line no-console
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions:
    process.env.NODE_ENV === 'production'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
});

module.exports = sequelize;
