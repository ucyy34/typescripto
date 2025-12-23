/**
 * Platform Settings Model
 * Stores platform-wide configuration settings
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const PlatformSettings = sequelize.define(
    'PlatformSettings',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        key: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            comment: 'Setting key (e.g., default_shipping_cost)',
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Setting value (stored as string, parse as needed)',
        },
        value_type: {
            type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
            defaultValue: 'string',
            comment: 'Type of the value for proper parsing',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Human-readable description of the setting',
        },
        updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: 'Admin who last updated this setting',
        },
    },
    {
        tableName: 'platform_settings',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['key'],
            },
        ],
    }
);

// Class Methods

/**
 * Get a setting value by key
 * @param {string} key - Setting key
 * @param {*} defaultValue - Default value if setting not found
 * @returns {Promise<*>}
 */
PlatformSettings.getValue = async function (key, defaultValue = null) {
    const setting = await this.findOne({ where: { key } });
    if (!setting) return defaultValue;

    // Parse value based on type
    switch (setting.value_type) {
        case 'number':
            return parseFloat(setting.value) || defaultValue;
        case 'boolean':
            return setting.value === 'true';
        case 'json':
            try {
                return JSON.parse(setting.value);
            } catch {
                return defaultValue;
            }
        default:
            return setting.value;
    }
};

/**
 * Set a setting value
 * @param {string} key - Setting key
 * @param {*} value - Value to set
 * @param {string} valueType - Type of value
 * @param {string} updatedBy - Admin user ID
 * @returns {Promise<PlatformSettings>}
 */
PlatformSettings.setValue = async function (key, value, valueType = 'string', updatedBy = null) {
    const stringValue = valueType === 'json' ? JSON.stringify(value) : String(value);

    const [setting] = await this.upsert({
        key,
        value: stringValue,
        value_type: valueType,
        updated_by: updatedBy,
    });

    return setting;
};

/**
 * Initialize default settings if they don't exist
 */
PlatformSettings.initializeDefaults = async function () {
    const defaults = [
        {
            key: 'default_shipping_cost',
            value: '35.00',
            value_type: 'number',
            description: 'Varsayılan platform kargo maliyeti (TL)',
        },
        {
            key: 'free_shipping_global_threshold',
            value: '500',
            value_type: 'number',
            description: 'Global ücretsiz kargo eşiği (TL)',
        },
    ];

    for (const setting of defaults) {
        const existing = await this.findOne({ where: { key: setting.key } });
        if (!existing) {
            await this.create(setting);
        }
    }
};

module.exports = PlatformSettings;
