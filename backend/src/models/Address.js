/**
 * Address Model
 * Represents saved addresses for users (shipping/billing)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Address = sequelize.define(
  'Address',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'User who owns this address',
    },
    type: {
      type: DataTypes.ENUM('shipping', 'billing', 'both'),
      defaultValue: 'shipping',
      allowNull: false,
      comment: 'Address type: shipping, billing, or both',
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User-friendly label (e.g., "Home", "Office", "Mom\'s House")',
    },
    full_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Recipient full name',
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        is: {
          args: /^[+]?[0-9\s()-]+$/,
          msg: 'Phone number must contain only numbers, spaces, and valid characters',
        },
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address',
        },
      },
      comment: 'Optional email for this address',
    },
    address_line1: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Street address, building number, apartment',
    },
    address_line2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Additional address details (floor, door number, etc.)',
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'District/County (e.g., "Kadıköy", "Çankaya")',
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'State/Province (e.g., "İstanbul", "Ankara")',
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING(100),
      defaultValue: 'Turkey',
      allowNull: false,
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Is this the default address for the user',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional delivery notes or instructions',
    },
  },
  {
    tableName: 'addresses',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['user_id', 'is_default'],
      },
      {
        fields: ['type'],
      },
    ],
  }
);

// Instance Methods

/**
 * Convert address to JSONB format for orders
 * @returns {Object}
 */
Address.prototype.toOrderFormat = function () {
  return {
    full_name: this.full_name,
    phone: this.phone,
    address_line1: this.address_line1,
    address_line2: this.address_line2,
    city: this.city,
    district: this.district,
    state: this.state,
    postal_code: this.postal_code,
    country: this.country,
    notes: this.notes,
  };
};

/**
 * Get formatted address string
 * @returns {string}
 */
Address.prototype.getFormattedAddress = function () {
  const parts = [this.address_line1];

  if (this.address_line2) {
    parts.push(this.address_line2);
  }

  parts.push(`${this.city}${this.district ? ', ' + this.district : ''}${this.state ? ', ' + this.state : ''} ${this.postal_code}`);
  parts.push(this.country);

  return parts.join('\n');
};

// Class Methods

/**
 * Get user's default address by type
 * @param {string} userId
 * @param {string} type - 'shipping' or 'billing'
 * @returns {Promise<Address|null>}
 */
Address.getDefaultByType = async function (userId, type) {
  return this.findOne({
    where: {
      user_id: userId,
      type: [type, 'both'],
      is_default: true,
    },
    order: [['updated_at', 'DESC']],
  });
};

/**
 * Get all addresses for a user
 * @param {string} userId
 * @returns {Promise<Address[]>}
 */
Address.getUserAddresses = async function (userId) {
  return this.findAll({
    where: { user_id: userId },
    order: [
      ['is_default', 'DESC'],
      ['updated_at', 'DESC'],
    ],
  });
};

/**
 * Set address as default and unset others
 * @param {string} addressId
 * @param {string} userId
 * @returns {Promise<void>}
 */
Address.setAsDefault = async function (addressId, userId) {
  const transaction = await sequelize.transaction();

  try {
    // Unset all other default addresses for this user
    await this.update(
      { is_default: false },
      {
        where: { user_id: userId },
        transaction,
      }
    );

    // Set the specified address as default
    await this.update(
      { is_default: true },
      {
        where: { id: addressId, user_id: userId },
        transaction,
      }
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Hooks

/**
 * Before creating address, ensure only one default per user
 */
Address.beforeCreate(async (address) => {
  if (address.is_default) {
    // Unset other default addresses for this user
    await Address.update(
      { is_default: false },
      {
        where: {
          user_id: address.user_id,
        },
      }
    );
  }
});

/**
 * Before updating address, ensure only one default per user
 */
Address.beforeUpdate(async (address) => {
  if (address.changed('is_default') && address.is_default) {
    // Unset other default addresses for this user
    await Address.update(
      { is_default: false },
      {
        where: {
          user_id: address.user_id,
          id: { [sequelize.Sequelize.Op.ne]: address.id },
        },
      }
    );
  }
});

module.exports = Address;
