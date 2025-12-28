/**
 * Shipment Model
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';
import { JsonValue } from './types/json.types';

export type ShipmentStatus = 'created' | 'ready_for_pickup' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';

export interface IShipmentDimensions {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
}

export interface IShipmentAddress {
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
    [key: string]: JsonValue | undefined;
}

export interface IShipmentAttributes extends Timestamps {
    id: string;
    order_id: string;
    store_id: string;
    carrier: string;
    service: string;
    tracking_number: string;
    label_url: string | null;
    cost: number;
    currency: string;
    status: ShipmentStatus;
    total_weight: number | null;
    dimensions: IShipmentDimensions | null;
    shipping_address: IShipmentAddress | null;
}

export interface IShipmentCreationAttributes extends Optional<IShipmentAttributes, 'id' | 'carrier' | 'service' | 'label_url' | 'cost' | 'currency' | 'status' | 'total_weight' | 'dimensions' | 'shipping_address' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Shipment extends Model<IShipmentAttributes, IShipmentCreationAttributes> implements IShipmentAttributes {
    public id!: string;
    public order_id!: string;
    public store_id!: string;
    public carrier!: string;
    public service!: string;
    public tracking_number!: string;
    public label_url!: string | null;
    public cost!: number;
    public currency!: string;
    public status!: ShipmentStatus;
    public total_weight!: number | null;
    public dimensions!: IShipmentDimensions | null;
    public shipping_address!: IShipmentAddress | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

Shipment.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        order_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'RESTRICT' },
        store_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'stores', key: 'id' }, onDelete: 'RESTRICT' },
        carrier: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'MockExpress' },
        service: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'STANDARD' },
        tracking_number: { type: DataTypes.STRING(150), allowNull: false, unique: true },
        label_url: { type: DataTypes.STRING(500), allowNull: true },
        cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.0 },
        currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'TRY' },
        status: { type: DataTypes.ENUM('created', 'ready_for_pickup', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled'), allowNull: false, defaultValue: 'created' },
        total_weight: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        dimensions: { type: DataTypes.JSONB, allowNull: true },
        shipping_address: { type: DataTypes.JSONB, allowNull: true },
    },
    {
        sequelize,
        modelName: 'Shipment',
        tableName: 'shipments',
        timestamps: true,
        indexes: [
            { fields: ['order_id'] },
            { fields: ['store_id'] },
            { fields: ['tracking_number'], unique: true },
            { fields: ['status'] },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
