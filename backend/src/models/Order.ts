/**
 * Order Model
 * Represents customer orders with FSM (Finite State Machine) pattern
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';
import { sequelize } from '../config/sequelize';
import { OrderStatus, Timestamps } from './types/model.types';

// Order Status State Machine
const ORDER_STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
    draft: ['pending', 'cancelled'],
    pending: ['confirmed', 'processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    confirmed: ['processing', 'shipped', 'cancelled'], // Legacy alias
    cancelled: [],
};

export interface IPaymentDetails {
    [key: string]: any;
}

export interface IAddress {
    [key: string]: any;
}

export interface IOrderAttributes extends Timestamps {
    id: string;
    idempotency_key: string | null;
    order_number: string;
    user_id: string | null;
    store_id: string;
    status: OrderStatus;
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    payment_method: string | null;
    subtotal: number;
    shipping_fee: number;
    tax: number;
    discount: number;
    coupon_code: string | null;
    coupon_discount: number;
    total: number;
    currency: string;
    shipping_address: IAddress;
    billing_address: IAddress | null;
    customer_note: string | null;
    seller_note: string | null;
    tracking_number: string | null;
    carrier: string | null;
    payment_transaction_id: string | null;
    payment_details: IPaymentDetails | null;
    paid_at: Date | null;
    shipped_at: Date | null;
    delivered_at: Date | null;
    cancelled_at: Date | null;
    cancellation_reason: string | null;
    ip_address: string | null;
    // Shipping Support
    shipping_actual_cost: number;
    shipping_customer_paid: number;
    shipping_store_covered: number;
    shipping_platform_covered: number;
    shipping_rule_id: string | null;
    shipping_store_owes_platform: number;
}

export interface IOrderCreationAttributes extends Optional<IOrderAttributes, 'id' | 'idempotency_key' | 'order_number' | 'status' | 'payment_status' | 'subtotal' | 'shipping_fee' | 'tax' | 'discount' | 'coupon_discount' | 'currency' | 'billing_address' | 'customer_note' | 'seller_note' | 'tracking_number' | 'carrier' | 'payment_transaction_id' | 'payment_details' | 'paid_at' | 'shipped_at' | 'delivered_at' | 'cancelled_at' | 'cancellation_reason' | 'ip_address' | 'shipping_actual_cost' | 'shipping_customer_paid' | 'shipping_store_covered' | 'shipping_platform_covered' | 'shipping_rule_id' | 'shipping_store_owes_platform' | 'coupon_code' | 'payment_method' | 'createdAt' | 'updatedAt' | 'deletedAt'> { }

export default class Order extends Model<IOrderAttributes, IOrderCreationAttributes> implements IOrderAttributes {
    public id!: string;
    public idempotency_key!: string | null;
    public order_number!: string;
    public user_id!: string | null;
    public store_id!: string;
    public status!: OrderStatus;
    public payment_status!: 'pending' | 'paid' | 'failed' | 'refunded';
    public payment_method!: string | null;
    public subtotal!: number;
    public shipping_fee!: number;
    public tax!: number;
    public discount!: number;
    public coupon_code!: string | null;
    public coupon_discount!: number;
    public total!: number;
    public currency!: string;
    public shipping_address!: IAddress;
    public billing_address!: IAddress | null;
    public customer_note!: string | null;
    public seller_note!: string | null;
    public tracking_number!: string | null;
    public carrier!: string | null;
    public payment_transaction_id!: string | null;
    public payment_details!: IPaymentDetails | null;
    public paid_at!: Date | null;
    public shipped_at!: Date | null;
    public delivered_at!: Date | null;
    public cancelled_at!: Date | null;
    public cancellation_reason!: string | null;
    public ip_address!: string | null;

    public shipping_actual_cost!: number;
    public shipping_customer_paid!: number;
    public shipping_store_covered!: number;
    public shipping_platform_covered!: number;
    public shipping_rule_id!: string | null;
    public shipping_store_owes_platform!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt!: Date | null;

    // Instance Methods
    public canTransitionTo(newStatus: OrderStatus): boolean {
        const allowedTransitions = ORDER_STATUS_TRANSITIONS[this.status] || [];
        return allowedTransitions.includes(newStatus);
    }

    public async transitionTo(newStatus: OrderStatus, metadata: any = {}): Promise<boolean> {
        if (!this.canTransitionTo(newStatus)) {
            throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
        }

        this.status = newStatus;

        // Update timestamp fields based on status
        const now = new Date();
        switch (newStatus) {
            case 'confirmed': // Handle legacy confirmation same as processing start or purely logic
                // No specific timestamp for confirmed in standard schema, but valid transition
                break;
            case 'shipped':
                this.shipped_at = now;
                if (metadata.tracking_number) {
                    this.tracking_number = metadata.tracking_number;
                }
                if (metadata.carrier) {
                    this.carrier = metadata.carrier;
                }
                break;
            case 'delivered':
                this.delivered_at = now;
                break;
            case 'cancelled':
                this.cancelled_at = now;
                if (metadata.reason) {
                    this.cancellation_reason = metadata.reason;
                }
                break;
        }

        // Note: 'paid' is payment_status, handled separately or via metadata logic in legacy,
        // but here let's support metadata update if passed, or direct assignment if flow requires.
        // Legacy JS handled 'paid' in the same switch if status was 'paid', but 'paid' is payment_status.
        // The JS had `case 'paid':` but 'paid' is NOT in the status ENUM for OrderStatus (it's in payment_status).
        // Reviewing JS: `case 'paid': ... this.payment_status = 'paid'`.
        // BUT `status` enum definition in JS: 'draft', 'pending', 'processing', 'shipped', 'delivered', 'confirmed', 'cancelled'.
        // 'paid' is NOT in `status` enum.
        // The JS `transitionTo` logic had `case 'paid'` which implies it might be called with 'paid', but `canTransitionTo` uses `ORDER_STATUS_TRANSITIONS`.
        // `ORDER_STATUS_TRANSITIONS` does NOT have 'paid'.
        // So `case 'paid'` in JS was likely dead code or misinterpretation of payment flow inside status flow.
        // However, if we want to support updating payment status via this method helper:
        if (newStatus as string === 'paid') {
            // This block would never be reached if validated against `canTransitionTo` logic strictness unless we adjust transitions.
            // Keeping strict to enum. Payment updates should be done separately or via specific method.
        }

        // For refund:
        if (newStatus as any === 'refunded') {
            this.payment_status = 'refunded';
        }

        await this.save();
        return true;
    }

    public calculateTotal(items: any[]): void {
        this.subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        this.total = this.subtotal + this.shipping_fee + this.tax - this.discount;
    }

    public isCancellable(): boolean {
        return (['pending', 'confirmed', 'processing'] as OrderStatus[]).includes(this.status);
    }

    public isRefundable(): boolean {
        return (['delivered', 'completed'] as any[]).includes(this.status) && this.payment_status === 'paid';
    }

    // Static Methods
    public static async generateOrderNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `ORD-${year}-`;

        const lastOrder = await this.findOne({
            where: {
                order_number: {
                    [Op.like]: `${prefix}%`,
                },
            },
            order: [['createdAt', 'DESC']],
        });

        let nextNumber = 1;
        if (lastOrder) {
            const lastNumber = parseInt(lastOrder.order_number.split('-').pop() || '0', 10);
            nextNumber = lastNumber + 1;
        }

        return `${prefix}${String(nextNumber).padStart(5, '0')}`;
    }

    public static async findByUser(userId: string, options: any = {}): Promise<Order[]> {
        return this.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
            ...options,
        });
    }

    public static async findByStore(storeId: string, options: any = {}): Promise<Order[]> {
        return this.findAll({
            where: { store_id: storeId },
            order: [['createdAt', 'DESC']],
            ...options,
        });
    }

    public static async findByStatus(status: OrderStatus, options: any = {}): Promise<Order[]> {
        return this.findAll({
            where: { status },
            order: [['createdAt', 'DESC']],
            ...options,
        });
    }
}

Order.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        idempotency_key: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            comment: 'Unique key for safe retries',
        },
        order_number: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: 'Human-readable order number (e.g., ORD-2024-00001)',
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'SET NULL',
            comment: 'User ID - null for guest orders',
        },
        store_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'stores',
                key: 'id',
            },
            onDelete: 'RESTRICT',
            comment: 'Each order belongs to one store',
        },
        status: {
            type: DataTypes.ENUM(
                'draft',
                'pending',
                'processing',
                'shipped',
                'delivered',
                'confirmed',
                'cancelled'
            ),
            defaultValue: 'pending',
            allowNull: false,
        },
        payment_status: {
            type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
            defaultValue: 'pending',
            allowNull: false,
        },
        payment_method: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'credit_card, bank_transfer, cash_on_delivery',
        },
        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.0,
        },
        shipping_fee: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
        },
        tax: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
        },
        discount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: 'Total discount (coupons + other discounts)',
        },
        coupon_code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'Applied coupon code',
        },
        coupon_discount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: 'Discount from coupon',
        },
        total: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'TRY',
        },
        shipping_address: {
            type: DataTypes.JSONB,
            allowNull: false,
            comment: 'Full shipping address object',
        },
        billing_address: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        customer_note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        seller_note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        tracking_number: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        carrier: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Shipping carrier (e.g., Aras Kargo, MNG)',
        },
        payment_transaction_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        payment_details: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Payment gateway response data',
        },
        paid_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        shipped_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        delivered_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        cancelled_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        cancellation_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: true,
        },
        shipping_actual_cost: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: 'Actual shipping cost (hidden from customer)',
        },
        shipping_customer_paid: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: 'Amount customer paid as "shipping support"',
        },
        shipping_store_covered: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: 'Amount covered by store',
        },
        shipping_platform_covered: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: 'Amount covered by platform',
        },
        shipping_rule_id: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'Applied shipping support rule ID',
        },
        shipping_store_owes_platform: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: 'Amount store owes platform for shipping coverage (charged back)',
        },
    },
    {
        sequelize,
        tableName: 'orders',
        indexes: [
            {
                unique: true,
                fields: ['order_number'],
            },
            {
                fields: ['user_id'],
            },
            {
                fields: ['store_id'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['payment_status'],
            },
            {
                fields: ['createdAt'],
            },
        ],
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);

// Hooks
Order.beforeCreate(async (order: Order) => {
    if (!order.order_number) {
        order.order_number = await Order.generateOrderNumber();
    }
});

Order.beforeUpdate(async (order: Order) => {
    if (order.changed('status')) {
        const oldStatus = order.previous('status');
        const newStatus = order.status;

        const allowedTransitions = ORDER_STATUS_TRANSITIONS[oldStatus] || [];
        if (!allowedTransitions.includes(newStatus)) {
            throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
        }
    }
});


