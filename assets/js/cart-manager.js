/**
 * Unified Cart Manager
 * API-driven cart management for guest and authenticated users
 */

class CartManager {
    constructor() {
        this.apiClient = new ApiClient();
        this.lastSnapshot = {
            items: [],
            totals: { subtotal: 0, item_count: 0 }
        };
        this.isLoggedIn = typeof AuthManager !== 'undefined' ? AuthManager.isLoggedIn() : false;
        this.subscribers = new Set();
    }

    /**
     * Normalize backend cart item to the frontend shape used by UI components
     */
    normalizeBackendItem(item) {
        if (!item) {
            return null;
        }

        if (item.product) {
            return {
                product_id: item.product_id || item.product.id,
                product: item.product,
                quantity: item.quantity || 1,
                price: parseFloat(item.price || item.product.price || 0)
            };
        }

        return {
            product_id: item.product_id,
            product: {
                id: item.product_id,
                title: item.title,
                slug: item.slug,
                price: item.price,
                compare_price: item.compare_price,
                images: item.image ? [item.image] : [],
                stock: item.stock,
                is_active: item.is_available !== false,
                store: item.store,
                category: item.category
            },
            quantity: item.quantity || 1,
            price: parseFloat(item.price || 0)
        };
    }

    _calculateTotals(items) {
        const subtotal = items.reduce((sum, item) => {
            const unitPrice = parseFloat(item.price || item.product?.price || 0);
            return sum + unitPrice * item.quantity;
        }, 0);

        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

        return {
            subtotal: Number(subtotal.toFixed(2)),
            item_count: itemCount
        };
    }

    _applySnapshot(data) {
        const normalizedItems = Array.isArray(data?.items)
            ? data.items.map(item => this.normalizeBackendItem(item)).filter(Boolean)
            : [];

        const totals = data?.totals && typeof data.totals === 'object'
            ? {
                subtotal: Number(parseFloat(data.totals.subtotal || 0).toFixed(2)),
                item_count: parseInt(data.totals.item_count || 0, 10)
            }
            : this._calculateTotals(normalizedItems);

        this.lastSnapshot = {
            items: normalizedItems,
            totals,
            raw: data || { items: normalizedItems, totals }
        };

        this.isLoggedIn = typeof AuthManager !== 'undefined' ? AuthManager.isLoggedIn() : this.isLoggedIn;

        this._notify();
        return this.lastSnapshot.items;
    }

    _notify() {
        if (!this.subscribers || this.subscribers.size === 0) {
            return;
        }

        for (const handler of this.subscribers) {
            try {
                handler(this.lastSnapshot);
            } catch (error) {
                console.error('[CartManager] Subscriber error:', error);
            }
        }
    }

    subscribe(handler) {
        if (typeof handler !== 'function') {
            return () => {};
        }

        this.subscribers.add(handler);
        handler(this.lastSnapshot);

        return () => {
            this.subscribers.delete(handler);
        };
    }

    async _fetchCartFromApi() {
        const response = await this.apiClient.get('/cart', {}, { useCache: false });
        if (response.success) {
            return response.data || { items: [], totals: { subtotal: 0, item_count: 0 } };
        }

        throw new Error(response.message || 'Failed to fetch cart');
    }

    async getCart(forceRefresh = true) {
        try {
            if (!forceRefresh && this.lastSnapshot.items.length > 0) {
                return this.lastSnapshot.items;
            }

            const data = await this._fetchCartFromApi();
            return this._applySnapshot(data);
        } catch (error) {
            console.error('[CartManager] Error fetching cart:', error);
            this.lastSnapshot = {
                items: [],
                totals: { subtotal: 0, item_count: 0 },
                raw: null
            };
            this._notify();
            return [];
        }
    }

    async addItem(productId, productData, quantity = 1) {
        try {
            const response = await this.apiClient.post('/cart/items', {
                product_id: productId,
                quantity
            });

            if (response.success) {
                this._applySnapshot(response.data);
                return true;
            }

            console.warn('[CartManager] Add item failed:', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error adding item:', error);
            return false;
        }
    }

    async updateItem(productId, quantity) {
        try {
            const response = await this.apiClient.put(`/cart/items/${productId}`, { quantity });
            if (response.success) {
                this._applySnapshot(response.data);
                return true;
            }

            console.warn('[CartManager] Update item failed:', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error updating item:', error);
            return false;
        }
    }

    async removeItem(productId) {
        try {
            const response = await this.apiClient.delete(`/cart/items/${productId}`);
            if (response.success) {
                this._applySnapshot(response.data);
                return true;
            }

            console.warn('[CartManager] Remove item failed:', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error removing item:', error);
            return false;
        }
    }

    async clearCart() {
        try {
            const response = await this.apiClient.delete('/cart');
            if (response.success) {
                this._applySnapshot(response.data);
                return true;
            }

            console.warn('[CartManager] Clear cart failed:', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error clearing cart:', error);
            return false;
        }
    }

    async getCartCount(forceRefresh = false) {
        if (forceRefresh) {
            await this.getCart(true);
        }

        return this.lastSnapshot.totals.item_count || 0;
    }

    async mergeGuestCart() {
        try {
            this.isLoggedIn = typeof AuthManager !== 'undefined' ? AuthManager.isLoggedIn() : true;
            this.apiClient = new ApiClient();

            const response = await this.apiClient.post('/cart/merge', {});
            if (response.success) {
                this._applySnapshot(response.data);
                return true;
            }

            console.warn('[CartManager] Merge guest cart failed:', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error merging guest cart:', error);
            return false;
        }
    }
}

// Create global instance
window.cartManager = new CartManager();

// Debug helper
window.debugCart = function() {
    console.log('=== CART DEBUG ===');
    console.log('Snapshot:', window.cartManager.lastSnapshot);
};
