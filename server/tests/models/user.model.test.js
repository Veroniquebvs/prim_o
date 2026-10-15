/**
 * tests/models/user.model.test.js — Unit tests for the User model's password protection (T-81).
 *
 * Builds instances in memory only: Sequelize does not open a connection until a query runs,
 * so no database is needed. Checks that the password hash is excluded by the default scope,
 * loaded only through the 'withPassword' scope, and never serialised by toJSON.
 */
const { Sequelize } = require('sequelize');
const { User, initUser } = require('../../src/models/User');

beforeAll(() => {
  initUser(new Sequelize('postgres://user:pass@localhost:5432/unused', { logging: false }));
});

describe('User model — password hash protection', () => {
  it('excludes password_hash in the default scope', () => {
    expect(User.options.defaultScope).toEqual({ attributes: { exclude: ['password_hash'] } });
  });

  it('includes password_hash only through the withPassword scope', () => {
    expect(User.options.scopes.withPassword).toEqual({ attributes: { include: ['password_hash'] } });
  });

  it('never serialises password_hash, even when it is loaded', () => {
    const user = User.build({ name: 'Doe', email: 'john@example.com', password_hash: '$2b$12$secret', role: 'employee' });

    const json = user.toJSON();

    expect(json).not.toHaveProperty('password_hash');
    expect(json.email).toBe('john@example.com');
    expect(JSON.parse(JSON.stringify(user))).not.toHaveProperty('password_hash');
    expect(user.password_hash).toBe('$2b$12$secret');
  });
});
