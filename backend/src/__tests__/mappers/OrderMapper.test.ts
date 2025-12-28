/**
 * OrderMapper Unit Tests
 * Verifies mapping between Sequelize models and Domain types
 */

const { OrderMapper } = require('../../infrastructure/mappers/OrderMapper');

describe('OrderMapper', () => {
    describe('toDomain', () => {
        it('should map Sequelize order to domain IOrder with cents values', () => {
            const raw = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                order_number: 'ORD-2025-00001',
                user_id: 'user-123',
                store_id: 'store-456',
                status: 'pending',
                payment_status: 'pending',
                subtotal_cents: 9999,
                shipping_cost_cents: 1500,
                discount_cents: 500,
                total_cents: 10999,
                currency: 'TRY',
                shipping_address: {
                    full_name: 'Test User',
                    phone: '+905551234567',
                    address_line1: '123 Test St',
                    city: 'Istanbul',
                    postal_code: '34000',
                    country: 'Turkey',
                },
                idempotency_key: 'idem-key-123',
                items: [
                    {
                        id: 'item-1',
                        order_id: '123e4567-e89b-12d3-a456-426614174000',
                        product_id: 'prod-1',
                        vendor_id: 'store-456',
                        quantity: 2,
                        unit_amount_cents: 4999,
                        line_total_amount_cents: 9998,
                        currency: 'TRY',
                        product_snapshot: { title: 'Test Product', sku: 'SKU-001' },
                    },
                ],
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
            };

            const order = OrderMapper.toDomain(raw);

            // Basic fields
            expect(order.id).toBe('123e4567-e89b-12d3-a456-426614174000');
            expect(order.orderNumber).toBe('ORD-2025-00001');
            expect(order.status).toBe('pending');

            // Cents values (NO decimal conversion here - raw cents)
            expect(order.subtotalCents).toBe(9999);
            expect(order.shippingCostCents).toBe(1500);
            expect(order.discountCents).toBe(500);
            expect(order.totalCents).toBe(10999);
            expect(order.currency).toBe('TRY');

            // Items
            expect(order.items).toHaveLength(1);
            expect(order.items[0].unitAmountCents).toBe(4999);
            expect(order.items[0].lineTotalAmountCents).toBe(9998);
            expect(order.items[0].productSnapshot.title).toBe('Test Product');

            // Address
            expect(order.shippingAddress.fullName).toBe('Test User');
            expect(order.shippingAddress.city).toBe('Istanbul');
        });

        it('should throw error for null input', () => {
            expect(() => OrderMapper.toDomain(null)).toThrow('OrderMapper.toDomain: raw is null/undefined');
        });

        it('should handle missing optional fields gracefully', () => {
            const raw = {
                id: 'test-id',
                order_number: 'ORD-TEST',
                status: 'draft',
                items: [],
                shipping_address: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const order = OrderMapper.toDomain(raw);

            expect(order.subtotalCents).toBe(0);
            expect(order.shippingCostCents).toBe(0);
            expect(order.totalCents).toBe(0);
            expect(order.shippingAddress.fullName).toBe('');
            expect(order.shippingAddress.country).toBe('Turkey'); // Default
        });
    });

    describe('toPersistence', () => {
        it('should map domain order to snake_case persistence format', () => {
            const order = {
                userId: 'user-123',
                storeId: 'store-456',
                status: 'pending',
                subtotalCents: 9999,
                shippingCostCents: 1500,
                totalCents: 11499,
                currency: 'TRY',
                shippingAddress: {
                    fullName: 'Test User',
                    phone: '+905551234567',
                    addressLine1: '123 Test St',
                    city: 'Istanbul',
                    postalCode: '34000',
                    country: 'Turkey',
                },
            };

            const persisted = OrderMapper.toPersistence(order);

            expect(persisted.user_id).toBe('user-123');
            expect(persisted.store_id).toBe('store-456');
            expect(persisted.subtotal_cents).toBe(9999);
            expect(persisted.shipping_cost_cents).toBe(1500);
            expect(persisted.total_cents).toBe(11499);
            expect(persisted.shipping_address.full_name).toBe('Test User');
        });
    });
});
