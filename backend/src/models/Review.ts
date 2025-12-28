/**
 * Review Model
 * Product and store reviews/ratings
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface IReviewAttributes extends Timestamps {
    id: string;
    user_id: string;
    product_id: string | null;
    store_id: string | null;
    order_id: string | null;
    rating: number;
    title: string | null;
    comment: string | null;
    images: string[];
    is_verified_purchase: boolean;
    status: ReviewStatus;
    is_approved: boolean; // Deprecated
    rejection_reason: string | null;
    helpful_count: number;
    seller_response: string | null;
    seller_response_at: Date | null;
}

export interface IReviewCreationAttributes extends Optional<IReviewAttributes, 'id' | 'product_id' | 'store_id' | 'order_id' | 'title' | 'comment' | 'images' | 'is_verified_purchase' | 'status' | 'is_approved' | 'rejection_reason' | 'helpful_count' | 'seller_response' | 'seller_response_at' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Review extends Model<IReviewAttributes, IReviewCreationAttributes> implements IReviewAttributes {
    public id!: string;
    public user_id!: string;
    public product_id!: string | null;
    public store_id!: string | null;
    public order_id!: string | null;
    public rating!: number;
    public title!: string | null;
    public comment!: string | null;
    public images!: string[];
    public is_verified_purchase!: boolean;
    public status!: ReviewStatus;
    public is_approved!: boolean;
    public rejection_reason!: string | null;
    public helpful_count!: number;
    public seller_response!: string | null;
    public seller_response_at!: Date | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public isProductReview(): boolean {
        return this.product_id !== null;
    }

    public isStoreReview(): boolean {
        return this.store_id !== null;
    }

    public async addSellerResponse(response: string): Promise<void> {
        this.seller_response = response;
        this.seller_response_at = new Date();
        await this.save();
    }

    public async markAsHelpful(): Promise<void> {
        this.helpful_count += 1;
        await this.save();
    }

    // Static Methods
    public static async findForProduct(productId: string, options: any = {}): Promise<Review[]> {
        return this.findAll({
            where: { product_id: productId, is_approved: true },
            order: [['createdAt', 'DESC']],
            ...options,
        });
    }

    public static async findForStore(storeId: string, options: any = {}): Promise<Review[]> {
        return this.findAll({
            where: { store_id: storeId, is_approved: true },
            order: [['createdAt', 'DESC']],
            ...options,
        });
    }

    public static async getAverageRatingForProduct(productId: string): Promise<number> {
        const result = await this.findAll({
            where: { product_id: productId, is_approved: true },
            attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
            raw: true,
        }) as unknown as { avg_rating: string }[];

        return result[0]?.avg_rating ? parseFloat(parseFloat(result[0].avg_rating).toFixed(2)) : 0;
    }

    public static async getAverageRatingForStore(storeId: string): Promise<number> {
        const result = await this.findAll({
            where: { store_id: storeId, is_approved: true },
            attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']],
            raw: true,
        }) as unknown as { avg_rating: string }[];

        return result[0]?.avg_rating ? parseFloat(parseFloat(result[0].avg_rating).toFixed(2)) : 0;
    }
}

Review.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        product_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'products', key: 'id' }, onDelete: 'CASCADE' },
        store_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'stores', key: 'id' }, onDelete: 'CASCADE' },
        order_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'orders', key: 'id' }, onDelete: 'SET NULL' },
        rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: { args: [1], msg: 'Rating must be at least 1' }, max: { args: [5], msg: 'Rating cannot exceed 5' } } },
        title: { type: DataTypes.STRING(200), allowNull: true },
        comment: { type: DataTypes.TEXT, allowNull: true },
        images: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
        is_verified_purchase: { type: DataTypes.BOOLEAN, defaultValue: false },
        status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending', allowNull: false },
        is_approved: { type: DataTypes.BOOLEAN, defaultValue: false },
        rejection_reason: { type: DataTypes.TEXT, allowNull: true },
        helpful_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        seller_response: { type: DataTypes.TEXT, allowNull: true },
        seller_response_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
        sequelize,
        modelName: 'Review',
        tableName: 'reviews',
        timestamps: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['product_id'] },
            { fields: ['store_id'] },
            { fields: ['order_id'] },
            { fields: ['rating'] },
            { fields: ['is_approved'] },
            { fields: ['created_at'] },
        ],
        validate: {
            hasTarget() {
                if (!this.product_id && !this.store_id) throw new Error('Review must be for either a product or a store');
                if (this.product_id && this.store_id) throw new Error('Review cannot be for both product and store');
            },
        },
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
