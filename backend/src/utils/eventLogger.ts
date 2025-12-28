'use strict';

import * as fs from 'fs';
import * as path from 'path';

interface EventLoggerInterface {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    add?: (transport: unknown) => void;
}

let winston: any;

try {
    winston = require('winston');
} catch (error) {
    winston = null;
}

const logsDir = path.resolve(__dirname, '..', '..', 'logs');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

let eventLogger: EventLoggerInterface;

if (winston && winston.transports && typeof winston.transports.File === 'function') {
    const { createLogger, format, transports } = winston;

    const fileTransport = new transports.File({
        filename: path.join(logsDir, 'events.log'),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5,
    });

    eventLogger = createLogger({
        level: process.env.EVENT_LOG_LEVEL || 'info',
        format: format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.errors({ stack: true }),
            format.splat(),
            format.json()
        ),
        transports: [fileTransport],
    });

    if (process.env.NODE_ENV !== 'production') {
        (eventLogger as any).add(
            new transports.Console({
                format: format.combine(
                    format.colorize(),
                    format.timestamp({ format: 'HH:mm:ss' }),
                    format.printf(({ level, message, timestamp, ...meta }: any) => {
                        const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
                        return `[${timestamp}] ${level}: ${message}${metaString}`;
                    })
                ),
            })
        );
    }
} else {
    const fallback = (level: string) => {
        return (...args: unknown[]): void => {
            const entry = `${new Date().toISOString()} [${level.toUpperCase()}] ${args
                .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
                .join(' ')}`;
            fs.appendFile(path.join(logsDir, 'events.log'), `${entry}\n`, () => { });
            const consoleFn = (console as any)[level];
            consoleFn ? consoleFn(entry) : console.log(entry);
        };
    };

    eventLogger = {
        info: fallback('info'),
        warn: fallback('warn'),
        error: fallback('error'),
        debug: fallback('debug'),
    };
}

export default eventLogger;

// CommonJS compatibility
module.exports = eventLogger;
