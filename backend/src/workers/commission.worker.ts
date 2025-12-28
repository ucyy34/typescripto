/**
 * Commission Worker
 * Subscribe to order paid events and create commission transactions
 */

import { ORDER_EVENTS } from '../events/order.events';
import eventBus from '../events/eventBus';
import commissionService from '../services/commission.service';

console.log('[Worker] CommissionWorker started');

interface OrderPayload {
    orderId?: string;
    [key: string]: unknown;
}

eventBus.subscribe(ORDER_EVENTS.ORDER_PAID, async (payload: OrderPayload) => {
    if (!payload?.orderId) {
        return;
    }

    try {
        await (commissionService as any).createCommissionTransaction(payload.orderId);
    } catch (error: any) {
        console.error('[CommissionWorker] Failed to create commission transaction', {
            orderId: payload.orderId,
            error: error.message,
        });
    }
});

export default true;

// CommonJS compatibility
module.exports = true;
