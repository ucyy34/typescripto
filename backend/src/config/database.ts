/**
 * Database Configuration (PostgreSQL + Sequelize)
 * Optimized for 50K daily traffic with connection pooling
 */

import * as path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import logger from '../utils/logger';

interface DatabaseConnection {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
    sslRequired: boolean;
}

interface DatabaseConfig {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
    dialect: string;
    logging: boolean | ((msg: string) => void);
    pool: {
        max: number;
        min: number;
        acquire: number;
        idle: number;
    };
    define: {
        timestamps: boolean;
        underscored: boolean;
        paranoid: boolean;
    };
    dialectOptions?: {
        ssl?: {
            require: boolean;
            rejectUnauthorized: boolean;
        };
    };
    use_env_variable?: string;
}

const parseDatabaseUrl = (databaseUrl: string | undefined): DatabaseConnection | null => {
    if (!databaseUrl) {
        return null;
    }

    try {
        const parsed = new URL(databaseUrl);

        const username = decodeURIComponent(parsed.username || '');
        const password = decodeURIComponent(parsed.password || '');
        const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

        return {
            username,
            password,
            database,
            host: parsed.hostname,
            port: parsed.port ? parseInt(parsed.port, 10) : 5432,
            sslRequired: parsed.searchParams.get('sslmode') === 'require',
        };
    } catch (error: any) {
        logger.warn('Invalid DATABASE_URL provided, falling back to discrete credentials: %s', error.message);
        return null;
    }
};

const withDatabaseUrl = (config: DatabaseConfig, { enableSsl = false } = {}): DatabaseConfig => {
    const connection = parseDatabaseUrl(process.env.DATABASE_URL);

    if (!connection) {
        return config;
    }

    let dialectOptions = config.dialectOptions ? { ...config.dialectOptions } : undefined;
    const shouldUseSsl = enableSsl || connection.sslRequired;

    if (shouldUseSsl) {
        const sslOptions = { require: true, rejectUnauthorized: false };
        if (dialectOptions) {
            dialectOptions.ssl = { ...dialectOptions.ssl, ...sslOptions };
        } else {
            dialectOptions = { ssl: sslOptions };
        }
    }

    return {
        ...config,
        username: connection.username || config.username,
        password: connection.password || config.password,
        database: connection.database || config.database,
        host: connection.host || config.host,
        port: connection.port || config.port,
        dialectOptions: dialectOptions || config.dialectOptions,
    };
};

const development = withDatabaseUrl({
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'dostan_marketplace_dev',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: (msg: string) => logger.debug(msg), // Route SQL logs through central logger
    pool: {
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),
        acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
        idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
    },
    define: {
        timestamps: true,
        underscored: true, // Use snake_case for column names
        paranoid: true, // Soft deletes (deleted_at column)
    },
});

const test = withDatabaseUrl({
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'dostan_marketplace_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false, // Disable SQL logging in tests
    pool: {
        max: 5,
        min: 1,
        acquire: 30000,
        idle: 10000,
    },
    define: {
        timestamps: true,
        underscored: true,
        paranoid: true,
    },
});

const production = withDatabaseUrl(
    {
        username: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || '',
        host: process.env.DB_HOST || '',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        dialect: 'postgres',
        logging: false, // Disable SQL logging in production
        pool: {
            max: parseInt(process.env.DB_POOL_MAX || '20', 10), // Higher for production
            min: parseInt(process.env.DB_POOL_MIN || '5', 10),
            acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
            idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
        },
        define: {
            timestamps: true,
            underscored: true,
            paranoid: true,
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false, // For cloud-hosted databases
            },
        },
    },
    { enableSsl: true }
);

export { development, test, production };

// CommonJS compatibility
module.exports = { development, test, production };
