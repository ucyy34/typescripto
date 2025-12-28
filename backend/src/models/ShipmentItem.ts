/**
 * ShipmentItem Model
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface IShipmentItemAttributes extends Timestamps {
    id: string;
    shipment_id: string;
    order_item_id: string | null;
    qty: number;
    snapshot: any | null;
}

export interface IShipmentItemCreationAttributes extends Optional<IShipmentItemAttributes, 'id' | 'order_item_id' | 'qty' | 'snapshot' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class ShipmentItem extends Model<IShipmentItemAttributes, IShipmentItemCreationAttributes> implements IShipmentItemAttributes {
    public id!: string;
    public shipment_id!: string;
    public order_item_id!: string | null;
    public qty!: number;
    public snapshot!: any | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

ShipmentItem.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        shipment_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'shipments', key: 'id' }, onDelete: 'CASCADE' },
        order_item_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'order_items', key: 'id' }, onDelete: 'SET NULL' },
        qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        snapshot: { type: DataTypes.JSONB, allowNull: true, comment: 'Optional snapshot of order item at shipping time' },
    },
    {
        sequelize,
        modelName: 'ShipmentItem',
        tableName: 'shipment_items',
        timestamps: true,
        indexes: [
            { fields: ['shipment_id'] },
            { fields: ['order_item_id'] },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
