/**
 * Return Request API Client
 * Handles return requests for customers
 */

class ReturnAPI {
  constructor() {
    this.API_BASE = (typeof API_CONFIG !== 'undefined' && API_CONFIG.BASE_URL) ? API_CONFIG.BASE_URL : 'http://localhost:5050/api/v1';
  }

  /**
   * Create new return request
   * @param {Object} returnData - Return request data
   * @returns {Promise<Object>}
   */
  async createReturnRequest(returnData) {
    try {
      const response = await fetch(`${this.API_BASE}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify(returnData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create return request');
      }

      return data;
    } catch (error) {
      console.error('Error creating return request:', error);
      throw error;
    }
  }

  /**
   * Get user's return requests
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>}
   */
  async getUserReturns(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`${this.API_BASE}/returns?${queryParams}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch return requests');
      }

      return data;
    } catch (error) {
      console.error('Error fetching return requests:', error);
      throw error;
    }
  }

  /**
   * Get return request by ID
   * @param {string} returnId - Return request ID
   * @returns {Promise<Object>}
   */
  async getReturnRequest(returnId) {
    try {
      const response = await fetch(`${this.API_BASE}/returns/${returnId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch return request');
      }

      return data;
    } catch (error) {
      console.error('Error fetching return request:', error);
      throw error;
    }
  }

  /**
   * Cancel return request
   * @param {string} returnId - Return request ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>}
   */
  async cancelReturnRequest(returnId, reason) {
    try {
      const response = await fetch(`${this.API_BASE}/returns/${returnId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel return request');
      }

      return data;
    } catch (error) {
      console.error('Error cancelling return request:', error);
      throw error;
    }
  }

  /**
   * Update return status (vendor/admin only)
   * @param {string} returnId - Return request ID
   * @param {Object} statusData - Status update data
   * @returns {Promise<Object>}
   */
  async updateReturnStatus(returnId, statusData) {
    try {
      const response = await fetch(`${this.API_BASE}/returns/${returnId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify(statusData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update return status');
      }

      return data;
    } catch (error) {
      console.error('Error updating return status:', error);
      throw error;
    }
  }

  /**
   * Get store's return requests (vendor only)
   * @param {string} storeId - Store ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>}
   */
  async getStoreReturns(storeId, filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(
        `${this.API_BASE}/returns/stores/${storeId}?${queryParams}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.getToken()}`,
          },
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch store returns');
      }

      return data;
    } catch (error) {
      console.error('Error fetching store returns:', error);
      throw error;
    }
  }

  /**
   * Get authentication token
   * @returns {string}
   * @private
   */
  getToken() {
    return localStorage.getItem('token') || '';
  }

  /**
   * Format return status for display
   * @param {string} status
   * @returns {Object}
   */
  formatReturnStatus(status) {
    const statusMap = {
      pending: { label: 'Beklemede', class: 'status-pending', icon: '⏳' },
      approved: { label: 'Onaylandı', class: 'status-approved', icon: '✓' },
      rejected: { label: 'Reddedildi', class: 'status-rejected', icon: '✗' },
      items_received: { label: 'Ürün Alındı', class: 'status-received', icon: '📦' },
      refund_processed: { label: 'İade Yapıldı', class: 'status-refunded', icon: '💰' },
      completed: { label: 'Tamamlandı', class: 'status-completed', icon: '✅' },
      cancelled: { label: 'İptal Edildi', class: 'status-cancelled', icon: '🚫' },
    };

    return statusMap[status] || { label: status, class: 'status-unknown', icon: '❓' };
  }

  /**
   * Format return reason for display
   * @param {string} reason
   * @returns {string}
   */
  formatReturnReason(reason) {
    const reasonMap = {
      defective: 'Kusurlu Ürün',
      wrong_item: 'Yanlış Ürün',
      not_as_described: 'Açıklamaya Uymuyor',
      damaged: 'Hasarlı',
      changed_mind: 'Fikrim Değişti',
      better_price_elsewhere: 'Başka Yerde Daha Ucuz',
      other: 'Diğer',
    };

    return reasonMap[reason] || reason;
  }
}

// Initialize API client
const returnAPI = new ReturnAPI();










