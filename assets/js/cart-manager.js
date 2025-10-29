/**
 * Cart Manager
 * Simplified API-driven cart management for both guest and authenticated users.
 */

class CartManager {
    constructor() {
        this.apiClient = new ApiClient();
        this.lastCart = [];
    }

    async getCart(forceRefresh = false) {
        try {
            if (forceRefresh && window.apiCache) {
                window.apiCache.clearPattern('/cart');
            }

            const response = await this.apiClient.get('/cart', {}, { useCache: !forceRefresh });

            if (!response?.success || !response?.data) {
                return [];
            }

            const normalized = (response.data.items || []).map((item) => this.normalizeBackendItem(item));
            this.lastCart = normalized;
            return normalized;
        } catch (error) {
            console.error('[CartManager] Failed to load cart from API', error);
            this.lastCart = [];
            return [];
        }
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
                price: parseFloat(item.price || item.product.price || 0),
            };
        }

        return {
            product_id: item.product_id,
            product: {
                id: item.product_id,
                title: item.title,
                slug: item.slug,
                price: item.price,
                compare_price: item.compare_price || null,
                images: item.image ? [item.image] : [],
                stock: item.stock ?? null,
                is_available: item.is_available,
                store: item.store || null,
                category: item.category || null,
            },
            quantity: item.quantity || 1,
            price: parseFloat(item.price || 0),
        };
    }

    async addItem(productId, _productData, quantity = 1) {
        try {
            const payload = { product_id: productId, quantity };
            const response = await this.apiClient.post('/cart/items', payload);

            if (response.success) {
                this._clearCartCache();
                await this.getCart(true);
                return true;
            }

            console.warn('[CartManager] Failed to add item', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error adding item', error);
            return false;
        }
    }

    async updateItem(productId, quantity) {
        try {
            const response = await this.apiClient.put(`/cart/items/${productId}`, { quantity });

            if (response.success) {
                this._clearCartCache();
                await this.getCart(true);
                return true;
            }

            console.warn('[CartManager] Failed to update item', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error updating item', error);
            return false;
        }
    }

    async removeItem(productId) {
        try {
            const response = await this.apiClient.delete(`/cart/items/${productId}`);

            if (response.success) {
                this._clearCartCache();
                await this.getCart(true);
                return true;
            }

            console.warn('[CartManager] Failed to remove item', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error removing item', error);
            return false;
        }
    }

    async clearCart() {
        try {
            const response = await this.apiClient.delete('/cart');

            if (response.success) {
                this._clearCartCache();
                this.lastCart = [];
                return true;
            }

            console.warn('[CartManager] Failed to clear cart', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error clearing cart', error);
            return false;
        }
    }

    async getCartCount(forceRefresh = false) {
        const items = await this.getCart(forceRefresh);
        return items.reduce((sum, item) => sum + (item?.quantity || 0), 0);
    }

    async mergeGuestCart() {
        try {
            const response = await this.apiClient.post('/cart/merge', {});

            if (response.success) {
                this._clearCartCache();
                await this.getCart(true);
                return true;
            }

            console.warn('[CartManager] Guest cart merge failed', response.message);
            return false;
        } catch (error) {
            console.error('[CartManager] Error merging guest cart', error);
            return false;
        }
    }

    _clearCartCache() {
        if (window.apiCache) {
            window.apiCache.clearPattern('/cart');
        }
    }
}

window.cartManager = new CartManager();

window.debugCart = async function debugCart() {
    const items = await window.cartManager.getCart(true);
    console.log('=== CART DEBUG ===');
    console.log('Items:', items.length);
    items.forEach((item, index) => {
        console.log(`${index + 1}.`, item.product?.title || item.product_id, 'x', item.quantity);
    });
};
