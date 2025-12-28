/**
 * Product Model
 * Represents products listed by stores
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import slugify from 'slugify';
import { sequelize } from '../config/sequelize';
import { ProductStatus, Timestamps } from './types/model.types';

export interface IProductAttributes extends Timestamps {
    id: string;
    store_id: string;
    category_id: string;
    title: string;
    slug: string;
    description: string | null;
    short_description: string | null;
    sku: string | null;
    price: number;
    compare_price: number | null;
    cost_price: number | null;
    stock: number;
    low_stock_threshold: number;
    images: string[];
    status: ProductStatus;
    rejection_reason: string | null;
    is_active: boolean;
    is_featured: boolean;
    weight: number | null;
    dimensions: any | null; // JSONB
    material: string | null;
    technique: string | null;
    attributes: any; // JSONB
    seo_title: string | null;
    seo_description: string | null;
    meta_keywords: string[];
    tags: string[];
    badges: string[]; // JSONB
    rating: number;
    total_reviews: number;
    total_sales: number;
    views_count: number;
    approved_at: Date | null;
    approved_by: string | null;
}

export interface IProductCreationAttributes extends Optional<IProductAttributes, 'id' | 'description' | 'short_description' | 'sku' | 'compare_price' | 'cost_price' | 'stock' | 'low_stock_threshold' | 'images' | 'status' | 'rejection_reason' | 'is_active' | 'is_featured' | 'weight' | 'dimensions' | 'material' | 'technique' | 'attributes' | 'seo_title' | 'seo_description' | 'meta_keywords' | 'tags' | 'badges' | 'rating' | 'total_reviews' | 'total_sales' | 'views_count' | 'approved_at' | 'approved_by' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Product extends Model<IProductAttributes, IProductCreationAttributes> implements IProductAttributes {
    public id!: string;
    public store_id!: string;
    public category_id!: string;
    public title!: string;
    public slug!: string;
    public description!: string | null;
    public short_description!: string | null;
    public sku!: string | null;
    public price!: number;
    public compare_price!: number | null;
    public cost_price!: number | null;
    public stock!: number;
    public low_stock_threshold!: number;
    public images!: string[];
    public status!: ProductStatus;
    public rejection_reason!: string | null;
    public is_active!: boolean;
    public is_featured!: boolean;
    public weight!: number | null;
    public dimensions!: any | null;
    public material!: string | null;
    public technique!: string | null;
    public attributes!: any;
    public seo_title!: string | null;
    public seo_description!: string | null;
    public meta_keywords!: string[];
    public tags!: string[];
    public badges!: string[];
    public rating!: number;
    public total_reviews!: number;
    public total_sales!: number;
    public views_count!: number;
    public approved_at!: Date | null;
    public approved_by!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public isAvailable(): boolean {
        return this.is_active && this.status === 'approved' && this.stock > 0;
    }

    public isLowStock(): boolean {
        return this.stock <= this.low_stock_threshold && this.stock > 0;
    }

    public isOutOfStock(): boolean {
        return this.stock === 0;
    }

    public getDiscountPercentage(): number | null {
        if (this.compare_price && this.compare_price > this.price) {
            return Math.round(((this.compare_price - this.price) / this.compare_price) * 100);
        }
        return null;
    }

    public async decreaseStock(quantity: number): Promise<boolean> {
        if (this.stock >= quantity) {
            this.stock -= quantity;
            this.total_sales += quantity;
            await this.save();
            return true;
        }
        return false;
    }

    public async increaseStock(quantity: number): Promise<void> {
        this.stock += quantity;
        await this.save();
    }

    public async incrementViews(): Promise<void> {
        this.views_count += 1;
        await this.save({ silent: true }); // Don't update updatedAt (or update updatedAt but keep updated_at in logic if needed, but Sequelize handles timestamps)
    }

    public async updateRating(newRating: number): Promise<void> {
        const totalRating = Number(this.rating) * this.total_reviews + newRating;
        this.total_reviews += 1;
        this.rating = Number((totalRating / this.total_reviews).toFixed(2));
        await this.save();
    }

    // Static Methods
    public static async findAvailable(options: any = {}): Promise<Product[]> {
        return this.findAll({
            where: {
                is_active: true,
                status: 'approved',
                stock: { [Op.gt]: 0 },
            },
            ...options,
        });
    }

    public static async findBySlug(slug: string): Promise<Product | null> {
        return this.findOne({ where: { slug } });
    }

    public static async findFeatured(limit: number = 10): Promise<Product[]> {
        return this.findAll({
            where: {
                is_featured: true,
                is_active: true,
                status: 'approved',
                stock: { [Op.gt]: 0 },
            },
            order: [['total_sales', 'DESC']],
            limit,
        });
    }

    public static async findBestSellers(limit: number = 10): Promise<Product[]> {
        return this.findAll({
            where: {
                is_active: true,
                status: 'approved',
                stock: { [Op.gt]: 0 },
            },
            order: [['total_sales', 'DESC']],
            limit,
        });
    }

    public static async search(query: string, options: any = {}): Promise<Product[]> {
        return this.findAll({
            where: {
                title: {
                    [Op.iLike]: `%${query}%`,
                },
                is_active: true,
                status: 'approved',
                stock: { [Op.gt]: 0 },
            },
            ...options,
        });
    }
}

Product.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        store_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'stores',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        category_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'categories',
                key: 'id',
            },
            onDelete: 'RESTRICT',
        },
        title: {
            type: DataTypes.STRING(300),
            allowNull: false,
            validate: {
                len: {
                    args: [5, 300],
                    msg: 'Product title must be between 5 and 300 characters',
                },
            },
        },
        slug: {
            type: DataTypes.STRING(350),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        short_description: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        sku: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Stock Keeping Unit',
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: {
                    args: [0],
                    msg: 'Price cannot be negative',
                },
            },
        },
        compare_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Original price for discount display',
        },
        cost_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Cost to seller (not shown to buyers)',
        },
        stock: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            validate: {
                min: {
                    args: [0],
                    msg: 'Stock cannot be negative',
                },
            },
        },
        low_stock_threshold: {
            type: DataTypes.INTEGER,
            defaultValue: 10,
            comment: 'Alert seller when stock reaches this level',
        },
        images: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
            comment: 'Array of image URLs',
        },
        status: {
            type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
            defaultValue: 'pending',
            allowNull: false,
        },
        rejection_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_featured: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        weight: {
            type: DataTypes.DECIMAL(8, 2),
            allowNull: true,
            comment: 'Weight in kg for shipping calculation',
        },
        dimensions: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Length, width, height in cm',
        },
        material: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'Product material (e.g., wood, ceramic, glass)',
        },
        technique: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'Crafting technique (e.g., hand-carved, blown glass)',
        },
        attributes: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Product-specific attributes (color, size, material, etc.)',
        },
        seo_title: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: 'SEO optimized title for search engines (50-60 chars)',
        },
        seo_description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'SEO meta description for search engines (150-160 chars)',
        },
        meta_keywords: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
            comment: 'SEO keywords for search engines',
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
        },
        badges: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Product badges like handmade, limited, eco-friendly, spiritual, traditional',
        },
        rating: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 0.0,
            validate: {
                min: 0,
                max: 5,
            },
        },
        total_reviews: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        total_sales: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        views_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        approved_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        approved_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
    },
    {
        sequelize,
        tableName: 'products',
        timestamps: true,
        paranoid: true, // Enable soft deletes
        indexes: [
            {
                unique: true,
                fields: ['slug'],
            },
            {
                fields: ['store_id'],
            },
            {
                fields: ['category_id'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['is_active'],
            },
            {
                fields: ['is_featured'],
            },
            {
                fields: ['price'],
            },
            {
                fields: ['rating'],
            },
            {
                fields: ['total_sales'],
            },
            {
                fields: ['createdAt'], // Standardizing on createdAt
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

// Hooks
Product.beforeCreate(async (product: Product) => {
    if (!product.slug && product.title) {
        let slug = slugify(product.title, { lower: true, strict: true });

        // Ensure slug is unique
        const existing = await Product.findOne({ where: { slug } });
        if (existing) {
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            slug = `${slug}-${randomSuffix}`;
        }

        product.slug = slug;
    }
});

Product.beforeUpdate(async (product: Product) => {
    if (product.changed('title')) {
        let slug = slugify(product.title, { lower: true, strict: true });

        // Ensure slug is unique
        const existing = await Product.findOne({
            where: {
                slug,
                id: { [Op.ne]: product.id },
            },
        });

        if (existing) {
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            slug = `${slug}-${randomSuffix}`;
        }

        product.slug = slug;
    }

    // Set approved_at when status changes to approved
    if (product.changed('status') && product.status === 'approved' && !product.approved_at) {
        product.approved_at = new Date();
    }
});


