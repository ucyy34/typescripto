/**
 * Quick Admin Password Reset
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');

async function main() {
    const { User, sequelize } = require('../models');

    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connected!');

        const admin = await User.findOne({
            where: { email: 'admin@dostanmarket.com' }
        });

        if (admin) {
            console.log('Admin found, resetting password...');
            const hash = await bcrypt.hash('Admin@123456', 12);
            await admin.update({ password_hash: hash });
            console.log('✅ Password reset!');
        } else {
            console.log('Admin not found, creating...');
            const hash = await bcrypt.hash('Admin@123456', 12);
            await User.create({
                email: 'admin@dostanmarket.com',
                password_hash: hash,
                first_name: 'Admin',
                last_name: 'User',
                role: 'admin',
                is_verified: true
            });
            console.log('✅ Admin created!');
        }

        console.log('Email: admin@dostanmarket.com');
        console.log('Password: Admin@123456');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
