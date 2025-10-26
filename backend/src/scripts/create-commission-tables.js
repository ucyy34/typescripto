/**
 * Create Commission Tables
 * Run this script to create commission_settings and commission_transactions tables
 */

const { sequelize } = require('../config/sequelize');
const CommissionSettings = require('../models/CommissionSettings');
const CommissionTransaction = require('../models/CommissionTransaction');

async function createCommissionTables() {
  try {
    console.log('🔄 Starting commission tables creation...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Create tables (force: false ensures we don't drop existing data)
    await CommissionSettings.sync({ force: false });
    console.log('✅ commission_settings table created successfully');

    await CommissionTransaction.sync({ force: false });
    console.log('✅ commission_transactions table created successfully');

    // Check commission_settings table structure
    const settingsInfo = await sequelize.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'commission_settings'
       ORDER BY ordinal_position;`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('\n📊 Commission Settings Table Structure:');
    console.table(settingsInfo);

    // Check commission_transactions table structure
    const transactionsInfo = await sequelize.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'commission_transactions'
       ORDER BY ordinal_position;`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('\n📊 Commission Transactions Table Structure:');
    console.table(transactionsInfo);

    // Initialize default global settings
    console.log('\n🔧 Initializing default commission settings...');
    const existingSettings = await CommissionSettings.findOne({
      where: { store_id: null },
    });

    if (!existingSettings) {
      await CommissionSettings.create({
        store_id: null,
        commission_type: 'percentage',
        default_rate: 15.00,
        min_commission: 5.00,
        max_commission: null,
        is_active: true,
        notes: 'Default global commission settings - 15%',
      });
      console.log('✅ Default settings created: 15% commission');
    } else {
      console.log('ℹ️  Default settings already exist');
    }

    console.log('\n✅ Commission system is ready!');
    console.log('\nFeatures:');
    console.log('  ✓ Commission settings management (global & per-store)');
    console.log('  ✓ Automatic commission calculation on order creation');
    console.log('  ✓ Commission transaction tracking');
    console.log('  ✓ Store earnings summary');
    console.log('  ✓ Platform revenue tracking');
    console.log('  ✓ Flexible commission types: percentage, fixed, tiered, category-based');

    console.log('\n📝 API Endpoints:');
    console.log('  Vendor:');
    console.log('    GET  /api/v1/commissions/store/:storeId');
    console.log('    GET  /api/v1/commissions/store/:storeId/summary');
    console.log('  Admin:');
    console.log('    GET  /api/v1/commissions/admin/all');
    console.log('    GET  /api/v1/commissions/admin/summary');
    console.log('    POST /api/v1/commissions/admin/settings');
    console.log('    PATCH /api/v1/commissions/admin/:id/paid');

    console.log('\n📝 Next steps:');
    console.log('  1. Restart your backend server');
    console.log('  2. Test commission calculation on new orders');
    console.log('  3. Check vendor earnings dashboard');
    console.log('  4. Configure admin commission panel');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating commission tables:', error);
    console.error('Details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createCommissionTables();
}

module.exports = createCommissionTables;










