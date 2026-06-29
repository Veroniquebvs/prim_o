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
