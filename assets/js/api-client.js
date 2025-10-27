/**
 * API Client
 * Centralized API client with token management and error handling
 */

class ApiClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
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
    const headers = { ...API_CONFIG.HEADERS };

    Object.entries(customHeaders).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        delete headers[key];
      } else {
        headers[key] = value;
      }
    });

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
        ...options,
        headers: this.buildHeaders(options.headers),
        signal: controller.signal,
      };

      console.log(`[API] ${options.method || 'GET'} ${endpoint}`);

      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      // Parse JSON response
      const data = await response.json();

      // Check if request was successful
      if (!response.ok) {
        console.error(`[API] Error ${response.status}:`, data);

        // Return backend error message directly if available
        if (data.message) {
          return {
            success: false,
            message: data.message,
            error: data.error || 'API_ERROR',
            status: response.status
          };
        }

        return this.handleError(new Error(data.message || 'Request failed'), response);
      }

      console.log(`[API] Success:`, data);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      return this.handleError(error);
    }
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

  /**
   * Upload product image
   */
  async uploadProductImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(API_CONFIG.ENDPOINTS.UPLOADS.PRODUCT_IMAGE, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': null,
      },
    });
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
   * Get product by slug
   */
  async getProductBySlug(slug) {
    return this.get(API_CONFIG.ENDPOINTS.PRODUCTS.BY_SLUG(slug));
  }

  /**
   * Search products with suggestions
   */
  async searchProducts(query, options = {}) {
    const trimmedQuery = typeof query === 'string' ? query.trim() : '';

    if (!trimmedQuery || trimmedQuery.length < 2) {
      return Promise.resolve({
        success: true,
        data: {
          query: trimmedQuery,
          normalizedQuery: trimmedQuery.toLowerCase(),
          total: 0,
          results: [],
          suggestions: [],
          fallback: [],
          took: 0,
        },
        message: 'Search query too short',
      });
    }

    const params = {
      query: trimmedQuery,
      limit: options.limit,
      includeSuggestions: options.includeSuggestions,
      includeFallbacks: options.includeFallbacks,
      store_id: options.storeId,
      category_id: options.categoryId,
    };

    Object.keys(params).forEach((key) => {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        delete params[key];
      }
    });

    return this.get(API_CONFIG.ENDPOINTS.SEARCH.PRODUCTS, params, { useCache: false });
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
   * Get category by slug
   */
  async getCategoryBySlug(slug) {
    return this.get(API_CONFIG.ENDPOINTS.CATEGORIES.BY_SLUG(slug));
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
}

// Create singleton instance
const apiClient = new ApiClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ApiClient, apiClient };
}
