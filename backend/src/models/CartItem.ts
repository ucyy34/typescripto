/**
 * CartItem Model
 * Individual items in a shopping cart
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface ICartItemAttributes extends Timestamps {
    id: string;
    cart_id: string;
    product_id: string;
    variant_id: string | null;
    quantity: number;
    price_cents: number;
}

export interface ICartItemCreationAttributes extends Optional<ICartItemAttributes, 'id' | 'variant_id' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class CartItem extends Model<ICartItemAttributes, ICartItemCreationAttributes> implements ICartItemAttributes {
    public id!: string;
    public cart_id!: string;
    public product_id!: string;
    public variant_id!: string | null;
    public quantity!: number;
    public price_cents!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

CartItem.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        cart_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'carts',
                key: 'id'
            },
            onDelete: 'CASCADE',
        },
        product_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id'
            },
            onDelete: 'CASCADE',
        },
        variant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'product_variants', // Note: This table name assumption based on standard naming, verify if migrating ProductVariant later
                key: 'id'
            }
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: {
                min: {
                    args: [1],
                    msg: 'Quantity must be at least 1'
                }
            }
        },
        price_cents: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Snapshot price at addition',
        },
    },
    {
        sequelize,
        modelName: 'CartItem',
        tableName: 'cart_items',
        timestamps: true,
        paranoid: false, // No soft delete for cart items
        indexes: [
            {
                fields: ['cart_id'],
            },
            {
                fields: ['product_id'],
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
