/**
 * Cart Model
 * Represents a user's shopping cart
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface ICartAttributes extends Timestamps {
    id: string;
    user_id: string | null;
    guest_key: string | null;
}

export interface ICartCreationAttributes extends Optional<ICartAttributes, 'id' | 'user_id' | 'guest_key' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Cart extends Model<ICartAttributes, ICartCreationAttributes> implements ICartAttributes {
    public id!: string;
    public user_id!: string | null;
    public guest_key!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

Cart.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        guest_key: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
    },
    {
        sequelize,
        modelName: 'Cart',
        tableName: 'carts',
        timestamps: true,
        paranoid: true, // Soft delete enabled
        indexes: [
            {
                unique: true,
                fields: ['guest_key'],
            },
            {
                fields: ['user_id'],
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);
