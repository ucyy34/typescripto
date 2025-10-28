const mockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(() => mockLogger()),
});

module.exports = {
  createLogger: jest.fn(() => mockLogger()),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    json: jest.fn(),
    simple: jest.fn(),
    errors: jest.fn(),
    splat: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
  },
};
