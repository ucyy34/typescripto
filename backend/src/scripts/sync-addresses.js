/**
 * Sync Addresses Table
 * Creates the addresses table in the database
 */

const { sequelize, Address } = require('../models');

async function syncAddresses() {
  try {
    console.log('🔄 Syncing addresses table...');

    // Sync the Address model (create table if not exists)
    await Address.sync({ alter: true });

    console.log('✅ Addresses table synced successfully');

    // Close connection
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing addresses table:', error);
    process.exit(1);
  }
}

syncAddresses();
