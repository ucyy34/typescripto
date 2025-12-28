/**
 * CouponUsage Model
 * Track coupon usage by users
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export interface ICouponUsageAttributes extends Timestamps {
    id: string;
    coupon_id: string;
    user_id: string | null;
    order_id: string;
    discount_amount: number;
    order_total: number;
    final_total: number;
    used_at: Date;
}

export interface ICouponUsageCreationAttributes extends Optional<ICouponUsageAttributes, 'id' | 'user_id' | 'used_at' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class CouponUsage extends Model<ICouponUsageAttributes, ICouponUsageCreationAttributes> implements ICouponUsageAttributes {
    public id!: string;
    public coupon_id!: string;
    public user_id!: string | null;
    public order_id!: string;
    public discount_amount!: number;
    public order_total!: number;
    public final_total!: number;
    public used_at!: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Static Methods
    public static async getUserUsageCount(couponId: string, userId: string | null): Promise<number> {
        if (!userId) return 0;
        return this.count({ where: { coupon_id: couponId, user_id: userId } });
    }

    public static async getTotalUsageCount(couponId: string): Promise<number> {
        return this.count({ where: { coupon_id: couponId } });
    }

    public static async getUserHistory(userId: string): Promise<CouponUsage[]> {
        return this.findAll({
            where: { user_id: userId },
            include: [{ association: 'coupon', attributes: ['code', 'name', 'discount_type', 'discount_value'] }],
            order: [['used_at', 'DESC']],
            limit: 50,
        });
    }
}

CouponUsage.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        coupon_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'coupons', key: 'id' }, onDelete: 'CASCADE' },
        user_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        order_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
        discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        order_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        final_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        used_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
        sequelize,
        modelName: 'CouponUsage',
        tableName: 'coupon_usages',
        timestamps: true,
        updatedAt: false,
        indexes: [
            { fields: ['coupon_id'] },
            { fields: ['user_id'] },
            { fields: ['order_id'] },
            { fields: ['used_at'] },
            { unique: true, fields: ['order_id', 'coupon_id'] },
        ],
        createdAt: 'created_at',
    }
);
