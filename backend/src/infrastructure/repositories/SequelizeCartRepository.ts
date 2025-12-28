import { ICart, ICartItem } from '../../domain/types/cart.types';
import { NotFoundError } from '../../shared/errors';
import { Transaction } from 'sequelize';

const { Cart, CartItem, Product } = require('../../models');

export class SequelizeCartRepository {
    /**
     * Find cart by user ID
     */
    async findByUserId(userId: string, transaction?: Transaction): Promise<ICart | null> {
        const cart = await Cart.findOne({
            where: { user_id: userId },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'title', 'slug', 'images', 'store_id'],
                        },
                        {
                            model: require('../../models').ProductVariant,
                            as: 'variant',
                            attributes: ['id', 'sku', 'price', 'stock', 'image_url'],
                        },
                    ],
                },
            ],
            transaction
        });

        if (!cart) return null;

        return this.toDomain(cart);
    }

    /**
     * Find cart by Guest Key
     * Supports locking for atomic operations (e.g. merge)
     * Note: When locking, we don't include items (FOR UPDATE + LEFT JOIN issue in PostgreSQL)
     */
    async findByGuestKey(
        guestKey: string,
        options: { transaction?: Transaction, lock?: boolean | string | object } = {}
    ): Promise<ICart | null> {
        // If locking, first lock the cart row, then fetch with includes
        if (options.lock && options.transaction) {
            // Step 1: Lock the cart row (no includes)
            const lockedCart = await Cart.findOne({
                where: { guest_key: guestKey },
                transaction: options.transaction,
                lock: options.lock
            });

            if (!lockedCart) return null;

            // Step 2: Fetch with includes (no lock)
            const cart = await Cart.findOne({
                where: { id: lockedCart.id },
                include: [
                    {
                        model: CartItem,
                        as: 'items',
                        include: [
                            {
                                model: Product,
                                as: 'product',
                                attributes: ['id', 'title', 'slug', 'images'],
                            },
                        ],
                    },
                ],
                transaction: options.transaction
            });

            return this.toDomain(cart);
        }

        // Normal query without lock
        const cart = await Cart.findOne({
            where: { guest_key: guestKey },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [
                        {
                            model: Product,
                            as: 'product',
                            attributes: ['id', 'title', 'slug', 'images'],
                        },
                        {
                            model: require('../../models').ProductVariant,
                            as: 'variant',
                            attributes: ['id', 'sku', 'price', 'stock', 'image_url'],
                        },
                    ],
                },
            ],
            transaction: options.transaction
        });

        if (!cart) return null;

        return this.toDomain(cart);
    }

    /**
     * Create cart (User or Guest)
     */
    async create(userId: string | null, guestKey: string | null, transaction?: Transaction): Promise<ICart> {
        const cart = await Cart.create(
            { user_id: userId, guest_key: guestKey },
            { transaction }
        );
        return this.toDomain(cart);
    }

    /**
     * Add or update item in cart
     * Handles "upsert" logic manually to ensure price snapshot logic is correct
     */
    async addItem(
        cartId: string,
        productId: string,
        quantity: number,
        priceCents: number,
        variantId?: string | null,
        transaction?: Transaction
    ): Promise<void> {
        const existingItem = await CartItem.findOne({
            where: {
                cart_id: cartId,
                product_id: productId,
                variant_id: variantId || null
            },
            transaction
        });

        if (existingItem) {
            existingItem.quantity += quantity;
            await existingItem.save({ transaction });
        } else {
            await CartItem.create({
                cart_id: cartId,
                product_id: productId,
                variant_id: variantId || null,
                quantity,
                price_cents: priceCents,
            }, { transaction });
        }
    }

    /**
     * Update item quantity directly
     */
    async updateItemQuantity(itemId: string, quantity: number, transaction?: Transaction): Promise<void> {
        const item = await CartItem.findByPk(itemId, { transaction });
        if (!item) throw new NotFoundError('CartItem', itemId);

        item.quantity = quantity;
        await item.save({ transaction });
    }

    /**
     * Remove item
     */
    async removeItem(itemId: string, transaction?: Transaction): Promise<void> {
        const deleted = await CartItem.destroy({ where: { id: itemId }, transaction });
        if (!deleted) throw new NotFoundError('CartItem', itemId);
    }

    /**
     * Clear cart items
     */
    async clearCart(cartId: string, transaction?: Transaction): Promise<void> {
        await CartItem.destroy({ where: { cart_id: cartId }, transaction });
    }

    /**
     * Delete cart entirely (used after merge)
     * Uses force:true to hard delete and release the guest_key unique constraint
     */
    async deleteCart(cartId: string, transaction?: Transaction): Promise<void> {
        await Cart.destroy({ where: { id: cartId }, transaction, force: true });
    }

    /**
     * Mapper: Sequelize -> Domain
     */
    private toDomain(cartModel: any): ICart {
        const items = (cartModel.items || []).map((item: any) => ({
            id: item.id,
            cartId: item.cart_id,
            productId: item.product_id,
            quantity: item.quantity,
            priceCents: item.price_cents,

            // Store (Phase 8.0 - multi-store checkout)
            storeId: item.product?.store_id || undefined,

            // Variant
            variant: item.variant ? {
                id: item.variant.id,
                sku: item.variant.sku,
                price: item.variant.price,
                stock: item.variant.stock, // Include stock for validation
            } : null,

            // Joined fields
            productTitle: item.product?.title || 'Unknown Product',
            productSlug: item.product?.slug || '',
            productImage: item.variant?.image_url || (item.product?.images ? item.product.images[0] : undefined), // Use variant image if available

            // Computed per item
            totalPriceCents: item.quantity * item.price_cents,
        }));

        // Computed totals
        const totalQuantity = items.reduce((sum: number, i: ICartItem) => sum + i.quantity, 0);
        const totalPriceCents = items.reduce((sum: number, i: ICartItem) => sum + (i.totalPriceCents || 0), 0);

        return {
            id: cartModel.id,
            userId: cartModel.user_id || null,
            guestKey: cartModel.guest_key || null,
            items,
            totalQuantity,
            totalPriceCents,
            createdAt: cartModel.created_at,
            updatedAt: cartModel.updated_at,
        };
    }

    // ==========================================
    // CHECKOUT V2 METHODS
    // ==========================================

    /**
     * Get cart with items for atomic checkout (with row locking)
     * Uses safe locking strategy: lock cart row first, then fetch items separately
     */
    async getCartForUpdate(
        userId: string,
        transaction: Transaction
    ): Promise<ICart | null> {
        // Step 1: Lock the cart row (no includes to avoid FOR UPDATE + LEFT JOIN issue)
        const lockedCart = await Cart.findOne({
            where: { user_id: userId },
            transaction,
            lock: Transaction.LOCK.UPDATE
        });

        if (!lockedCart) return null;

        // Step 2: Fetch cart items (no lock needed, cart row is locked)
        const cartItems = await CartItem.findAll({
            where: { cart_id: lockedCart.id },
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'title', 'slug', 'images', 'price_cents', 'stock', 'store_id'],
            },
            {
                model: require('../../models').ProductVariant,
                as: 'variant',
                attributes: ['id', 'sku', 'price', 'stock', 'image_url'],
            }],
            transaction
        });

        // Build domain object manually
        const items = cartItems.map((item: any) => ({
            id: item.id,
            cartId: item.cart_id,
            productId: item.product_id,
            quantity: item.quantity,
            priceCents: item.price_cents,
            storeId: item.product?.store_id || undefined,
            productTitle: item.product?.title || 'Unknown Product',
            productSlug: item.product?.slug || '',
            productImage: item.product?.images ? item.product.images[0] : undefined,
            totalPriceCents: item.quantity * item.price_cents,
        }));

        const totalQuantity = items.reduce((sum: number, i: any) => sum + i.quantity, 0);
        const totalPriceCents = items.reduce((sum: number, i: any) => sum + (i.totalPriceCents || 0), 0);

        return {
            id: lockedCart.id,
            userId: lockedCart.user_id || null,
            guestKey: lockedCart.guest_key || null,
            items,
            totalQuantity,
            totalPriceCents,
            createdAt: lockedCart.created_at,
            updatedAt: lockedCart.updated_at,
        };
    }

    /**
     * Get cart items with product stock info for checkout validation
     */
    async getCartItemsWithStock(
        cartId: string,
        transaction?: Transaction
    ): Promise<Array<{ itemId: string; productId: string; quantity: number; priceCents: number; stock: number }>> {
        const items = await CartItem.findAll({
            where: { cart_id: cartId },
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'stock', 'price_cents'],
            },
            {
                model: require('../../models').ProductVariant,
                as: 'variant',
                attributes: ['id', 'stock', 'price'],
            }],
            transaction
        });

        return items.map((item: any) => ({
            itemId: item.id,
            productId: item.product_id,
            quantity: item.quantity,
            priceCents: item.product?.price_cents || item.price_cents,
            stock: item.product?.stock || 0,
        }));
    }
}
