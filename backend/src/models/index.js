/**
 * Hybrid CJS Bridge for legacy require('./models')
 * 
 * Provides backward compatibility for CommonJS consumers:
 * - const models = require('./models')
 * - const { User, Order } = require('./models')
 * - import models from './models'
 * 
 * Works in both:
 * - dist runtime (compiled JS) 
 * - ts-node runtime (TS sources)
 */

// Single require - prefer compiled JS, fallback to ts-node
let mod;
try {
  // Prefer compiled JS when built
  mod = require('./index');
} catch (e) {
  // Fallback for ts-node runtime (development)
  mod = require('./index.ts');
}

// Export default or module itself
module.exports = mod.default ?? mod;

// Attach all named exports for destructuring access
Object.assign(module.exports, mod);
