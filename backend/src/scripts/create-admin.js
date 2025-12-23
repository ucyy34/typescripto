/**
 * Create Admin User Script
 * Quick script to add admin user to database
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');

async function createAdmin() {
    // Dynamic import after dotenv
    const db = require('../models');
    const { User } = db;

    try {
        console.log('🔄 Connecting to database...');
        await db.sequelize.authenticate();
        console.log('✅ Database connected');

        // Check if admin exists
        const existingAdmin = await User.findOne({ where: { role: 'admin' } });

        if (existingAdmin) {
            console.log('✅ Admin user already exists:');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log('   Password: Admin@123456 (if not changed)');
            process.exit(0);
            return;
        }

        // Create admin user
        console.log('👤 Creating admin user...');
        const hashedPassword = await bcrypt.hash('Admin@123456', 12);

        const admin = await User.create({
            email: 'admin@dostanmarket.com',
            password_hash: hashedPassword,
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            is_verified: true,
            is_active: true
        });

        console.log('✅ Admin user created successfully!');
        console.log(`   Email: ${admin.email}`);
        console.log('   Password: Admin@123456');

    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    } finally {
        process.exit(0);
    }
}

createAdmin();
