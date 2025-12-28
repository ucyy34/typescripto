/**
 * Analytics Service
 * In-memory analytics tracking for order events
 */

import logger from '../utils/logger';

const { ORDER_EVENTS } = require('../events/order.events');

// Types
interface StoreMetrics {
    ordersCreated: number;
    revenue: number;
    completedOrders: number;
}

interface AnalyticsPayload {
    orderId?: string;
    storeId?: string;
    total?: number | string;
    type?: string;
}

const TERMINAL_ANALYTICS_EVENTS = new Set<string>([
    ORDER_EVENTS.ORDER_COMPLETED,
    ORDER_EVENTS.ORDER_FAILED,
    'order.cancelled',
]);

class AnalyticsService {
    private metricsByStore: Map<string, StoreMetrics>;
    private processedEvents: Map<string, Set<string>>;
    private finalizedOrders: Set<string>;

    constructor() {
        this.metricsByStore = new Map();
        this.processedEvents = new Map();
        this.finalizedOrders = new Set();
    }

    reset(): void {
        this.metricsByStore.clear();
        this.processedEvents.clear();
        this.finalizedOrders.clear();
    }

    getMetrics(storeId: string | null = null): Record<string, StoreMetrics> {
        if (storeId) {
            const metrics = this.metricsByStore.get(storeId) || {
                ordersCreated: 0,
                revenue: 0,
                completedOrders: 0,
            };
            return { [storeId]: { ...metrics } };
        }

        const snapshot: Record<string, StoreMetrics> = {};
        for (const [id, metrics] of this.metricsByStore.entries()) {
            snapshot[id] = { ...metrics };
        }
        return snapshot;
    }

    private _ensureStoreMetrics(storeId: string | null): StoreMetrics | null {
        if (!storeId) {
            return null;
        }

        if (!this.metricsByStore.has(storeId)) {
            this.metricsByStore.set(storeId, {
                ordersCreated: 0,
                revenue: 0,
                completedOrders: 0,
            });
        }

        return this.metricsByStore.get(storeId) || null;
    }

    private _shouldProcess(orderId: string | null, eventType: string | null): boolean {
        if (!orderId || !eventType) {
            return false;
        }

        if (this.finalizedOrders.has(orderId)) {
            return false;
        }

        let events = this.processedEvents.get(orderId);
        if (!events) {
            events = new Set<string>();
            this.processedEvents.set(orderId, events);
        }

        if (events.has(eventType)) {
            return false;
        }

        events.add(eventType);

        if (TERMINAL_ANALYTICS_EVENTS.has(eventType)) {
            this.finalizedOrders.add(orderId);
            this.processedEvents.delete(orderId);
        }

        return true;
    }

    async handleOrderEvent(eventType: string | null, payload: AnalyticsPayload | null): Promise<void> {
        const normalizedEvent = eventType || payload?.type || null;
        const orderId = payload?.orderId || null;
        const storeId = payload?.storeId || null;

        if (!normalizedEvent || !storeId || !this._shouldProcess(orderId, normalizedEvent)) {
            return;
        }

        const metrics = this._ensureStoreMetrics(storeId);
        if (!metrics) {
            return;
        }

        logger.info(`[Analytics] ${normalizedEvent}`, {
            orderId,
            storeId,
            total: payload?.total || null,
        });

        switch (normalizedEvent) {
            case ORDER_EVENTS.ORDER_CREATED:
                metrics.ordersCreated += 1;
                break;
            case ORDER_EVENTS.ORDER_PAID:
                metrics.revenue = parseFloat(
                    (metrics.revenue + (parseFloat(String(payload?.total)) || 0)).toFixed(2)
                );
                break;
            case ORDER_EVENTS.ORDER_COMPLETED:
                metrics.completedOrders += 1;
                break;
            default:
                break;
        }
    }
}

export default new AnalyticsService();
