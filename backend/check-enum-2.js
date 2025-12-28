const { sequelize } = require('./src/config/sequelize');

async function fixEnum() {
    try {
        console.log('Connecting to DB...');
        await sequelize.authenticate();
        console.log('Connected.');

        // Check current values
        const [results] = await sequelize.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'enum_orders_status';
    `);

        const validValues = results.map(r => r.enumlabel);
        console.log('Current ENUM values:', validValues);

        const needed = ['draft', 'pending', 'confirmed', 'cancelled'];

        for (const val of needed) {
            if (!validValues.includes(val)) {
                console.log(`Adding missing enum val: ${val}`);
                try {
                    // Must ensure no transaction is wrapped around this.
                    // Sequelize query defaults to no transaction if not specified.
                    await sequelize.query(`ALTER TYPE "enum_orders_status" ADD VALUE '${val}'`);
                    console.log(`Added ${val}.`);
                } catch (e) {
                    console.error(`Failed to add ${val}:`, e.message);
                }
            }
        }

        console.log('Enum fix check complete.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

fixEnum();
