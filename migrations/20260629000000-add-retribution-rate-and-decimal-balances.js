module.exports = {
  up: async (queryInterface) => {
    // Add retribution_rate to teams (idempotent)
    await queryInterface.sequelize.query(`
      ALTER TABLE teams ADD COLUMN IF NOT EXISTS retribution_rate DECIMAL(5,2) NOT NULL DEFAULT 0;
    `);

    // Convert token_balance and amount columns to DECIMAL(10,2) (safe even if already DECIMAL)
    await queryInterface.sequelize.query(`
      ALTER TABLE teams     ALTER COLUMN token_balance TYPE DECIMAL(10,2) USING token_balance::numeric;
      ALTER TABLE users     ALTER COLUMN token_balance TYPE DECIMAL(10,2) USING token_balance::numeric;
      ALTER TABLE companies ALTER COLUMN token_balance TYPE DECIMAL(10,2) USING token_balance::numeric;
      ALTER TABLE token_transactions    ALTER COLUMN amount TYPE DECIMAL(10,2) USING amount::numeric;
      ALTER TABLE scheduled_allocations ALTER COLUMN amount TYPE DECIMAL(10,2) USING amount::numeric;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('teams', 'retribution_rate');
    await queryInterface.changeColumn('teams', 'token_balance', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.changeColumn('users', 'token_balance', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.changeColumn('companies', 'token_balance', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.changeColumn('token_transactions', 'amount', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn('scheduled_allocations', 'amount', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
