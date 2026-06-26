module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('scheduled_allocations', 'target_type', {
      type: Sequelize.ENUM('user', 'all_company', 'all_employees', 'all_managers', 'team', 'team_and_manager'),
      defaultValue: 'all_company',
      allowNull: false,
    });
    await queryInterface.addColumn('scheduled_allocations', 'target_team_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'teams',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('scheduled_allocations', 'target_team_id');
    await queryInterface.removeColumn('scheduled_allocations', 'target_type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_scheduled_allocations_target_type";');
  }
};
