/**
 * Models Index (TypeScript)
 * Central place for all models and their associations
 * Type-safe model registry with 2A hybrid CJS support
 */

import { sequelize } from '../config/sequelize';

// Direct imports for all 28 models
import User from './User';
import Store from './Store';
import Category from './Category';
import Product from './Product';
import Order from './Order';
import OrderItem from './OrderItem';
import Cart from './Cart';
import CartItem from './CartItem';
import Review from './Review';
import WishlistItem from './WishlistItem';
import Wishlist from './Wishlist';
import CategoryVariant from './CategoryVariant';
import ProductVariant from './ProductVariant';
import ReturnRequest from './ReturnRequest';
import CommissionSettings from './CommissionSettings';
import CommissionTransaction from './CommissionTransaction';
import Coupon from './Coupon';
import CouponUsage from './CouponUsage';
import Shipment from './Shipment';
import ShipmentItem from './ShipmentItem';
import ShipmentEvent from './ShipmentEvent';
import Campaign from './Campaign';
import Address from './Address';
import StoreDailySales from './StoreDailySales';
import VendorPayout from './VendorPayout';
import ShippingSupportRule from './ShippingSupportRule';
import PlatformSettings from './PlatformSettings';

// ============================================================================
// Type-safe models object
// ============================================================================

export const models = {
    User,
    Store,
    Category,
    Product,
    Order,
    OrderItem,
    Cart,
    CartItem,
    Review,
    WishlistItem,
    Wishlist,
    CategoryVariant,
    ProductVariant,
    ReturnRequest,
    CommissionSettings,
    CommissionTransaction,
    Coupon,
    CouponUsage,
    Shipment,
    ShipmentItem,
    ShipmentEvent,
    Campaign,
    Address,
    StoreDailySales,
    VendorPayout,
    ShippingSupportRule,
    PlatformSettings,
} as const;

export type Models = typeof models;

// Instance type aliases for service typing
export type UserInstance = InstanceType<typeof User>;
export type StoreInstance = InstanceType<typeof Store>;
export type CategoryInstance = InstanceType<typeof Category>;
export type ProductInstance = InstanceType<typeof Product>;
export type OrderInstance = InstanceType<typeof Order>;
export type OrderItemInstance = InstanceType<typeof OrderItem>;
export type CartInstance = InstanceType<typeof Cart>;
export type CartItemInstance = InstanceType<typeof CartItem>;
export type ReviewInstance = InstanceType<typeof Review>;
export type WishlistItemInstance = InstanceType<typeof WishlistItem>;
export type WishlistInstance = InstanceType<typeof Wishlist>;
export type CategoryVariantInstance = InstanceType<typeof CategoryVariant>;
export type ProductVariantInstance = InstanceType<typeof ProductVariant>;
export type ReturnRequestInstance = InstanceType<typeof ReturnRequest>;
export type CommissionSettingsInstance = InstanceType<typeof CommissionSettings>;
export type CommissionTransactionInstance = InstanceType<typeof CommissionTransaction>;
export type CouponInstance = InstanceType<typeof Coupon>;
export type CouponUsageInstance = InstanceType<typeof CouponUsage>;
export type ShipmentInstance = InstanceType<typeof Shipment>;
export type ShipmentItemInstance = InstanceType<typeof ShipmentItem>;
export type ShipmentEventInstance = InstanceType<typeof ShipmentEvent>;
export type CampaignInstance = InstanceType<typeof Campaign>;
export type AddressInstance = InstanceType<typeof Address>;
export type StoreDailySalesInstance = InstanceType<typeof StoreDailySales>;
export type VendorPayoutInstance = InstanceType<typeof VendorPayout>;
export type ShippingSupportRuleInstance = InstanceType<typeof ShippingSupportRule>;
export type PlatformSettingsInstance = InstanceType<typeof PlatformSettings>;

// ============================================================================
// Associations (using models object for typo safety)
// ============================================================================

// Destructure for cleaner association definitions
const {
    User: UserModel,
    Store: StoreModel,
    Category: CategoryModel,
    Product: ProductModel,
    Order: OrderModel,
    OrderItem: OrderItemModel,
    Cart: CartModel,
    CartItem: CartItemModel,
    Review: ReviewModel,
    WishlistItem: WishlistItemModel,
    CategoryVariant: CategoryVariantModel,
    ProductVariant: ProductVariantModel,
    ReturnRequest: ReturnRequestModel,
    CommissionSettings: CommissionSettingsModel,
    CommissionTransaction: CommissionTransactionModel,
    Coupon: CouponModel,
    CouponUsage: CouponUsageModel,
    Shipment: ShipmentModel,
    ShipmentItem: ShipmentItemModel,
    ShipmentEvent: ShipmentEventModel,
    Campaign: CampaignModel,
    Address: AddressModel,
    StoreDailySales: StoreDailySalesModel,
    VendorPayout: VendorPayoutModel,
    Wishlist: WishlistModel,
} = models;

// -----------------------------------------------------------------------------
// User associations
// -----------------------------------------------------------------------------

UserModel.hasOne(StoreModel, {
    foreignKey: 'user_id',
    as: 'store',
    onDelete: 'CASCADE',
});

UserModel.hasOne(CartModel, {
    foreignKey: 'user_id',
    as: 'cart',
    onDelete: 'CASCADE',
});

UserModel.hasMany(OrderModel, {
    foreignKey: 'user_id',
    as: 'orders',
    onDelete: 'RESTRICT',
});

UserModel.hasMany(ReviewModel, {
    foreignKey: 'user_id',
    as: 'reviews',
    onDelete: 'CASCADE',
});

UserModel.hasMany(WishlistItemModel, {
    foreignKey: 'user_id',
    as: 'wishlistItems',
    onDelete: 'CASCADE',
});

UserModel.hasMany(AddressModel, {
    foreignKey: 'user_id',
    as: 'addresses',
    onDelete: 'CASCADE',
});

// -----------------------------------------------------------------------------
// Address associations
// -----------------------------------------------------------------------------

AddressModel.belongsTo(UserModel, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'CASCADE',
});

// -----------------------------------------------------------------------------
// Store associations
// -----------------------------------------------------------------------------

StoreModel.belongsTo(UserModel, {
    foreignKey: 'user_id',
    as: 'owner',
    onDelete: 'CASCADE',
});

StoreModel.belongsTo(UserModel, {
    foreignKey: 'approved_by',
    as: 'approvedBy',
    onDelete: 'SET NULL',
});

StoreModel.hasMany(ProductModel, {
    foreignKey: 'store_id',
    as: 'products',
    onDelete: 'CASCADE',
});

StoreModel.hasMany(OrderModel, {
    foreignKey: 'store_id',
    as: 'orders',
    onDelete: 'RESTRICT',
});

StoreModel.hasMany(ReviewModel, {
    foreignKey: 'store_id',
    as: 'reviews',
    onDelete: 'CASCADE',
});

// -----------------------------------------------------------------------------
// Category associations
// (Self-referencing associations already defined in Category model)
// -----------------------------------------------------------------------------

CategoryModel.hasMany(CategoryVariantModel, {
    foreignKey: 'category_id',
    as: 'variants',
    onDelete: 'CASCADE',
});

// -----------------------------------------------------------------------------
// CategoryVariant associations
// -----------------------------------------------------------------------------

CategoryVariantModel.belongsTo(CategoryModel, {
    foreignKey: 'category_id',
    as: 'category',
    onDelete: 'CASCADE',
});

CategoryVariantModel.hasMany(ProductVariantModel, {
    foreignKey: 'category_variant_id',
    as: 'productVariants',
    onDelete: 'RESTRICT',
});

// -----------------------------------------------------------------------------
// Product associations
// -----------------------------------------------------------------------------

ProductModel.belongsTo(StoreModel, {
    foreignKey: 'store_id',
    as: 'store',
    onDelete: 'CASCADE',
});

ProductModel.belongsTo(CategoryModel, {
    foreignKey: 'category_id',
    as: 'category',
    onDelete: 'RESTRICT',
});

ProductModel.belongsTo(UserModel, {
    foreignKey: 'approved_by',
    as: 'approvedBy',
    onDelete: 'SET NULL',
});

ProductModel.hasMany(OrderItemModel, {
    foreignKey: 'product_id',
    as: 'orderItems',
    onDelete: 'RESTRICT',
});

ProductModel.hasMany(ReviewModel, {
    foreignKey: 'product_id',
    as: 'reviews',
    onDelete: 'CASCADE',
});

ProductModel.hasMany(ProductVariantModel, {
    foreignKey: 'product_id',
    as: 'productVariants',
    onDelete: 'CASCADE',
});

ProductModel.hasMany(WishlistItemModel, {
    foreignKey: 'product_id',
    as: 'wishlistEntries',
    onDelete: 'CASCADE',
});

WishlistItemModel.belongsTo(UserModel, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'CASCADE',
});

WishlistItemModel.belongsTo(ProductModel, {
    foreignKey: 'product_id',
    as: 'product',
    onDelete: 'CASCADE',
});

// -----------------------------------------------------------------------------
// ProductVariant associations
// -----------------------------------------------------------------------------

ProductVariantModel.belongsTo(ProductModel, {
    foreignKey: 'product_id',
    as: 'product',
    onDelete: 'CASCADE',
});

ProductVariantModel.belongsTo(CategoryVariantModel, {
    foreignKey: 'category_variant_id',
    as: 'categoryVariant',
    onDelete: 'RESTRICT',
});

// -----------------------------------------------------------------------------
// Order associations
// -----------------------------------------------------------------------------

OrderModel.belongsTo(UserModel, {
    foreignKey: 'user_id',
    as: 'customer',
    onDelete: 'RESTRICT',
});

OrderModel.belongsTo(StoreModel, {
    foreignKey: 'store_id',
    as: 'store',
    onDelete: 'RESTRICT',
});

OrderModel.hasMany(OrderItemModel, {
    foreignKey: 'order_id',
    as: 'items',
    onDelete: 'CASCADE',
});

OrderModel.hasMany(ReviewModel, {
    foreignKey: 'order_id',
    as: 'reviews',
    onDelete: 'SET NULL',
});

// -----------------------------------------------------------------------------
// Shipment associations
// -----------------------------------------------------------------------------

OrderModel.hasMany(ShipmentModel, {
    foreignKey: 'order_id',
    as: 'shipments',
    onDelete: 'RESTRICT',
});

ShipmentModel.belongsTo(OrderModel, {
    foreignKey: 'order_id',
    as: 'order',
    onDelete: 'RESTRICT',
});

StoreModel.hasMany(ShipmentModel, {
    foreignKey: 'store_id',
    as: 'shipments',
    onDelete: 'RESTRICT',
});

ShipmentModel.belongsTo(StoreModel, {
    foreignKey: 'store_id',
    as: 'store',
    onDelete: 'RESTRICT',
});

ShipmentModel.hasMany(ShipmentItemModel, {
    foreignKey: 'shipment_id',
    as: 'items',
    onDelete: 'CASCADE',
});

ShipmentItemModel.belongsTo(ShipmentModel, {
    foreignKey: 'shipment_id',
    as: 'shipment',
    onDelete: 'CASCADE',
});

ShipmentModel.hasMany(ShipmentEventModel, {
    foreignKey: 'shipment_id',
    as: 'events',
    onDelete: 'CASCADE',
});

ShipmentEventModel.belongsTo(ShipmentModel, {
    foreignKey: 'shipment_id',
    as: 'shipment',
    onDelete: 'CASCADE',
});

// -----------------------------------------------------------------------------
// OrderItem associations
// -----------------------------------------------------------------------------

OrderItemModel.belongsTo(OrderModel, {
    foreignKey: 'order_id',
    as: 'order',
    onDelete: 'CASCADE',
});

OrderItemModel.belongsTo(ProductModel, {
    foreignKey: 'product_id',
    as: 'product',
    onDelete: 'RESTRICT',
});

// -----------------------------------------------------------------------------
// Cart associations
// -----------------------------------------------------------------------------

CartModel.belongsTo(UserModel, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'CASCADE',
});

CartModel.hasMany(CartItemModel, {
    foreignKey: 'cart_id',
    as: 'items',
    onDelete: 'CASCADE',
});

CartItemModel.belongsTo(CartModel, {
    foreignKey: 'cart_id',
    as: 'cart',
    onDelete: 'CASCADE',
});

CartItemModel.belongsTo(ProductModel, {
    foreignKey: 'product_id',
    as: 'product',
    onDelete: 'RESTRICT',
});

CartItemModel.belongsTo(ProductVariantModel, {
    foreignKey: 'variant_id',
    as: 'variant',
    onDelete: 'SET NULL',
});

// -----------------------------------------------------------------------------
// Review associations
// -----------------------------------------------------------------------------

ReviewModel.belongsTo(UserModel, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'CASCADE',
});

ReviewModel.belongsTo(ProductModel, {
    foreignKey: 'product_id',
    as: 'product',
    onDelete: 'CASCADE',
});

ReviewModel.belongsTo(StoreModel, {
    foreignKey: 'store_id',
    as: 'store',
    onDelete: 'CASCADE',
});

ReviewModel.belongsTo(OrderModel, {
    foreignKey: 'order_id',
    as: 'order',
    onDelete: 'SET NULL',
});

// -----------------------------------------------------------------------------
// ReturnRequest associations
// -----------------------------------------------------------------------------

ReturnRequestModel.belongsTo(UserModel, {
    foreignKey: 'user_id',
    as: 'customer',
    onDelete: 'RESTRICT',
});

ReturnRequestModel.belongsTo(OrderModel, {
    foreignKey: 'order_id',
    as: 'order',
    onDelete: 'RESTRICT',
});

ReturnRequestModel.belongsTo(StoreModel, {
    foreignKey: 'store_id',
    as: 'store',
    onDelete: 'RESTRICT',
});

ReturnRequestModel.belongsTo(UserModel, {
    foreignKey: 'approved_by',
    as: 'approvedBy',
    onDelete: 'SET NULL',
});

OrderModel.hasMany(ReturnRequestModel, {
    foreignKey: 'order_id',
    as: 'returns',
    onDelete: 'RESTRICT',
});

StoreModel.hasMany(ReturnRequestModel, {
    foreignKey: 'store_id',
    as: 'returns',
    onDelete: 'RESTRICT',
});

UserModel.hasMany(ReturnRequestModel, {
    foreignKey: 'user_id',
    as: 'returnRequests',
    onDelete: 'RESTRICT',
});

// -----------------------------------------------------------------------------
// CommissionSettings associations
// -----------------------------------------------------------------------------

CommissionSettingsModel.belongsTo(StoreModel, {
    foreignKey: 'store_id',
    as: 'store',
    onDelete: 'CASCADE',
});

StoreModel.hasMany(CommissionSettingsModel, {
    foreignKey: 'store_id',
    as: 'commissionSettings',
    onDelete: 'CASCADE',
});

// -----------------------------------------------------------------------------
// CommissionTransaction associations
// -----------------------------------------------------------------------------

CommissionTransactionModel.belongsTo(OrderModel, {
    foreignKey: 'order_id',
    as: 'order',
    onDelete: 'RESTRICT',
});

CommissionTransactionModel.belongsTo(StoreModel, {
    foreignKey: 'store_id',
    as: 'store',
    onDelete: 'RESTRICT',
});

CommissionTransactionModel.belongsTo(CommissionSettingsModel, {
    foreignKey: 'setting_id',
    as: 'settings',
    onDelete: 'SET NULL',
});

OrderModel.hasOne(CommissionTransactionModel, {
    foreignKey: 'order_id',
    as: 'commission',
    onDelete: 'RESTRICT',
});

StoreModel.hasMany(CommissionTransactionModel, {
    foreignKey: 'store_id',
    as: 'commissionTransactions',
    onDelete: 'RESTRICT',
});

// -----------------------------------------------------------------------------
// Coupon associations
// -----------------------------------------------------------------------------

CouponModel.belongsTo(UserModel, {
    foreignKey: 'created_by',
    as: 'creator',
    onDelete: 'SET NULL',
});

UserModel.hasMany(CouponModel, {
    foreignKey: 'created_by',
    as: 'createdCoupons',
    onDelete: 'SET NULL',
});

// -----------------------------------------------------------------------------
// CouponUsage associations
// -----------------------------------------------------------------------------

CouponUsageModel.belongsTo(CouponModel, {
    foreignKey: 'coupon_id',
    as: 'coupon',
    onDelete: 'CASCADE',
});

CouponUsageModel.belongsTo(UserModel, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'SET NULL',
});

CouponUsageModel.belongsTo(OrderModel, {
    foreignKey: 'order_id',
    as: 'order',
    onDelete: 'CASCADE',
});

CouponModel.hasMany(CouponUsageModel, {
    foreignKey: 'coupon_id',
    as: 'usages',
    onDelete: 'CASCADE',
});

UserModel.hasMany(CouponUsageModel, {
    foreignKey: 'user_id',
    as: 'couponUsages',
    onDelete: 'SET NULL',
});

OrderModel.hasOne(CouponUsageModel, {
    foreignKey: 'order_id',
    as: 'couponUsage',
    onDelete: 'CASCADE',
});

// -----------------------------------------------------------------------------
// Campaign associations
// -----------------------------------------------------------------------------

CampaignModel.belongsTo(UserModel, {
    foreignKey: 'created_by',
    as: 'creator',
    onDelete: 'CASCADE',
});

CampaignModel.belongsTo(StoreModel, {
    foreignKey: 'store_id',
    as: 'store',
    onDelete: 'CASCADE',
});

UserModel.hasMany(CampaignModel, {
    foreignKey: 'created_by',
    as: 'campaigns',
    onDelete: 'CASCADE',
});

StoreModel.hasMany(CampaignModel, {
    foreignKey: 'store_id',
    as: 'campaigns',
    onDelete: 'CASCADE',
});

// -----------------------------------------------------------------------------
// StoreDailySales associations (for siftah system)
// -----------------------------------------------------------------------------

StoreModel.hasMany(StoreDailySalesModel, {
    foreignKey: 'store_id',
    as: 'dailySales',
    onDelete: 'CASCADE',
});

StoreDailySalesModel.belongsTo(StoreModel, {
    foreignKey: 'store_id',
    as: 'store',
    onDelete: 'CASCADE',
});

// -----------------------------------------------------------------------------
// VendorPayout associations
// -----------------------------------------------------------------------------

StoreModel.hasMany(VendorPayoutModel, {
    foreignKey: 'store_id',
    as: 'payouts',
    onDelete: 'RESTRICT',
});

VendorPayoutModel.belongsTo(StoreModel, {
    foreignKey: 'store_id',
    as: 'store',
    onDelete: 'RESTRICT',
});

VendorPayoutModel.belongsTo(UserModel, {
    foreignKey: 'reviewed_by',
    as: 'reviewer',
    onDelete: 'SET NULL',
});

// ============================================================================
// Exports
// ============================================================================

// Default export for ES modules
export default {
    sequelize,
    ...models,
};

// Named exports for individual model access
export {
    sequelize,
    User,
    Store,
    Category,
    Product,
    Order,
    OrderItem,
    Cart,
    CartItem,
    Review,
    WishlistItem,
    Wishlist,
    CategoryVariant,
    ProductVariant,
    ReturnRequest,
    CommissionSettings,
    CommissionTransaction,
    Coupon,
    CouponUsage,
    Shipment,
    ShipmentItem,
    ShipmentEvent,
    Campaign,
    Address,
    StoreDailySales,
    VendorPayout,
    ShippingSupportRule,
    PlatformSettings,
};
