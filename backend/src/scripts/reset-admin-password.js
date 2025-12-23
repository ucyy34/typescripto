/**
 * Reset Admin Password Script
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');
const User = require('../models/User');

async function resetAdminPassword() {
    try {
        console.log('🔄 Resetting admin password...');
        await sequelize.authenticate();

        const admin = await User.findOne({ where: { email: 'admin@dostanmarket.com' } });

        if (!admin) {
            console.log('❌ Admin user not found');
            process.exit(1);
        }

        const newPassword = 'Admin@123456';
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await admin.update({ password_hash: hashedPassword });

        console.log('✅ Admin password reset successfully!');
        console.log(`   Email: ${admin.email}`);
        console.log(`   Password: ${newPassword}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetAdminPassword();
