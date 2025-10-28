const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { redisClient } = require('../config/redis');

const EVENT_QUEUE_NAME = 'events';
let useMemoryBus = process.env.NODE_ENV === 'test';
let Queue;
let Worker;
let QueueEvents;

if (!useMemoryBus) {
  try {
    ({ Queue, Worker, QueueEvents } = require('bullmq'));
  } catch (error) {
    logger.warn('BullMQ dependency missing, using in-memory event bus: %s', error.message);
    useMemoryBus = true;
  }
}

const ensureLogFile = () => {
  const logDir = path.join(__dirname, '../../logs');
  const logPath = path.join(logDir, 'events.log');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, '', 'utf8');
  }
  return logPath;
};

const logPath = ensureLogFile();

const appendLog = (line) => {
  fs.appendFile(logPath, `${line}\n`, (err) => {
    if (err) {
      logger.error('Failed to append event log: %s', err.message);
    }
  });
};

/**
 * In-memory bus used during tests to avoid Redis dependency.
 */
class MemoryEventBus {
  constructor() {
    this.emitter = new EventEmitter();
  }

  async publish(type, payload, jobOptions = {}) {
    const enriched = this.enrichPayload(type, payload, jobOptions);
    appendLog(`${new Date().toISOString()} ${type} ${JSON.stringify(enriched)}`);
    this.emitter.emit(type, enriched);
    return enriched;
  }

  subscribe(type, handler) {
    const wrapped = async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        logger.error('Memory bus handler for %s failed: %s', type, error.message);
        throw error;
      }
    };

    this.emitter.on(type, wrapped);

    return () => {
      this.emitter.off(type, wrapped);
    };
  }

  enrichPayload(type, payload, jobOptions) {
    const base = payload || {};
    return {
      ...base,
      eventType: type,
      timestamp: base.timestamp || new Date().toISOString(),
      version: base.version || Date.now(),
      metadata: {
        retry: jobOptions.attempts ? jobOptions.attempts > 1 : false,
        ...base.metadata,
      },
    };
  }
}

/**
 * BullMQ-backed event bus implementation for development/production.
 */
class BullEventBus {
  constructor() {
    this.handlers = new Map();
    this.queue = new Queue(EVENT_QUEUE_NAME, {
      connection: redisClient.duplicate(),
    });
    this.worker = new Worker(
      EVENT_QUEUE_NAME,
      async (job) => {
        const typeHandlers = this.handlers.get(job.name);
        if (!typeHandlers || typeHandlers.length === 0) {
          logger.warn('No handlers registered for event %s', job.name);
          return null;
        }

        appendLog(`${new Date().toISOString()} ${job.name} ${JSON.stringify(job.data)}`);

        for (const handler of typeHandlers) {
          await handler(job.data, job);
        }
        return null;
      },
      {
        connection: redisClient.duplicate(),
        concurrency: parseInt(process.env.EVENT_WORKER_CONCURRENCY || '4', 10),
      }
    );

    this.worker.on('failed', (job, err) => {
      logger.error('Event job %s failed: %s', job?.name, err?.message);
    });

    this.queueEvents = new QueueEvents(EVENT_QUEUE_NAME, {
      connection: redisClient.duplicate(),
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error('Queue event failed for job %s: %s', jobId, failedReason);
    });
  }

  enrichPayload(type, payload, jobOptions) {
    const base = payload || {};
    return {
      ...base,
      eventType: type,
      timestamp: base.timestamp || new Date().toISOString(),
      version: base.version || Date.now(),
      metadata: {
        retry: jobOptions.attempts ? jobOptions.attempts > 1 : false,
        ...base.metadata,
      },
    };
  }

  async publish(type, payload, jobOptions = {}) {
    const enriched = this.enrichPayload(type, payload, jobOptions);
    await this.queue.add(type, enriched, {
      removeOnComplete: { count: 1000 },
      removeOnFail: false,
      attempts: jobOptions.attempts || 3,
      backoff: jobOptions.backoff || { type: 'exponential', delay: 500 },
    });
    appendLog(`${new Date().toISOString()} ${type} ${JSON.stringify(enriched)}`);
    return enriched;
  }

  subscribe(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type).push(async (payload, job) => {
      try {
        await handler(payload, job);
      } catch (error) {
        logger.error('Handler for %s failed: %s', type, error.message);
        throw error;
      }
    });

    return () => {
      const list = this.handlers.get(type) || [];
      const idx = list.findIndex((fn) => fn === handler);
      if (idx >= 0) {
        list.splice(idx, 1);
      }
    };
  }
}

const eventBus = useMemoryBus ? new MemoryEventBus() : new BullEventBus();

module.exports = eventBus;
