const dotenv = require('dotenv');
dotenv.config();

const { listTransactions } = require('./src/services/token.service');
const sequelize = require('./src/config/database');

async function test() {
  try {
    const data = await listTransactions({ company_id: undefined });
    console.log('Result length:', data.length);
    console.log('First 3 items company fields:', data.slice(0, 3).map(tx => ({
      id: tx.id,
      company_id: tx.company_id,
      company: tx.company
    })));
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

test();
