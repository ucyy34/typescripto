/**
 * API Client
 * Centralized API client with token management and error handling
 */

class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.debug = false;
    this.guestIdHeader = 'X-Guest-Id';
    this.guestIdStorageKey = 'guest_session_id';
    this.cachedGuestId = null;

    // Phase 7.2: Guest Key Lifecycle (cookie-first, memory fallback)
    this.guestKeyHeader = 'X-Guest-Key';
    this.guestKeyCookieName = 'guest_key';
    this.guestKeyTTLDays = 7;
    this._inMemoryGuestKey = null;

    try {
      if (typeof window !== 'undefined') {
        if (window.API_DEBUG === true) {
          this.debug = true;
        } else if (window.localStorage) {
          this.debug = window.localStorage.getItem('API_DEBUG') === 'true';
        }
      }
    } catch (_) {
      this.debug = false;
    }
  }

  // ==========================================
  // COOKIE HELPERS (Phase 7.2)
  // ==========================================

  /**
   * Get cookie value by name
   */
  getCookie(name) {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  /**
   * Set cookie with expiration days
   */
  setCookie(name, value, days) {
    if (typeof document === 'undefined') return false;
    try {
      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Delete cookie by name
   */
  deleteCookie(name) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  /**
   * Validate UUID format
   */
  isValidUUID(str) {
    if (!str || typeof str !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
  }

  // ==========================================
  // GUEST KEY LIFECYCLE (Phase 7.2)
  // ==========================================

  /**
   * Get or create guest key (cookie-first, memory fallback)
   * @returns {string} UUID guest key
   */
  getGuestKey() {
    // 1. Try cookie
    const cookieKey = this.getCookie(this.guestKeyCookieName);
    if (cookieKey && this.isValidUUID(cookieKey)) {
      this._inMemoryGuestKey = cookieKey;
      return cookieKey;
    }

    // 2. Use in-memory if exists
    if (this._inMemoryGuestKey && this.isValidUUID(this._inMemoryGuestKey)) {
      return this._inMemoryGuestKey;
    }

    // 3. Generate new key
    let newKey;
    try {
      newKey = crypto.randomUUID();
    } catch (_) {
      newKey = this.generateGuestId(); // Fallback
    }

    // 4. Try save to cookie
    const cookieSet = this.setCookie(this.guestKeyCookieName, newKey, this.guestKeyTTLDays);

    // 5. Verify cookie was set, otherwise use memory
    if (!cookieSet || this.getCookie(this.guestKeyCookieName) !== newKey) {
      this._inMemoryGuestKey = newKey; // Cookie blocked, use memory
      if (this.debug) {
        console.log('[ApiClient] Cookie blocked, using in-memory guest key');
      }
    } else {
      this._inMemoryGuestKey = newKey;
    }

    return newKey;
  }

  /**
   * Clear guest key (cookie + memory)
   */
  clearGuestKey() {
    this.deleteCookie(this.guestKeyCookieName);
    this._inMemoryGuestKey = null;
  }

  /**
   * Rotate guest key (generate new, overwrite cookie/memory)
   * Called after successful merge
   * @returns {string} New guest key
   */
  rotateGuestKey() {
    let newKey;
    try {
      newKey = crypto.randomUUID();
    } catch (_) {
      newKey = this.generateGuestId();
    }

    this.setCookie(this.guestKeyCookieName, newKey, this.guestKeyTTLDays);
    this._inMemoryGuestKey = newKey;

    if (this.debug) {
      console.log('[ApiClient] Guest key rotated:', newKey.substring(0, 8) + '...');
    }

    return newKey;
  }

  /**
   * Merge guest cart into user cart (called after login)
   * @param {string} authToken - JWT auth token
   * @returns {Promise<Object>} Merge result
   */
  async mergeGuestCartOnLogin(authToken) {
    const guestKey = this.getGuestKey();
    if (!guestKey) {
      return { success: true, message: 'No guest key to merge' };
    }

    try {
      const response = await fetch(`${this.baseURL}/api/v2/cart/merge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          [this.guestKeyHeader]: guestKey
        },
        body: JSON.stringify({ guestKey })
      });

      const data = await response.json();

      if (response.ok && data.nextGuestKeyRequired) {
        this.rotateGuestKey();
      }

      return data;
    } catch (error) {
      if (this.debug) {
        console.error('[ApiClient] Merge failed:', error);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Get authorization token from localStorage
   */
  getToken() {
    return localStorage.getItem('accessToken');
  }

  /**
   * Build headers with authorization
   */
  buildHeaders(customHeaders = {}) {
    const headers = { ...API_CONFIG.HEADERS, ...customHeaders };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Legacy guest ID (for backward compatibility)
    const guestId = this.getGuestId();
    if (guestId) {
      headers[this.guestIdHeader] = guestId;
    }

    // Phase 7.2: Guest Key (for Cart V2)
    const guestKey = this.getGuestKey();
    if (guestKey) {
      headers[this.guestKeyHeader] = guestKey;
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  handleError(error, response = null) {
    console.error('API Error:', error);

    if (response) {
      // HTTP error
      if (response.status === 401) {
        // Unauthorized - clear auth and redirect to login
        AuthManager.logout();
        return {
          success: false,
          message: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
          error: 'UNAUTHORIZED',
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          message: 'Bu işlem için yetkiniz yok.',
          error: 'FORBIDDEN',
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          message: 'Kaynak bulunamadı.',
          error: 'NOT_FOUND',
        };
      }

      if (response.status === 422 || response.status === 400) {
        return {
          success: false,
          message: 'Gönderilen veriler geçersiz.',
          error: 'VALIDATION_ERROR',
        };
      }

      if (response.status >= 500) {
        return {
          success: false,
          message: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
          error: 'SERVER_ERROR',
        };
      }
    }

    // Network error
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      return {
        success: false,
        message: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
        error: 'NETWORK_ERROR',
      };
    }

    // Timeout error
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'İstek zaman aşımına uğradı.',
        error: 'TIMEOUT',
      };
    }

    // Generic error
    return {
      success: false,
      message: error.message || 'Bir hata oluştu.',
      error: 'UNKNOWN_ERROR',
    };
  }

  /**
   * Make HTTP request with timeout
   */
  async request(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const url = `${this.baseURL}${endpoint}`;
      const config = {
        credentials: 'include',
        ...options,
        headers: this.buildHeaders(options.headers),
        credentials: options.credentials || 'include',
        signal: controller.signal,
        credentials: 'include',
      };

      this._log(`${config.method || 'GET'} ${endpoint}`);

      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      const serverGuestId = response.headers.get(this.guestIdHeader);
      if (serverGuestId) {
        this.rememberGuestId(serverGuestId);
      }

      const responseText = await response.text();
      let data;

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (_) {
          data = { success: response.ok, message: responseText };
        }
      } else {
        data = { success: response.ok };
      }

      if (typeof data.success !== 'boolean') {
        data.success = response.ok;
      }

      if (!data.message && response.statusText) {
        data.message = response.statusText;
      }

      if (!response.ok) {
        this._log(`Error ${response.status} ${endpoint}`, data);

        if (data.message) {
          return {
            success: false,
            message: data.message,
            error: data.error || 'API_ERROR',
            status: response.status,
          };
        }

        return this.handleError(new Error('Request failed'), response);
      }

      this._log(`Success ${endpoint}`, data);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      return this.handleError(error);
    }
  }

  /**
   * Get or create a stable guest id for cross-origin carts
   */
  getGuestId() {
    if (this.cachedGuestId) {
      return this.cachedGuestId;
    }

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null;
      }

      const stored = window.localStorage.getItem(this.guestIdStorageKey);
      if (stored) {
        this.cachedGuestId = stored;
        return stored;
      }

      const generated = this.generateGuestId();
      if (generated) {
        window.localStorage.setItem(this.guestIdStorageKey, generated);
        this.cachedGuestId = generated;
        return generated;
      }
    } catch (error) {
      if (this.debug) {
        console.warn('[ApiClient] Failed to access guest storage', error);
      }
    }

    return null;
  }

  rememberGuestId(guestId) {
    if (!guestId || typeof guestId !== 'string') {
      return;
    }

    const trimmed = guestId.trim();
    if (!trimmed) {
      return;
    }

    this.cachedGuestId = trimmed;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.guestIdStorageKey, trimmed);
      }
    } catch (_) {
      // Ignore storage errors - header will still carry the id
    }
  }

  generateGuestId() {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (_) {
      // Ignore crypto errors and fall through to manual generation
    }

    const randomSegment = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${Date.now().toString(16)}-${randomSegment()}-${randomSegment()}-${randomSegment()}-${randomSegment()}${randomSegment()}${randomSegment()}`;
  }

  /**
   * GET request with caching
   */
  async get(endpoint, params = {}, options = {}) {
    const { useCache = true, cacheDuration } = options;

    // Check cache first
    if (useCache && window.apiCache) {
      const cached = window.apiCache.get(endpoint, params);
      if (cached) {
        return cached;
      }
    }

    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    const response = await this.request(url, { method: 'GET' });

    // Cache successful GET requests
    if (useCache && window.apiCache && response.success) {
      window.apiCache.set(endpoint, params, response);
    }

    return response;
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  _log(...args) {
    if (this.debug) {
      console.log('[API]', ...args);
    }
  }

  // ==========================================
  // AUTH METHODS
  // ==========================================

  /**
   * Login user
   */
  async login(email, password) {
    return this.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, { email, password });
  }

  /**
   * Register user
   */
  async register(userData) {
    return this.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, userData);
  }

  /**
   * Logout user
   */
  async logout() {
    return this.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
  }

  /**
   * Get current user
   */
  async getMe() {
    return this.get(API_CONFIG.ENDPOINTS.AUTH.ME);
  }

  // ==========================================
  // STORE METHODS
  // ==========================================

  /**
   * Get all stores with filters
   */
  async getStores(filters = {}) {
    return this.get(API_CONFIG.ENDPOINTS.STORES.BASE, filters);
  }

  /**
   * Get store by ID
   */
  async getStore(storeId) {
    return this.get(API_CONFIG.ENDPOINTS.STORES.BY_ID(storeId));
  }

  /**
   * Get current user's store
   */
  async getMyStore() {
    return this.get(API_CONFIG.ENDPOINTS.STORES.MY_STORE);
  }

  /**
   * Create a new store for the authenticated seller
   */
  async createStore(storeData = {}) {
    return this.post(API_CONFIG.ENDPOINTS.STORES.BASE, storeData);
  }

  /**
   * Update store status (approve/reject/suspend)
   */
  async updateStoreStatus(storeId, status, rejectionReason = null) {
    const data = { status };
    if (rejectionReason) {
      data.rejection_reason = rejectionReason;
    }
    return this.patch(API_CONFIG.ENDPOINTS.STORES.STATUS(storeId), data);
  }

  /**
   * Get store statistics
   */
  async getStoreStats(storeId) {
    return this.get(API_CONFIG.ENDPOINTS.STORES.STATS(storeId));
  }

  // ==========================================
  // USER METHODS (Admin)
  // ==========================================

  /**
   * Get all users with filters (admin only)
   */
  async getUsers(filters = {}) {
    return this.get('/users', filters);
  }

  /**
   * Get user by ID (admin only)
   */
  async getUserById(userId) {
    return this.get(`/users/${userId}`);
  }

  /**
   * Update user status (activate/suspend)
   */
  async updateUserStatus(userId, isActive) {
    return this.patch(`/users/${userId}/status`, { is_active: isActive });
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId, role) {
    return this.patch(`/users/${userId}/role`, { role });
  }

  // ==========================================
  // PRODUCT METHODS
  // ==========================================

  /**
   * Get all products with filters
   */
  async getProducts(filters = {}) {
    return this.get(API_CONFIG.ENDPOINTS.PRODUCTS.BASE, filters);
  }

  /**
   * Get product by ID
   */
  async getProduct(productId) {
    return this.get(API_CONFIG.ENDPOINTS.PRODUCTS.BY_ID(productId));
  }

  /**
   * Update product status (approve/reject)
   */
  async updateProductStatus(productId, status, rejectionReason = null) {
    const data = { status };
    if (rejectionReason) {
      data.rejection_reason = rejectionReason;
    }
    return this.patch(API_CONFIG.ENDPOINTS.PRODUCTS.STATUS(productId), data);
  }

  // ==========================================
  // ORDER METHODS
  // ==========================================

  /**
   * Get all orders with filters
   */
  async getOrders(filters = {}) {
    return this.get(API_CONFIG.ENDPOINTS.ORDERS.BASE, filters);
  }

  /**
   * Get all orders (admin only)
   */
  async getAllOrders(filters = {}) {
    return this.get(`${API_CONFIG.ENDPOINTS.ORDERS.BASE}/admin`, filters);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    return this.get(API_CONFIG.ENDPOINTS.ORDERS.BY_ID(orderId));
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, additionalData = {}) {
    return this.patch(API_CONFIG.ENDPOINTS.ORDERS.STATUS(orderId), {
      status,
      ...additionalData,
    });
  }

  /**
   * Get store orders
   */
  async getStoreOrders(storeId, filters = {}) {
    return this.get(API_CONFIG.ENDPOINTS.ORDERS.STORE_ORDERS(storeId), filters);
  }

  // ==========================================
  // CAMPAIGN METHODS
  // ==========================================

  /**
   * Get all campaigns (admin)
   */
  async getCampaigns(filters = {}) {
    return this.get(API_CONFIG.ENDPOINTS.CAMPAIGNS.BASE, filters);
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId) {
    return this.get(API_CONFIG.ENDPOINTS.CAMPAIGNS.BY_ID(campaignId));
  }

  /**
   * Create campaign (admin)
   */
  async createCampaign(data = {}) {
    return this.post(API_CONFIG.ENDPOINTS.CAMPAIGNS.BASE, data);
  }

  /**
   * Update campaign (admin)
   */
  async updateCampaign(campaignId, data = {}) {
    return this.patch(API_CONFIG.ENDPOINTS.CAMPAIGNS.BY_ID(campaignId), data);
  }

  /**
   * Approve or reject campaign (admin)
   */
  async updateCampaignApproval(campaignId, approvalStatus, rejectionReason = '') {
    const payload = { approval_status: approvalStatus };
    if (approvalStatus === 'rejected' && rejectionReason) {
      payload.rejection_reason = rejectionReason;
    }
    return this.patch(API_CONFIG.ENDPOINTS.CAMPAIGNS.APPROVAL(campaignId), payload);
  }

  /**
   * Delete campaign (admin)
   */
  async deleteCampaign(campaignId) {
    return this.delete(API_CONFIG.ENDPOINTS.CAMPAIGNS.BY_ID(campaignId));
  }

  /**
   * Get campaign stats (admin)
   */
  async getCampaignStats(campaignId) {
    return this.get(API_CONFIG.ENDPOINTS.CAMPAIGNS.STATS(campaignId));
  }

  /**
   * Get campaigns for a store (seller)
   */
  async getStoreCampaigns(storeId, filters = {}) {
    return this.get(API_CONFIG.ENDPOINTS.CAMPAIGNS.STORE_BASE(storeId), filters);
  }

  /**
   * Create campaign for a store (seller)
   */
  async createStoreCampaign(storeId, data = {}) {
    return this.post(API_CONFIG.ENDPOINTS.CAMPAIGNS.STORE_BASE(storeId), data);
  }

  /**
   * Update store campaign (seller)
   */
  async updateStoreCampaign(storeId, campaignId, data = {}) {
    return this.patch(API_CONFIG.ENDPOINTS.CAMPAIGNS.STORE_BY_ID(storeId, campaignId), data);
  }

  /**
   * Delete store campaign (seller)
   */
  async deleteStoreCampaign(storeId, campaignId) {
    return this.delete(API_CONFIG.ENDPOINTS.CAMPAIGNS.STORE_BY_ID(storeId, campaignId));
  }

  /**
   * Get store campaign stats (seller)
   */
  async getStoreCampaignStats(storeId, campaignId) {
    return this.get(API_CONFIG.ENDPOINTS.CAMPAIGNS.STORE_STATS(storeId, campaignId));
  }

  // ==========================================
  // CART & WISHLIST EXTENSIONS
  // ==========================================

  async getCartRecommendations(params = {}) {
    return this.get(API_CONFIG.ENDPOINTS.RECOMMENDATIONS.CART, params, { useCache: false });
  }

  async getWishlist() {
    return this.get(API_CONFIG.ENDPOINTS.WISHLIST.BASE, {}, { useCache: false });
  }

  async addToWishlist(productId, metadata = null) {
    const payload = { product_id: productId };
    if (metadata && Object.keys(metadata).length > 0) {
      payload.metadata = metadata;
    }
    return this.post(API_CONFIG.ENDPOINTS.WISHLIST.BASE, payload);
  }

  async removeFromWishlist(productId) {
    return this.delete(API_CONFIG.ENDPOINTS.WISHLIST.ITEM(productId));
  }

  async syncWishlist(items = []) {
    return this.post(API_CONFIG.ENDPOINTS.WISHLIST.SYNC, { items });
  }

  // ==========================================
  // CATEGORY METHODS
  // ==========================================

  /**
   * Get all categories
   */
  async getCategories(filters = {}) {
    return this.get(API_CONFIG.ENDPOINTS.CATEGORIES.BASE, filters);
  }

  /**
   * Get top-level categories
   */
  async getTopLevelCategories() {
    return this.get(API_CONFIG.ENDPOINTS.CATEGORIES.TOP_LEVEL);
  }

  /**
   * Get category by ID
   */
  async getCategory(categoryId) {
    return this.get(API_CONFIG.ENDPOINTS.CATEGORIES.BY_ID(categoryId));
  }

  /**
   * Create new category
   */
  async createCategory(categoryData) {
    return this.post(API_CONFIG.ENDPOINTS.CATEGORIES.BASE, categoryData);
  }

  /**
   * Update category
   */
  async updateCategory(categoryId, categoryData) {
    return this.put(API_CONFIG.ENDPOINTS.CATEGORIES.BY_ID(categoryId), categoryData);
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId) {
    return this.delete(API_CONFIG.ENDPOINTS.CATEGORIES.BY_ID(categoryId));
  }

  // ==========================================
  // DASHBOARD METHODS (might need backend endpoints)
  // ==========================================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    // For now, we'll aggregate from existing endpoints
    try {
      const [stores, products, orders] = await Promise.all([
        this.getStores({ limit: 1 }),
        this.getProducts({ limit: 1 }),
        this.getOrders({ limit: 1 }),
      ]);

      return {
        success: true,
        data: {
          totalStores: stores.pagination?.total || 0,
          totalProducts: products.pagination?.total || 0,
          totalOrders: orders.pagination?.total || 0,
          pendingStores: 0, // Will be calculated separately
          pendingProducts: 0, // Will be calculated separately
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get pending stores count
   */
  async getPendingStoresCount() {
    const result = await this.getStores({ status: 'pending', limit: 1 });
    return result.pagination?.total || 0;
  }

  /**
   * Get pending products count
   */
  async getPendingProductsCount() {
    const result = await this.getProducts({ status: 'pending', limit: 1 });
    return result.pagination?.total || 0;
  }
  // ==========================================
  // REVIEW METHODS
  // ==========================================

  /**
   * Get reviews for a store
   */
  async getStoreReviews(storeId, filters = {}) {
    return this.get(API_CONFIG.ENDPOINTS.STORES.REVIEWS(storeId), filters);
  }

  /**
   * Get reviews for a product
   */
  async getProductReviews(productId, filters = {}) {
    return this.get(API_CONFIG.ENDPOINTS.PRODUCTS.REVIEWS(productId), filters);
  }

  /**
   * Get featured/approved reviews across all stores (for testimonials)
   */
  async getFeaturedReviews(limit = 10) {
    try {
      const storesResponse = await this.getStores({
        status: 'approved',
        limit: 5,
        sort: '-rating'
      });

      if (!storesResponse.success || !storesResponse.data?.length) {
        return { success: true, data: [] };
      }

      const reviewPromises = storesResponse.data.map(store =>
        this.getStoreReviews(store.id, { limit: 3, status: 'approved' })
          .then(res => res.success ? res.data.map(r => ({ ...r, store })) : [])
          .catch(() => [])
      );

      const reviewArrays = await Promise.all(reviewPromises);
      const allReviews = reviewArrays.flat()
        .filter(r => r.rating >= 4)
        .slice(0, limit);

      return { success: true, data: allReviews };
    } catch (error) {
      console.error('[ApiClient] Error fetching featured reviews:', error);
      return { success: false, data: [], error: error.message };
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApiClient, apiClient };
}
