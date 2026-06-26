require('dotenv').config({ path: 'server/.env' });
if(!process.env.DATABASE_URL) {
  // try root .env
  require('dotenv').config({ path: '.env' });
}
const { User } = require('./server/src/models');
async function check() {
  const users = await User.findAll({ where: { email: 'sophie.martin@leclerc.fr' } });
  console.log(users.map(u => ({ id: u.id, email: u.email, role: u.role })));
  process.exit(0);
}
check();
