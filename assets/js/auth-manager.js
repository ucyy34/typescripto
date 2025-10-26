/**
 * Auth Manager
 * Manages authentication state and user session
 */

class AuthManager {
  /**
   * Storage keys
   */
  static STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
  };

  /**
   * Save login data to localStorage
   */
  static login(tokens, user) {
    try {
      localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(user));

      console.log('[Auth] User logged in:', user.email);

      try {
        if (typeof window !== 'undefined' && window.wishlistManager && typeof window.wishlistManager.handleAuthLogin === 'function') {
          window.wishlistManager.handleAuthLogin().catch((error) => {
            console.warn('[Auth] Wishlist sync after login failed:', error);
          });
        }
      } catch (error) {
        console.warn('[Auth] Wishlist login hook error:', error);
      }

      return true;
    } catch (error) {
      console.error('[Auth] Failed to save login data:', error);
      return false;
    }
  }

  /**
   * Logout and clear all auth data
   */
  static logout(redirectToLogin = true) {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(this.STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(this.STORAGE_KEYS.USER);

      console.log('[Auth] User logged out');

      try {
        if (typeof window !== 'undefined' && window.wishlistManager && typeof window.wishlistManager.handleAuthLogout === 'function') {
          window.wishlistManager.handleAuthLogout().catch((error) => {
            console.warn('[Auth] Wishlist logout hook error:', error);
          });
        }
      } catch (error) {
        console.warn('[Auth] Wishlist logout hook error:', error);
      }

      if (redirectToLogin) {
        // Redirect to login page
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login') && !currentPath.includes('index.html')) {
          window.location.href = '/index.html?redirect=login';
        }
      }

      return true;
    } catch (error) {
      console.error('[Auth] Failed to logout:', error);
      return false;
    }
  }

  /**
   * Get current user from localStorage
   */
  static getUser() {
    try {
      const userJson = localStorage.getItem(this.STORAGE_KEYS.USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('[Auth] Failed to get user:', error);
      return null;
    }
  }

  /**
   * Get access token
   */
  static getToken() {
    return localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token
   */
  static getRefreshToken() {
    return localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Set access token
   */
  static setToken(token) {
    try {
      localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, token);
      console.log('[Auth] Access token updated');
      return true;
    } catch (error) {
      console.error('[Auth] Failed to set token:', error);
      return false;
    }
  }

  /**
   * Set refresh token
   */
  static setRefreshToken(token) {
    try {
      localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, token);
      console.log('[Auth] Refresh token updated');
      return true;
    } catch (error) {
      console.error('[Auth] Failed to set refresh token:', error);
      return false;
    }
  }

  /**
   * Check if user is logged in
   */
  static isLoggedIn() {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  /**
   * Check if user is admin
   */
  static isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  }

  /**
   * Check if user is seller
   */
  static isSeller() {
    const user = this.getUser();
    return user && user.role === 'seller';
  }

  /**
   * Check if user is buyer
   */
  static isBuyer() {
    const user = this.getUser();
    return user && user.role === 'buyer';
  }

  /**
   * Get user role
   */
  static getUserRole() {
    const user = this.getUser();
    return user ? user.role : null;
  }

  /**
   * Check authentication and redirect if needed
   */
  static checkAuth(requiredRole = null) {
    const isLoggedIn = this.isLoggedIn();
    const user = this.getUser();

    console.log('[Auth] Checking authentication...', { isLoggedIn, user });

    // Not logged in - redirect to login
    if (!isLoggedIn) {
      console.warn('[Auth] User not logged in, redirecting to login');
      this.logout(true);
      return false;
    }

    // Check role if required
    if (requiredRole) {
      if (user.role !== requiredRole) {
        console.warn(`[Auth] User role ${user.role} does not match required role ${requiredRole}`);
        this.showUnauthorizedMessage();
        return false;
      }
    }

    console.log('[Auth] Authentication check passed');
    return true;
  }

  /**
   * Check if user has admin access for admin panel
   */
  static checkAdminAuth() {
    return this.checkAuth('admin');
  }

  /**
   * Check if user has seller access for vendor panel
   */
  static checkSellerAuth() {
    const user = this.getUser();
    // Seller or admin can access vendor panel
    return this.isLoggedIn() && (user.role === 'seller' || user.role === 'admin');
  }

  /**
   * Show unauthorized message
   */
  static showUnauthorizedMessage() {
    alert('Bu sayfaya erişim yetkiniz yok. Lütfen yönetici olarak giriş yapın.');
    window.location.href = '/index.html';
  }

  /**
   * Update user data in localStorage
   */
  static updateUser(userData) {
    try {
      const currentUser = this.getUser();
      if (!currentUser) {
        console.error('[Auth] No user to update');
        return false;
      }

      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem(this.STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      console.log('[Auth] User updated:', updatedUser);
      return true;
    } catch (error) {
      console.error('[Auth] Failed to update user:', error);
      return false;
    }
  }

  /**
   * Decode JWT token (basic decode, no verification)
   */
  static decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('[Auth] Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token = null) {
    try {
      const tokenToCheck = token || this.getToken();
      if (!tokenToCheck) return true;

      const decoded = this.decodeToken(tokenToCheck);
      if (!decoded || !decoded.exp) return true;

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      console.error('[Auth] Failed to check token expiration:', error);
      return true;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        console.error('[Auth] No refresh token available');
        this.logout();
        return false;
      }

      // Call refresh endpoint (assuming it exists)
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.error('[Auth] Token refresh failed');
        this.logout();
        return false;
      }

      const data = await response.json();
      if (data.success && data.data.accessToken) {
        localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, data.data.accessToken);
        console.log('[Auth] Access token refreshed');
        return true;
      }

      this.logout();
      return false;
    } catch (error) {
      console.error('[Auth] Failed to refresh token:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Initialize auth state on page load
   */
  static init() {
    console.log('[Auth] Initializing auth manager...');

    // Check if token is expired
    if (this.isLoggedIn() && this.isTokenExpired()) {
      console.warn('[Auth] Token expired, attempting to refresh...');
      this.refreshAccessToken();
    }

    // Display user info in UI if logged in
    this.updateUIWithUserInfo();
  }

  /**
   * Update UI with user information
   */
  static updateUIWithUserInfo() {
    const user = this.getUser();
    if (!user) return;

    // Update user name displays
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach((el) => {
      el.textContent = `${user.first_name} ${user.last_name}`;
    });

    // Update user email displays
    const userEmailElements = document.querySelectorAll('.user-email');
    userEmailElements.forEach((el) => {
      el.textContent = user.email;
    });

    // Update user role displays
    const userRoleElements = document.querySelectorAll('.user-role');
    userRoleElements.forEach((el) => {
      el.textContent = user.role === 'admin' ? 'Yönetici' : user.role === 'seller' ? 'Satıcı' : 'Alıcı';
    });

    // Show/hide elements based on authentication
    const authElements = document.querySelectorAll('[data-auth-required]');
    authElements.forEach((el) => {
      el.style.display = this.isLoggedIn() ? '' : 'none';
    });

    const guestElements = document.querySelectorAll('[data-guest-only]');
    guestElements.forEach((el) => {
      el.style.display = this.isLoggedIn() ? 'none' : '';
    });
  }
}

// Auto-initialize on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
  });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthManager;
}
