const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Shipment = sequelize.define(
  'Shipment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'RESTRICT',
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'stores', key: 'id' },
      onDelete: 'RESTRICT',
    },
    carrier: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'MockExpress',
    },
    service: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'STANDARD',
    },
    tracking_number: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    label_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'TRY',
    },
    status: {
      type: DataTypes.ENUM(
        'created',
        'ready_for_pickup',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'created',
    },
    total_weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    dimensions: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    shipping_address: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: 'shipments',
    indexes: [
      { fields: ['order_id'] },
      { fields: ['store_id'] },
      { fields: ['tracking_number'], unique: true },
      { fields: ['status'] },
    ],
  }
);

module.exports = Shipment;
