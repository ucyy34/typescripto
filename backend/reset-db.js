const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');

async function resetDb() {
    // 1. Connect to postgres (default DB) to drop target DB
    const adminUrl = 'postgres://postgres:medusa123@localhost:5432/postgres';
    const sequelize = new Sequelize(adminUrl, { logging: false });

    try {
        console.log('🔄 RESETTING DATABASE: dosttan_dev');

        // Terminate connections
        await sequelize.query(`
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = 'dosttan_dev' AND pid <> pg_backend_pid();
        `);

        // Drop
        await sequelize.query('DROP DATABASE IF EXISTS dosttan_dev;');
        console.log('✅ Dropped dosttan_dev');

        // Create
        await sequelize.query('CREATE DATABASE dosttan_dev;');
        console.log('✅ Created dosttan_dev');

        // 2. Run Seed:Dev (Migrate + Seed)
        console.log('🚀 Running npm run seed:dev...');
        execSync('npm run seed:dev', {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: { ...process.env, ENV_TAG: 'dev' }
        });

        console.log('🎉 FRESH DB RESET COMPLETE!');

    } catch (error) {
        console.error('❌ Reset Failed:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

resetDb();
