/**
 * User Model
 * Represents buyers, sellers, and admins in the marketplace
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/sequelize');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address',
        },
      },
      set(value) {
        this.setDataValue('email', value.toLowerCase().trim());
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^[+]?[0-9\s()-]+$/,
          msg: 'Phone number must contain only numbers, spaces, and valid characters',
        },
      },
    },
    role: {
      type: DataTypes.ENUM('buyer', 'seller', 'admin'),
      defaultValue: 'buyer',
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_password_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_password_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_login_ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['is_active'],
      },
    ],
  }
);

// Instance Methods

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @returns {Promise<boolean>}
 */
User.prototype.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password_hash);
};

/**
 * Get user's full name
 * @returns {string}
 */
User.prototype.getFullName = function () {
  if (this.first_name && this.last_name) {
    return `${this.first_name} ${this.last_name}`;
  }
  return this.first_name || this.last_name || this.email.split('@')[0];
};

/**
 * Get safe user object (without sensitive data)
 * @returns {Object}
 */
User.prototype.toSafeObject = function () {
  const { password_hash, refresh_token, verification_token, reset_password_token, ...safeUser } = this.toJSON();
  return safeUser;
};

// Class Methods

/**
 * Hash password before creating/updating user
 * @param {string} password - Plain text password
 * @returns {Promise<string>}
 */
User.hashPassword = async function (password) {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
  return bcrypt.hash(password, rounds);
};

/**
 * Find user by email
 * @param {string} email
 * @returns {Promise<User|null>}
 */
User.findByEmail = async function (email) {
  return this.findOne({ where: { email: email.toLowerCase().trim() } });
};

/**
 * Create admin user
 * @param {Object} data
 * @returns {Promise<User>}
 */
User.createAdmin = async function (data) {
  return this.create({
    ...data,
    role: 'admin',
    is_verified: true,
    is_active: true,
  });
};

// Hooks

/**
 * Before creating user, hash password
 */
User.beforeCreate(async (user) => {
  if (user.password_hash && !user.password_hash.startsWith('$2')) {
    user.password_hash = await User.hashPassword(user.password_hash);
  }
});

/**
 * Before updating user, hash password if changed
 */
User.beforeUpdate(async (user) => {
  if (user.changed('password_hash') && !user.password_hash.startsWith('$2')) {
    user.password_hash = await User.hashPassword(user.password_hash);
  }
});

module.exports = User;
