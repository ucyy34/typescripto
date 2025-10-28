'use strict';

const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const eventLogger = require('../utils/eventLogger');

const buildPayload = (type, payload = {}) => ({
  type,
  timestamp: payload.timestamp || new Date().toISOString(),
  version: payload.version || Date.now(),
  ...payload,
});

const createInMemoryBus = () => {
  const emitter = new EventEmitter();

  return {
    publish: async (type, payload = {}) => {
      const eventPayload = buildPayload(type, payload);
      emitter.emit(type, eventPayload);
      return eventPayload;
    },
    subscribe: (type, handler) => {
      emitter.on(type, handler);
      return {
        close: () => emitter.off(type, handler),
      };
    },
    clear: () => emitter.removeAllListeners(),
    shutdown: async () => emitter.removeAllListeners(),
  };
};

if (process.env.NODE_ENV === 'test') {
  module.exports = createInMemoryBus();
  return;
}

let Queue;
let Worker;
let QueueEvents;

try {
  ({ Queue, Worker, QueueEvents } = require('bullmq'));
} catch (error) {
  logger.warn('BullMQ not available, using in-memory event bus. %s', error.message);
  module.exports = createInMemoryBus();
  return;
}

const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB, 10) || 0,
    };

const EVENT_QUEUE_NAME = process.env.EVENT_QUEUE_NAME || 'events';

const queue = new Queue(EVENT_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

const queueEvents = new QueueEvents(EVENT_QUEUE_NAME, { connection });
queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('[EventBus] Job %s failed: %s', jobId, failedReason);
});
queueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.debug('[EventBus] Job %s completed', jobId, returnvalue ? { returnvalue } : undefined);
});

const subscribers = new Map();

const subscribe = (type, handler, options = {}) => {
  const worker = new Worker(
    EVENT_QUEUE_NAME,
    async (job) => {
      if (job.name !== type) {
        return;
      }

      const eventPayload = job.data;
      try {
        await handler(eventPayload);
        eventLogger.info(`${type}`, {
          payload: eventPayload,
          worker: options.workerId || process.pid,
        });
      } catch (error) {
        logger.error('[EventBus] Handler for %s failed: %s', type, error.message, {
          stack: error.stack,
        });
        throw error;
      }
    },
    {
      connection,
      concurrency: options.concurrency || 5,
    }
  );

  worker.on('error', (err) => {
    logger.error('[EventBus] Worker error for %s: %s', type, err.message);
  });

  subscribers.set(type, [...(subscribers.get(type) || []), worker]);
  return worker;
};

const publish = async (type, payload = {}, opts = {}) => {
  const eventPayload = buildPayload(type, payload);
  await queue.add(type, eventPayload, opts);
  eventLogger.info(`${type}`, { payload: eventPayload, source: opts.source || 'api' });
  return eventPayload;
};

const shutdown = async () => {
  await Promise.all([
    queue.close(),
    queueEvents.close(),
    ...Array.from(subscribers.values()).flat().map((worker) => worker.close()),
  ]);
};

module.exports = {
  publish,
  subscribe,
  shutdown,
};
