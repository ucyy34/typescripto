const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ShipmentItem = sequelize.define(
  'ShipmentItem',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    shipment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'shipments', key: 'id' },
      onDelete: 'CASCADE',
    },
    order_item_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'order_items', key: 'id' },
      onDelete: 'SET NULL',
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    snapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Optional snapshot of order item at shipping time',
    },
  },
  {
    tableName: 'shipment_items',
    indexes: [
      { fields: ['shipment_id'] },
      { fields: ['order_item_id'] },
    ],
  }
);

module.exports = ShipmentItem;
