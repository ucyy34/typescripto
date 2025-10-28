const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const { redisClient } = require('../config/redis');

let Queue;
let Worker;
let bullEnabled = true;

try {
  // Lazy require BullMQ. In CI environments where the dependency is not
  // pre-installed we gracefully fall back to an in-memory dispatcher that
  // keeps the API surface identical for unit tests.
  ({ Queue, Worker } = require('bullmq'));
} catch (error) {
  bullEnabled = false;
}

const queueName = process.env.EVENT_QUEUE_NAME || 'events';
const logDirectory = path.resolve(__dirname, '..', '..', 'logs');
const logFile = path.join(logDirectory, 'events.log');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const emitter = new EventEmitter();
const inMemoryHandlers = new Map();
const activeWorkers = new Set();
let queueInstance = null;

const ensureQueue = () => {
  if (!bullEnabled || queueInstance) {
    return queueInstance;
  }

  // Create a dedicated Redis connection for BullMQ so that queue operations do
  // not interfere with the global cache client (different command buffering,
  // etc.).
  const connection = redisClient.duplicate();
  queueInstance = new Queue(queueName, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  return queueInstance;
};

const dispatchInMemory = async (type, payload) => {
  const handlers = inMemoryHandlers.get(type);
  if (!handlers || handlers.length === 0) {
    return;
  }

  for (const handler of handlers) {
    try {
      await handler(payload);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`In-memory event handler for ${type} failed:`, error);
    }
  }
};

const logEvent = (type, payload) => {
  const record = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };

  fs.appendFile(logFile, `${JSON.stringify(record)}\n`, (error) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to write event log:', error);
    }
  });
};

const publish = async (type, payload = {}) => {
  const eventPayload = {
    ...payload,
    type,
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  logEvent(type, eventPayload);

  emitter.emit(type, eventPayload);

  if (bullEnabled) {
    const queue = ensureQueue();
    await queue.add(type, eventPayload, {
      jobId: payload.jobId || undefined,
    });
  } else {
    // Execute asynchronously to mimic queue behaviour.
    setImmediate(() => {
      dispatchInMemory(type, eventPayload);
    });
  }

  return eventPayload;
};

const subscribe = (type, handler) => {
  if (bullEnabled) {
    const worker = new Worker(
      queueName,
      async (job) => {
        if (job.name !== type) {
          return null;
        }
        await handler(job.data);
        return null;
      },
      {
        connection: redisClient.duplicate(),
      }
    );

    activeWorkers.add(worker);

    const close = async () => {
      activeWorkers.delete(worker);
      await worker.close();
    };

    return { close };
  }

  const handlers = inMemoryHandlers.get(type) || [];
  const wrapped = async (payload) => handler(payload);
  handlers.push(wrapped);
  inMemoryHandlers.set(type, handlers);

  emitter.on(type, wrapped);

  return {
    close: async () => {
      emitter.off(type, wrapped);
      const existing = inMemoryHandlers.get(type) || [];
      inMemoryHandlers.set(
        type,
        existing.filter((fn) => fn !== wrapped)
      );
    },
  };
};

const once = (type) =>
  new Promise((resolve) => {
    emitter.once(type, resolve);
  });

const close = async () => {
  const workers = Array.from(activeWorkers);
  await Promise.all(
    workers.map(async (worker) => {
      try {
        await worker.close();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to close worker:', error);
      }
    })
  );
  activeWorkers.clear();

  if (queueInstance) {
    try {
      await queueInstance.close();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to close queue:', error);
    }
    queueInstance = null;
  }
};

module.exports = {
  publish,
  subscribe,
  once,
  close,
  queueName,
  isBullEnabled: () => bullEnabled,
};
