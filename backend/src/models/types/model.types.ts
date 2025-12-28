/**
 * Shared Model Types
 * Common enums and types used across models
 */

export type UserRole = 'buyer' | 'seller' | 'admin';
export type ProductStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'draft' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type StoreStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'items_received' | 'refund_processed' | 'completed' | 'cancelled';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ShipmentStatus = 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';

export interface Timestamps {
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
}
