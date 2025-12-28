/**
 * CommissionTransaction Model
 * Records commission calculations for each order
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps } from './types/model.types';

export type CommissionTransactionStatus = 'pending' | 'calculated' | 'paid_to_seller' | 'refunded' | 'cancelled';

export interface ICommissionTransactionAttributes extends Timestamps {
    id: string;
    order_id: string;
    store_id: string;
    setting_id: string | null;
    order_total: number;
    commission_rate: number;
    commission_amount: number;
    seller_amount: number;
    platform_amount: number;
    status: CommissionTransactionStatus;
    paid_at: Date | null;
    payment_method: string | null;
    payment_reference: string | null;
    payout_id: string | null;
    notes: string | null;
    calculated_at: Date;
    refunded_at: Date | null;
    refund_amount: number | null;
}

export interface ICommissionTransactionCreationAttributes extends Optional<ICommissionTransactionAttributes, 'id' | 'setting_id' | 'status' | 'paid_at' | 'payment_method' | 'payment_reference' | 'payout_id' | 'notes' | 'calculated_at' | 'refunded_at' | 'refund_amount' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class CommissionTransaction extends Model<ICommissionTransactionAttributes, ICommissionTransactionCreationAttributes> implements ICommissionTransactionAttributes {
    public id!: string;
    public order_id!: string;
    public store_id!: string;
    public setting_id!: string | null;
    public order_total!: number;
    public commission_rate!: number;
    public commission_amount!: number;
    public seller_amount!: number;
    public platform_amount!: number;
    public status!: CommissionTransactionStatus;
    public paid_at!: Date | null;
    public payment_method!: string | null;
    public payment_reference!: string | null;
    public payout_id!: string | null;
    public notes!: string | null;
    public calculated_at!: Date;
    public refunded_at!: Date | null;
    public refund_amount!: number | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public async markAsPaid(paymentMethod: string, paymentReference: string, payoutId: string): Promise<boolean> {
        this.status = 'paid_to_seller';
        this.paid_at = new Date();
        this.payment_method = paymentMethod;
        this.payment_reference = paymentReference;
        this.payout_id = payoutId;
        await this.save();
        return true;
    }

    public async markAsRefunded(refundAmount?: number): Promise<boolean> {
        this.status = 'refunded';
        this.refunded_at = new Date();
        this.refund_amount = refundAmount || Number(this.order_total);

        if (refundAmount && refundAmount < Number(this.order_total)) {
            const remainingAmount = Number(this.order_total) - refundAmount;
            const remainingCommission = remainingAmount * (Number(this.commission_rate) / 100);
            this.commission_amount = parseFloat(remainingCommission.toFixed(2));
            this.seller_amount = parseFloat((remainingAmount - remainingCommission).toFixed(2));
            this.platform_amount = this.commission_amount;
        } else {
            this.commission_amount = 0;
            this.seller_amount = 0;
            this.platform_amount = 0;
        }

        await this.save();
        return true;
    }

    public getBreakdown(): { order_total: number; commission_rate: number; commission_amount: number; seller_amount: number; platform_amount: number; commission_percentage: string } {
        return {
            order_total: Number(this.order_total),
            commission_rate: Number(this.commission_rate),
            commission_amount: Number(this.commission_amount),
            seller_amount: Number(this.seller_amount),
            platform_amount: Number(this.platform_amount),
            commission_percentage: ((Number(this.commission_amount) / Number(this.order_total)) * 100).toFixed(2),
        };
    }

    // Static Methods
    public static async getStoreSummary(storeId: string, startDate: Date, endDate: Date): Promise<{ total_sales: number; total_commission: number; total_seller_amount: number; transaction_count: number; average_commission_rate: number }> {
        const transactions = await this.findAll({
            where: { store_id: storeId, status: ['calculated', 'paid_to_seller'], calculated_at: { [Op.between]: [startDate, endDate] } },
        });

        const summary = { total_sales: 0, total_commission: 0, total_seller_amount: 0, transaction_count: transactions.length, average_commission_rate: 0 };
        transactions.forEach((t) => {
            summary.total_sales += Number(t.order_total);
            summary.total_commission += Number(t.commission_amount);
            summary.total_seller_amount += Number(t.seller_amount);
        });
        if (summary.total_sales > 0) {
            summary.average_commission_rate = parseFloat(((summary.total_commission / summary.total_sales) * 100).toFixed(2));
        }
        return summary;
    }

    public static async getPlatformSummary(startDate: Date, endDate: Date): Promise<{ total_sales: number; total_commission: number; total_paid_to_sellers: number; pending_payments: number; transaction_count: number; unique_stores: number }> {
        const transactions = await this.findAll({
            where: { status: ['calculated', 'paid_to_seller'], calculated_at: { [Op.between]: [startDate, endDate] } },
        });

        const uniqueStores = new Set<string>();
        const summary = { total_sales: 0, total_commission: 0, total_paid_to_sellers: 0, pending_payments: 0, transaction_count: transactions.length, unique_stores: 0 };
        transactions.forEach((t) => {
            summary.total_sales += Number(t.order_total);
            summary.total_commission += Number(t.commission_amount);
            if (t.status === 'paid_to_seller') {
                summary.total_paid_to_sellers += Number(t.seller_amount);
            } else {
                summary.pending_payments += Number(t.seller_amount);
            }
            uniqueStores.add(t.store_id);
        });
        summary.unique_stores = uniqueStores.size;
        return summary;
    }
}

CommissionTransaction.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        order_id: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: 'orders', key: 'id' }, onDelete: 'RESTRICT' },
        store_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'stores', key: 'id' }, onDelete: 'RESTRICT' },
        setting_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'commission_settings', key: 'id' }, onDelete: 'SET NULL' },
        order_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        commission_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        commission_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        seller_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        platform_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        status: { type: DataTypes.ENUM('pending', 'calculated', 'paid_to_seller', 'refunded', 'cancelled'), defaultValue: 'pending', allowNull: false },
        paid_at: { type: DataTypes.DATE, allowNull: true },
        payment_method: { type: DataTypes.STRING(50), allowNull: true },
        payment_reference: { type: DataTypes.STRING(100), allowNull: true },
        payout_id: { type: DataTypes.UUID, allowNull: true },
        notes: { type: DataTypes.TEXT, allowNull: true },
        calculated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        refunded_at: { type: DataTypes.DATE, allowNull: true },
        refund_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    },
    {
        sequelize,
        modelName: 'CommissionTransaction',
        tableName: 'commission_transactions',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['order_id'] },
            { fields: ['store_id'] },
            { fields: ['status'] },
            { fields: ['payout_id'] },
            { fields: ['calculated_at'] },
            { fields: ['paid_at'] },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

// Hooks
CommissionTransaction.beforeSave(async (transaction: CommissionTransaction) => {
    const calculatedPlatformAmount = parseFloat((Number(transaction.order_total) - Number(transaction.seller_amount)).toFixed(2));
    if (Math.abs(calculatedPlatformAmount - Number(transaction.platform_amount)) > 0.01) {
        throw new Error('Commission amounts do not add up correctly');
    }
    if (Number(transaction.seller_amount) < 0) throw new Error('Seller amount cannot be negative');
    if (Number(transaction.seller_amount) > Number(transaction.order_total)) throw new Error('Seller amount cannot exceed order total');
});
