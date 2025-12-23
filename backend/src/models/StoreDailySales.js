/**
 * StoreDailySales Model
 * Tracks daily successful order counts per store for siftah system
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const StoreDailySales = sequelize.define(
    'StoreDailySales',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        store_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'stores',
                key: 'id',
            },
            onDelete: 'CASCADE',
            comment: 'Reference to the store',
        },
        sale_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'Business date (Turkey timezone)',
        },
        successful_order_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Number of successful (paid) orders on this date',
        },
        first_order_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp of the first order of the day',
        },
        last_order_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp of the most recent order',
        },
    },
    {
        tableName: 'store_daily_sales',
        timestamps: true,
        paranoid: false,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['store_id', 'sale_date'],
                name: 'idx_sds_store_date_unique',
            },
            {
                fields: ['sale_date'],
                name: 'idx_sds_date',
            },
            {
                fields: ['sale_date', 'successful_order_count'],
                name: 'idx_sds_date_count',
            },
        ],
    }
);

module.exports = StoreDailySales;
