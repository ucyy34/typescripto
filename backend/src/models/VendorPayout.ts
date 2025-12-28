/**
 * VendorPayout Model
 * Tracks payout requests from vendors and their processing status
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps, PayoutStatus } from './types/model.types';

export interface IPayoutBreakdown {
    total_sales: number;
    shipping_collected: number;
    platform_commission: number;
    previous_payouts: number;
    available_balance: number;
    orders_included: string[];
}

export interface IVendorPayoutAttributes extends Timestamps {
    id: string;
    store_id: string;
    requested_amount: number;
    approved_amount: number | null;
    status: PayoutStatus;
    bank_name: string | null;
    iban: string | null;
    account_holder: string | null;
    reviewed_by: string | null;
    reviewed_at: Date | null;
    admin_notes: string | null;
    rejection_reason: string | null;
    processed_at: Date | null;
    transaction_reference: string | null;
    breakdown: IPayoutBreakdown | null;
    requested_at: Date;
}

export interface IVendorPayoutCreationAttributes extends Optional<IVendorPayoutAttributes, 'id' | 'approved_amount' | 'status' | 'bank_name' | 'iban' | 'account_holder' | 'reviewed_by' | 'reviewed_at' | 'admin_notes' | 'rejection_reason' | 'processed_at' | 'transaction_reference' | 'breakdown' | 'requested_at' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class VendorPayout extends Model<IVendorPayoutAttributes, IVendorPayoutCreationAttributes> implements IVendorPayoutAttributes {
    public id!: string;
    public store_id!: string;
    public requested_amount!: number;
    public approved_amount!: number | null;
    public status!: PayoutStatus;
    public bank_name!: string | null;
    public iban!: string | null;
    public account_holder!: string | null;
    public reviewed_by!: string | null;
    public reviewed_at!: Date | null;
    public admin_notes!: string | null;
    public rejection_reason!: string | null;
    public processed_at!: Date | null;
    public transaction_reference!: string | null;
    public breakdown!: IPayoutBreakdown | null;
    public requested_at!: Date;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Constants
    public static MINIMUM_PAYOUT_AMOUNT = 100; // TL

    // Instance Methods
    public async approve(adminId: string, approvedAmount: number | null = null, notes: string | null = null): Promise<VendorPayout> {
        this.status = 'processing'; // 'approved' maps to 'processing' in PayoutStatus
        this.reviewed_by = adminId;
        this.reviewed_at = new Date();
        this.approved_amount = approvedAmount || this.requested_amount;
        if (notes) this.admin_notes = notes;
        await this.save();
        return this;
    }

    public async reject(adminId: string, reason: string): Promise<VendorPayout> {
        this.status = 'failed'; // 'rejected' maps to 'failed' in PayoutStatus
        this.reviewed_by = adminId;
        this.reviewed_at = new Date();
        this.rejection_reason = reason;
        await this.save();
        return this;
    }

    public async startProcessing(transactionRef: string | null = null): Promise<VendorPayout> {
        this.status = 'processing';
        if (transactionRef) this.transaction_reference = transactionRef;
        await this.save();
        return this;
    }

    public async complete(transactionRef: string): Promise<VendorPayout> {
        this.status = 'completed';
        this.processed_at = new Date();
        this.transaction_reference = transactionRef;
        await this.save();
        return this;
    }
}

VendorPayout.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        store_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'stores', key: 'id' } },
        requested_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        approved_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        status: { type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'), defaultValue: 'pending' },
        bank_name: { type: DataTypes.STRING(100), allowNull: true },
        iban: { type: DataTypes.STRING(34), allowNull: true },
        account_holder: { type: DataTypes.STRING(200), allowNull: true },
        reviewed_by: { type: DataTypes.UUID, allowNull: true },
        reviewed_at: { type: DataTypes.DATE, allowNull: true },
        admin_notes: { type: DataTypes.TEXT, allowNull: true },
        rejection_reason: { type: DataTypes.TEXT, allowNull: true },
        processed_at: { type: DataTypes.DATE, allowNull: true },
        transaction_reference: { type: DataTypes.STRING(100), allowNull: true },
        breakdown: { type: DataTypes.JSONB, allowNull: true },
        requested_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
        sequelize,
        modelName: 'VendorPayout',
        tableName: 'vendor_payouts',
        timestamps: true,
        indexes: [
            { fields: ['store_id'] },
            { fields: ['status'] },
            { fields: ['requested_at'] },
            { fields: ['reviewed_by'] },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);
