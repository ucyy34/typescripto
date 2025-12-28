/**
 * Category Model
 * Product categories with hierarchical structure (parent-child)
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import slugify from 'slugify';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface ICategoryAttributes extends Timestamps {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    icon: string | null;
    parent_id: string | null;
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
    commission_rate: number | null;
    meta_title: string | null;
    meta_description: string | null;
}

export interface ICategoryCreationAttributes extends Optional<ICategoryAttributes, 'id' | 'slug' | 'description' | 'image' | 'icon' | 'parent_id' | 'is_active' | 'is_featured' | 'sort_order' | 'commission_rate' | 'meta_title' | 'meta_description' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Category extends Model<ICategoryAttributes, ICategoryCreationAttributes> implements ICategoryAttributes {
    public id!: string;
    public name!: string;
    public slug!: string;
    public description!: string | null;
    public image!: string | null;
    public icon!: string | null;
    public parent_id!: string | null;
    public is_active!: boolean;
    public is_featured!: boolean;
    public sort_order!: number;
    public commission_rate!: number | null;
    public meta_title!: string | null;
    public meta_description!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public isTopLevel(): boolean {
        return this.parent_id === null;
    }

    public async getFullPath(): Promise<string> {
        const path = [this.name];
        let current: Category | null = this;

        while (current && current.parent_id) {
            current = await Category.findByPk(current.parent_id);
            if (current) {
                path.unshift(current.name);
            }
        }

        return path.join(' > ');
    }

    // Static Methods
    public static async getTopLevel(options: any = {}): Promise<Category[]> {
        return this.findAll({
            where: { parent_id: null, is_active: true },
            order: [['sort_order', 'ASC'], ['name', 'ASC']],
            ...options,
        });
    }

    public static async getTree(): Promise<Category[]> {
        const categories = await this.findAll({
            where: { is_active: true },
            order: [['sort_order', 'ASC'], ['name', 'ASC']],
            include: [
                {
                    model: Category,
                    as: 'children',
                    where: { is_active: true },
                    required: false,
                    include: [
                        {
                            model: Category,
                            as: 'children',
                            where: { is_active: true },
                            required: false,
                        },
                    ],
                },
            ],
        });

        return categories.filter((cat) => cat.parent_id === null);
    }

    public static async findBySlug(slug: string): Promise<Category | null> {
        return this.findOne({ where: { slug } });
    }

    public static async getFeatured(): Promise<Category[]> {
        return this.findAll({
            where: { is_featured: true, is_active: true },
            order: [['sort_order', 'ASC']],
            limit: 10,
        });
    }
}

Category.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                len: {
                    args: [2, 100],
                    msg: 'Category name must be between 2 and 100 characters',
                },
            },
        },
        slug: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        image: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        icon: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Icon class or emoji for category',
        },
        parent_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'categories',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_featured: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        sort_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: 'For custom sorting',
        },
        commission_rate: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            defaultValue: null,
            comment: 'Category-specific commission rate (overrides global)',
            validate: {
                min: 0,
                max: 100,
            },
        },
        meta_title: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'SEO meta title',
        },
        meta_description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'SEO meta description',
        },
    },
    {
        sequelize,
        modelName: 'Category',
        tableName: 'categories',
        indexes: [
            {
                unique: true,
                fields: ['slug'],
            },
            {
                fields: ['parent_id'],
            },
            {
                fields: ['is_active'],
            },
            {
                fields: ['is_featured'],
            },
            {
                fields: ['sort_order'],
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

// Self-referencing associations
Category.hasMany(Category, {
    as: 'children',
    foreignKey: 'parent_id',
});

Category.belongsTo(Category, {
    as: 'parent',
    foreignKey: 'parent_id',
});

// Hooks
Category.beforeCreate(async (category: Category) => {
    if (!category.slug && category.name) {
        let slug = slugify(category.name, { lower: true, strict: true });

        const existing = await Category.findOne({ where: { slug } });
        if (existing) {
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            slug = `${slug}-${randomSuffix}`;
        }

        category.slug = slug;
    }
});

Category.beforeUpdate(async (category: Category) => {
    if (category.changed('name')) {
        let slug = slugify(category.name, { lower: true, strict: true });

        const existing = await Category.findOne({
            where: {
                slug,
                id: { [Op.ne]: category.id },
            },
        });

        if (existing) {
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            slug = `${slug}-${randomSuffix}`;
        }

        category.slug = slug;
    }
});
