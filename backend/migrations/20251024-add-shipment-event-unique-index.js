/**
 * Migration: Add Unique Index to Shipment Events
 * 
 * Purpose: Prevent duplicate shipment events
 * Creates a composite unique index on (shipment_id, code, occurred_at)
 * 
 * Created: 2025-10-24
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('[Migration] Adding unique index to shipment_events...');
    
    try {
      // Add composite unique index to prevent duplicate events
      await queryInterface.addIndex('shipment_events', 
        ['shipment_id', 'code', 'occurred_at'],
        {
          name: 'idx_shipment_events_unique',
          unique: true,
          type: 'BTREE',
        }
      );
      
      console.log('[Migration] ✅ Successfully added unique index idx_shipment_events_unique');
    } catch (error) {
      console.error('[Migration] ❌ Error adding index:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('[Migration] Removing unique index from shipment_events...');
    
    try {
      // Remove the unique index
      await queryInterface.removeIndex('shipment_events', 'idx_shipment_events_unique');
      
      console.log('[Migration] ✅ Successfully removed unique index');
    } catch (error) {
      console.error('[Migration] ❌ Error removing index:', error.message);
      throw error;
    }
  }
};






