/**
 * ProductVariant Model
 * Stores individual variant combinations for each product
 * Example: A t-shirt has variants like "Black-L", "Black-M", "White-L"
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface IProductVariantSelectedOption {
    label: string;
    value: string;
}

export interface IProductVariantAttributes extends Timestamps {
    id: string;
    product_id: string;
    sku: string | null;
    color_hex: string | null;
    color_name: string | null;
    variant_type: string | null;
    variant_value: string | null;
    price: number;
    stock: number;
    image_url: string | null;
    discount_percent: number | null;
    discount_ends_at: Date | null;
    is_active: boolean;
    // Legacy fields
    category_variant_id: string | null;
    variant_name: string | null;
    selected_options: IProductVariantSelectedOption[] | null;
}

export interface IProductVariantCreationAttributes extends Optional<IProductVariantAttributes, 'id' | 'sku' | 'color_hex' | 'color_name' | 'variant_type' | 'variant_value' | 'stock' | 'image_url' | 'discount_percent' | 'discount_ends_at' | 'is_active' | 'category_variant_id' | 'variant_name' | 'selected_options' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class ProductVariant extends Model<IProductVariantAttributes, IProductVariantCreationAttributes> implements IProductVariantAttributes {
    public id!: string;
    public product_id!: string;
    public sku!: string | null;
    public color_hex!: string | null;
    public color_name!: string | null;
    public variant_type!: string | null;
    public variant_value!: string | null;
    public price!: number;
    public stock!: number;
    public image_url!: string | null;
    public discount_percent!: number | null;
    public discount_ends_at!: Date | null;
    public is_active!: boolean;
    public category_variant_id!: string | null;
    public variant_name!: string | null;
    public selected_options!: IProductVariantSelectedOption[] | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public getEffectivePrice(): number {
        if (this.discount_percent && this.discount_ends_at && new Date() < this.discount_ends_at) {
            return this.price * (1 - this.discount_percent / 100);
        }
        return this.price;
    }

    public isInStock(): boolean {
        return this.is_active && this.stock > 0;
    }
}

ProductVariant.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
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
        sku: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
            comment: 'SKU code for this variant (e.g., DC-2024-SYH-L)',
        },
        color_hex: {
            type: DataTypes.STRING(7),
            allowNull: true,
            comment: 'Hex color code (e.g., #000000)',
        },
        color_name: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Color name (e.g., Siyah)',
        },
        variant_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Variant type key (e.g., beden, boyut, agirlik)',
        },
        variant_value: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Selected value (e.g., L, 100g, Küçük)',
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Variant price',
        },
        stock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Variant stock quantity',
        },
        image_url: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Optional variant-specific image',
        },
        discount_percent: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: 'Discount percentage (e.g., 20.00 for 20%)',
        },
        discount_ends_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'When the discount expires',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: 'Whether this variant is available for purchase',
        },
        category_variant_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'category_variants',
                key: 'id',
            },
            onDelete: 'SET NULL',
            comment: 'Legacy: Links to category variant (deprecated)',
        },
        variant_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Legacy: Cached variant name',
        },
        selected_options: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
            comment: 'Legacy: Array of selected options',
        },
    },
    {
        sequelize,
        modelName: 'ProductVariant',
        tableName: 'product_variants',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                fields: ['product_id'],
            },
            {
                fields: ['sku'],
                unique: true,
                name: 'unique_product_variant_sku',
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);
