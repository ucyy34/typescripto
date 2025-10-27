/**
 * Wishlist Manager
 * Keeps wishlist state in sync between backend and local storage fallback
 */

class WishlistManager {
    constructor() {
        this.apiClient = typeof ApiClient !== 'undefined' ? new ApiClient() : null;
        this.cacheKey = 'wishlist';
        this.guestDetailsKey = 'wishlist_items';
        this.ids = this._loadIdsFromStorage();
        this.items = null;
        this.lastFetchedAt = 0;
        this.fetchPromise = null;
        this.maxCacheAge = 60 * 1000; // 60 seconds
        this.isLoggedIn = !!localStorage.getItem('accessToken');

        window.addEventListener('storage', (event) => {
            if (event.key === this.cacheKey) {
                this.ids = this._loadIdsFromStorage();
                this._broadcast();
            }
        });
    }

    _updateLoginState() {
        this.isLoggedIn = !!localStorage.getItem('accessToken');
        if (this.isLoggedIn && !this.apiClient && typeof ApiClient !== 'undefined') {
            this.apiClient = new ApiClient();
        }
    }

    _loadIdsFromStorage() {
        try {
            const raw = localStorage.getItem(this.cacheKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter((id) => typeof id === 'string');
            }
        } catch (error) {
            console.warn('[WishlistManager] Failed to parse local ids, resetting', error);
        }
        localStorage.removeItem(this.cacheKey);
        return [];
    }

    _saveIdsToStorage(ids) {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(ids));
        } catch (error) {
            console.error('[WishlistManager] Failed to persist ids', error);
        }
    }

    _loadGuestDetails() {
        try {
            const raw = localStorage.getItem(this.guestDetailsKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter((item) => item && item.product_id);
            }
        } catch (error) {
            console.warn('[WishlistManager] Failed to parse guest wishlist details', error);
        }
        localStorage.removeItem(this.guestDetailsKey);
        return [];
    }

    _saveGuestDetails(items) {
        try {
            localStorage.setItem(this.guestDetailsKey, JSON.stringify(items));
        } catch (error) {
            console.error('[WishlistManager] Failed to persist guest details', error);
        }
    }

    _mergeGuestItem(productId, productData) {
        const details = this._loadGuestDetails();
        const existingIndex = details.findIndex((item) => item.product_id === productId);
        const payload = {
            product_id: productId,
            product: productData?.product || productData,
        };
        if (existingIndex > -1) {
            details[existingIndex] = payload;
        } else {
            details.unshift(payload);
        }
        this._saveGuestDetails(details.slice(0, 50));
        this.items = details;
    }

    _broadcast() {
        window.dispatchEvent(
            new CustomEvent('wishlist:update', {
                detail: {
                    ids: [...this.ids],
                    items: this.items ? [...this.items] : null,
                },
            })
        );
    }

    getIds() {
        return [...this.ids];
    }

    isInWishlist(productId) {
        return this.ids.includes(productId);
    }

    async getWishlist({ forceRefresh = false } = {}) {
        this._updateLoginState();

        if (this.isLoggedIn && this.apiClient) {
            if (!forceRefresh && this.items && Date.now() - this.lastFetchedAt < this.maxCacheAge) {
                return this.items;
            }

            if (!this.fetchPromise || forceRefresh) {
                this.fetchPromise = this.apiClient
                    .get('/wishlist', {}, { useCache: false })
                    .then((response) => {
                        const items = response?.data?.items || [];
                        this.items = items;
                        this.ids = items.map((item) => item.product_id);
                        this._saveIdsToStorage(this.ids);
                        this.lastFetchedAt = Date.now();
                        this.fetchPromise = null;
                        this._broadcast();
                        return items;
                    })
                    .catch((error) => {
                        console.error('[WishlistManager] Failed to load wishlist from API', error);
                        this.fetchPromise = null;
                        throw error;
                    });
            }

            return this.fetchPromise;
        }

        // Guest fallback
        this.items = this._loadGuestDetails();
        this.ids = this._loadIdsFromStorage();
        return this.items;
    }

    async add(product) {
        const productId = typeof product === 'string' ? product : product?.id || product?.product_id;
        if (!productId) {
            throw new Error('Product id is required to add to wishlist');
        }

        this._updateLoginState();

        if (this.isLoggedIn && this.apiClient) {
            await this.apiClient.post('/wishlist', { product_id: productId });
            return this.getWishlist({ forceRefresh: true });
        }

        if (!this.ids.includes(productId)) {
            this.ids.push(productId);
            this._saveIdsToStorage(this.ids);
            if (product) {
                this._mergeGuestItem(productId, product);
            }
            this._broadcast();
        }
        return this.getWishlist();
    }

    async remove(productId) {
        if (!productId) return;

        this._updateLoginState();

        if (this.isLoggedIn && this.apiClient) {
            await this.apiClient.delete(`/wishlist/${productId}`);
            await this.getWishlist({ forceRefresh: true });
            return;
        }

        this.ids = this.ids.filter((id) => id !== productId);
        this._saveIdsToStorage(this.ids);

        const details = this._loadGuestDetails().filter((item) => item.product_id !== productId);
        this._saveGuestDetails(details);
        this.items = details;
        this._broadcast();
    }

    async toggle(product) {
        const productId = typeof product === 'string' ? product : product?.id || product?.product_id;
        if (!productId) return;

        if (this.isInWishlist(productId)) {
            await this.remove(productId);
            return false;
        }

        await this.add(product);
        return true;
    }
}

window.wishlistManager = new WishlistManager();
