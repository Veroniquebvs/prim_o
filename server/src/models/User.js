/**
 * models/User.js — Sequelize model for the users table.
 *
 * Represents every person who can authenticate with the platform, regardless of their role.
 * A user belongs to exactly one company (except admin users who have no company). The role
 * field controls which features and routes the user can access. The token_balance tracks how
 * many tokens this user currently holds and can spend in the marketplace. Passwords are never
 * stored here directly — only the bcrypt hash produced by AuthService.
 *
 * Roles: 'admin' | 'employer' | 'manager' | 'employee'
 * Status: 'pending' (newly registered, not yet validated by employer) | 'active'
 */
const { Model, DataTypes } = require('sequelize');

/**
 * User model class. The initUser function must be called with the Sequelize instance before
 * the model can be used for database queries.
 */
class User extends Model {
  // Space for future custom methods (e.g., password validation)
}

const initUser = (sequelize) => {
  User.init(
    {
      // 1. Unique Identifier (Required, automatically managed)
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      // 2. User's Last Name (Required)
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      // 3. User's First Name (Required)
      first_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      // 4. User Email Address (Required, Unique + Format validation)
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Prevents two users from having the same email
        validate: {
          isEmail: true, // Checks for valid email format (e.g., user@example.com)
          notEmpty: true,
        },
      },
      // 5. Secured Password Hash (Required)
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      // 6. User Role (Required + Restriced to specific values)
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [['admin', 'employer', 'employee', 'manager']],
        },
      },
      // 7. Token Balance (Required, Integer for whole numbers)
      token_balance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0, // A user starts with 0 tokens by default
      },
      // 8. employee status
      status: {
        type: DataTypes.ENUM('pending', 'active'),
        defaultValue: 'pending',
        allowNull: false,
      },

      // 9. entry date
      entry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      // 10. avatar index (1–6) chosen by the user
      avatar_index: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true, // Automatically handles createdAt and updatedAt (timestamps)
      underscored: true, // Converts camelCase to snake_case in DB (e.g., password_hash)
    }
  );
  return User;
};

module.exports = { User, initUser };
