/**
 * OrderItem Model
 * Individual items within an order
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface IProductSnapshot {
    title: string;
    sku: string | null;
    image: string | null;
}

export interface IOrderItemAttributes extends Timestamps {
    id: string;
    order_id: string;
    product_id: string;
    vendor_id: string;
    product_snapshot: IProductSnapshot;
    quantity: number;
    unit_amount_cents: number;
    line_total_amount_cents: number;
    currency: string;
    price: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
}

export interface IOrderItemCreationAttributes extends Optional<IOrderItemAttributes, 'id' | 'line_total_amount_cents' | 'currency' | 'discount' | 'tax' | 'total' | 'price' | 'subtotal' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class OrderItem extends Model<IOrderItemAttributes, IOrderItemCreationAttributes> implements IOrderItemAttributes {
    public id!: string;
    public order_id!: string;
    public product_id!: string;
    public vendor_id!: string;
    public product_snapshot!: IProductSnapshot;
    public quantity!: number;
    public unit_amount_cents!: number;
    public line_total_amount_cents!: number;
    public currency!: string;
    public price!: number;
    public subtotal!: number;
    public discount!: number;
    public tax!: number;
    public total!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public calculateTotals(): void {
        // Source of Truth: Integer Math
        this.line_total_amount_cents = this.unit_amount_cents * this.quantity;

        // Sync to Legacy Decimal Fields for UI
        this.price = this.unit_amount_cents / 100;
        this.subtotal = this.line_total_amount_cents / 100;

        const taxVal = Number(this.tax || 0);
        const discountVal = Number(this.discount || 0);
        this.total = this.subtotal + taxVal - discountVal;
    }
}

OrderItem.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        order_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'orders',
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
            onDelete: 'RESTRICT',
        },
        vendor_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'stores',
                key: 'id'
            },
            onDelete: 'RESTRICT',
            comment: 'Vendor/Store this item belongs to',
        },
        product_snapshot: {
            type: DataTypes.JSONB,
            allowNull: false,
            comment: 'Product display info (title, sku, image)',
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: {
                    args: [1],
                    msg: 'Quantity must be at least 1',
                },
            },
        },
        // Strict Integer Financials
        unit_amount_cents: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Unit price in cents (Source of Truth)',
        },
        line_total_amount_cents: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'quantity * unit_amount_cents (Source of Truth)',
        },
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'TRY',
        },

        // Derived/Legacy UI Fields (Populated/Derived from cents)
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Legacy: derived from unit_amount_cents / 100',
        },
        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Legacy: derived',
        },
        discount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
        },
        tax: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
        },
        total: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'order_items',
        indexes: [
            {
                fields: ['order_id'],
            },
            {
                fields: ['product_id'],
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

// Hooks
OrderItem.beforeSave(async (orderItem: OrderItem) => {
    orderItem.calculateTotals();
});


