/**
 * Wishlist Manager
 * Centralized wishlist handling with backend integration and local fallback
 */

class WishlistManager {
  constructor() {
    this.apiClient = typeof ApiClient !== 'undefined' ? new ApiClient() : null;
    this.items = [];
    this.loadingPromise = null;

    this.restoreFromStorage();
    this.refreshFromBackend();
  }

  restoreFromStorage() {
    try {
      const raw = localStorage.getItem('wishlist');
      if (!raw) {
        this.items = [];
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.items = [];
        localStorage.removeItem('wishlist');
        return;
      }

      this.items = parsed.map((item) => this.normalizeItem(item)).filter(Boolean);
    } catch (error) {
      console.warn('[WishlistManager] Failed to parse stored wishlist', error);
      this.items = [];
      localStorage.removeItem('wishlist');
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('wishlist', JSON.stringify(this.items));
    } catch (error) {
      console.warn('[WishlistManager] Failed to persist wishlist', error);
    }
  }

  normalizeItem(item) {
    if (!item || !item.product_id) {
      return null;
    }

    return {
      product_id: item.product_id,
      added_at: item.added_at || new Date().toISOString(),
      product: item.product || null,
    };
  }

  getSnapshot() {
    return this.items.map((item) => ({ ...item, product: item.product ? { ...item.product } : null }));
  }

  isInWishlist(productId) {
    return this.items.some((item) => item.product_id === productId);
  }

  setCache(items, persist = true) {
    this.items = Array.isArray(items) ? items.map((item) => this.normalizeItem(item)).filter(Boolean) : [];
    if (persist) {
      this.saveToStorage();
    }
    this.dispatchUpdate();
  }

  dispatchUpdate() {
    try {
      document.dispatchEvent(
        new CustomEvent('wishlist:updated', {
          detail: {
            items: this.getSnapshot(),
          },
        })
      );
    } catch (_) {}
  }

  async refreshFromBackend(force = false) {
    if (!this.apiClient) {
      return this.items;
    }

    if (this.loadingPromise && !force) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        const response = await this.apiClient.get('/wishlist', {}, { useCache: !force });
        if (response && response.success && response.data) {
          const items = response.data.items || [];
          this.setCache(items, true);
          return this.items;
        }
      } catch (error) {
        console.warn('[WishlistManager] Failed to load wishlist from API', error);
      } finally {
        this.loadingPromise = null;
      }

      return this.items;
    })();

    return this.loadingPromise;
  }

  async getWishlist(force = false) {
    if (force) {
      await this.refreshFromBackend(true);
    }
    return this.getSnapshot();
  }

  async addItem(productId, productData = null) {
    const payload = { product_id: productId };

    if (this.apiClient) {
      try {
        const response = await this.apiClient.post('/wishlist/items', payload);
        if (response && response.success && response.data) {
          this.setCache(response.data.items || []);
          return true;
        }
      } catch (error) {
        console.warn('[WishlistManager] Failed to add wishlist item via API', error);
      }
    }

    if (!this.isInWishlist(productId)) {
      this.items.push({
        product_id: productId,
        added_at: new Date().toISOString(),
        product: productData,
      });
      this.saveToStorage();
      this.dispatchUpdate();
    }

    return true;
  }

  async removeItem(productId) {
    if (this.apiClient) {
      try {
        const response = await this.apiClient.delete(`/wishlist/items/${productId}`);
        if (response && response.success && response.data) {
          this.setCache(response.data.items || []);
          return true;
        }
      } catch (error) {
        console.warn('[WishlistManager] Failed to remove wishlist item via API', error);
      }
    }

    this.items = this.items.filter((item) => item.product_id !== productId);
    this.saveToStorage();
    this.dispatchUpdate();
    return true;
  }

  async toggleItem(productId, productData = null) {
    if (this.isInWishlist(productId)) {
      await this.removeItem(productId);
      return false;
    }

    await this.addItem(productId, productData);
    return true;
  }

  async clear() {
    if (this.apiClient) {
      try {
        const response = await this.apiClient.delete('/wishlist');
        if (response && response.success && response.data) {
          this.setCache(response.data.items || []);
          return true;
        }
      } catch (error) {
        console.warn('[WishlistManager] Failed to clear wishlist via API', error);
      }
    }

    this.items = [];
    this.saveToStorage();
    this.dispatchUpdate();
    return true;
  }

  async mergeGuestWishlist() {
    if (!AuthManager || !AuthManager.isLoggedIn || !AuthManager.isLoggedIn()) {
      return this.items;
    }

    if (!this.apiClient) {
      return this.items;
    }

    try {
      const response = await this.apiClient.post('/wishlist/merge');
      if (response && response.success && response.data) {
        this.setCache(response.data.items || []);
      } else {
        await this.refreshFromBackend(true);
      }
    } catch (error) {
      console.warn('[WishlistManager] Failed to merge wishlist after login', error);
    }

    return this.items;
  }

  async getRecommendations(options = {}) {
    if (!this.apiClient) {
      return [];
    }

    const params = new URLSearchParams();

    if (options.limit) {
      params.set('limit', options.limit);
    }

    if (Array.isArray(options.seedIds) && options.seedIds.length > 0) {
      params.set('seed', options.seedIds.join(','));
    }

    if (options.includeCart === false) {
      params.set('include_cart', 'false');
    }

    if (options.includeWishlist === false) {
      params.set('include_wishlist', 'false');
    }

    const endpoint = params.toString() ? `/wishlist/recommendations?${params.toString()}` : '/wishlist/recommendations';

    try {
      const response = await this.apiClient.get(endpoint, {}, { useCache: false });
      if (response && response.success && response.data) {
        return response.data.items || [];
      }
    } catch (error) {
      console.warn('[WishlistManager] Failed to load recommendations', error);
    }

    return [];
  }
}

if (typeof window !== 'undefined') {
  window.wishlistManager = new WishlistManager();
}
