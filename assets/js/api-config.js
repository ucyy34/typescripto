/**
 * API Configuration
 * Backend API endpoints and configuration
 */

// Resolve a robust BASE_URL that works in file:// and http:// contexts
function resolveApiBaseUrl() {
  // 1) Runtime override via window (e.g., set before scripts):
  try {
    if (typeof window !== 'undefined') {
      const runtimeOverride = window.API_BASE_URL || (window.API_CONFIG_OVERRIDE && window.API_CONFIG_OVERRIDE.BASE_URL);
      if (runtimeOverride && typeof runtimeOverride === 'string') {
        return runtimeOverride.replace(/\/$/, '');
      }
    }
  } catch (_) {}

  // 2) Optional localStorage override (manual testing):
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const ls = window.localStorage.getItem('API_BASE_URL');
      if (ls && typeof ls === 'string') {
        return ls.replace(/\/$/, '');
      }
    }
  } catch (_) {}

  // 3) If served over http(s), prefer same-origin
  try {
    if (typeof location !== 'undefined' && /^https?:/i.test(location.origin)) {
      return `${location.origin.replace(/\/$/, '')}/api/v1`;
    }
  } catch (_) {}

  // 4) Fallback to backend default dev port (aligned to 5050 per project config)
  return 'http://localhost:5050/api/v1';
}

const API_CONFIG = {
  // Base URL for API
  BASE_URL: resolveApiBaseUrl(),

  // API Endpoints
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      ME: '/auth/me',
    },

    // User endpoints
    USERS: {
      BASE: '/users',
      BY_ID: (id) => `/users/${id}`,
      PROFILE: '/users/profile',
    },

    // Store endpoints
    STORES: {
      BASE: '/stores',
      BY_ID: (id) => `/stores/${id}`,
      BY_SLUG: (slug) => `/stores/slug/${slug}`,
      MY_STORE: '/stores/my-store',
      STATUS: (id) => `/stores/${id}/status`,
      STATS: (id) => `/stores/${id}/stats`,
      PRODUCTS: (id) => `/stores/${id}/products`,
      ORDERS: (id) => `/stores/${id}/orders`,
    },

    // Product endpoints
    PRODUCTS: {
      BASE: '/products',
      BY_ID: (id) => `/products/${id}`,
      BY_SLUG: (slug) => `/products/slug/${slug}`,
      STATUS: (id) => `/products/${id}/status`,
      BY_STORE: (storeId) => `/stores/${storeId}/products`,
      SEARCH: '/products/search',
    },

    UPLOADS: {
      PRODUCT_IMAGE: '/uploads/products',
    },

    // Category endpoints
    CATEGORIES: {
      BASE: '/categories',
      BY_ID: (id) => `/categories/${id}`,
      BY_SLUG: (slug) => `/categories/slug/${slug}`,
      TOP_LEVEL: '/categories/top-level',
      CHILDREN: (id) => `/categories/${id}/children`,
      PRODUCTS: (id) => `/categories/${id}/products`,
    },

    // Order endpoints
    ORDERS: {
      BASE: '/orders',
      BY_ID: (id) => `/orders/${id}`,
      STATUS: (id) => `/orders/${id}/status`,
      STORE_ORDERS: (storeId) => `/stores/${storeId}/orders`,
    },

    // Cart endpoints
    CART: {
      BASE: '/cart',
      ITEMS: '/cart/items',
      ITEM_BY_ID: (productId) => `/cart/items/${productId}`,
      MERGE: '/cart/merge',
    },

    // Dashboard/Stats endpoints (might need to be created)
    DASHBOARD: {
      STATS: '/dashboard/stats',
      RECENT_ORDERS: '/dashboard/recent-orders',
      RECENT_PRODUCTS: '/dashboard/recent-products',
    },

    // Upload endpoints
    UPLOADS: {
      PRODUCT_IMAGE: '/uploads/products',
    },
  },

  // Request timeout
  TIMEOUT: 30000, // 30 seconds

  // Headers
  HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },

  DEBUG: (() => {
    try {
      if (typeof window !== 'undefined') {
        if (typeof window.API_DEBUG === 'boolean') {
          return window.API_DEBUG;
        }
        if (window.localStorage) {
          const stored = window.localStorage.getItem('API_DEBUG');
          if (stored !== null) {
            return stored === 'true' || stored === '1';
          }
        }
      }
    } catch (err) {
      // Ignore access issues
    }
    return false;
  })(),
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
}
