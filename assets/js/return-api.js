/**
 * Return Request API Client
 * Handles return requests for customers
 */

class ReturnAPI {
  constructor() {
    this.apiClient = new ApiClient();
  }

  /**
   * Create new return request
   * @param {Object} returnData - Return request data
   * @returns {Promise<Object>}
   */
  async createReturnRequest(returnData) {
    try {
      const response = await this.apiClient.post('/returns', returnData);
      return response;
    } catch (error) {
      console.error('[ReturnAPI] Error creating return request:', error);
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
      const queryString = new URLSearchParams(filters).toString();
      const endpoint = queryString ? `/returns?${queryString}` : '/returns';
      const response = await this.apiClient.get(endpoint);
      return response;
    } catch (error) {
      console.error('[ReturnAPI] Error fetching return requests:', error);
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
      const response = await this.apiClient.get(`/returns/${returnId}`);
      return response;
    } catch (error) {
      console.error('[ReturnAPI] Error fetching return request:', error);
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
      const response = await this.apiClient.post(`/returns/${returnId}/cancel`, { reason });
      return response;
    } catch (error) {
      console.error('[ReturnAPI] Error cancelling return request:', error);
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
      const response = await this.apiClient.patch(`/returns/${returnId}/status`, statusData);
      return response;
    } catch (error) {
      console.error('[ReturnAPI] Error updating return status:', error);
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
      const queryString = new URLSearchParams(filters).toString();
      const endpoint = queryString ? `/returns/stores/${storeId}?${queryString}` : `/returns/stores/${storeId}`;
      const response = await this.apiClient.get(endpoint);
      return response;
    } catch (error) {
      console.error('[ReturnAPI] Error fetching store returns:', error);
      throw error;
    }
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










