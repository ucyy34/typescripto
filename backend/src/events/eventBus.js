/**
 * Event Bus abstraction powered by BullMQ with in-memory fallback.
 * Provides publish/subscribe helpers so services remain decoupled.
 */

const { EventEmitter } = require('events');
let Queue;
let Worker;
let QueueScheduler;

try {
  ({ Queue, Worker, QueueScheduler } = require('bullmq'));
} catch (error) {
  console.warn('[EventBus] bullmq not installed, using in-memory transport only');
  Queue = null;
  Worker = null;
  QueueScheduler = null;
}
const { redisClient } = require('../config/redis');

const eventLogger = require('../utils/eventLogger');

const EVENTS_QUEUE_NAME = 'events';

const emitter = new EventEmitter();
const isTestEnv = process.env.NODE_ENV === 'test';
const forceMemory = process.env.EVENT_BUS_MODE === 'memory';

let queue;
let scheduler;

const shouldUseMemory = () => forceMemory || isTestEnv;

const ensureQueue = () => {
  if (shouldUseMemory() || !Queue) {
    return null;
  }

  if (!queue) {
    try {
      const connection = redisClient.duplicate();
      queue = new Queue(EVENTS_QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: 100,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 500,
          },
        },
      });

      scheduler = new QueueScheduler(EVENTS_QUEUE_NAME, {
        connection: redisClient.duplicate(),
      });
    } catch (error) {
      console.warn('[EventBus] Falling back to in-memory emitter:', error.message);
      queue = null;
      scheduler = null;
      process.env.EVENT_BUS_MODE = 'memory';
    }
  }

  return queue;
};

const publish = async (type, payload = {}) => {
  const enrichedPayload = {
    ...payload,
    type,
    version: payload.version ?? Date.now(),
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  eventLogger.info(`[EventBus] ${type}`, enrichedPayload);

  const activeQueue = ensureQueue();

  if (activeQueue) {
    await activeQueue.add(type, enrichedPayload);
    return;
  }

  // In-memory fallback for tests and local environments without Redis
  process.nextTick(() => {
    emitter.emit(type, enrichedPayload);
  });
};

const subscribe = (type, handler, { concurrency = 5 } = {}) => {
  if (typeof handler !== 'function') {
    throw new TypeError('Event handler must be a function');
  }

  if (shouldUseMemory() || !ensureQueue()) {
    const listener = (payload) => {
      Promise.resolve()
        .then(() => handler(payload))
        .catch((error) => {
          console.error(`[EventBus] In-memory handler for ${type} failed`, error);
        });
    };

    emitter.on(type, listener);
    return {
      close: () => emitter.off(type, listener),
    };
  }

  const worker = new Worker(
    EVENTS_QUEUE_NAME,
    async (job) => {
      if (job.name !== type) {
        return null;
      }

      return handler(job.data);
    },
    {
      connection: redisClient.duplicate(),
      concurrency,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[EventBus] Job ${job?.id} (${type}) failed`, err);
  });

  return worker;
};

module.exports = {
  publish,
  subscribe,
  EVENTS_QUEUE_NAME,
  ensureQueue,
  getScheduler: () => scheduler,
};
