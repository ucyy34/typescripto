import { SequelizeCartRepository } from '../../infrastructure/repositories/SequelizeCartRepository';
import { getProductRepository } from '../../infrastructure/repositories/SequelizeProductRepository';
import { ICart, IAddToCartInput } from '../../domain/types/cart.types';
import { NotFoundError, StockError, UnprocessableError } from '../../shared/errors';
import { Transaction } from 'sequelize';

// Import sequelize instance for transactions
const { sequelize } = require('../../models');

export class CartService {
    private cartRepo: SequelizeCartRepository;

    constructor() {
        this.cartRepo = new SequelizeCartRepository();
    }

    /**
     * Get User Cart (or create if needed - though strictly get should just get?)
     * Current behavior: Gets or creates empty.
     */
    async getCart(userId: string): Promise<ICart> {
        let cart = await this.cartRepo.findByUserId(userId);
        if (!cart) {
            cart = await this.cartRepo.create(userId, null);
        }
        return cart;
    }

    /**
     * Get Guest Cart
     */
    async getGuestCart(guestKey: string): Promise<ICart> {
        let cart = await this.cartRepo.findByGuestKey(guestKey);
        if (!cart) {
            cart = await this.cartRepo.create(null, guestKey);
        }
        return cart;
    }

    /**
     * Add Item to Cart (User or Guest)
     */
    async addItem(input: IAddToCartInput): Promise<ICart> {
        const { userId, guestKey, productId, quantity } = input;

        if (!userId && !guestKey) {
            throw new UnprocessableError('Either userId or guestKey is required');
        }

        // 1. Get Product (Check existence & stock)
        const productRepo = getProductRepository();
        const product = await productRepo.findById(productId);
        if (!product) throw new NotFoundError('Product', productId);

        // Basic stock check for the added quantity
        if (product.stock < quantity) {
            throw new StockError(`Insufficient stock. Available: ${product.stock}`);
        }

        // 2. Resolve Cart
        let cart: ICart | null = null;
        if (userId) {
            cart = await this.cartRepo.findByUserId(userId);
            if (!cart) cart = await this.cartRepo.create(userId, null);
        } else if (guestKey) {
            cart = await this.cartRepo.findByGuestKey(guestKey);
            if (!cart) cart = await this.cartRepo.create(null, guestKey);
        }

        if (!cart) throw new Error('Failed to resolve cart');

        // 3. Check existing quantity in cart + new quantity
        const existingItem = cart.items.find(i => i.productId === productId);
        const currentQty = existingItem ? existingItem.quantity : 0;
        const totalQty = currentQty + quantity;

        if (product.stock < totalQty) {
            throw new StockError(`Insufficient stock. You have ${currentQty} in cart, cannot add ${quantity} more. Available: ${product.stock}`);
        }

        // 4. Add/Update Item (Snapshot Price)
        // If item exists, we usually prefer to KEEP the old snapshot or update?
        // Phase 7.0 standard: Snapshot at add time.
        // For new items: use product.priceCents.
        // For existing: Repo handles logic (usually increment qty).
        // Pass product.priceCents to Repo. Repo decides if it updates price (it keeps old price for duplicates).
        await this.cartRepo.addItem(cart.id, productId, quantity, product.priceCents, null);

        // 5. Return updated cart
        // We need to re-fetch to get fresh totals
        return userId
            ? (await this.cartRepo.findByUserId(userId))!
            : (await this.cartRepo.findByGuestKey(guestKey!))!;
    }

    /**
     * Update Item Quantity
     */
    async updateItem(context: { userId?: string, guestKey?: string }, itemId: string, quantity: number): Promise<ICart> {
        const { userId, guestKey } = context;

        // 1. Resolve Cart
        let cart: ICart | null = null;
        if (userId) cart = await this.cartRepo.findByUserId(userId);
        else if (guestKey) cart = await this.cartRepo.findByGuestKey(guestKey);

        if (!cart) throw new NotFoundError('Cart', userId || guestKey || 'unknown');

        // 2. Validate Item Ownership
        const item = cart.items.find(i => i.id === itemId);
        if (!item) throw new NotFoundError('CartItem', itemId);

        // 3. Stock Check (if increasing)
        if (quantity > item.quantity) {
            const productRepo = getProductRepository();
            const product = await productRepo.findById(item.productId);
            if (product && product.stock < quantity) {
                throw new StockError(`Insufficient stock. Available: ${product.stock}`);
            }
        }

        // 4. Update
        await this.cartRepo.updateItemQuantity(itemId, quantity);

        return userId
            ? (await this.cartRepo.findByUserId(userId))!
            : (await this.cartRepo.findByGuestKey(guestKey!))!;
    }

    /**
     * Remove Item
     */
    async removeItem(context: { userId?: string, guestKey?: string }, itemId: string): Promise<ICart> {
        const { userId, guestKey } = context;

        // 1. Resolve Cart logic similar to above...
        let cart: ICart | null = null;
        if (userId) cart = await this.cartRepo.findByUserId(userId);
        else if (guestKey) cart = await this.cartRepo.findByGuestKey(guestKey);

        if (!cart) throw new NotFoundError('Cart', userId || guestKey || 'unknown');

        // 2. Validate Item Ownership
        const item = cart.items.find(i => i.id === itemId);
        if (!item) throw new NotFoundError('CartItem', itemId);

        await this.cartRepo.removeItem(itemId);

        return userId
            ? (await this.cartRepo.findByUserId(userId))!
            : (await this.cartRepo.findByGuestKey(guestKey!))!;
    }

    /**
     * Clear Cart
     */
    async clearCart(context: { userId?: string, guestKey?: string }): Promise<ICart> {
        const { userId, guestKey } = context;
        let cart: ICart | null = null;

        if (userId) cart = await this.cartRepo.findByUserId(userId);
        else if (guestKey) cart = await this.cartRepo.findByGuestKey(guestKey);

        if (cart) {
            await this.cartRepo.clearCart(cart.id);
        }

        // Return empty cart (or refreshed)
        // If it didn't exist, we return a virtual empty structure or create one?
        // Let's create empty to be safe
        if (userId) {
            return (await this.cartRepo.findByUserId(userId)) || (await this.cartRepo.create(userId, null));
        } else {
            return (await this.cartRepo.findByGuestKey(guestKey!)) || (await this.cartRepo.create(null, guestKey!));
        }
    }

    /**
     * Merge Guest Cart into User Cart
     * Transactional + Locked
     */
    async mergeGuestCart(userId: string, guestKey: string): Promise<ICart> {
        const productRepo = getProductRepository();

        return await sequelize.transaction(async (t: Transaction) => {
            // 1. Lock Guest Cart
            const guestCart = await this.cartRepo.findByGuestKey(guestKey, {
                transaction: t,
                lock: Transaction.LOCK.UPDATE
            });

            // Idempotency: If guest cart doesn't exist (already merged/deleted), just return user cart
            if (!guestCart || guestCart.items.length === 0) {
                const userCart = await this.cartRepo.findByUserId(userId, t);
                return userCart || await this.cartRepo.create(userId, null, t);
            }

            // 2. Get/Create User Cart (Lock implicit by update or create)
            let userCart = await this.cartRepo.findByUserId(userId, t);
            if (!userCart) {
                userCart = await this.cartRepo.create(userId, null, t);
            }

            // 3. Loop items & Merge
            for (const guestItem of guestCart.items) {
                // Check Product Stock for clamping
                const product = await productRepo.findById(guestItem.productId); // Should facilitate transaction if repo supported it, but read is okay.
                // ideally productRepo should accept transaction too for strict consistency, 
                // but stock is checked in addItem hook as well? 
                // No, we implement clamping here.

                if (!product) continue; // Skip deleted products

                // Determine target quantity
                // Find if exists in user cart
                const existingUserItem = userCart!.items.find(i => i.productId === guestItem.productId);
                const currentQty = existingUserItem ? existingUserItem.quantity : 0;

                const rawMergedQty = currentQty + guestItem.quantity;
                const clampedQty = Math.min(rawMergedQty, product.stock);

                const qtyToAdd = clampedQty - currentQty; // Delta

                if (qtyToAdd > 0) {
                    // Price strategy: 
                    // If existing, repo preserves price. 
                    // If new, uses guestItem.priceCents (snapshot from guest time) OR product.priceCents?
                    // Requirement: "otherwise use guest item unit_amount_cents for newly created items."
                    const priceToUse = existingUserItem ? existingUserItem.priceCents : guestItem.priceCents;

                    await this.cartRepo.addItem(userCart!.id, guestItem.productId, qtyToAdd, priceToUse, guestItem.variant?.id || null, t);
                }
            }

            // 4. Delete Guest Cart
            await this.cartRepo.deleteCart(guestCart.id, t);

            // 5. Return fresh User Cart
            return (await this.cartRepo.findByUserId(userId, t))!;
        });
    }
}
