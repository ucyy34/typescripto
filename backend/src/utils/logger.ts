/**
 * Logger Utility
 * Winston-based logging with fallback to console
 */

interface Logger {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    child?: () => Logger;
}

let winston: any;

try {
    winston = require('winston');
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

    const isProduction = process.env.NODE_ENV === 'production';
    const level = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

    const baseFormats = [
        format.errors({ stack: true }),
        format.splat(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    ];

    const consoleFormat = format.combine(
        ...baseFormats,
        format.printf(({ level: lvl, message, timestamp, stack, ...meta }: any) => {
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
