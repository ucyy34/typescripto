const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = require('../src/config/sequelize');
const User = require('../src/models/User');
const Store = require('../src/models/Store');
const logger = require('../src/utils/logger');

const seed = async () => {
  let exitCode = 0;

  try {
    logger.info('Starting seed script');
    await sequelize.authenticate();

    const [adminUser, created] = await User.findOrCreate({
      where: { email: 'admin@dostan.app' },
      defaults: {
        password_hash: 'admin123',
        first_name: 'Dostan',
        last_name: 'Admin',
        role: 'admin',
        is_verified: true,
        is_active: true,
      },
    });

    if (created) {
      logger.info('Created default admin user (admin@dostan.app / admin123)');
    } else {
      logger.info('Default admin user already exists');
    }

    await Store.findOrCreate({
      where: { slug: 'dostan-main-store' },
      defaults: {
        user_id: adminUser.id,
        name: 'Dostan Main Store',
        slug: 'dostan-main-store',
        description: 'Demo store seeded for Railway deployments',
        status: 'approved',
        approved_at: new Date(),
        approved_by: adminUser.id,
        email: 'store@dostan.app',
      },
    });

    logger.info('Seed data applied successfully');
  } catch (error) {
    logger.error('Seed script failed: %s', error.message);
    exitCode = 1;
  } finally {
    await sequelize.close();
    process.exit(exitCode);
  }
};

seed();
