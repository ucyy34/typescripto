const { sequelize } = require('./src/config/sequelize');

async function checkTable() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB:', sequelize.config.database);

        // Check column type name
        const [cols] = await sequelize.query(`
      SELECT column_name, udt_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'status';
    `);
        console.log('Column Info:', cols);

        // Check Enum values for that type
        if (cols.length > 0) {
            const typeName = cols[0].udt_name;
            console.log(`Checking values for type: ${typeName}`);

            const [vals] = await sequelize.query(`
          SELECT e.enumlabel
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = '${typeName}';
        `);
            console.log('Enum Values:', vals.map(r => r.enumlabel));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkTable();
