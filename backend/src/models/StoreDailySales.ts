/**
 * StoreDailySales Model
 * Tracks daily successful order counts per store for siftah system
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface IStoreDailySalesAttributes extends Timestamps {
    id: string;
    store_id: string;
    sale_date: string; // DATEONLY is string in JS
    successful_order_count: number;
    first_order_at: Date | null;
    last_order_at: Date | null;
}

export interface IStoreDailySalesCreationAttributes extends Optional<IStoreDailySalesAttributes, 'id' | 'successful_order_count' | 'first_order_at' | 'last_order_at' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class StoreDailySales extends Model<IStoreDailySalesAttributes, IStoreDailySalesCreationAttributes> implements IStoreDailySalesAttributes {
    public id!: string;
    public store_id!: string;
    public sale_date!: string;
    public successful_order_count!: number;
    public first_order_at!: Date | null;
    public last_order_at!: Date | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

StoreDailySales.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        store_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'stores', key: 'id' }, onDelete: 'CASCADE' },
        sale_date: { type: DataTypes.DATEONLY, allowNull: false },
        successful_order_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        first_order_at: { type: DataTypes.DATE, allowNull: true },
        last_order_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
        sequelize,
        modelName: 'StoreDailySales',
        tableName: 'store_daily_sales',
        timestamps: true,
        paranoid: false,
        indexes: [
            { unique: true, fields: ['store_id', 'sale_date'], name: 'idx_sds_store_date_unique' },
            { fields: ['sale_date'], name: 'idx_sds_date' },
            { fields: ['sale_date', 'successful_order_count'], name: 'idx_sds_date_count' },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
