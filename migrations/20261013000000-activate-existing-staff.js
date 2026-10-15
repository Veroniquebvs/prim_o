"use strict";

/**
 * Data migration — login and refresh now refuse accounts whose status is not 'active'.
 * Before that change, self-registered employers and admins created by scripts/create-admin.js
 * kept the model default 'pending'. Activates every admin, employer and manager still pending
 * so they are not locked out. Pending employees stay pending: their employer activates them.
 * Not reversible: the previous status of each row is not kept.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Runs after the base-schema migration; the guard only protects partial runs
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('users')) return;
    await queryInterface.sequelize.query(
      "UPDATE users SET status = 'active' WHERE status = 'pending' AND role IN ('admin', 'employer', 'manager')"
    );
  },

  async down() {
    // Irreversible data fix: nothing to undo.
  },
};
