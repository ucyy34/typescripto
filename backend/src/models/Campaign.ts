/**
 * Campaign Model
 * Marketing campaigns for products and categories
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export type CampaignType = 'FLASH_SALE' | 'BUY_X_GET_Y' | 'CATEGORY_DISCOUNT' | 'FREE_SHIPPING' | 'BUNDLE_DEAL' | 'GIFT_WITH_PURCHASE' | 'MINIMUM_PURCHASE';
export type CampaignDiscountType = 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y';
export type CampaignApplicableTo = 'products' | 'categories' | 'all_store' | 'entire_platform';
export type CampaignApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ICampaignAttributes extends Timestamps {
    id: string;
    name: string;
    description: string | null;
    campaign_type: CampaignType;
    discount_type: CampaignDiscountType;
    discount_value: number;
    max_discount_amount: number | null;
    buy_quantity: number | null;
    get_quantity: number | null;
    gift_product_ids: string[];
    start_date: Date;
    end_date: Date;
    min_order_amount: number;
    min_quantity: number;
    applicable_to: CampaignApplicableTo;
    product_ids: string[];
    category_ids: string[];
    created_by: string;
    store_id: string | null;
    badge_text: string | null;
    badge_color: string;
    show_countdown: boolean;
    priority: number;
    usage_limit: number | null;
    usage_count: number;
    max_uses_per_user: number;
    is_active: boolean;
    is_featured: boolean;
    approval_status: CampaignApprovalStatus;
    rejection_reason: string | null;
    view_count: number;
    click_count: number;
    conversion_count: number;
    total_revenue: number;
    notes: string | null;
}

export interface ICampaignCreationAttributes extends Optional<ICampaignAttributes, 'id' | 'description' | 'discount_type' | 'discount_value' | 'max_discount_amount' | 'buy_quantity' | 'get_quantity' | 'gift_product_ids' | 'start_date' | 'min_order_amount' | 'min_quantity' | 'applicable_to' | 'product_ids' | 'category_ids' | 'store_id' | 'badge_text' | 'badge_color' | 'show_countdown' | 'priority' | 'usage_limit' | 'usage_count' | 'max_uses_per_user' | 'is_active' | 'is_featured' | 'approval_status' | 'rejection_reason' | 'view_count' | 'click_count' | 'conversion_count' | 'total_revenue' | 'notes' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Campaign extends Model<ICampaignAttributes, ICampaignCreationAttributes> implements ICampaignAttributes {
    public id!: string;
    public name!: string;
    public description!: string | null;
    public campaign_type!: CampaignType;
    public discount_type!: CampaignDiscountType;
    public discount_value!: number;
    public max_discount_amount!: number | null;
    public buy_quantity!: number | null;
    public get_quantity!: number | null;
    public gift_product_ids!: string[];
    public start_date!: Date;
    public end_date!: Date;
    public min_order_amount!: number;
    public min_quantity!: number;
    public applicable_to!: CampaignApplicableTo;
    public product_ids!: string[];
    public category_ids!: string[];
    public created_by!: string;
    public store_id!: string | null;
    public badge_text!: string | null;
    public badge_color!: string;
    public show_countdown!: boolean;
    public priority!: number;
    public usage_limit!: number | null;
    public usage_count!: number;
    public max_uses_per_user!: number;
    public is_active!: boolean;
    public is_featured!: boolean;
    public approval_status!: CampaignApprovalStatus;
    public rejection_reason!: string | null;
    public view_count!: number;
    public click_count!: number;
    public conversion_count!: number;
    public total_revenue!: number;
    public notes!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public isActiveNow(): boolean {
        if (!this.is_active || this.approval_status !== 'approved') return false;
        const now = new Date();
        return now >= this.start_date && now <= this.end_date;
    }

    public hasReachedLimit(): boolean {
        if (!this.usage_limit) return false;
        return this.usage_count >= this.usage_limit;
    }

    public calculateDiscount(amount: number, quantity: number = 1): number {
        let discount = 0;
        if (this.discount_type === 'percentage') {
            discount = amount * (Number(this.discount_value) / 100);
            if (this.max_discount_amount && discount > Number(this.max_discount_amount)) {
                discount = Number(this.max_discount_amount);
            }
        } else if (this.discount_type === 'fixed') {
            discount = Number(this.discount_value);
            if (discount > amount) discount = amount;
        } else if (this.discount_type === 'buy_x_get_y' && this.buy_quantity && this.get_quantity) {
            const sets = Math.floor(quantity / this.buy_quantity);
            const freeItems = sets * this.get_quantity;
            const pricePerItem = amount / quantity;
            discount = freeItems * pricePerItem;
        }
        return parseFloat(discount.toFixed(2));
    }

    public getBadgeText(): string {
        if (this.badge_text) return this.badge_text;
        switch (this.campaign_type) {
            case 'FLASH_SALE': return this.discount_type === 'percentage' ? `%${this.discount_value} İNDİRİM` : `₺${this.discount_value} İNDİRİM`;
            case 'BUY_X_GET_Y': return `${this.buy_quantity} Al ${this.get_quantity} Öde`;
            case 'FREE_SHIPPING': return 'ÜCRETSİZ KARGO';
            default: return 'KAMPANYA';
        }
    }

    public getTimeRemaining(): { days: number; hours: number; minutes: number; seconds: number; expired: boolean } {
        const now = new Date();
        const end = new Date(this.end_date);
        const diff = end.getTime() - now.getTime();
        if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
        return {
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
            expired: false,
        };
    }

    // Static Methods
    public static async getActiveCampaigns(filters: { storeId?: string; productId?: string } = {}): Promise<Campaign[]> {
        const now = new Date();
        const where: any = { is_active: true, approval_status: 'approved', start_date: { [Op.lte]: now }, end_date: { [Op.gte]: now } };
        if (filters.storeId) {
            where[Op.or] = [{ store_id: filters.storeId }, { store_id: null, applicable_to: 'entire_platform' }];
        }
        return this.findAll({ where, order: [['priority', 'DESC'], ['createdAt', 'DESC']] });
    }

    public static async getCampaignsForProduct(productId: string, categoryId: string, storeId: string): Promise<Campaign[]> {
        const now = new Date();
        return this.findAll({
            where: {
                is_active: true, approval_status: 'approved', start_date: { [Op.lte]: now }, end_date: { [Op.gte]: now },
                [Op.or]: [
                    { applicable_to: 'entire_platform' },
                    { applicable_to: 'all_store', store_id: storeId },
                    { applicable_to: 'products', product_ids: { [Op.contains]: [productId] } },
                    { applicable_to: 'categories', category_ids: { [Op.contains]: [categoryId] } },
                ],
            },
            order: [['priority', 'DESC']],
        });
    }
}

Campaign.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        name: { type: DataTypes.STRING(200), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        campaign_type: { type: DataTypes.ENUM('FLASH_SALE', 'BUY_X_GET_Y', 'CATEGORY_DISCOUNT', 'FREE_SHIPPING', 'BUNDLE_DEAL', 'GIFT_WITH_PURCHASE', 'MINIMUM_PURCHASE'), allowNull: false },
        discount_type: { type: DataTypes.ENUM('percentage', 'fixed', 'free_shipping', 'buy_x_get_y'), allowNull: false, defaultValue: 'percentage' },
        discount_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        max_discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        buy_quantity: { type: DataTypes.INTEGER, allowNull: true },
        get_quantity: { type: DataTypes.INTEGER, allowNull: true },
        gift_product_ids: { type: DataTypes.ARRAY(DataTypes.UUID), defaultValue: [] },
        start_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        end_date: { type: DataTypes.DATE, allowNull: false },
        min_order_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
        min_quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
        applicable_to: { type: DataTypes.ENUM('products', 'categories', 'all_store', 'entire_platform'), defaultValue: 'products' },
        product_ids: { type: DataTypes.ARRAY(DataTypes.UUID), defaultValue: [] },
        category_ids: { type: DataTypes.ARRAY(DataTypes.UUID), defaultValue: [] },
        created_by: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        store_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'stores', key: 'id' }, onDelete: 'CASCADE' },
        badge_text: { type: DataTypes.STRING(50), allowNull: true },
        badge_color: { type: DataTypes.STRING(7), defaultValue: '#FF6B6B' },
        show_countdown: { type: DataTypes.BOOLEAN, defaultValue: false },
        priority: { type: DataTypes.INTEGER, defaultValue: 0 },
        usage_limit: { type: DataTypes.INTEGER, allowNull: true },
        usage_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        max_uses_per_user: { type: DataTypes.INTEGER, defaultValue: 1 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
        approval_status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'approved' },
        rejection_reason: { type: DataTypes.TEXT, allowNull: true },
        view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        click_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        conversion_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        total_revenue: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
        notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
        sequelize,
        modelName: 'Campaign',
        tableName: 'campaigns',
        timestamps: true,
        paranoid: true,
        indexes: [
            { fields: ['campaign_type'] },
            { fields: ['is_active'] },
            { fields: ['start_date', 'end_date'] },
            { fields: ['store_id'] },
            { fields: ['created_by'] },
            { fields: ['approval_status'] },
            { fields: ['priority'] },
            { fields: ['product_ids'], using: 'gin' },
            { fields: ['category_ids'], using: 'gin' },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

// Hooks
Campaign.beforeValidate((campaign: Campaign) => {
    if (campaign.start_date && campaign.end_date && new Date(campaign.start_date) >= new Date(campaign.end_date)) {
        throw new Error('End date must be after start date');
    }
    if (campaign.campaign_type === 'BUY_X_GET_Y') {
        if (!campaign.buy_quantity || !campaign.get_quantity) {
            throw new Error('BUY_X_GET_Y campaigns require buy_quantity and get_quantity');
        }
        campaign.discount_type = 'buy_x_get_y';
    }
    if (campaign.campaign_type === 'GIFT_WITH_PURCHASE' && (!campaign.gift_product_ids || campaign.gift_product_ids.length === 0)) {
        throw new Error('GIFT_WITH_PURCHASE campaigns require at least one gift product');
    }
});

Campaign.beforeSave((campaign: Campaign) => {
    if (campaign.discount_type === 'percentage' && Number(campaign.discount_value) > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
    }
    if (campaign.discount_type === 'free_shipping') campaign.discount_value = 0;
});
