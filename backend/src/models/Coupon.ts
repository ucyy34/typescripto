/**
 * Coupon Model
 * Discount coupons for orders
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export type CouponDiscountType = 'percentage' | 'fixed' | 'free_shipping';
export type CouponApplicableTo = 'all' | 'products' | 'categories' | 'stores';

export interface ICouponAttributes extends Timestamps {
    id: string;
    code: string;
    name: string;
    description: string | null;
    discount_type: CouponDiscountType;
    discount_value: number;
    max_discount_amount: number | null;
    usage_limit: number | null;
    usage_limit_per_user: number;
    times_used: number;
    valid_from: Date;
    valid_until: Date | null;
    min_order_amount: number;
    applicable_to: CouponApplicableTo;
    applicable_ids: string[];
    first_order_only: boolean;
    is_active: boolean;
    created_by: string | null;
    notes: string | null;
}

export interface ICouponCreationAttributes extends Optional<ICouponAttributes, 'id' | 'description' | 'max_discount_amount' | 'usage_limit' | 'usage_limit_per_user' | 'times_used' | 'valid_from' | 'valid_until' | 'min_order_amount' | 'applicable_to' | 'applicable_ids' | 'first_order_only' | 'is_active' | 'created_by' | 'notes' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Coupon extends Model<ICouponAttributes, ICouponCreationAttributes> implements ICouponAttributes {
    public id!: string;
    public code!: string;
    public name!: string;
    public description!: string | null;
    public discount_type!: CouponDiscountType;
    public discount_value!: number;
    public max_discount_amount!: number | null;
    public usage_limit!: number | null;
    public usage_limit_per_user!: number;
    public times_used!: number;
    public valid_from!: Date;
    public valid_until!: Date | null;
    public min_order_amount!: number;
    public applicable_to!: CouponApplicableTo;
    public applicable_ids!: string[];
    public first_order_only!: boolean;
    public is_active!: boolean;
    public created_by!: string | null;
    public notes!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public isValidNow(): boolean {
        const now = new Date();
        if (this.valid_from && now < this.valid_from) return false;
        if (this.valid_until && now > this.valid_until) return false;
        return true;
    }

    public hasReachedLimit(): boolean {
        if (!this.usage_limit) return false;
        return this.times_used >= this.usage_limit;
    }

    public canBeApplied(options: { orderAmount?: number; userId?: string | null; userOrderCount?: number } = {}): { valid: boolean; error?: string } {
        const { orderAmount = 0, userOrderCount = 0 } = options;

        if (!this.is_active) return { valid: false, error: 'Coupon is not active' };
        if (!this.isValidNow()) return { valid: false, error: 'Coupon is expired or not yet valid' };
        if (this.hasReachedLimit()) return { valid: false, error: 'Coupon usage limit reached' };
        if (orderAmount < Number(this.min_order_amount)) {
            return { valid: false, error: `Minimum order amount is ₺${this.min_order_amount}` };
        }
        if (this.first_order_only && userOrderCount > 0) {
            return { valid: false, error: 'This coupon is only for first orders' };
        }

        return { valid: true };
    }

    public calculateDiscount(orderAmount: number): number {
        let discount = 0;

        if (this.discount_type === 'percentage') {
            discount = orderAmount * (Number(this.discount_value) / 100);
            if (this.max_discount_amount && discount > Number(this.max_discount_amount)) {
                discount = Number(this.max_discount_amount);
            }
        } else if (this.discount_type === 'fixed') {
            discount = Number(this.discount_value);
            if (discount > orderAmount) discount = orderAmount;
        }

        return parseFloat(discount.toFixed(2));
    }

    public getDisplayText(): string {
        if (this.discount_type === 'percentage') {
            let text = `${this.discount_value}% OFF`;
            if (this.max_discount_amount) text += ` (Max ₺${this.max_discount_amount})`;
            return text;
        } else if (this.discount_type === 'fixed') {
            return `₺${this.discount_value} OFF`;
        } else if (this.discount_type === 'free_shipping') {
            return 'FREE SHIPPING';
        }
        return '';
    }

    // Static Methods
    public static async findByCode(code: string): Promise<Coupon | null> {
        return this.findOne({ where: { code: code.toUpperCase() } });
    }

    public static async getActiveCoupons(): Promise<Coupon[]> {
        const now = new Date();
        return this.findAll({
            where: {
                is_active: true,
                valid_from: { [Op.lte]: now },
                [Op.or]: [
                    { valid_until: null },
                    { valid_until: { [Op.gte]: now } },
                ],
            },
            order: [['createdAt', 'DESC']],
        });
    }
}

Coupon.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: { len: { args: [3, 50], msg: 'Coupon code must be between 3 and 50 characters' } },
        },
        name: { type: DataTypes.STRING(200), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        discount_type: { type: DataTypes.ENUM('percentage', 'fixed', 'free_shipping'), allowNull: false, defaultValue: 'percentage' },
        discount_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
        max_discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        usage_limit: { type: DataTypes.INTEGER, allowNull: true },
        usage_limit_per_user: { type: DataTypes.INTEGER, defaultValue: 1 },
        times_used: { type: DataTypes.INTEGER, defaultValue: 0 },
        valid_from: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        valid_until: { type: DataTypes.DATE, allowNull: true },
        min_order_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
        applicable_to: { type: DataTypes.ENUM('all', 'products', 'categories', 'stores'), defaultValue: 'all' },
        applicable_ids: { type: DataTypes.ARRAY(DataTypes.UUID), defaultValue: [] },
        first_order_only: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        created_by: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
        sequelize,
        modelName: 'Coupon',
        tableName: 'coupons',
        timestamps: true,
        paranoid: true,
        indexes: [
            { unique: true, fields: ['code'], where: { deleted_at: null } },
            { fields: ['is_active'] },
            { fields: ['valid_from', 'valid_until'] },
            { fields: ['discount_type'] },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

// Hooks
Coupon.beforeValidate((coupon: Coupon) => {
    if (coupon.code) coupon.code = coupon.code.toUpperCase().trim();
});

Coupon.beforeSave((coupon: Coupon) => {
    if (coupon.discount_type === 'percentage' && Number(coupon.discount_value) > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
    }
    if (coupon.discount_type === 'free_shipping') coupon.discount_value = 0;
    if (coupon.valid_from && coupon.valid_until && coupon.valid_from > coupon.valid_until) {
        throw new Error('Start date cannot be after end date');
    }
});
