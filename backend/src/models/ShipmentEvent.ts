/**
 * ShipmentEvent Model
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface IShipmentEventAttributes extends Timestamps {
    id: string;
    shipment_id: string;
    code: string;
    description: string | null;
    location: string | null;
    occurred_at: Date;
    raw_payload: any | null;
}

export interface IShipmentEventCreationAttributes extends Optional<IShipmentEventAttributes, 'id' | 'description' | 'location' | 'raw_payload' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class ShipmentEvent extends Model<IShipmentEventAttributes, IShipmentEventCreationAttributes> implements IShipmentEventAttributes {
    public id!: string;
    public shipment_id!: string;
    public code!: string;
    public description!: string | null;
    public location!: string | null;
    public occurred_at!: Date;
    public raw_payload!: any | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

ShipmentEvent.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        shipment_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'shipments', key: 'id' }, onDelete: 'CASCADE' },
        code: { type: DataTypes.STRING(100), allowNull: false },
        description: { type: DataTypes.STRING(500), allowNull: true },
        location: { type: DataTypes.STRING(255), allowNull: true },
        occurred_at: { type: DataTypes.DATE, allowNull: false },
        raw_payload: { type: DataTypes.JSONB, allowNull: true },
    },
    {
        sequelize,
        modelName: 'ShipmentEvent',
        tableName: 'shipment_events',
        timestamps: true,
        indexes: [
            { fields: ['shipment_id'] },
            { fields: ['occurred_at'] },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
