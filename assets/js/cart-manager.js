/**
 * Unified Cart Manager backed by API endpoints
 * Provides guest/user cart operations without relying on localStorage
 */

class CartManager {
    constructor() {
        this.apiClient = new ApiClient();
        this.cartCache = null;
        this.isLoggedIn = this._resolveAuthState();
    }

    _resolveAuthState() {
        try {
            if (typeof AuthManager !== 'undefined' && typeof AuthManager.isLoggedIn === 'function') {
                return AuthManager.isLoggedIn();
            }
        } catch (_) {
            // Ignore errors accessing AuthManager in environments where it does not exist
        }
        return false;
    }

    _normalizeCartResponse(cartData) {
        const items = Array.isArray(cartData?.items) ? cartData.items : [];
        return items.map((item) => this.normalizeBackendItem(item));
    }

    _storeCache(items) {
        this.cartCache = items;
        return items;
    }

    normalizeBackendItem(item) {
        if (!item) {
            return null;
        }

        if (item.product) {
            return {
                product_id: item.product.id || item.product_id,
                product: item.product,
                quantity: item.quantity || 1,
                price: parseFloat(item.price || item.product?.price || 0),
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
                category: item.category,
            },
            quantity: item.quantity || 1,
            price: parseFloat(item.price || 0),
        };
    }

    async getCart(forceRefresh = false) {
        this.isLoggedIn = this._resolveAuthState();

        if (!forceRefresh && Array.isArray(this.cartCache)) {
            return this.cartCache;
        }

        try {
            const response = await this.apiClient.get('/cart', {}, { useCache: false });
            if (response.success) {
                const normalized = this._normalizeCartResponse(response.data);
                return this._storeCache(normalized);
            }

            console.warn('[CartManager] Failed to load cart:', response.message);
        } catch (error) {
            console.error('[CartManager] Error fetching cart:', error);
        }

        return this._storeCache([]);
    }

    async addItem(productId, _productData, quantity = 1) {
        try {
            const response = await this.apiClient.post('/cart/items', {
                product_id: productId,
                quantity,
            });

            if (response.success) {
                const normalized = this._normalizeCartResponse(response.data);
                this._storeCache(normalized);
                return true;
            }

            console.warn('[CartManager] Failed to add item to cart:', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error adding item to cart:', error);
            return false;
        }
    }

    async updateItem(productId, quantity) {
        try {
            const response = await this.apiClient.put(`/cart/items/${productId}`, { quantity });

            if (response.success) {
                const normalized = this._normalizeCartResponse(response.data);
                this._storeCache(normalized);
                return true;
            }

            console.warn('[CartManager] Failed to update cart item:', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error updating cart item:', error);
            return false;
        }
    }

    async removeItem(productId) {
        try {
            const response = await this.apiClient.delete(`/cart/items/${productId}`);

            if (response.success) {
                const normalized = this._normalizeCartResponse(response.data);
                this._storeCache(normalized);
                return true;
            }

            console.warn('[CartManager] Failed to remove cart item:', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error removing cart item:', error);
            return false;
        }
    }

    async clearCart() {
        try {
            const response = await this.apiClient.delete('/cart');
            if (response.success) {
                this._storeCache([]);
                return true;
            }

            console.warn('[CartManager] Failed to clear cart:', response.message);
        } catch (error) {
            console.error('[CartManager] Error clearing cart:', error);
        }

        this._storeCache([]);
        return false;
    }

    async getCartCount() {
        const items = await this.getCart();
        return items.reduce((sum, item) => sum + (item?.quantity || 0), 0);
    }

    async mergeGuestCart() {
        try {
            const response = await this.apiClient.post('/cart/merge');
            if (response.success) {
                const normalized = this._normalizeCartResponse(response.data);
                this._storeCache(normalized);
                return true;
            }

            console.warn('[CartManager] Failed to merge guest cart:', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error merging guest cart:', error);
            return false;
        }
    }

    invalidateCache() {
        this.cartCache = null;
    }
}

// Create global instance
window.cartManager = new CartManager();

// Debug helper for quick inspection during development
window.debugCart = async function () {
    const cart = await window.cartManager.getCart(true);
    console.log('=== CART DEBUG ===');
    console.log('Logged in:', window.cartManager.isLoggedIn);
    console.log('Items:', cart.length);
    cart.forEach((item, index) => {
        console.log(`${index + 1}.`, item.product?.title || item.product_id, 'x', item.quantity);
    });
};
