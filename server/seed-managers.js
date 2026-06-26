/**
 * Seed script — 3 managers + 5 employees each for Leclerc
 * Run: node seed-managers.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const sequelize = require('./src/config/database');
const { Company, User, Team, TeamMember } = require('./src/models');

const LECLERC_ID = '3b9140a3-b1b7-4e02-9a63-ab41dcf4ad44';
const BCRYPT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'admin123';

const MANAGERS = [
  { first_name: 'Sophie',   name: 'Martin',   email: 'sophie.martin@leclerc.fr',   team: 'Équipe Rayon Frais' },
  { first_name: 'Thomas',   name: 'Dubois',   email: 'thomas.dubois@leclerc.fr',   team: 'Équipe Caisse' },
  { first_name: 'Isabelle', name: 'Bernard',  email: 'isabelle.bernard@leclerc.fr', team: 'Équipe Drive' },
];

const EMPLOYEES_PER_MANAGER = [
  [
    { first_name: 'Lucas',    name: 'Petit',     email: 'lucas.petit@leclerc.fr' },
    { first_name: 'Emma',     name: 'Leroy',     email: 'emma.leroy@leclerc.fr' },
    { first_name: 'Nathan',   name: 'Moreau',    email: 'nathan.moreau@leclerc.fr' },
    { first_name: 'Chloé',   name: 'Simon',     email: 'chloe.simon@leclerc.fr' },
    { first_name: 'Antoine',  name: 'Laurent',   email: 'antoine.laurent@leclerc.fr' },
  ],
  [
    { first_name: 'Camille',  name: 'Michel',    email: 'camille.michel@leclerc.fr' },
    { first_name: 'Raphaël', name: 'Garcia',    email: 'raphael.garcia@leclerc.fr' },
    { first_name: 'Léa',     name: 'David',     email: 'lea.david@leclerc.fr' },
    { first_name: 'Hugo',    name: 'Bertrand',  email: 'hugo.bertrand@leclerc.fr' },
    { first_name: 'Manon',   name: 'Roux',      email: 'manon.roux@leclerc.fr' },
  ],
  [
    { first_name: 'Alexis',  name: 'Vincent',   email: 'alexis.vincent@leclerc.fr' },
    { first_name: 'Inès',   name: 'Fournier',  email: 'ines.fournier@leclerc.fr' },
    { first_name: 'Maxime',  name: 'Morel',     email: 'maxime.morel@leclerc.fr' },
    { first_name: 'Julie',   name: 'Girard',    email: 'julie.girard@leclerc.fr' },
    { first_name: 'Théo',   name: 'André',     email: 'theo.andre@leclerc.fr' },
  ],
];

async function seed() {
  await sequelize.authenticate();
  console.log('✓ DB connected');

  const company = await Company.findByPk(LECLERC_ID);
  if (!company) throw new Error('Leclerc company not found');
  console.log(`✓ Company: ${company.name}`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
  console.log('✓ Password hashed');

  for (let i = 0; i < MANAGERS.length; i++) {
    const mgr = MANAGERS[i];
    const employees = EMPLOYEES_PER_MANAGER[i];

    // Skip if manager already exists
    const existingMgr = await User.findOne({ where: { email: mgr.email } });
    if (existingMgr) {
      console.log(`  ⚠ Manager ${mgr.email} already exists — skipping`);
      continue;
    }

    const t = await sequelize.transaction();
    try {
      // Create manager
      const manager = await User.create({
        first_name: mgr.first_name,
        name: mgr.name,
        email: mgr.email,
        password_hash: passwordHash,
        role: 'manager',
        company_id: LECLERC_ID,
        token_balance: 100,
        status: 'active',
      }, { transaction: t });

      console.log(`  + Manager: ${mgr.first_name} ${mgr.name}`);

      // Create team
      const team = await Team.create({
        name: mgr.team,
        company_id: LECLERC_ID,
        manager_id: manager.id,
      }, { transaction: t });

      console.log(`    + Team: ${mgr.team}`);

      // Create employees and add to team
      for (const emp of employees) {
        const existing = await User.findOne({ where: { email: emp.email }, transaction: t });
        if (existing) {
          console.log(`      ⚠ Employee ${emp.email} already exists — skipping`);
          continue;
        }

        const employee = await User.create({
          first_name: emp.first_name,
          name: emp.name,
          email: emp.email,
          password_hash: passwordHash,
          role: 'employee',
          company_id: LECLERC_ID,
          token_balance: 0,
          status: 'active',
        }, { transaction: t });

        await TeamMember.create({
          team_id: team.id,
          user_id: employee.id,
          joined_at: new Date(),
        }, { transaction: t });

        console.log(`      + Employee: ${emp.first_name} ${emp.name}`);
      }

      await t.commit();
      console.log(`  ✓ Team "${mgr.team}" committed`);
    } catch (err) {
      await t.rollback();
      console.error(`  ✗ Error for ${mgr.email}:`, err.message);
    }
  }

  console.log('\n✅ Seed complete');
  console.log(`   Default password for all users: ${DEFAULT_PASSWORD}`);
  await sequelize.close();
}

seed().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
