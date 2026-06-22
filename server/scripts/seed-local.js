/**
 * scripts/seed-local.js — Seed for the local Docker PostgreSQL database.
 *
 * Does NOT force NODE_ENV=production so the database config runs without SSL (the Docker
 * Postgres container does not support SSL). Defaults to the standard Docker compose URL
 * if no argument is provided. Creates the same dataset as seed-full.js: admin + demo
 * companies + employers + employees + 90 vouchers (10 per category with generated images).
 */
// Seed de la base Docker LOCALE (sans SSL).
// Crée : compte admin + 3 entreprises + 3 employeurs + 9 employés (cf. workflow.md)
// + 90 bons (10 par catégorie, une image chacun).
//
// Usage :
//   node scripts/seed-local.js
//   node scripts/seed-local.js postgresql://primo:primo_password@localhost:5433/primo_dev
//
// On NE force PAS NODE_ENV=production → la config DB reste sans SSL (le Postgres
// Docker local ne supporte pas le SSL, contrairement à Render).

const bcrypt = require('bcrypt');

const DATABASE_URL =
  process.argv[2] || 'postgresql://primo:primo_password@localhost:5433/primo_dev';
process.env.DATABASE_URL = DATABASE_URL;

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
  console.log('Connexion DB locale OK');
  await sequelize.sync({ alter: true });
  console.log('Tables synchronisées');

  const hash = await bcrypt.hash(PASSWORD, 12);

  // ── Admin ──
  await User.findOrCreate({
    where: { email: 'admin123@admin.com' },
    defaults: {
      email: 'admin123@admin.com',
      password_hash: hash,
      role: 'admin',
      name: 'Admin Primo',
      first_name: 'Admin',
      token_balance: 0,
      status: 'active',
    },
  });
  console.log('Admin : admin123@admin.com');

  // ── Entreprises + employeurs + employés ──
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

  // ── Bons d'achat ──
  let created = 0;
  for (const v of vouchers) {
    const [, wasCreated] = await Voucher.findOrCreate({
      where: { promo_code: v.promo_code },
      defaults: { ...v, available: true },
    });
    if (wasCreated) created++;
  }
  console.log(`\n${created} bons créés (${vouchers.length - created} déjà existants)`);
  console.log('Seed local terminé !');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
