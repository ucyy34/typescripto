/**
 * Wishlist Model
 * Stores products favourited by a user
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface IWishlistAttributes extends Timestamps {
    id: string;
    user_id: string;
    product_id: string;
}

export interface IWishlistCreationAttributes extends Optional<IWishlistAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Wishlist extends Model<IWishlistAttributes, IWishlistCreationAttributes> implements IWishlistAttributes {
    public id!: string;
    public user_id!: string;
    public product_id!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

Wishlist.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        product_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
    },
    {
        sequelize,
        modelName: 'Wishlist',
        tableName: 'wishlists',
        underscored: true,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['user_id', 'product_id'],
                name: 'wishlists_user_product_unique',
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
