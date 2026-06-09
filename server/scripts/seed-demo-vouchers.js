require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const sequelize = require('../src/config/database');
require('../src/models');
const { Voucher } = require('../src/models');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

/* ── Palette couleur par catégorie ── */
const COLORS = {
  sport:      { bg: '#dbeafe', accent: '#2563eb', icon: '🏃' },
  voyage:     { bg: '#fef3c7', accent: '#d97706', icon: '✈️' },
  culture:    { bg: '#ede9fe', accent: '#7c3aed', icon: '🎭' },
  nourriture: { bg: '#dcfce7', accent: '#16a34a', icon: '🍔' },
  loisirs:    { bg: '#fce7f3', accent: '#db2777', icon: '🎮' },
  tech:       { bg: '#e0f2fe', accent: '#0284c7', icon: '💻' },
  services:   { bg: '#f0fdf4', accent: '#15803d', icon: '🛠️' },
  shopping:   { bg: '#fdf4ff', accent: '#9333ea', icon: '🛍️' },
  'bien-être':{ bg: '#fff7ed', accent: '#ea580c', icon: '🧘' },
};

function makeSvg(partner, category) {
  const { bg, accent } = COLORS[category] || { bg: '#f3f4f6', accent: '#6b7280' };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
  <rect width="400" height="200" fill="${bg}"/>
  <rect width="400" height="6" fill="${accent}"/>
  <text x="200" y="95" font-family="Arial,sans-serif" font-size="32" font-weight="bold"
        fill="${accent}" text-anchor="middle" dominant-baseline="middle">${partner}</text>
  <text x="200" y="145" font-family="Arial,sans-serif" font-size="16"
        fill="${accent}88" text-anchor="middle">${category.charAt(0).toUpperCase() + category.slice(1)}</text>
</svg>`;
}

const VOUCHERS = [
  { partner: 'Décathlon',    title: 'Bon d\'achat 50 €',     token_cost: 100, category: 'sport'      },
  { partner: 'Booking.com',  title: 'Réduction week-end',    token_cost: 200, category: 'voyage'     },
  { partner: 'Fnac',         title: 'Bon cadeau livres',      token_cost:  80, category: 'culture'    },
  { partner: 'Uber Eats',    title: 'Réduction 15 €',         token_cost:  50, category: 'nourriture' },
  { partner: 'Netflix',      title: 'Abonnement 1 mois',      token_cost: 120, category: 'loisirs'    },
  { partner: 'Apple Store',  title: 'Bon d\'achat 30 €',      token_cost: 150, category: 'tech'       },
  { partner: 'BlaBlaCar',    title: 'Crédits trajets',         token_cost:  60, category: 'services'   },
  { partner: 'Zalando',      title: 'Bon 40 €',               token_cost:  90, category: 'shopping'   },
  { partner: 'Sephora',      title: 'Coffret beauté 35 €',    token_cost: 110, category: 'bien-être'  },
  { partner: 'Leroy Merlin', title: 'Bon d\'achat 25 €',      token_cost:  70, category: 'loisirs'    },
];

async function run() {
  await sequelize.authenticate();
  console.log('DB connectée');

  for (const v of VOUCHERS) {
    const slug     = v.partner.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `seed-${slug}.svg`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, makeSvg(v.partner, v.category));

    const [voucher, created] = await Voucher.findOrCreate({
      where: { partner: v.partner, title: v.title },
      defaults: {
        ...v,
        available: true,
        images: [`/uploads/${filename}`],
      },
    });

    if (!created) {
      await voucher.update({ images: [`/uploads/${filename}`], category: v.category });
    }

    console.log(`${created ? '✔' : '↺'} ${v.partner} — ${v.category}`);
  }

  console.log('\nSeed terminé.');
  await sequelize.close();
}

run().catch(err => { console.error(err); process.exit(1); });
