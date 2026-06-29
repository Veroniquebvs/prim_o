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
