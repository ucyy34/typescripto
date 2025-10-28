let logger;

try {
  const { createLogger, format, transports } = require('winston');

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

  logger = createLogger({
    level,
    transports: [
      new transports.Console({
        format: isProduction ? productionFormat : consoleFormat,
      }),
    ],
  });
} catch (error) {
  const log = (level, args) => {
    const method = level === 'debug' ? 'log' : level;
    // eslint-disable-next-line no-console
    console[method](...args);
  };

  logger = {
    error: (...args) => log('error', args),
    warn: (...args) => log('warn', args),
    info: (...args) => log('info', args),
    debug: (...args) => log('debug', args),
  };
}

module.exports = logger;
