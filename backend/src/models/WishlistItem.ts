/**
 * WishlistItem Model
 * Stores products saved by users for later
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface IWishlistItemAttributes extends Timestamps {
    id: string;
    user_id: string;
    product_id: string;
    metadata: any | null; // JSONB
}

export interface IWishlistItemCreationAttributes extends Optional<IWishlistItemAttributes, 'id' | 'metadata' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class WishlistItem extends Model<IWishlistItemAttributes, IWishlistItemCreationAttributes> implements IWishlistItemAttributes {
    public id!: string;
    public user_id!: string;
    public product_id!: string;
    public metadata!: any | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

WishlistItem.init(
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
        },
        product_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Optional client-side metadata for display fallbacks',
        },
    },
    {
        sequelize,
        modelName: 'WishlistItem',
        tableName: 'wishlist_items',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'product_id'],
            },
            {
                fields: ['product_id'],
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
