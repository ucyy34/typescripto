/**
 * ShippingSupportRule Model
 * Global shipping support rules set by admin
 * These rules can override store-level settings
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ShippingSupportRule = sequelize.define(
    'ShippingSupportRule',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: 'Rule name for admin reference',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Detailed description of the rule',
        },
        condition_type: {
            type: DataTypes.ENUM('cart_total', 'multi_store', 'first_order', 'campaign'),
            allowNull: false,
            comment: 'Type of condition to check',
        },
        threshold_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Threshold amount for cart_total condition',
        },
        scope: {
            type: DataTypes.ENUM('all', 'multi_store_only', 'new_customers'),
            defaultValue: 'all',
            comment: 'Which orders this rule applies to',
        },
        platform_contribution: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 100,
            validate: {
                min: 0,
                max: 100,
            },
            comment: 'Percentage of shipping cost covered by platform (0-100)',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Is this rule currently active?',
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When this rule becomes active',
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When this rule expires (null = never)',
        },
        priority: {
            type: DataTypes.INTEGER,
            defaultValue: 10,
            comment: 'Lower number = higher priority (1 is highest)',
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
    },
    {
        tableName: 'shipping_support_rules',
        indexes: [
            {
                fields: ['is_active'],
            },
            {
                fields: ['condition_type'],
            },
            {
                fields: ['priority'],
            },
            {
                fields: ['start_date', 'end_date'],
            },
        ],
    }
);

// Class Methods

/**
 * Find all active rules ordered by priority
 * @returns {Promise<Array<ShippingSupportRule>>}
 */
ShippingSupportRule.findActiveRules = function () {
    const now = new Date();
    const Op = sequelize.Sequelize.Op;

    return this.findAll({
        where: {
            is_active: true,
            [Op.and]: [
                {
                    [Op.or]: [
                        { start_date: null },
                        { start_date: { [Op.lte]: now } },
                    ],
                },
                {
                    [Op.or]: [
                        { end_date: null },
                        { end_date: { [Op.gte]: now } },
                    ],
                },
            ],
        },
        order: [['priority', 'ASC']],
    });
};

/**
 * Check if a rule applies to given cart
 * @param {Object} cart - Cart data with total, storeCount, isNewCustomer
 * @returns {boolean}
 */
ShippingSupportRule.prototype.appliesTo = function (cart) {
    switch (this.condition_type) {
        case 'cart_total':
            return cart.total >= parseFloat(this.threshold_amount || 0);

        case 'multi_store':
            return cart.storeCount > 1;

        case 'first_order':
            return cart.isNewCustomer === true;

        case 'campaign':
            // Campaign rules always apply when active
            return true;

        default:
            return false;
    }
};

module.exports = ShippingSupportRule;
