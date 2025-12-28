/**
 * Return Request Model
 * Handles product return requests from customers
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { Timestamps, ReturnStatus } from './types/model.types';

export type ReturnReason = 'defective' | 'wrong_item' | 'not_as_described' | 'damaged' | 'changed_mind' | 'better_price_elsewhere' | 'other';
export type RefundMethod = 'original_payment_method' | 'store_credit';

export interface IReturnItem {
    order_item_id: string;
    quantity: number;
    reason?: string;
}

export interface IReturnRequestAttributes extends Timestamps {
    id: string;
    return_number: string;
    order_id: string;
    user_id: string;
    store_id: string;
    status: ReturnStatus;
    reason: ReturnReason;
    description: string;
    items: IReturnItem[];
    images: string[];
    refund_amount: number;
    refund_method: string;
    store_response: string | null;
    approved_by: string | null;
    approved_at: Date | null;
    rejected_at: Date | null;
    items_received_at: Date | null;
    refund_processed_at: Date | null;
    completed_at: Date | null;
    cancelled_at: Date | null;
    cancellation_reason: string | null;
    tracking_number: string | null;
    carrier: string | null;
    admin_notes: string | null;
}

export interface IReturnRequestCreationAttributes extends Optional<IReturnRequestAttributes, 'id' | 'return_number' | 'status' | 'images' | 'refund_method' | 'store_response' | 'approved_by' | 'approved_at' | 'rejected_at' | 'items_received_at' | 'refund_processed_at' | 'completed_at' | 'cancelled_at' | 'cancellation_reason' | 'tracking_number' | 'carrier' | 'admin_notes' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class ReturnRequest extends Model<IReturnRequestAttributes, IReturnRequestCreationAttributes> implements IReturnRequestAttributes {
    public id!: string;
    public return_number!: string;
    public order_id!: string;
    public user_id!: string;
    public store_id!: string;
    public status!: ReturnStatus;
    public reason!: ReturnReason;
    public description!: string;
    public items!: IReturnItem[];
    public images!: string[];
    public refund_amount!: number;
    public refund_method!: string;
    public store_response!: string | null;
    public approved_by!: string | null;
    public approved_at!: Date | null;
    public rejected_at!: Date | null;
    public items_received_at!: Date | null;
    public refund_processed_at!: Date | null;
    public completed_at!: Date | null;
    public cancelled_at!: Date | null;
    public cancellation_reason!: string | null;
    public tracking_number!: string | null;
    public carrier!: string | null;
    public admin_notes!: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Constants
    public static readonly RETURN_STATUS_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
        pending: ['approved', 'rejected', 'cancelled'],
        approved: ['items_received', 'cancelled'],
        rejected: [],
        items_received: ['refund_processed'],
        refund_processed: ['completed'],
        completed: [],
        cancelled: [],
    };

    // Instance Methods
    public canTransitionTo(newStatus: ReturnStatus): boolean {
        const allowedTransitions = ReturnRequest.RETURN_STATUS_TRANSITIONS[this.status] || [];
        return allowedTransitions.includes(newStatus);
    }

    public async transitionTo(newStatus: ReturnStatus, metadata: { approved_by?: string; store_response?: string; tracking_number?: string; carrier?: string; cancellation_reason?: string } = {}): Promise<boolean> {
        if (!this.canTransitionTo(newStatus)) {
            throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
        }

        this.status = newStatus;
        const now = new Date();

        switch (newStatus) {
            case 'approved':
                this.approved_at = now;
                if (metadata.approved_by) this.approved_by = metadata.approved_by;
                if (metadata.store_response) this.store_response = metadata.store_response;
                break;
            case 'rejected':
                this.rejected_at = now;
                if (metadata.approved_by) this.approved_by = metadata.approved_by;
                if (metadata.store_response) this.store_response = metadata.store_response;
                break;
            case 'items_received':
                this.items_received_at = now;
                if (metadata.tracking_number) this.tracking_number = metadata.tracking_number;
                if (metadata.carrier) this.carrier = metadata.carrier;
                break;
            case 'refund_processed':
                this.refund_processed_at = now;
                break;
            case 'completed':
                this.completed_at = now;
                break;
            case 'cancelled':
                this.cancelled_at = now;
                if (metadata.cancellation_reason) this.cancellation_reason = metadata.cancellation_reason;
                break;
        }

        await this.save();
        return true;
    }

    public isCancellable(): boolean {
        return ['pending', 'approved'].includes(this.status);
    }

    // Static Methods
    public static async generateReturnNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `RET-${year}-`;

        const lastReturn = await this.findOne({
            where: { return_number: { [Op.like]: `${prefix}%` } },
            order: [['createdAt', 'DESC']],
        });

        let nextNumber = 1;
        if (lastReturn) {
            const lastNumber = parseInt(lastReturn.return_number.split('-').pop() || '0', 10);
            nextNumber = lastNumber + 1;
        }

        return `${prefix}${String(nextNumber).padStart(5, '0')}`;
    }
}

ReturnRequest.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        return_number: { type: DataTypes.STRING(50), allowNull: true, unique: true },
        order_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'RESTRICT' },
        user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
        store_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'stores', key: 'id' }, onDelete: 'RESTRICT' },
        status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'items_received', 'refund_processed', 'completed', 'cancelled'), defaultValue: 'pending', allowNull: false },
        reason: { type: DataTypes.ENUM('defective', 'wrong_item', 'not_as_described', 'damaged', 'changed_mind', 'better_price_elsewhere', 'other'), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: false },
        items: { type: DataTypes.JSONB, allowNull: false },
        images: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
        refund_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        refund_method: { type: DataTypes.STRING(50), defaultValue: 'original_payment_method' },
        store_response: { type: DataTypes.TEXT, allowNull: true },
        approved_by: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        approved_at: { type: DataTypes.DATE, allowNull: true },
        rejected_at: { type: DataTypes.DATE, allowNull: true },
        items_received_at: { type: DataTypes.DATE, allowNull: true },
        refund_processed_at: { type: DataTypes.DATE, allowNull: true },
        completed_at: { type: DataTypes.DATE, allowNull: true },
        cancelled_at: { type: DataTypes.DATE, allowNull: true },
        cancellation_reason: { type: DataTypes.TEXT, allowNull: true },
        tracking_number: { type: DataTypes.STRING(100), allowNull: true },
        carrier: { type: DataTypes.STRING(100), allowNull: true },
        admin_notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
        sequelize,
        modelName: 'ReturnRequest',
        tableName: 'return_requests',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['return_number'] },
            { fields: ['order_id'] },
            { fields: ['user_id'] },
            { fields: ['store_id'] },
            { fields: ['status'] },
            { fields: ['created_at'] },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

// Hooks
ReturnRequest.beforeCreate(async (returnRequest: ReturnRequest) => {
    if (!returnRequest.return_number) {
        returnRequest.return_number = await ReturnRequest.generateReturnNumber();
    }
});

ReturnRequest.beforeUpdate((returnRequest: ReturnRequest) => {
    if (returnRequest.changed('status')) {
        const oldStatus = returnRequest.previous('status') as ReturnStatus;
        const newStatus = returnRequest.status;
        const allowedTransitions = ReturnRequest.RETURN_STATUS_TRANSITIONS[oldStatus] || [];
        if (!allowedTransitions.includes(newStatus)) {
            throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
        }
    }
});
