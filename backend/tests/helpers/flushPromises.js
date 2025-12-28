/**
 * Test Helper: Async Promise Flusher
 * 
 * Flushes process.nextTick() and setImmediate() queues
 * Essential for deterministic async testing
 */

module.exports = () => new Promise(resolve => setImmediate(resolve));
