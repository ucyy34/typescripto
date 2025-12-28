/**
 * Sequelize ORM Instance
 * Central database connection manager
 */

import { Sequelize, Options } from 'sequelize';
import type { DatabaseConfig } from './database';
import { development, production, test } from './database';
import { env } from './env';
import logger from '../utils/logger';

type Environment = 'development' | 'test' | 'production';

const runtimeEnv: Environment = env.NODE_ENV || 'development';
const configByEnv: Record<Environment, DatabaseConfig> = {
    development,
    test,
    production,
};
const dbConfig = configByEnv[runtimeEnv];
const envValues = env as Record<string, string | undefined>;

// Create Sequelize instance
let sequelize: Sequelize;

if (dbConfig.use_env_variable) {
    sequelize = new Sequelize(envValues[dbConfig.use_env_variable] as string, {
        dialect: dbConfig.dialect,
        logging: dbConfig.logging,
        pool: dbConfig.pool,
        define: dbConfig.define,
        dialectOptions: dbConfig.dialectOptions || {},
    } as Options);
} else {
    sequelize = new Sequelize(
        dbConfig.database,
        dbConfig.username,
        dbConfig.password,
        {
            host: dbConfig.host,
            port: dbConfig.port,
            dialect: dbConfig.dialect,
            logging: dbConfig.logging,
            pool: dbConfig.pool,
            define: dbConfig.define,
            dialectOptions: dbConfig.dialectOptions || {},
        } as Options
    );
}

/**
 * Test database connection
 */
const testConnection = async (): Promise<boolean> => {
    try {
        await sequelize.authenticate();
        logger.info('✅ Connected to PostgreSQL');
        return true;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Failed to connect to PostgreSQL: %s', message);
        return false;
    }
};

/**
 * Sync database models (use migrations in production)
 */
const syncDatabase = async (options: object = {}): Promise<boolean> => {
    try {
        await sequelize.sync(options);
        logger.info('✅ Database synced');
        return true;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Database sync failed: %s', message);
        return false;
    }
};

/**
 * Close database connection
 */
const closeConnection = async (): Promise<void> => {
    try {
        await sequelize.close();
        logger.info('Database connection closed');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Database close failed: %s', message);
    }
};

export { sequelize, testConnection, syncDatabase, closeConnection };

// CommonJS compatibility
module.exports = {
    sequelize,
    testConnection,
    syncDatabase,
    closeConnection,
};
