/**
 * Models Index
 * Central place for all models and their associations
 */

const { sequelize } = require('../config/sequelize');

// Import all models
const User = require('./User');
const Store = require('./Store');
const Category = require('./Category');
const Product = require('./Product');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Cart = require('./Cart');
const Wishlist = require('./Wishlist');
const Review = require('./Review');
const CategoryVariant = require('./CategoryVariant');
const ProductVariant = require('./ProductVariant');
const ReturnRequest = require('./ReturnRequest');
const CommissionSettings = require('./CommissionSettings');
const CommissionTransaction = require('./CommissionTransaction');
const Coupon = require('./Coupon');
const CouponUsage = require('./CouponUsage');
const Shipment = require('./Shipment');
const ShipmentItem = require('./ShipmentItem');
const ShipmentEvent = require('./ShipmentEvent');
const Campaign = require('./Campaign');

// Define Associations

// User associations
User.hasOne(Store, {
  foreignKey: 'user_id',
  as: 'store',
  onDelete: 'CASCADE',
});

User.hasOne(Cart, {
  foreignKey: 'user_id',
  as: 'cart',
  onDelete: 'CASCADE',
});

User.hasOne(Wishlist, {
  foreignKey: 'user_id',
  as: 'wishlist',
  onDelete: 'CASCADE',
});

User.hasMany(Order, {
  foreignKey: 'user_id',
  as: 'orders',
  onDelete: 'RESTRICT',
});

User.hasMany(Review, {
  foreignKey: 'user_id',
  as: 'reviews',
  onDelete: 'CASCADE',
});

// Store associations
Store.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'owner',
  onDelete: 'CASCADE',
});

Store.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approvedBy',
  onDelete: 'SET NULL',
});

Store.hasMany(Product, {
  foreignKey: 'store_id',
  as: 'products',
  onDelete: 'CASCADE',
});

Store.hasMany(Order, {
  foreignKey: 'store_id',
  as: 'orders',
  onDelete: 'RESTRICT',
});

Store.hasMany(Review, {
  foreignKey: 'store_id',
  as: 'reviews',
  onDelete: 'CASCADE',
});

// Category associations
// (Self-referencing associations already defined in Category model)

Category.hasMany(CategoryVariant, {
  foreignKey: 'category_id',
  as: 'variants',
  onDelete: 'CASCADE',
});

// CategoryVariant associations
CategoryVariant.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category',
  onDelete: 'CASCADE',
});

CategoryVariant.hasMany(ProductVariant, {
  foreignKey: 'category_variant_id',
  as: 'productVariants',
  onDelete: 'RESTRICT',
});

// Product associations
Product.belongsTo(Store, {
  foreignKey: 'store_id',
  as: 'store',
  onDelete: 'CASCADE',
});

Product.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category',
  onDelete: 'RESTRICT',
});

Product.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approvedBy',
  onDelete: 'SET NULL',
});

Product.hasMany(OrderItem, {
  foreignKey: 'product_id',
  as: 'orderItems',
  onDelete: 'RESTRICT',
});

Product.hasMany(Review, {
  foreignKey: 'product_id',
  as: 'reviews',
  onDelete: 'CASCADE',
});

Product.hasMany(ProductVariant, {
  foreignKey: 'product_id',
  as: 'productVariants',
  onDelete: 'CASCADE',
});

Wishlist.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE',
});

// ProductVariant associations
ProductVariant.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product',
  onDelete: 'CASCADE',
});

ProductVariant.belongsTo(CategoryVariant, {
  foreignKey: 'category_variant_id',
  as: 'categoryVariant',
  onDelete: 'RESTRICT',
});

// Order associations
Order.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'customer',
  onDelete: 'RESTRICT',
});

Order.belongsTo(Store, {
  foreignKey: 'store_id',
  as: 'store',
  onDelete: 'RESTRICT',
});

Order.hasMany(OrderItem, {
  foreignKey: 'order_id',
  as: 'items',
  onDelete: 'CASCADE',
});

Order.hasMany(Review, {
  foreignKey: 'order_id',
  as: 'reviews',
  onDelete: 'SET NULL',
});

// Shipment associations
Order.hasMany(Shipment, {
  foreignKey: 'order_id',
  as: 'shipments',
  onDelete: 'RESTRICT',
});

Shipment.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order',
  onDelete: 'RESTRICT',
});

Store.hasMany(Shipment, {
  foreignKey: 'store_id',
  as: 'shipments',
  onDelete: 'RESTRICT',
});

Shipment.belongsTo(Store, {
  foreignKey: 'store_id',
  as: 'store',
  onDelete: 'RESTRICT',
});

Shipment.hasMany(ShipmentItem, {
  foreignKey: 'shipment_id',
  as: 'items',
  onDelete: 'CASCADE',
});

ShipmentItem.belongsTo(Shipment, {
  foreignKey: 'shipment_id',
  as: 'shipment',
  onDelete: 'CASCADE',
});

Shipment.hasMany(ShipmentEvent, {
  foreignKey: 'shipment_id',
  as: 'events',
  onDelete: 'CASCADE',
});

ShipmentEvent.belongsTo(Shipment, {
  foreignKey: 'shipment_id',
  as: 'shipment',
  onDelete: 'CASCADE',
});

// OrderItem associations
OrderItem.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order',
  onDelete: 'CASCADE',
});

OrderItem.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product',
  onDelete: 'RESTRICT',
});

// Cart associations
Cart.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE',
});

// Review associations
Review.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE',
});

Review.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product',
  onDelete: 'CASCADE',
});

Review.belongsTo(Store, {
  foreignKey: 'store_id',
  as: 'store',
  onDelete: 'CASCADE',
});

Review.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order',
  onDelete: 'SET NULL',
});

// ReturnRequest associations
ReturnRequest.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'customer',
  onDelete: 'RESTRICT',
});

ReturnRequest.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order',
  onDelete: 'RESTRICT',
});

ReturnRequest.belongsTo(Store, {
  foreignKey: 'store_id',
  as: 'store',
  onDelete: 'RESTRICT',
});

ReturnRequest.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approvedBy',
  onDelete: 'SET NULL',
});

Order.hasMany(ReturnRequest, {
  foreignKey: 'order_id',
  as: 'returns',
  onDelete: 'RESTRICT',
});

Store.hasMany(ReturnRequest, {
  foreignKey: 'store_id',
  as: 'returns',
  onDelete: 'RESTRICT',
});

User.hasMany(ReturnRequest, {
  foreignKey: 'user_id',
  as: 'returnRequests',
  onDelete: 'RESTRICT',
});

// CommissionSettings associations
CommissionSettings.belongsTo(Store, {
  foreignKey: 'store_id',
  as: 'store',
  onDelete: 'CASCADE',
});

Store.hasMany(CommissionSettings, {
  foreignKey: 'store_id',
  as: 'commissionSettings',
  onDelete: 'CASCADE',
});

// CommissionTransaction associations
CommissionTransaction.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order',
  onDelete: 'RESTRICT',
});

CommissionTransaction.belongsTo(Store, {
  foreignKey: 'store_id',
  as: 'store',
  onDelete: 'RESTRICT',
});

CommissionTransaction.belongsTo(CommissionSettings, {
  foreignKey: 'setting_id',
  as: 'settings',
  onDelete: 'SET NULL',
});

Order.hasOne(CommissionTransaction, {
  foreignKey: 'order_id',
  as: 'commission',
  onDelete: 'RESTRICT',
});

Store.hasMany(CommissionTransaction, {
  foreignKey: 'store_id',
  as: 'commissionTransactions',
  onDelete: 'RESTRICT',
});

// Coupon associations
Coupon.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
  onDelete: 'SET NULL',
});

User.hasMany(Coupon, {
  foreignKey: 'created_by',
  as: 'createdCoupons',
  onDelete: 'SET NULL',
});

// CouponUsage associations
CouponUsage.belongsTo(Coupon, {
  foreignKey: 'coupon_id',
  as: 'coupon',
  onDelete: 'CASCADE',
});

CouponUsage.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'SET NULL',
});

CouponUsage.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order',
  onDelete: 'CASCADE',
});

Coupon.hasMany(CouponUsage, {
  foreignKey: 'coupon_id',
  as: 'usages',
  onDelete: 'CASCADE',
});

User.hasMany(CouponUsage, {
  foreignKey: 'user_id',
  as: 'couponUsages',
  onDelete: 'SET NULL',
});

Order.hasOne(CouponUsage, {
  foreignKey: 'order_id',
  as: 'couponUsage',
  onDelete: 'CASCADE',
});

// Campaign associations
Campaign.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator',
  onDelete: 'CASCADE',
});

Campaign.belongsTo(Store, {
  foreignKey: 'store_id',
  as: 'store',
  onDelete: 'CASCADE',
});

User.hasMany(Campaign, {
  foreignKey: 'created_by',
  as: 'campaigns',
  onDelete: 'CASCADE',
});

Store.hasMany(Campaign, {
  foreignKey: 'store_id',
  as: 'campaigns',
  onDelete: 'CASCADE',
});

// Export all models and sequelize instance
module.exports = {
  sequelize,
  User,
  Store,
  Category,
  Product,
  Order,
  OrderItem,
  Cart,
  Wishlist,
  Review,
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
};
