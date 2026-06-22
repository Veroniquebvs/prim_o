/**
 * scripts/seed-full.js — Full production/staging seed for the Render environment.
 *
 * Expects the DATABASE_URL as the first command-line argument. Sets NODE_ENV=production
 * so the database config enables SSL. Loads the shared seed-data.js dataset and creates:
 * an admin account, the demo companies, one employer per company, and several employees per
 * company with token balances and demo vouchers. Safe to run on a fresh schema only; running
 * on an existing DB may produce duplicate-key errors.
 */
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const DATABASE_URL = process.argv[2];
if (!DATABASE_URL) {
  console.error('Usage: node scripts/seed-full.js <DATABASE_URL>');
  process.exit(1);
}

process.env.DATABASE_URL = DATABASE_URL;
process.env.NODE_ENV = 'production';

const { sequelize, Company, User, Voucher } = require('../src/models');
const {
  PASSWORD,
  companies,
  employeesByCompany,
  employersByCompany,
  vouchers,
} = require('./seed-data');

async function main() {
  await sequelize.authenticate();
  console.log('Connexion DB OK');
  await sequelize.sync({ alter: true });
  console.log('Tables synchronisées');

  const hash = await bcrypt.hash(PASSWORD, 12);

  for (let i = 0; i < companies.length; i++) {
    const companyData = companies[i];
    const [company] = await Company.findOrCreate({
      where: { name: companyData.name },
      defaults: companyData,
    });
    console.log(`Entreprise : ${company.name}`);

    const emp = employersByCompany[i];
    await User.findOrCreate({
      where: { email: emp.email },
      defaults: {
        ...emp,
        password_hash: hash,
        role: 'employer',
        token_balance: 500,
        status: 'active',
        company_id: company.id,
      },
    });
    console.log(`  Employeur : ${emp.first_name} ${emp.name}`);

    for (const e of employeesByCompany[i]) {
      await User.findOrCreate({
        where: { email: e.email },
        defaults: {
          ...e,
          password_hash: hash,
          role: 'employee',
          token_balance: 200,
          status: 'active',
          company_id: company.id,
        },
      });
      console.log(`  Employé : ${e.first_name} ${e.name}`);
    }
  }

  let created = 0;
  for (const v of vouchers) {
    const [, wasCreated] = await Voucher.findOrCreate({
      where: { promo_code: v.promo_code },
      defaults: { ...v, available: true },
    });
    if (wasCreated) created++;
  }
  console.log(`\n${created} offres créées (${vouchers.length - created} déjà existantes)`);
  console.log('\nSeed terminé !');
  await sequelize.close();
}

main().catch(err => { console.error(err); process.exit(1); });
