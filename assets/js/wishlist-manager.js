/**
 * Wishlist Manager
 * Keeps wishlist data in sync between backend and localStorage
 */

class WishlistManager {
  constructor() {
    this.localDetailedKey = 'wishlist:detailed';
    this.localIdsKey = 'wishlist';
    this.listeners = new Set();
    this.items = [];
    this.apiClient = null;
    this.isLoggedIn = false;
    this.readyPromise = null;
    this.syncing = false;

    this._bootstrap();
  }

  _bootstrap() {
    this.items = this._loadLocalItems();
    this._ensureApiClient();
    this.readyPromise = this.isLoggedIn ? this.refreshFromBackend().catch(() => this.items) : Promise.resolve(this.items);
  }

  _ensureApiClient() {
    try {
      this.isLoggedIn = typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn();
    } catch (_) {
      this.isLoggedIn = false;
    }

    if (this.isLoggedIn && typeof ApiClient !== 'undefined') {
      this.apiClient = new ApiClient();
    } else {
      this.apiClient = null;
    }
  }

  async ensureInitialized() {
    return this.readyPromise;
  }

  getItems() {
    return this.items.map((item) => ({ ...item }));
  }

  getWishlistIds() {
    return this.items.map((item) => item.product_id);
  }

  isInWishlist(productId) {
    return this.getWishlistIds().includes(productId);
  }

  onChange(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
      listener(this.getItems());
    }
    return () => this.listeners.delete(listener);
  }

  async refreshFromBackend() {
    if (!this.apiClient) {
      return this.items;
    }

    try {
      const response = await this.apiClient.getWishlist();
      const data = response?.data?.items || response?.items || [];
      if (Array.isArray(data)) {
        this.items = data;
        this._persistLocal();
        this._notify();
      }
    } catch (error) {
      console.warn('[WishlistManager] Failed to refresh from backend:', error);
    }

    return this.items;
  }

  async add(productId, metadata = {}) {
    if (!productId) {
      return this.items;
    }

    if (this.isLoggedIn && this.apiClient && this._isUuid(productId)) {
      await this.apiClient.addToWishlist(productId, metadata.product ? { product: metadata.product } : null);
      return this.refreshFromBackend();
    }

    this._addLocalItem(productId, metadata.product || null);
    this._persistLocal();
    this._notify();
    return this.items;
  }

  async remove(productId) {
    if (!productId) {
      return this.items;
    }

    if (this.isLoggedIn && this.apiClient && this._isUuid(productId)) {
      await this.apiClient.removeFromWishlist(productId);
      return this.refreshFromBackend();
    }

    this.items = this.items.filter((item) => item.product_id !== productId);
    this._persistLocal();
    this._notify();
    return this.items;
  }

  async toggle(productId, metadata = {}) {
    if (this.isInWishlist(productId)) {
      await this.remove(productId);
      return false;
    }

    await this.add(productId, metadata);
    return true;
  }

  async syncLocalToBackend() {
    if (!this.isLoggedIn || !this.apiClient) {
      return;
    }

    if (this.syncing) {
      return;
    }

    this.syncing = true;
    try {
      const validIds = this.items
        .map((item) => item.product_id)
        .filter((id) => this._isUuid(id));

      if (validIds.length > 0) {
        await this.apiClient.syncWishlist(validIds.map((id) => ({ product_id: id })));
      } else {
        await this.apiClient.syncWishlist([]);
      }
    } catch (error) {
      console.warn('[WishlistManager] Failed to sync local wishlist:', error);
    } finally {
      this.syncing = false;
    }
  }

  async handleAuthLogin() {
    this._ensureApiClient();
    await this.syncLocalToBackend();
    await this.refreshFromBackend();
  }

  async handleAuthLogout() {
    this._ensureApiClient();
    this._persistLocal();
    this._notify();
  }

  _notify() {
    const snapshot = this.getItems();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('[WishlistManager] Listener error:', error);
      }
    });
  }

  _loadLocalItems() {
    const detailedRaw = this._safeParse(localStorage.getItem(this.localDetailedKey));
    if (Array.isArray(detailedRaw) && detailedRaw.length > 0) {
      return detailedRaw
        .filter((item) => item && item.product_id)
        .map((item) => ({
          product_id: item.product_id,
          product: item.product || null,
          added_at: item.added_at || item.created_at || new Date().toISOString(),
          id: item.id || item.product_id,
        }));
    }

    const rawIds = this._safeParse(localStorage.getItem(this.localIdsKey)) || [];
    if (Array.isArray(rawIds)) {
      const uniqueIds = [...new Set(rawIds.filter(Boolean))];
      return uniqueIds.map((id) => ({
        product_id: id,
        product: null,
        added_at: new Date().toISOString(),
        id,
      }));
    }

    return [];
  }

  _addLocalItem(productId, productData) {
    if (this.isInWishlist(productId)) {
      return;
    }

    const entry = {
      product_id: productId,
      product: productData || null,
      added_at: new Date().toISOString(),
      id: productId,
    };
    this.items = [entry, ...this.items];
  }

  _persistLocal() {
    try {
      localStorage.setItem(this.localDetailedKey, JSON.stringify(this.items));
      localStorage.setItem(this.localIdsKey, JSON.stringify(this.getWishlistIds()));
    } catch (error) {
      console.warn('[WishlistManager] Failed to persist wishlist locally:', error);
    }
  }

  _safeParse(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('[WishlistManager] Failed to parse local wishlist payload:', error);
      return null;
    }
  }

  _isUuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}

if (typeof window !== 'undefined') {
  window.wishlistManager = new WishlistManager();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WishlistManager;
}
