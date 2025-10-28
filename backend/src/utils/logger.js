let winston;

try {
  winston = require('winston');
} catch (error) {
  winston = null;
}

if (!winston) {
  const fallback = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    debug: (...args) => console.debug('[DEBUG]', ...args),
  };

  fallback.child = () => fallback;

  module.exports = fallback;
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
    format.printf(({ level: lvl, message, timestamp, stack, ...meta }) => {
      const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      if (stack) {
        return `[${timestamp}] ${lvl.toUpperCase()}: ${message}\n${stack}`;
      }
      return `[${timestamp}] ${lvl.toUpperCase()}: ${message}${metaString}`;
    })
  );

  const productionFormat = format.combine(...baseFormats, format.json());

  const logger = createLogger({
    level,
    transports: [
      new transports.Console({
        format: isProduction ? productionFormat : consoleFormat,
      }),
    ],
  });

  module.exports = logger;
}
