/**
 * Shipping Domain Types
 * Pure TypeScript interfaces - no framework dependencies
 */

import { IShippingAddress } from './common.types';

export interface IShippingRate {
    carrier: string;
    service: string;
    amount: number;
    currency: string;
    etaDays?: number;
}

export interface IShippingDimensions {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
}

export interface IShippingDestination extends IShippingAddress {
    email?: string;
    company?: string;
}

export interface IShipmentItemPayload {
    orderItemId?: string;
    qty?: number;
}

export interface ICreateShipmentPayload {
    storeId: string;
    orderId: string;
    selectedRate?: IShippingRate;
    items?: IShipmentItemPayload[];
    totalWeight?: number;
    dimensions?: IShippingDimensions;
    destination?: IShippingDestination;
}

export interface IShipmentResponse {
    id: string;
    store_id: string;
    order_id: string;
    carrier: string;
    service: string;
    tracking_number: string;
    label_url: string;
    cost: number;
    currency: string;
    items: IShipmentItemPayload[];
    status: string;
}

export interface ITrackingEvent {
    code: string;
    description: string;
    occurred_at: string;
}

export interface ITrackingResult {
    tracking_number: string;
    carrier: string;
    status: string;
    events: ITrackingEvent[];
}
