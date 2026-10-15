"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotent: a database created by the base-schema migration already has the column
    const columns = await queryInterface.describeTable("users");
    if (columns.entry_date) return;
    await queryInterface.addColumn("users", "entry_date", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "entry_date");
  },
};
