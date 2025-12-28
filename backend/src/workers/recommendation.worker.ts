/**
 * Recommendation Worker
 * Subscribe to order events and update recommendations
 */

import { ORDER_EVENTS } from '../events/order.events';
import eventBus from '../events/eventBus';
import recommendationService from '../services/recommendation.service';

console.log('[Worker] recommendation started');

eventBus.subscribe(ORDER_EVENTS.ORDER_COMPLETED, async (payload: unknown) => {
    await (recommendationService as any).recordOrderCompletion(payload);
});

export default true;

// CommonJS compatibility
module.exports = true;
