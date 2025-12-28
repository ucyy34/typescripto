/**
 * Store Model
 * Represents seller stores in the marketplace
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import slugify from 'slugify';
import { sequelize } from '../config/sequelize';
import { StoreStatus, Timestamps } from './types/model.types';

export interface IStoreSettings {
    allow_reviews: boolean;
    auto_accept_orders: boolean;
    minimum_order_amount: number;
    shipping_fee: number;
    free_shipping_threshold: number;
}

export interface IBankAccount {
    holder_name: string;
    bank_name: string;
    iban: string;
}

export interface IStoreAttributes extends Timestamps {
    id: string;
    user_id: string;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    banner: string | null;
    status: StoreStatus;
    rejection_reason: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    country: string;
    postal_code: string | null;
    tax_number: string | null;
    bank_account: IBankAccount | null;
    settings: IStoreSettings;
    rating: number;
    total_reviews: number;
    total_sales: number;
    is_featured: boolean;
    approved_at: Date | null;
    approved_by: string | null;
    shipping_cost: number | null;
    free_shipping_threshold: number | null;
    is_free_shipping: boolean;
}

export interface IStoreCreationAttributes extends Optional<IStoreAttributes, 'id' | 'description' | 'logo' | 'banner' | 'rejection_reason' | 'phone' | 'email' | 'address' | 'city' | 'postal_code' | 'tax_number' | 'bank_account' | 'settings' | 'rating' | 'total_reviews' | 'total_sales' | 'is_featured' | 'approved_at' | 'approved_by' | 'shipping_cost' | 'free_shipping_threshold' | 'is_free_shipping' | 'country' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Store extends Model<IStoreAttributes, IStoreCreationAttributes> implements IStoreAttributes {
    public id!: string;
    public user_id!: string;
    public name!: string;
    public slug!: string;
    public description!: string | null;
    public logo!: string | null;
    public banner!: string | null;
    public status!: StoreStatus;
    public rejection_reason!: string | null;
    public phone!: string | null;
    public email!: string | null;
    public address!: string | null;
    public city!: string | null;
    public country!: string;
    public postal_code!: string | null;
    public tax_number!: string | null;
    public bank_account!: IBankAccount | null;
    public settings!: IStoreSettings;
    public rating!: number;
    public total_reviews!: number;
    public total_sales!: number;
    public is_featured!: boolean;
    public approved_at!: Date | null;
    public approved_by!: string | null;
    public shipping_cost!: number | null;
    public free_shipping_threshold!: number | null;
    public is_free_shipping!: boolean;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public isActive(): boolean {
        return this.status === 'approved';
    }

    public getFullAddress(): string {
        const parts = [this.address, this.city, this.postal_code, this.country].filter(Boolean);
        return parts.join(', ');
    }

    public async updateRating(newRating: number): Promise<void> {
        const totalRating = Number(this.rating) * this.total_reviews + newRating;
        this.total_reviews += 1;
        this.rating = Number((totalRating / this.total_reviews).toFixed(2));
        await this.save();
    }

    // Static Methods
    public static async findApproved(options: any = {}): Promise<Store[]> {
        return this.findAll({
            where: { status: 'approved' },
            ...options,
        });
    }

    public static async findPending(options: any = {}): Promise<Store[]> {
        return this.findAll({
            where: { status: 'pending' },
            order: [['createdAt', 'ASC']], // Note: JS used 'created_at', but standard TS models use 'createdAt' unless underscored: true
            ...options,
        });
    }

    public static async findBySlug(slug: string): Promise<Store | null> {
        return this.findOne({ where: { slug } });
    }
}

Store.init(
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
        name: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: {
                len: {
                    args: [3, 200],
                    msg: 'Store name must be between 3 and 200 characters',
                },
            },
        },
        slug: {
            type: DataTypes.STRING(250),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        logo: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        banner: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
            defaultValue: 'pending',
            allowNull: false,
        },
        rejection_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
            validate: {
                isEmail: {
                    msg: 'Must be a valid email address',
                },
            },
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        country: {
            type: DataTypes.STRING(100),
            defaultValue: 'Turkey',
        },
        postal_code: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },
        tax_number: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        bank_account: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Bank account details for payouts',
        },
        settings: {
            type: DataTypes.JSONB,
            defaultValue: {
                allow_reviews: true,
                auto_accept_orders: false,
                minimum_order_amount: 0,
                shipping_fee: 0,
                free_shipping_threshold: 0,
            },
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
        is_featured: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
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
        shipping_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Custom shipping cost for this store (null = use platform default)',
        },
        free_shipping_threshold: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Order amount above which shipping support is free',
        },
        is_free_shipping: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: 'Always offer free shipping support',
        },
    },
    {
        sequelize,
        tableName: 'stores',
        indexes: [
            {
                unique: true,
                fields: ['slug'],
            },
            {
                fields: ['user_id'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['is_featured'],
            },
            {
                fields: ['rating'],
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

// Hooks
Store.beforeCreate(async (store: Store) => {
    if (!store.slug && store.name) {
        let slug = slugify(store.name, { lower: true, strict: true });

        // Check if slug exists, add suffix if needed
        const existingStore = await Store.findOne({ where: { slug } });
        if (existingStore) {
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            slug = `${slug}-${randomSuffix}`;
        }

        store.slug = slug;
    }
});

Store.beforeUpdate(async (store: Store) => {
    if (store.changed('name')) {
        let slug = slugify(store.name, { lower: true, strict: true });

        // Ensure slug is unique
        const existingStore = await Store.findOne({
            where: {
                slug,
                id: { [Op.ne]: store.id },
            },
        });

        if (existingStore) {
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            slug = `${slug}-${randomSuffix}`;
        }

        store.slug = slug;
    }

    // Set approved_at when status changes to approved
    if (store.changed('status') && store.status === 'approved' && !store.approved_at) {
        store.approved_at = new Date();
    }
});


