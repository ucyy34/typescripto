const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.ts') });

// Explicit overwrite if .env.ts format differs or isn't picked up by sequelize config
process.env.DB_NAME = 'dosttan_dev';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'medusa123';

const { User } = require('./src/models');
const bcrypt = require('bcrypt');
const sequelize = require('./src/config/sequelize').sequelize;

console.log('EnsureAdmin connecting to:', process.env.DB_NAME);

async function ensureAdmin() {
    try {
        await sequelize.authenticate();
        const hashedPassword = await bcrypt.hash('SmokeTestAdmin123!', 10);

        const [admin, created] = await User.findOrCreate({
            where: { email: 'smoke_admin@dostik.com' },
            defaults: {
                password_hash: hashedPassword,
                first_name: 'Smoke',
                last_name: 'Admin',
                role: 'admin',
                is_verified: true,
                is_active: true
            }
        });

        if (!created) {
            admin.password_hash = hashedPassword;
            admin.role = 'admin'; // Ensure Role
            await admin.save();
        }

        console.log('✅ Guaranteed Admin User: smoke_admin@dostik.com / SmokeTestAdmin123!');
    } catch (e) {
        console.error('❌ Failed to ensure admin:', e);
    } finally {
        await sequelize.close();
    }
}

ensureAdmin();
