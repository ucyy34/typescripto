const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ShipmentEvent = sequelize.define(
  'ShipmentEvent',
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
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    raw_payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: 'shipment_events',
    indexes: [
      { fields: ['shipment_id'] },
      { fields: ['occurred_at'] },
    ],
  }
);

module.exports = ShipmentEvent;
