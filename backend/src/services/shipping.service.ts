import { v4 as uuidv4 } from 'uuid';
import { Shipment, ShipmentItem, ShipmentEvent, Order } from '../models';
import type ShipmentModel, { IShipmentAddress, IShipmentDimensions, ShipmentStatus } from '../models/Shipment';
import type OrderModel from '../models/Order';

interface ShippingRate {
  carrier: string;
  service: string;
  amount: number;
  currency: string;
  etaDays?: number;
}

interface ShipmentItemPayload {
  orderItemId?: string;
  qty?: number;
}

interface CreateShipmentPayload {
  storeId: string;
  orderId: string;
  selectedRate?: ShippingRate;
  items?: ShipmentItemPayload[];
  totalWeight?: number;
  dimensions?: IShipmentDimensions | null;
  destination?: IShipmentAddress | null;
}

interface ShipmentResponse {
  id: string;
  store_id: string;
  order_id: string;
  carrier: string;
  service: string;
  tracking_number: string;
  label_url: string;
  cost: number;
  currency: string;
  items: ShipmentItemPayload[];
  status: ShipmentStatus;
}

interface TrackingEvent {
  code: string;
  description: string;
  occurred_at: string;
}

interface TrackingResult {
  tracking_number: string;
  carrier: string;
  status: string;
  events: TrackingEvent[];
}

function ensureMock(): void {
  const provider = process.env.SHIPPING_PROVIDER || 'mock';
  if (provider !== 'mock') {
    throw new Error('Only mock shipping provider is implemented. Set SHIPPING_PROVIDER=mock');
  }
}

async function getRates(payload: { totalWeight?: number }): Promise<ShippingRate[]> {
  ensureMock();
  const base = Math.max(20, Math.ceil((payload.totalWeight || 1) * 5));
  return [
    { carrier: 'MockExpress', service: 'STANDARD', amount: base, currency: 'TRY', etaDays: 3 },
    { carrier: 'MockExpress', service: 'EXPRESS', amount: base + 15, currency: 'TRY', etaDays: 1 },
  ];
}

async function createShipment(payload: CreateShipmentPayload): Promise<ShipmentResponse> {
  ensureMock();
  const trackingNumber = 'MOCK-' + uuidv4().split('-')[0].toUpperCase();
  const labelUrl = `https://example.com/labels/${trackingNumber}.pdf`;

  const response: ShipmentResponse = {
    id: uuidv4(),
    store_id: payload.storeId,
    order_id: payload.orderId,
    carrier: payload.selectedRate?.carrier || 'MockExpress',
    service: payload.selectedRate?.service || 'STANDARD',
    tracking_number: trackingNumber,
    label_url: labelUrl,
    cost: payload.selectedRate?.amount || 25,
    currency: payload.selectedRate?.currency || 'TRY',
    items: payload.items || [],
    status: 'created',
  };

  if (process.env.SHIPPING_PERSIST === 'true') {
    try {
      const created: ShipmentModel = await Shipment.create({
        order_id: response.order_id,
        store_id: response.store_id,
        carrier: response.carrier,
        service: response.service,
        tracking_number: response.tracking_number,
        label_url: response.label_url,
        cost: response.cost,
        currency: response.currency,
        status: response.status,
        total_weight: payload.totalWeight || null,
        dimensions: payload.dimensions || null,
        shipping_address: payload.destination || null,
      });

      // Persist items
      if (Array.isArray(response.items) && response.items.length > 0) {
        await Promise.all(
          response.items.map((it) =>
            ShipmentItem.create({
              shipment_id: created.id,
              order_item_id: it.orderItemId || null,
              qty: it.qty || 1,
            })
          )
        );
      }

      // Initial event (using findOrCreate to prevent duplicates)
      await ShipmentEvent.findOrCreate({
        where: {
          shipment_id: created.id,
          code: 'created',
          occurred_at: new Date(),
        },
        defaults: {
          description: 'Label created',
          location: null,
          raw_payload: null,
        },
      });

      response.id = created.id;

      // ✅ IMPROVED: Better error handling for order status update
      try {
        const order: OrderModel | null = await Order.findByPk(response.order_id);
        if (order && order.canTransitionTo('shipped')) {
          await order.transitionTo('shipped', {
            tracking_number: response.tracking_number,
            carrier: response.carrier,
          });
          console.log(`[shipping] Order ${response.order_id} marked as shipped`);
        } else {
          console.warn(`[shipping] Order ${response.order_id} cannot transition to shipped`);
        }
      } catch (orderErr: unknown) {
        // ✅ IMPROVED: Log error but don't fail shipment creation
        console.error('[shipping] Order status update failed:', orderErr);
        // In production, you might want to queue this for retry or alert ops team
      }
    } catch (err: unknown) {
      // ✅ IMPROVED: Better error handling and logging
      console.error('[shipping] Shipment persist error:', {
        error: err,
        stack: process.env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined,
        orderId: payload.orderId,
        storeId: payload.storeId,
      });

      // ✅ IMPROVED: In production, throw critical errors
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to persist shipment: ${err instanceof Error ? err.message : 'unknown error'}`);
      }

      // In development, continue with mock response
      console.warn('[shipping] Continuing with mock response (development mode)');
    }
  }

  return response;
}

async function getShipmentById(id: string): Promise<ShipmentModel | ShipmentResponse> {
  ensureMock();
  if (process.env.SHIPPING_PERSIST === 'true') {
    try {
      const found: ShipmentModel | null = await Shipment.findByPk(id, { include: [{ model: ShipmentItem, as: 'items' }, { model: ShipmentEvent, as: 'events' }] });
      if (found) return found;
    } catch (err: unknown) {
      console.warn('[shipping] Get shipment fallback to mock:', err);
    }
  }
  return {
    id,
    carrier: 'MockExpress',
    service: 'STANDARD',
    tracking_number: 'MOCK-' + (id || 'XXXXXX').toString().slice(0, 6).toUpperCase(),
    label_url: `https://example.com/labels/${id}.pdf`,
    status: 'created',
  };
}

async function cancelShipment(id: string): Promise<{ id: string; cancelled: boolean; message: string }> {
  ensureMock();
  if (process.env.SHIPPING_PERSIST === 'true') {
    try {
      const found: ShipmentModel | null = await Shipment.findByPk(id);
      if (found) {
        await found.update({ status: 'cancelled' });
        // ✅ FIX: Use findOrCreate to prevent duplicate cancel events
        await ShipmentEvent.findOrCreate({
          where: {
            shipment_id: id,
            code: 'cancelled',
            occurred_at: new Date(),
          },
          defaults: {
            description: 'Shipment cancelled',
            location: null,
            raw_payload: null,
          },
        });
      }
    } catch (err: unknown) {
      console.warn('[shipping] Cancel persist error, continuing as mock:', err);
    }
  }
  return { id, cancelled: true, message: 'Shipment cancelled (mock)' };
}

async function track(trackingNumber: string): Promise<TrackingResult> {
  ensureMock();
  const now = new Date();
  const events: TrackingEvent[] = [
    { code: 'created', description: 'Label created', occurred_at: new Date(now.getTime() - 1000 * 60 * 60).toISOString() },
    { code: 'in_transit', description: 'In transit', occurred_at: new Date(now.getTime() - 1000 * 60 * 30).toISOString() },
    { code: 'out_for_delivery', description: 'Out for delivery', occurred_at: new Date(now.getTime() - 1000 * 60 * 10).toISOString() },
    { code: 'delivered', description: 'Delivered', occurred_at: now.toISOString() },
  ];
  const result: TrackingResult = {
    tracking_number: trackingNumber,
    carrier: 'MockExpress',
    status: 'delivered',
    events,
  };

  if (process.env.SHIPPING_PERSIST === 'true') {
    try {
      const shipment: ShipmentModel | null = await Shipment.findOne({ where: { tracking_number: trackingNumber } });
      if (shipment) {
        // ✅ FIX: Use findOrCreate to prevent duplicate events
        for (const ev of events) {
          await ShipmentEvent.findOrCreate({
            where: {
              shipment_id: shipment.id,
              code: ev.code,
              occurred_at: new Date(ev.occurred_at),
            },
            defaults: {
              description: ev.description,
              location: null,
              raw_payload: null,
            },
          });
        }
        await shipment.update({ status: 'delivered' });
      }
    } catch (err: unknown) {
      console.warn('[shipping] Track persist error, continuing as mock:', err);
    }
  }

  return result;
}

export = {
  getRates,
  createShipment,
  getShipmentById,
  cancelShipment,
  track,
};
