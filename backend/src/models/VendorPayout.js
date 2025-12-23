/**
 * Vendor Payout Model
 * Tracks payout requests from vendors and their processing status
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const VendorPayout = sequelize.define(
    'VendorPayout',
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
        },
        // Request Details
        requested_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Amount requested by vendor',
        },
        approved_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: 'Amount approved by admin (may differ from requested)',
        },
        // Status
        status: {
            type: DataTypes.ENUM(
                'pending',      // Waiting for admin review
                'approved',     // Admin approved, waiting for processing
                'processing',   // Being processed (bank transfer initiated)
                'completed',    // Successfully paid
                'rejected'      // Admin rejected
            ),
            defaultValue: 'pending',
        },
        // Bank Details (copied from store at request time)
        bank_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        iban: {
            type: DataTypes.STRING(34),
            allowNull: true,
        },
        account_holder: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        // Admin Actions
        reviewed_by: {
            type: DataTypes.UUID,
            allowNull: true,
            comment: 'Admin user who reviewed the request',
        },
        reviewed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        admin_notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Internal notes from admin',
        },
        rejection_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        // Processing Details
        processed_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        transaction_reference: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Bank transfer reference number',
        },
        // Breakdown (for transparency)
        breakdown: {
            type: DataTypes.JSONB,
            allowNull: true,
            comment: 'Detailed breakdown of the payout calculation',
            /*
            Structure:
            {
              total_sales: 1000,
              shipping_collected: 200,
              platform_commission: 150,
              previous_payouts: 500,
              available_balance: 550,
              orders_included: ['order-id-1', 'order-id-2']
            }
            */
        },
        // Timestamps
        requested_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        tableName: 'vendor_payouts',
        timestamps: true,
        indexes: [
            { fields: ['store_id'] },
            { fields: ['status'] },
            { fields: ['requested_at'] },
            { fields: ['reviewed_by'] },
        ],
    }
);

// Constants
VendorPayout.MINIMUM_PAYOUT_AMOUNT = 100; // TL

// Instance Methods

/**
 * Approve the payout request
 * @param {string} adminId - Admin user ID
 * @param {number} approvedAmount - Amount to approve (optional, defaults to requested)
 * @param {string} notes - Admin notes
 */
VendorPayout.prototype.approve = async function (adminId, approvedAmount = null, notes = null) {
    this.status = 'approved';
    this.reviewed_by = adminId;
    this.reviewed_at = new Date();
    this.approved_amount = approvedAmount || this.requested_amount;
    if (notes) this.admin_notes = notes;

    await this.save();
    return this;
};

/**
 * Reject the payout request
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Rejection reason
 */
VendorPayout.prototype.reject = async function (adminId, reason) {
    this.status = 'rejected';
    this.reviewed_by = adminId;
    this.reviewed_at = new Date();
    this.rejection_reason = reason;

    await this.save();
    return this;
};

/**
 * Mark as processing (bank transfer initiated)
 * @param {string} transactionRef - Bank transaction reference
 */
VendorPayout.prototype.startProcessing = async function (transactionRef = null) {
    this.status = 'processing';
    if (transactionRef) this.transaction_reference = transactionRef;

    await this.save();
    return this;
};

/**
 * Mark as completed
 * @param {string} transactionRef - Final bank transaction reference
 */
VendorPayout.prototype.complete = async function (transactionRef) {
    this.status = 'completed';
    this.processed_at = new Date();
    this.transaction_reference = transactionRef;

    await this.save();
    return this;
};

module.exports = VendorPayout;
