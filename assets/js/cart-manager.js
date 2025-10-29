/**
 * Cart Manager
 * Centralized client for cart operations backed by the API
 */

class CartManager {
    constructor() {
        this.apiClient = new ApiClient();
        this.lastCartResponse = { items: [], totals: { subtotal: 0, item_count: 0 } };
        this.lastCart = { items: [], totals: { subtotal: 0, item_count: 0 } };
    }

    /**
     * Fetch cart from API
     * @param {boolean} forceRefresh - bypass client cache
     * @returns {Promise<Array>} cart items
     */
    async getCart(forceRefresh = false) {
        try {
            const response = await this.apiClient.get(
                API_CONFIG.ENDPOINTS.CART.BASE,
                {},
                { useCache: !forceRefresh }
            );

            if (response.success && response.data) {
                this._applyCartResponse(response.data);
                return this.lastCart.items;
            }

            this._applyCartResponse();
            return [];
        } catch (error) {
            console.error('[CartManager] Failed to fetch cart:', error);
            this._applyCartResponse();
            return [];
        }
    }

    /**
     * Return last known totals without refetching
     */
    getTotals() {
        return this.lastCart?.totals || { subtotal: 0, item_count: 0 };
    }

    /**
     * Add item to cart via API
     */
    async addItem(productId, _productData = {}, quantity = 1) {
        try {
            const response = await this.apiClient.post(API_CONFIG.ENDPOINTS.CART.ITEMS, {
                product_id: productId,
                quantity,
            });

            if (response.success && response.data) {
                this._applyCartResponse(response.data);
                return true;
            }

            console.warn('[CartManager] addItem response not successful:', response);
            return false;
        } catch (error) {
            console.error('[CartManager] Error adding item:', error);
            return false;
        }
    }

    /**
     * Update item quantity
     */
    async updateItem(productId, quantity) {
        try {
            const response = await this.apiClient.put(
                API_CONFIG.ENDPOINTS.CART.ITEM_BY_ID(productId),
                { quantity }
            );

            if (response.success && response.data) {
                this._applyCartResponse(response.data);
                return true;
            }

            console.warn('[CartManager] updateItem response not successful:', response);
            return false;
        } catch (error) {
            console.error('[CartManager] Error updating item:', error);
            return false;
        }
    }

    /**
     * Remove item from cart
     */
    async removeItem(productId) {
        try {
            const response = await this.apiClient.delete(
                API_CONFIG.ENDPOINTS.CART.ITEM_BY_ID(productId)
            );

            if (response.success && response.data) {
                this._applyCartResponse(response.data);
                return true;
            }

            console.warn('[CartManager] removeItem response not successful:', response);
            return false;
        } catch (error) {
            console.error('[CartManager] Error removing item:', error);
            return false;
        }
    }

    /**
     * Clear entire cart
     */
    async clearCart() {
        try {
            const response = await this.apiClient.delete(API_CONFIG.ENDPOINTS.CART.BASE);
            if (response.success && response.data) {
                this._applyCartResponse(response.data);
            } else {
                this._applyCartResponse();
            }
            return true;
        } catch (error) {
            console.error('[CartManager] Error clearing cart:', error);
            this._applyCartResponse();
            return false;
        }
    }

    /**
     * Return number of items in cart
     */
    async getCartCount() {
        if (Array.isArray(this.lastCart?.items) && this.lastCart.items.length > 0) {
            return this.lastCart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }

        const items = await this.getCart(true);
        return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }

    /**
     * Merge guest cart into user cart after login
     */
    async mergeGuestCart() {
        try {
            const response = await this.apiClient.post(API_CONFIG.ENDPOINTS.CART.MERGE);
            if (response.success && response.data) {
                this._applyCartResponse(response.data);
                return true;
            }

            console.warn('[CartManager] mergeGuestCart response not successful:', response);
            return false;
        } catch (error) {
            console.error('[CartManager] Error merging guest cart:', error);
            return false;
        }
    }

    _applyCartResponse(data) {
        const response = data || { items: [], totals: { subtotal: 0, item_count: 0 } };
        this.lastCartResponse = response;

        const normalizedItems = Array.isArray(response.items)
            ? response.items
                  .map((item) => this._normalizeItem(item))
                  .filter((item) => item !== null)
            : [];

        this.lastCart = {
            items: normalizedItems,
            totals: response.totals || { subtotal: 0, item_count: 0 },
        };
    }

    _normalizeItem(item) {
        if (!item) {
            return null;
        }

        if (item.product) {
            return item;
        }

        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price || 0);
        const product = {
            id: item.product_id,
            title: item.title,
            slug: item.slug,
            price,
            compare_price: item.compare_price || null,
            images: item.image ? [item.image] : [],
            stock: item.stock,
            is_available: item.is_available,
            store: item.store || null,
            category: item.category || null,
        };

        return {
            product_id: item.product_id,
            quantity: item.quantity,
            price,
            item_total: item.item_total || price * item.quantity,
            product,
            store: item.store || null,
            category: item.category || null,
            title: item.title,
            slug: item.slug,
            compare_price: item.compare_price || null,
            stock: item.stock,
            is_available: item.is_available,
        };
    }
}

window.cartManager = new CartManager();
