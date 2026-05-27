const { Model, DataTypes } = require("sequelize");

class User extends Model {
  // Space for future custom methods (e.g., password validation)
}

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
        isIn: [["admin", "employer", "employee"]], // Only allows these 3 exact roles
      },
    },
    // 7. Token Balance (Required, Integer for whole numbers)
    token_balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // A user starts with 0 tokens by default
    },
  },
  {
    sequelize: require("../config/database"),
    modelName: "User",
    tableName: "users",
    timestamps: true, // Automatically handles createdAt and updatedAt (timestamps)
    underscored: true, // Converts camelCase to snake_case in DB (e.g., password_hash)
  },
);

module.exports = User;
