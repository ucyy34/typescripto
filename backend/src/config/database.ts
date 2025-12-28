/**
 * Database Configuration (PostgreSQL + Sequelize)
 * Optimized for 50K daily traffic with connection pooling
 */

import logger from '../utils/logger';
import { env } from './env';

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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn('Invalid DATABASE_URL provided, falling back to discrete credentials: %s', message);
        return null;
    }
};

const withDatabaseUrl = (config: DatabaseConfig, { enableSsl = false } = {}): DatabaseConfig => {
    const connection = parseDatabaseUrl(env.DATABASE_URL);

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
    username: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    database: env.DB_NAME || 'dostan_marketplace_dev',
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT,
    dialect: 'postgres',
    logging: (msg: string) => logger.debug(msg), // Route SQL logs through central logger
    pool: {
        max: env.DB_POOL_MAX ?? 10,
        min: env.DB_POOL_MIN ?? 2,
        acquire: env.DB_POOL_ACQUIRE ?? 30000,
        idle: env.DB_POOL_IDLE ?? 10000,
    },
    define: {
        timestamps: true,
        underscored: true, // Use snake_case for column names
        paranoid: true, // Soft deletes (deleted_at column)
    },
});

const test = withDatabaseUrl({
    username: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    database: env.DB_NAME || 'dostan_marketplace_test',
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT,
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
        username: env.DB_USER || '',
        password: env.DB_PASSWORD || '',
        database: env.DB_NAME || '',
        host: env.DB_HOST || '',
        port: env.DB_PORT,
        dialect: 'postgres',
        logging: false, // Disable SQL logging in production
        pool: {
            max: env.DB_POOL_MAX ?? 20, // Higher for production
            min: env.DB_POOL_MIN ?? 5,
            acquire: env.DB_POOL_ACQUIRE ?? 30000,
            idle: env.DB_POOL_IDLE ?? 10000,
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

export type { DatabaseConfig };
export { development, test, production };

// CommonJS compatibility
module.exports = { development, test, production };
