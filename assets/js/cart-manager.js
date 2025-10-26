/**
 * Unified Cart Manager
 * Manages cart across authenticated and guest users
 * Syncs between backend and localStorage
 */

class CartManager {
    constructor() {
        this.apiClient = null;
        this.isLoggedIn = false;
        this.initializeApiClient();
    }

    initializeApiClient() {
        // Check if user is logged in
        this.isLoggedIn = !!localStorage.getItem('accessToken');

        if (this.isLoggedIn && typeof ApiClient !== 'undefined') {
            this.apiClient = new ApiClient();
        }
    }

    /**
     * Get cart items (from backend or localStorage)
     * @returns {Promise<Array>} Cart items
     */
    async getCart(forceRefresh = false, allowRecovery = true) {
        try {
            // Always check current login status before fetching
            this.isLoggedIn = !!localStorage.getItem('accessToken');
            if (this.isLoggedIn && !this.apiClient) {
                this.initializeApiClient();
            }

            console.log('[CartManager] getCart - isLoggedIn:', this.isLoggedIn, 'hasApiClient:', !!this.apiClient);

            if (this.isLoggedIn && this.apiClient) {
                // Clear cache if force refresh
                if (forceRefresh && window.apiCache) {
                    window.apiCache.clearPattern('/cart');
                    console.log('[CartManager] Force refresh: cleared cart cache');
                }
                
                // Get from backend
                const response = await this.apiClient.get('/cart');

                if (response.success && response.data) {
                    console.log('[CartManager] Loaded from backend:', response.data.items?.length || 0, 'items');

                    // Normalize backend items to frontend shape
                    const normalized = (response.data.items || []).map(item => this.normalizeBackendItem(item));

                    if (normalized.length === 0) {
                        const localCart = this.getLocalCart();

                        if (allowRecovery && localCart.length > 0) {
                            console.warn('[CartManager] Backend cart empty but local cart has items - attempting recovery');
                            const restoredCount = await this.recoverBackendCartFromLocal(localCart);

                            if (restoredCount > 0) {
                                console.log('[CartManager] Recovery restored', restoredCount, 'items - refetching cart');
                                // After recovery attempt, fetch again without triggering recovery loop
                                return await this.getCart(true, false);
                            }

                            console.warn('[CartManager] Recovery could not restore items - keeping local cart');
                            return localCart;
                        }

                        if (!allowRecovery && localCart.length > 0) {
                            console.warn('[CartManager] Backend cart still empty after recovery - falling back to local cart');
                            return localCart;
                        }
                    }

                    // Sync to localStorage as backup
                    this.syncToLocalStorage(normalized);

                    return normalized;
                }
            }

            // Fallback to localStorage
            console.log('[CartManager] Using localStorage (not logged in or backend failed)');
            return this.getLocalCart();
        } catch (error) {
            console.error('[CartManager] Error fetching cart:', error);
            // Fallback to localStorage
            return this.getLocalCart();
        }
    }

    /**
     * Get cart from localStorage
     * @returns {Array} Cart items
     */
    getLocalCart() {
        let raw = [];
        const storedCart = localStorage.getItem('cart');

        if (storedCart) {
            try {
                const parsedCart = JSON.parse(storedCart);

                if (Array.isArray(parsedCart)) {
                    raw = parsedCart;
                } else {
                    console.warn('[CartManager] Stored cart is not an array - resetting cart storage');
                    localStorage.removeItem('cart');
                }
            } catch (parseError) {
                console.error('[CartManager] Failed to parse stored cart JSON - clearing cart', parseError);
                localStorage.removeItem('cart');
            }
        }

        console.log('[CartManager] Raw localStorage:', raw.length, 'items');

        // Auto-migrate old format to new format
        const migrated = raw.map(item => {
            // Check if item is in old format (missing product_id or product object)
            if (!item.product_id && item.id) {
                console.log('[CartManager] Migrating old format item:', item);
                // Old format detected, migrate to new format
                return {
                    product_id: item.id,
                    product: {
                        id: item.id,
                        title: item.title || 'Unknown Product',
                        price: item.price || 0,
                        images: item.images || [],
                        stock: item.stock || 99,
                        store: item.store || null
                    },
                    quantity: item.quantity || 1,
                    price: parseFloat(item.price || 0)
                };
            }

            // Check if product object is missing but we have product_id
            if (item.product_id && !item.product) {
                console.log('[CartManager] Item missing product object:', item);
                // Reconstruct product object from flat item data
                return {
                    product_id: item.product_id,
                    product: {
                        id: item.product_id,
                        title: item.title || 'Unknown Product',
                        price: item.price || 0,
                        images: item.images || [],
                        stock: item.stock || 99,
                        store: item.store || null
                    },
                    quantity: item.quantity || 1,
                    price: parseFloat(item.price || 0)
                };
            }

            // Already in correct format
            return item;
        });

        // Filter and log invalid items for debugging
        const valid = migrated.filter(i => {
            const isValid = i && i.product_id && i.product;
            if (!isValid) {
                console.warn('[CartManager] Invalid item filtered:', i);
            }
            return isValid;
        });

        // Auto-save if migration occurred or items were filtered
        if (valid.length !== raw.length || migrated.length !== raw.length) {
            console.log('[CartManager] Saving migrated/cleaned cart:', valid.length, 'items');
            localStorage.setItem('cart', JSON.stringify(valid));
        }

        console.log('[CartManager] Valid items after migration:', valid.length);
        return valid;
    }

    /**
     * Attempt to restore backend cart using the local cart snapshot
     * @param {Array} localCart - Items stored in localStorage
     */
    async recoverBackendCartFromLocal(localCart) {
        if (!this.isLoggedIn || !this.apiClient || !Array.isArray(localCart) || localCart.length === 0) {
            return 0;
        }

        try {
            console.warn('[CartManager] Recovering backend cart from local snapshot (items:', localCart.length, ')');

            let restoredCount = 0;

            for (const item of localCart) {
                if (!item || !item.product_id) continue;

                try {
                    const response = await this.apiClient.post('/cart/items', {
                        product_id: item.product_id,
                        quantity: item.quantity || 1
                    });
                    if (response?.success) {
                        restoredCount += 1;
                    }
                } catch (itemError) {
                    console.error('[CartManager] Failed to restore item during recovery:', item.product_id, itemError);
                }
            }

            if (window.apiCache) {
                window.apiCache.clearPattern('/cart');
            }

            return restoredCount;
        } catch (error) {
            console.error('[CartManager] Error during backend cart recovery:', error);
            return 0;
        }
    }

    /**
     * Add item to cart
     * @param {string} productId - Product ID
     * @param {Object} productData - Full product data
     * @param {number} quantity - Quantity to add
     * @returns {Promise<boolean>} Success status
     */
    async addItem(productId, productData, quantity = 1) {
        try {
            console.log('[CartManager] Adding item:', productId, 'qty:', quantity, productData);

            // Check current login status
            this.isLoggedIn = !!localStorage.getItem('accessToken');
            if (this.isLoggedIn && !this.apiClient) {
                this.initializeApiClient();
            }

            // Always add to localStorage first for immediate UI update
            this.addToLocalStorage(productId, productData, quantity);

            if (this.isLoggedIn && this.apiClient) {
                // Also sync to backend
                try {
                    const response = await this.apiClient.post('/cart/items', {
                        product_id: productId,
                        quantity: quantity
                    });
                    console.log('[CartManager] Synced to backend');
                    
                    // Clear cart cache to force fresh data on next GET
                    if (window.apiCache) {
                        window.apiCache.clearPattern('/cart');
                        console.log('[CartManager] Cleared cart cache');
                    }
                } catch (backendError) {
                    console.warn('[CartManager] Backend sync failed, localStorage only:', backendError);
                }
            }

            return true;

        } catch (error) {
            console.error('[CartManager] Error adding item:', error);
            return false;
        }
    }

    /**
     * Add item to localStorage
     * @param {string} productId - Product ID
     * @param {Object} productData - Full product data
     * @param {number} quantity - Quantity
     */
    addToLocalStorage(productId, productData, quantity) {
        console.log('[CartManager] addToLocalStorage called:', { productId, productData, quantity });

        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        console.log('[CartManager] Current cart from localStorage:', cart);

        const existingIndex = cart.findIndex(item => item.product_id === productId);
        console.log('[CartManager] Existing item index:', existingIndex);

        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantity;
            console.log('[CartManager] Updated existing item, new qty:', cart[existingIndex].quantity);
        } else {
            const newItem = {
                product_id: productId,
                product: {
                    id: productData.id || productId,
                    title: productData.title,
                    price: productData.price,
                    images: productData.images || [],
                    stock: productData.stock || 99,
                    store: productData.store || null
                },
                quantity: quantity,
                price: parseFloat(productData.price)
            };
            console.log('[CartManager] Creating new item:', newItem);
            cart.push(newItem);
            console.log('[CartManager] Cart after push:', cart);
        }

        console.log('[CartManager] About to save to localStorage, cart:', cart);
        localStorage.setItem('cart', JSON.stringify(cart));

        // Verify save
        const savedCart = JSON.parse(localStorage.getItem('cart'));
        console.log('[CartManager] Verified saved cart:', savedCart);
        console.log('[CartManager] Saved to localStorage successfully, total items:', savedCart.length);
    }

    /**
     * Sync backend cart to localStorage
     * @param {Array} items - Cart items from backend
     */
    syncToLocalStorage(items) {
        localStorage.setItem('cart', JSON.stringify(items));
        console.log('[CartManager] Synced to localStorage:', items.length, 'items');
    }

    /**
     * Normalize backend cart item (flattened) to frontend shape with nested product
     * Backend item fields (from cart.service.populateCartItems):
     * { product_id, title, slug, price, compare_price, image, quantity, stock, is_available, store, category }
     */
    normalizeBackendItem(item) {
        if (item.product) return item; // already normalized
        return {
            product_id: item.product_id,
            product: {
                id: item.product_id,
                title: item.title,
                slug: item.slug,
                price: item.price,
                compare_price: item.compare_price,
                images: item.image ? [item.image] : [],
                stock: item.stock || 99,
                is_active: item.is_available !== false,
                store: item.store,
                category: item.category,
            },
            quantity: item.quantity,
            price: item.price,
        };
    }

    /**
     * Update item quantity
     * @param {string} productId - Product ID
     * @param {number} quantity - New quantity
     * @returns {Promise<boolean>} Success status
     */
    async updateItem(productId, quantity) {
        try {
            if (this.isLoggedIn && this.apiClient) {
                const response = await this.apiClient.put(`/cart/items/${productId}`, { quantity });

                if (response.success) {
                    // Clear cart cache
                    if (window.apiCache) {
                        window.apiCache.clearPattern('/cart');
                    }
                    // Update localStorage too
                    this.updateLocalStorage(productId, quantity);
                    return true;
                }
            }

            // Update localStorage
            this.updateLocalStorage(productId, quantity);
            return true;

        } catch (error) {
            console.error('[CartManager] Error updating item:', error);
            this.updateLocalStorage(productId, quantity);
            return false;
        }
    }

    /**
     * Update item in localStorage
     * @param {string} productId - Product ID
     * @param {number} quantity - New quantity
     */
    updateLocalStorage(productId, quantity) {
        let cart = this.getLocalCart();
        const item = cart.find(i => i.product_id === productId);

        if (item) {
            item.quantity = quantity;
            localStorage.setItem('cart', JSON.stringify(cart));
        }
    }

    /**
     * Remove item from cart
     * @param {string} productId - Product ID
     * @returns {Promise<boolean>} Success status
     */
    async removeItem(productId) {
        try {
            if (this.isLoggedIn && this.apiClient) {
                const response = await this.apiClient.delete(`/cart/items/${productId}`);

                if (response.success) {
                    // Clear cart cache
                    if (window.apiCache) {
                        window.apiCache.clearPattern('/cart');
                    }
                    this.removeFromLocalStorage(productId);
                    return true;
                }
            }

            this.removeFromLocalStorage(productId);
            return true;

        } catch (error) {
            console.error('[CartManager] Error removing item:', error);
            this.removeFromLocalStorage(productId);
            return false;
        }
    }

    /**
     * Remove item from localStorage
     * @param {string} productId - Product ID
     */
    removeFromLocalStorage(productId) {
        let cart = this.getLocalCart();
        cart = cart.filter(item => item.product_id !== productId);
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    /**
     * Clear entire cart
     * @returns {Promise<boolean>} Success status
     */
    async clearCart() {
        try {
            if (this.isLoggedIn && this.apiClient) {
                await this.apiClient.delete('/cart');
                // Clear cart cache
                if (window.apiCache) {
                    window.apiCache.clearPattern('/cart');
                }
            }

            localStorage.removeItem('cart');
            return true;

        } catch (error) {
            console.error('[CartManager] Error clearing cart:', error);
            localStorage.removeItem('cart');
            return false;
        }
    }

    /**
     * Get cart count
     * @returns {Promise<number>} Total items in cart
     */
    async getCartCount() {
        const items = await this.getCart();
        return items.reduce((sum, item) => sum + item.quantity, 0);
    }

    /**
     * Merge guest cart to user cart after login
     * @returns {Promise<boolean>} Success status
     */
    async mergeGuestCart() {
        try {
            // First, re-initialize as logged in user BEFORE getting guest cart
            this.isLoggedIn = true;
            this.initializeApiClient();
            
            const guestCart = this.getLocalCart();

            if (guestCart.length === 0) {
                console.log('[CartManager] No guest cart to merge');
                return true;
            }

            console.log('[CartManager] Merging', guestCart.length, 'guest items to user cart');
            console.log('[CartManager] Guest cart data:', guestCart);

            // Backend merge endpoint uses session, but we use localStorage
            // So we need to add each item individually to user's cart
            console.log('[CartManager] Adding guest cart items to user cart...');
            
            for (const item of guestCart) {
                try {
                    console.log(`[CartManager] Adding item: ${item.product_id} x${item.quantity}`);
                    const result = await this.apiClient.post('/cart/items', {
                        product_id: item.product_id,
                        quantity: item.quantity
                    });
                    console.log(`[CartManager] Item added:`, result);
                } catch (itemError) {
                    console.error(`[CartManager] Failed to add item ${item.product_id}:`, itemError.message);
                    // Continue with other items even if one fails
                }
            }

            // Clear guest cart
            localStorage.removeItem('cart');
            console.log('[CartManager] Guest cart cleared from localStorage');

            // Reload from backend
            const cart = await this.getCart();
            console.log('[CartManager] Reloaded cart:', cart.length, 'items');

            console.log('[CartManager] Guest cart merged successfully');
            return true;

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
    console.log('Logged in:', window.cartManager.isLoggedIn);
    console.log('LocalStorage cart:', localStorage.getItem('cart'));
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    console.log('Items:', cart.length);
    cart.forEach((item, i) => {
        console.log(`  ${i + 1}.`, item.product?.title, 'x', item.quantity);
    });
};
