/**
 * Logger Utility
 * Winston-based logging with fallback to console
 */

import { env } from '../config/env';

interface Logger {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    child?: () => Logger;
}

type WinstonModule = typeof import('winston');
interface LogInfo {
    level: string;
    message: string;
    timestamp?: string;
    stack?: string;
    [key: string]: unknown;
}

let winston: WinstonModule | null;

try {
    winston = require('winston') as WinstonModule;
} catch (error) {
    winston = null;
}

let logger: Logger;

if (!winston) {
    const fallback: Logger = {
        info: (...args: unknown[]) => console.log('[INFO]', ...args),
        warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
        error: (...args: unknown[]) => console.error('[ERROR]', ...args),
        debug: (...args: unknown[]) => console.debug('[DEBUG]', ...args),
    };

    fallback.child = () => fallback;

    logger = fallback;
} else {
    const { createLogger, format, transports } = winston;

    const isProduction = env.NODE_ENV === 'production';
    const level = env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

    const baseFormats = [
        format.errors({ stack: true }),
        format.splat(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    ];

    const consoleFormat = format.combine(
        ...baseFormats,
        format.printf(({ level: lvl, message, timestamp, stack, ...meta }: LogInfo) => {
            const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            if (stack) {
                return `[${timestamp}] ${lvl.toUpperCase()}: ${message}\n${stack}`;
            }
            return `[${timestamp}] ${lvl.toUpperCase()}: ${message}${metaString}`;
        })
    );

    const productionFormat = format.combine(...baseFormats, format.json());

    logger = createLogger({
        level,
        transports: [
            new transports.Console({
                format: isProduction ? productionFormat : consoleFormat,
            }),
        ],
    });
}

export default logger;

// CommonJS compatibility
module.exports = logger;
