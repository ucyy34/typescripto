/**
 * CategoryVariant Model
 * Defines available variant types for each category
 * Example: "Clothing" category has variants like "Size" and "Color"
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export type CategoryVariantType = 'color' | 'text' | 'image';

export interface ICategoryVariantOption {
    label: string;
    value: string;
}

export interface ICategoryVariantAttributes extends Timestamps {
    id: string;
    category_id: string;
    name: string;
    type: CategoryVariantType;
    options: ICategoryVariantOption[];
    is_required: boolean;
    sort_order: number;
}

export interface ICategoryVariantCreationAttributes extends Optional<ICategoryVariantAttributes, 'id' | 'type' | 'options' | 'is_required' | 'sort_order' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class CategoryVariant extends Model<ICategoryVariantAttributes, ICategoryVariantCreationAttributes> implements ICategoryVariantAttributes {
    public id!: string;
    public category_id!: string;
    public name!: string;
    public type!: CategoryVariantType;
    public options!: ICategoryVariantOption[];
    public is_required!: boolean;
    public sort_order!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;
}

CategoryVariant.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        category_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'categories',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Variant type name (e.g., "Size", "Color", "Material")',
        },
        type: {
            type: DataTypes.ENUM('color', 'text', 'image'),
            defaultValue: 'text',
            comment: 'How the variant should be displayed',
        },
        options: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
            comment: 'Array of available options',
        },
        is_required: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Whether vendor must select this variant when creating product',
        },
        sort_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'Display order',
        },
    },
    {
        sequelize,
        modelName: 'CategoryVariant',
        tableName: 'category_variants',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                fields: ['category_id'],
            },
            {
                fields: ['category_id', 'name'],
                unique: true,
                name: 'unique_category_variant_name',
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);
