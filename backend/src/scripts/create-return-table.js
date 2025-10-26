/**
 * Create Return Requests Table
 * Run this script to create the return_requests table
 */

const { sequelize } = require('../config/sequelize');
const ReturnRequest = require('../models/ReturnRequest');

async function createReturnRequestsTable() {
  try {
    console.log('🔄 Starting return_requests table creation...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Create table (force: false ensures we don't drop existing data)
    await ReturnRequest.sync({ force: false });
    console.log('✅ return_requests table created successfully');

    // Check if table exists
    const tableInfo = await sequelize.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'return_requests'
       ORDER BY ordinal_position;`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('\n📊 Table Structure:');
    console.table(tableInfo);

    console.log('\n✅ Return requests system is ready!');
    console.log('\nFeatures:');
    console.log('  ✓ Customers can request returns for delivered orders');
    console.log('  ✓ 14-day return window from delivery date');
    console.log('  ✓ Status tracking: pending → approved → items_received → refund_processed → completed');
    console.log('  ✓ Store owners can approve/reject returns');
    console.log('  ✓ Automatic stock restoration on refund');
    console.log('  ✓ Image upload support for evidence');
    console.log('  ✓ Detailed item-level return tracking');

    console.log('\n📝 Next steps:');
    console.log('  1. Restart your backend server');
    console.log('  2. Test the return API endpoints');
    console.log('  3. Integrate frontend return forms');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating return_requests table:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createReturnRequestsTable();
}

module.exports = createReturnRequestsTable;










