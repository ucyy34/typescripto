/* ===============================================
   DOSTANWEBCSS ADMIN DASHBOARD JAVASCRIPT
   Master Control Panel with Backend API Integration
   =============================================== */

class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.api = apiClient; // Use the global API client
        this.realTimeData = {
            revenue: 0,
            users: 0,
            stores: 0,
            products: 0,
            orders: 0,
            uptime: 99.8
        };
        this.systemMetrics = {
            cpu: 23,
            memory: 67,
            storage: 84,
            network: 45
        };

        // Check authentication before initializing
        if (!AuthManager.checkAdminAuth()) {
            console.warn('[Admin Dashboard] Authentication failed, redirecting to login');
            // Redirect to admin login page
            setTimeout(() => {
                window.location.href = '../admincss/login.html';
            }, 1000);
            return;
        }

        this.init();
    }

    async init() {
        console.log('[Admin Dashboard] Initializing...');

        this.setupNavigation();
        this.setupNotifications();
        this.setupQuickActions();
        this.setupDostikAI();
        this.setupTheme();
        this.startSystemMonitoring();
        setupCouponModal();

        // Load initial data from API
        await this.loadDashboardStats();

        // Start real-time updates
        this.setupRealTimeUpdates();

        console.log('[Admin Dashboard] Initialization complete');
    }

    // ===========================================
    // API DATA LOADING METHODS
    // ===========================================

    /**
     * Load dashboard statistics from API
     */
    async loadDashboardStats() {
        try {
            console.log('[Admin Dashboard] Loading dashboard stats...');
            this.showLoading('dashboard-stats');

            // Load all stats in parallel
            console.log('[Admin Dashboard] Fetching stores, products, orders...');
            const [stores, products, orders, pendingStoresCount, pendingProductsCount] = await Promise.all([
                this.api.getStores({ limit: 1 }),
                this.api.getProducts({ limit: 1 }),
                this.api.getAllOrders({ limit: 1 }),
                this.api.getPendingStoresCount(),
                this.api.getPendingProductsCount()
            ]);

            console.log('[Admin Dashboard] API responses:', { stores, products, orders, pendingStoresCount, pendingProductsCount });

            // Update real-time data
            this.realTimeData.stores = stores.pagination?.total || 0;
            this.realTimeData.products = products.pagination?.total || 0;
            this.realTimeData.orders = orders.pagination?.total || 0;

            // Update UI
            this.updateDashboardUI({
                totalStores: this.realTimeData.stores,
                totalProducts: this.realTimeData.products,
                totalOrders: this.realTimeData.orders,
                pendingStores: pendingStoresCount,
                pendingProducts: pendingProductsCount,
            });

            this.hideLoading('dashboard-stats');
            console.log('[Admin Dashboard] Dashboard stats loaded successfully');
        } catch (error) {
            console.error('[Admin Dashboard] Error loading stats:', error);
            console.error('[Admin Dashboard] Error details:', error.message, error.stack);
            this.showError('Veriler yüklenirken hata oluştu: ' + error.message);
            this.hideLoading('dashboard-stats');
        }
    }

    /**
     * Update dashboard UI with stats
     */
    updateDashboardUI(stats) {
        // Update stat cards
        this.updateStatCard(0, stats.totalStores, 'Toplam Mağaza');
        this.updateStatCard(1, stats.totalProducts, 'Toplam Ürün');
        this.updateStatCard(2, stats.totalOrders, 'Toplam Sipariş');
        this.updateStatCard(3, stats.pendingStores, 'Bekleyen Mağaza');
        this.updateStatCard(4, stats.pendingProducts, 'Bekleyen Ürün');
    }

    /**
     * Update a stat card
     */
    updateStatCard(index, value, label) {
        const cards = document.querySelectorAll('.admin-card');
        if (cards[index]) {
            const valueElement = cards[index].querySelector('.stat-value');
            const labelElement = cards[index].querySelector('.stat-label');

            if (valueElement) {
                this.animateValue(valueElement, value);
            }
            if (labelElement && label) {
                labelElement.textContent = label;
            }
        }
    }

    /**
     * Load pending stores
     */
    async loadVendorsData() {
        try {
            console.log('[Admin Dashboard] Loading vendors data...');
            this.showLoading('stores-table');

            // Get ALL stores, not just pending
            const result = await this.api.getStores({ limit: 100 });
            console.log('[Admin Dashboard] Vendors API result:', result);

            if (result.success && result.data) {
                console.log('[Admin Dashboard] Rendering vendors table, count:', result.data.length);
                this.renderStoresTable(result.data);
            } else {
                console.warn('[Admin Dashboard] No vendors data received');
            }

            this.hideLoading('stores-table');
        } catch (error) {
            console.error('[Admin Dashboard] Error loading vendors:', error);
            this.showError('Mağazalar yüklenirken hata oluştu');
            this.hideLoading('stores-table');
        }
    }

    /**
     * Render stores table
     */
    renderStoresTable(stores) {
        const tableContainer = document.getElementById('stores-table');
        if (!tableContainer) {
            console.error('[Admin Dashboard] stores-table container not found');
            return;
        }

        if (!stores || stores.length === 0) {
            tableContainer.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Bekleyen mağaza bulunmamaktadır.</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(16, 185, 129, 0.1); border-bottom: 2px solid var(--admin-border);">
                        <th style="padding: 1rem; text-align: left;">Mağaza Adı</th>
                        <th style="padding: 1rem; text-align: left;">Sahip</th>
                        <th style="padding: 1rem; text-align: left;">E-posta</th>
                        <th style="padding: 1rem; text-align: left;">Durum</th>
                        <th style="padding: 1rem; text-align: center;">İşlemler</th>
                    </tr>
                </thead>
                <tbody>
        `;

        stores.forEach(store => {
            html += `
                <tr style="border-bottom: 1px solid var(--admin-border);">
                    <td style="padding: 1rem;">
                        <div style=\"font-weight: 600;\">${store.name}</div>
                        <div style=\"opacity: 0.7; font-size: 0.85rem;\">${store.slug || ''}</div>
                        <div style=\"margin-top:0.75rem; padding:0.75rem; background:#f8fafc; border:1px solid var(--admin-border); border-radius:8px;\">
                          <div style=\"font-weight:600; margin-bottom:0.5rem;\">Return Policy</div>
                          <div style=\"display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; align-items:center;\">
                            <label>Window (days)
                              <input data-store-id=\"${store.id}\" class=\"rt-win\" type=\"number\" min=\"0\" value=\"${(store.settings?.return_window_days ?? 14)}\" style=\"width:100%; padding:0.4rem; border:1px solid var(--admin-border); border-radius:6px;\" />
                            </label>
                            <label>Shipping
                              <select data-store-id=\"${store.id}\" class=\"rt-ship\" style=\"width:100%; padding:0.4rem; border:1px solid var(--admin-border); border-radius:6px;\">
                                <option value=\"none\" ${(store.settings?.return_shipping_policy==='none')?'selected':''}>None</option>
                                <option value=\"pro_rata\" ${(store.settings?.return_shipping_policy==='pro_rata')?'selected':''}>Pro-rata</option>
                                <option value=\"full\" ${(store.settings?.return_shipping_policy==='full')?'selected':''}>Full</option>
                              </select>
                            </label>
                            <label>Tax
                              <select data-store-id=\"${store.id}\" class=\"rt-tax\" style=\"width:100%; padding:0.4rem; border:1px solid var(--admin-border); border-radius:6px;\">
                                <option value=\"none\" ${(store.settings?.tax_refund_policy==='none')?'selected':''}>None</option>
                                <option value=\"pro_rata\" ${(store.settings?.tax_refund_policy==='pro_rata')?'selected':''}>Pro-rata</option>
                                <option value=\"full\" ${(store.settings?.tax_refund_policy==='full')?'selected':''}>Full</option>
                              </select>
                            </label>
                            <div>
                              <button onclick=\"window.adminDashboard.saveReturnPolicy('${store.id}')\" style=\"background:#2d6853; color:white; border:none; padding:0.45rem 0.8rem; border-radius:6px; cursor:pointer;\">Save</button>
                              <span id=\"rt-msg-${store.id}\" style=\"margin-left:0.5rem; opacity:0.8;\"></span>
                            </div>
                          </div>
                        </div>
                    </td>
                    <td style="padding: 1rem;">${store.user?.first_name || ''} ${store.user?.last_name || ''}</td>
                    <td style="padding: 1rem;">${store.email || store.user?.email || '-'}</td>
                    <td style="padding: 1rem;">
                        <span style="background: #f59e0b; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.85rem;">
                            ${this.getStatusLabel(store.status)}
                        </span>
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <button onclick="window.adminDashboard.approveStore('${store.id}')"
                                style="background: #10b981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
                            Onayla
                        </button>
                        <button onclick="window.adminDashboard.rejectStore('${store.id}')"
                                style="background: #dc2626; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                            Reddet
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    }

    async saveReturnPolicy(storeId) {
        try {
            const win = document.querySelector(`input.rt-win[data-store-id='${storeId}']`);
            const ship = document.querySelector(`select.rt-ship[data-store-id='${storeId}']`);
            const tax = document.querySelector(`select.rt-tax[data-store-id='${storeId}']`);
            const msg = document.getElementById(`rt-msg-${storeId}`);

            const winVal = parseInt(win?.value || '14', 10);
            const shipVal = ship?.value || 'none';
            const taxVal = tax?.value || 'pro_rata';

            // Fetch current store to merge settings
            const current = await this.api.getStore(storeId);
            const baseSettings = current?.data?.settings || {};
            const newSettings = { ...baseSettings, return_window_days: winVal, return_shipping_policy: shipVal, tax_refund_policy: taxVal };

            if (msg) { msg.textContent = 'Saving...'; msg.style.color = '#6b7280'; }
            const res = await this.api.put(`/stores/${storeId}`, { settings: newSettings });
            if (res.success) {
                if (msg) { msg.textContent = 'Saved'; msg.style.color = '#10b981'; }
            } else {
                throw new Error(res.message || 'Failed to save');
            }
        } catch (e) {
            const msg = document.getElementById(`rt-msg-${storeId}`);
            if (msg) { msg.textContent = 'Error: ' + e.message; msg.style.color = '#dc2626'; }
        }
    }

    /**
     * Approve store
     */
    async approveStore(storeId) {
        if (!confirm('Bu mağazayı onaylamak istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const result = await this.api.updateStoreStatus(storeId, 'approved');

            if (result.success) {
                this.showSuccess('Mağaza başarıyla onaylandı');
                await this.loadVendorsData(); // Reload table
            } else {
                this.showError(result.message || 'Mağaza onaylanırken hata oluştu');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error approving store:', error);
            this.showError('Mağaza onaylanırken hata oluştu');
        }
    }

    /**
     * Reject store
     */
    async rejectStore(storeId) {
        const reason = prompt('Reddetme sebebini girin:');
        if (!reason) return;

        try {
            const result = await this.api.updateStoreStatus(storeId, 'rejected', reason);

            if (result.success) {
                this.showSuccess('Mağaza reddedildi');
                await this.loadVendorsData(); // Reload table
            } else {
                this.showError(result.message || 'Mağaza reddedilirken hata oluştu');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error rejecting store:', error);
            this.showError('Mağaza reddedilirken hata oluştu');
        }
    }

    /**
     * Load pending products
     */
    async loadProductsData() {
        try {
            this.showLoading('products-table');

            const result = await this.api.getProducts({ status: 'pending', limit: 50 });

            if (result.success && result.data) {
                this.renderProductsTable(result.data);
            }

            this.hideLoading('products-table');
        } catch (error) {
            console.error('[Admin Dashboard] Error loading products:', error);
            this.showError('Ürünler yüklenirken hata oluştu');
            this.hideLoading('products-table');
        }
    }

    /**
     * Render products table
     */
    renderProductsTable(products) {
        const tableContainer = document.getElementById('products-table');
        if (!tableContainer) {
            console.error('[Admin Dashboard] products-table container not found');
            return;
        }

        if (!products || products.length === 0) {
            tableContainer.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Bekleyen ürün bulunmamaktadır.</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(16, 185, 129, 0.1); border-bottom: 2px solid var(--admin-border);">
                        <th style="padding: 1rem; text-align: left;">Ürün</th>
                        <th style="padding: 1rem; text-align: left;">Mağaza</th>
                        <th style="padding: 1rem; text-align: left;">Fiyat</th>
                        <th style="padding: 1rem; text-align: left;">Stok</th>
                        <th style="padding: 1rem; text-align: left;">Durum</th>
                        <th style="padding: 1rem; text-align: center;">İşlemler</th>
                    </tr>
                </thead>
                <tbody>
        `;

        products.forEach(product => {
            html += `
                <tr style="border-bottom: 1px solid var(--admin-border);">
                    <td style="padding: 1rem;">${product.title}</td>
                    <td style="padding: 1rem;">${product.store?.name || '-'}</td>
                    <td style="padding: 1rem;">${product.price} TL</td>
                    <td style="padding: 1rem;">${product.stock}</td>
                    <td style="padding: 1rem;">
                        <span style="background: #f59e0b; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.85rem;">
                            ${this.getStatusLabel(product.status)}
                        </span>
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <button onclick="window.adminDashboard.approveProduct('${product.id}')"
                                style="background: #10b981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
                            Onayla
                        </button>
                        <button onclick="window.adminDashboard.rejectProduct('${product.id}')"
                                style="background: #dc2626; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                            Reddet
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    }

    /**
     * Approve product
     */
    async approveProduct(productId) {
        if (!confirm('Bu ürünü onaylamak istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const result = await this.api.updateProductStatus(productId, 'approved');

            if (result.success) {
                this.showSuccess('Ürün başarıyla onaylandı');
                await this.loadProductsData(); // Reload table
            } else {
                this.showError(result.message || 'Ürün onaylanırken hata oluştu');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error approving product:', error);
            this.showError('Ürün onaylanırken hata oluştu');
        }
    }

    /**
     * Reject product
     */
    async rejectProduct(productId) {
        const reason = prompt('Reddetme sebebini girin:');
        if (!reason) return;

        try {
            const result = await this.api.updateProductStatus(productId, 'rejected', reason);

            if (result.success) {
                this.showSuccess('Ürün reddedildi');
                await this.loadProductsData(); // Reload table
            } else {
                this.showError(result.message || 'Ürün reddedilirken hata oluştu');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error rejecting product:', error);
            this.showError('Ürün reddedilirken hata oluştu');
        }
    }

    /**
     * Load orders
     */
    async loadOrdersData() {
        try {
            this.showLoading('orders-table');

            const result = await this.api.getAllOrders({ limit: 50 });

            if (result.success && result.data) {
                this.renderOrdersTable(result.data);
            }

            this.hideLoading('orders-table');
        } catch (error) {
            console.error('[Admin Dashboard] Error loading orders:', error);
            this.showError('Siparişler yüklenirken hata oluştu');
            this.hideLoading('orders-table');
        }
    }

    /**
     * Render orders table
     */
    renderOrdersTable(orders) {
        const tableContainer = document.getElementById('orders-table');
        if (!tableContainer) {
            console.error('[Admin Dashboard] orders-table container not found');
            return;
        }

        if (!orders || orders.length === 0) {
            tableContainer.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Sipariş bulunmamaktadır.</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(16, 185, 129, 0.1); border-bottom: 2px solid var(--admin-border);">
                        <th style="padding: 1rem; text-align: left;">Sipariş No</th>
                        <th style="padding: 1rem; text-align: left;">Müşteri</th>
                        <th style="padding: 1rem; text-align: left;">Mağaza</th>
                        <th style="padding: 1rem; text-align: left;">Tutar</th>
                        <th style="padding: 1rem; text-align: left;">Durum</th>
                        <th style="padding: 1rem; text-align: left;">Tarih</th>
                    </tr>
                </thead>
                <tbody>
        `;

        orders.forEach(order => {
            const statusColor = this.getOrderStatusColor(order.status);
            const date = new Date(order.createdAt).toLocaleDateString('tr-TR');

            html += `
                <tr style="border-bottom: 1px solid var(--admin-border);">
                    <td style="padding: 1rem; font-weight: 600;">${order.order_number}</td>
                    <td style="padding: 1rem;">${order.customer?.first_name || ''} ${order.customer?.last_name || ''}</td>
                    <td style="padding: 1rem;">${order.store?.name || '-'}</td>
                    <td style="padding: 1rem; font-weight: 600;">${order.total} ${order.currency}</td>
                    <td style="padding: 1rem;">
                        <span style="background: ${statusColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.85rem;">
                            ${this.getOrderStatusLabel(order.status)}
                        </span>
                    </td>
                    <td style="padding: 1rem;">${date}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    }

    /**
     * Load categories
     */
    async loadCategoriesData() {
        try {
            console.log('[Admin Dashboard] Loading categories...');
            this.showLoading('categories-table');

            const result = await this.api.getTopLevelCategories();
            console.log('[Admin Dashboard] Categories API response:', result);

            if (result.success && result.data) {
                console.log('[Admin Dashboard] Rendering categories table with', result.data.length, 'categories');
                this.renderCategoriesTable(result.data);
            } else {
                console.warn('[Admin Dashboard] Categories API returned no data:', result);
                this.showError('Kategoriler yüklenemedi');
            }

            this.hideLoading('categories-table');
        } catch (error) {
            console.error('[Admin Dashboard] Error loading categories:', error);
            console.error('[Admin Dashboard] Error details:', error.message, error.stack);
            this.showError('Kategoriler yüklenirken hata oluştu: ' + error.message);
            this.hideLoading('categories-table');
        }
    }

    /**
     * Render categories table
     */
    renderCategoriesTable(categories) {
        const tableContainer = document.getElementById('categories-table');
        if (!tableContainer) {
            console.error('[Admin Dashboard] categories-table container not found');
            return;
        }

        if (!categories || categories.length === 0) {
            tableContainer.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Kategori bulunmamaktadır.</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(16, 185, 129, 0.1); border-bottom: 2px solid var(--admin-border);">
                        <th style="padding: 1rem; text-align: left;">Kategori Adı</th>
                        <th style="padding: 1rem; text-align: left;">Slug</th>
                        <th style="padding: 1rem; text-align: center;">Komisyon %</th>
                        <th style="padding: 1rem; text-align: center;">Aktif</th>
                        <th style="padding: 1rem; text-align: center;">Öne Çıkan</th>
                        <th style="padding: 1rem; text-align: center;">İşlemler</th>
                    </tr>
                </thead>
                <tbody>
        `;

        categories.forEach(category => {
            const commissionDisplay = category.commission_rate !== null && category.commission_rate !== undefined
                ? `<span style="color: #10b981; font-weight: 600;">${category.commission_rate}%</span>`
                : '<span style="color: #6b7280; font-size: 0.85rem;">Global (15%)</span>';

            html += `
                <tr style="border-bottom: 1px solid var(--admin-border);">
                    <td style="padding: 1rem;">${category.icon || ''} ${category.name}</td>
                    <td style="padding: 1rem; font-family: monospace; font-size: 0.9rem;">${category.slug}</td>
                    <td style="padding: 1rem; text-align: center;">${commissionDisplay}</td>
                    <td style="padding: 1rem; text-align: center;">
                        ${category.is_active ? '✅' : '❌'}
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        ${category.is_featured ? '⭐' : '-'}
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <button
                            onclick="editCategoryCommission('${category.id}', '${category.name}', ${category.commission_rate})"
                            style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem;">
                            💰 Komisyon Ayarla
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    }

    // ===========================================
    // HELPER METHODS
    // ===========================================

    getStatusLabel(status) {
        const labels = {
            'pending': 'Beklemede',
            'approved': 'Onaylandı',
            'rejected': 'Reddedildi',
            'suspended': 'Askıya Alındı',
            'draft': 'Taslak'
        };
        return labels[status] || status;
    }

    getOrderStatusLabel(status) {
        const labels = {
            'pending_payment': 'Ödeme Bekliyor',
            'paid': 'Ödendi',
            'processing': 'Hazırlanıyor',
            'shipped': 'Kargoda',
            'delivered': 'Teslim Edildi',
            'cancelled': 'İptal Edildi',
            'refunded': 'İade Edildi'
        };
        return labels[status] || status;
    }

    getOrderStatusColor(status) {
        const colors = {
            'pending_payment': '#f59e0b',
            'paid': '#3b82f6',
            'processing': '#6366f1',
            'shipped': '#8b5cf6',
            'delivered': '#10b981',
            'cancelled': '#dc2626',
            'refunded': '#64748b'
        };
        return colors[status] || '#64748b';
    }

    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div><p>Yükleniyor...</p></div>';
        }
    }

    hideLoading(elementId) {
        // Loading is hidden automatically when content is rendered
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#dc2626' : '#3b82f6';

        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideInRight 0.3s ease-out;
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ===========================================
    // EXISTING METHODS (kept from original)
    // ===========================================

    setupNavigation() {
        const menuItems = document.querySelectorAll('.menu-item');

        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                if (section) {
                    this.switchSection(section);
                    this.updateActiveMenuItem(item);
                }
            });
        });
    }

    switchSection(sectionName) {
        console.log('[Admin Dashboard] Switching to section:', sectionName);

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
            this.currentSection = sectionName;

            console.log('[Admin Dashboard] Section switched to:', sectionName);

            // Load section-specific data from API
            this.loadSectionData(sectionName);

            // Dostik commentary
            this.dostikComment(sectionName);
        } else {
            console.error('[Admin Dashboard] Section not found:', `${sectionName}-section`);
        }
    }

    updateActiveMenuItem(activeItem) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    loadSectionData(sectionName) {
        console.log(`[Admin Dashboard] Loading ${sectionName} data from API...`);

        switch(sectionName) {
            case 'dashboard':
                this.loadDashboardStats();
                break;
            case 'vendors':
                this.loadVendorsData();
                break;
            case 'products':
                this.loadProductsData();
                break;
            case 'orders':
                this.loadOrdersData();
                break;
            case 'categories':
                this.loadCategoriesData();
                break;
            case 'commissions':
                loadCommissionsData();
                break;
            case 'coupons':
                loadCouponsData();
                break;
            case 'returns':
                loadReturnsData();
                break;
            case 'customers':
                this.loadCustomersData();
                break;
            case 'analytics':
                this.loadAnalyticsData();
                break;
            case 'security':
                this.loadSecurityData();
                break;
            case 'settings':
                this.loadSystemSettings();
                break;
            default:
                console.log(`[Admin Dashboard] No API data loader for ${sectionName}`);
        }
    }

    /**
     * Load customers data
     */
    async loadCustomersData() {
        try {
            this.showLoading('customers-table');

            // Get all users (buyers, sellers, and admins)
            const result = await this.api.getUsers({ limit: 100 });

            console.log('[Admin Dashboard] Users loaded:', result);

            if (result.success && result.data) {
                this.renderCustomersTable(result.data);
            } else {
                console.warn('[Admin Dashboard] No users data received');
                this.renderCustomersTable([]);
            }

            this.hideLoading('customers-table');
        } catch (error) {
            console.error('[Admin Dashboard] Error loading customers:', error);
            this.showError('Müşteriler yüklenirken hata oluştu');
            this.hideLoading('customers-table');
        }
    }

    /**
     * Render customers table
     */
    renderCustomersTable(customers) {
        const tableContainer = document.getElementById('customers-table');
        if (!tableContainer) {
            console.error('[Admin Dashboard] customers-table container not found');
            return;
        }

        if (!customers || customers.length === 0) {
            tableContainer.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Müşteri bulunmamaktadır.</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(16, 185, 129, 0.1); border-bottom: 2px solid var(--admin-border);">
                        <th style="padding: 1rem; text-align: left;">Kullanıcı Adı</th>
                        <th style="padding: 1rem; text-align: left;">E-posta</th>
                        <th style="padding: 1rem; text-align: center;">Rol</th>
                        <th style="padding: 1rem; text-align: center;">Durum</th>
                        <th style="padding: 1rem; text-align: left;">Kayıt Tarihi</th>
                        <th style="padding: 1rem; text-align: center;">İşlemler</th>
                    </tr>
                </thead>
                <tbody>
        `;

        customers.forEach(customer => {
            const date = new Date(customer.createdAt).toLocaleDateString('tr-TR');

            // Role labels
            const roleLabels = {
                'buyer': 'Alıcı',
                'seller': 'Satıcı',
                'admin': 'Admin'
            };
            const roleColors = {
                'buyer': '#3b82f6',
                'seller': '#8b5cf6',
                'admin': '#dc2626'
            };

            const roleLabel = roleLabels[customer.role] || customer.role;
            const roleColor = roleColors[customer.role] || '#6b7280';

            // Status
            const statusLabel = customer.is_active ? 'Aktif' : 'Askıda';
            const statusColor = customer.is_active ? '#10b981' : '#ef4444';
            const statusIcon = customer.is_active ? '✅' : '⛔';

            html += `
                <tr style="border-bottom: 1px solid var(--admin-border);">
                    <td style="padding: 1rem; font-weight: 600;">${customer.first_name || ''} ${customer.last_name || ''}</td>
                    <td style="padding: 1rem;">${customer.email}</td>
                    <td style="padding: 1rem; text-align: center;">
                        <span style="background: ${roleColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.85rem;">
                            ${roleLabel}
                        </span>
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <span style="color: ${statusColor}; font-weight: 600; font-size: 0.9rem;">
                            ${statusIcon} ${statusLabel}
                        </span>
                    </td>
                    <td style="padding: 1rem;">${date}</td>
                    <td style="padding: 1rem; text-align: center;">
                        ${customer.is_active ? `
                            <button
                                onclick="adminDashboard.suspendUser('${customer.id}', '${customer.email}')"
                                style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; margin-right: 0.5rem;">
                                🔒 Askıya Al
                            </button>
                        ` : `
                            <button
                                onclick="adminDashboard.activateUser('${customer.id}', '${customer.email}')"
                                style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; margin-right: 0.5rem;">
                                ✅ Aktifleştir
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    }

    /**
     * Suspend user account
     */
    async suspendUser(userId, userEmail) {
        if (!confirm(`"${userEmail}" kullanıcısını askıya almak istediğinizden emin misiniz?`)) {
            return;
        }

        try {
            const result = await this.api.updateUserStatus(userId, false);

            if (result.success) {
                alert('✅ Kullanıcı başarıyla askıya alındı');
                this.loadCustomersData();
            } else {
                throw new Error(result.message || 'Failed to suspend user');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error suspending user:', error);
            alert('❌ Kullanıcı askıya alınırken hata oluştu: ' + error.message);
        }
    }

    /**
     * Activate user account
     */
    async activateUser(userId, userEmail) {
        if (!confirm(`"${userEmail}" kullanıcısını aktifleştirmek istediğinizden emin misiniz?`)) {
            return;
        }

        try {
            const result = await this.api.updateUserStatus(userId, true);

            if (result.success) {
                alert('✅ Kullanıcı başarıyla aktifleştirildi');
                this.loadCustomersData();
            } else {
                throw new Error(result.message || 'Failed to activate user');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error activating user:', error);
            alert('❌ Kullanıcı aktifleştirilirken hata oluştu: ' + error.message);
        }
    }

    // Placeholder methods for sections not yet implemented
    loadAnalyticsData() {
        console.log('[Admin Dashboard] Analytics data - static display, no API call needed');
    }
    loadSecurityData() {
        console.log('[Admin Dashboard] Security data - static display, no API call needed');
    }
    loadSystemSettings() {
        console.log('[Admin Dashboard] Settings data - static display, no API call needed');
    }

    // Real-time Updates
    setupRealTimeUpdates() {
        // Update stats every 60 seconds
        setInterval(() => {
            if (this.currentSection === 'dashboard') {
                this.loadDashboardStats();
            }
        }, 60000);
    }

    animateValue(element, newValue, prefix = '', suffix = '') {
        const currentValue = parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0;
        const increment = (newValue - currentValue) / 30;
        let current = currentValue;

        const timer = setInterval(() => {
            current += increment;
            if (
                (increment > 0 && current >= newValue) ||
                (increment < 0 && current <= newValue)
            ) {
                current = newValue;
                clearInterval(timer);
            }

            let displayValue = Math.floor(current);
            if (suffix === 'k' && displayValue > 1000) {
                displayValue = (displayValue / 1000).toFixed(1) + 'k';
            }

            element.textContent = prefix + displayValue + (suffix !== 'k' ? suffix : '');
        }, 50);
    }

    // Notification System
    setupNotifications() {
        const notificationIcon = document.querySelector('.admin-notifications');

        if (notificationIcon) {
            notificationIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showNotificationDropdown();
            });
        }
    }

    showNotificationDropdown() {
        // Implementation kept from original
        // This would be enhanced with real notifications from backend
        console.log('[Admin Dashboard] Notification dropdown - using mock data');
    }

    // Quick Actions
    setupQuickActions() {
        const quickButtons = document.querySelectorAll('.admin-action-btn');

        quickButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.textContent.trim();
                this.executeQuickAction(action, button);
            });
        });

        const refreshBtn = document.querySelector('.admin-quick-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAllData();
            });
        }
    }

    executeQuickAction(action, buttonElement) {
        const originalText = buttonElement.innerHTML;
        buttonElement.innerHTML = '⏳ İşleniyor...';
        buttonElement.disabled = true;

        setTimeout(() => {
            buttonElement.innerHTML = '✅ Tamamlandı';

            setTimeout(() => {
                buttonElement.innerHTML = originalText;
                buttonElement.disabled = false;
            }, 1500);
        }, 2000);
    }

    async refreshAllData() {
        const refreshBtn = document.querySelector('.admin-quick-btn');
        if (!refreshBtn) return;

        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '🔄 Yenileniyor...';
        refreshBtn.disabled = true;

        await this.loadSectionData(this.currentSection);

        refreshBtn.innerHTML = '✅ Güncellendi';
        setTimeout(() => {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }, 1000);
    }

    // Dostik AI System
    setupDostikAI() {
        const dostikBtn = document.querySelector('button[style*="Ask Dostik"]');

        if (dostikBtn) {
            dostikBtn.addEventListener('click', () => {
                this.showDostikDialog();
            });
        }
    }

    showDostikDialog() {
        // Implementation kept from original - Dostik AI assistant
        console.log('[Admin Dashboard] Dostik AI Dialog');
    }

    dostikComment(section, action = null) {
        console.log(`[Admin Dashboard] Dostik comment for ${section}`);
    }

    // Theme Management
    setupTheme() {
        const savedTheme = localStorage.getItem('adminTheme') || 'light';
        this.applyTheme(savedTheme);
        this.createThemeToggle();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('adminTheme', theme);
    }

    createThemeToggle() {
        const header = document.querySelector('.admin-header .container');
        if (header && !document.querySelector('.theme-toggle')) {
            const themeToggle = document.createElement('button');
            themeToggle.className = 'theme-toggle';
            themeToggle.innerHTML = '🌙';

            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                this.applyTheme(newTheme);
                themeToggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
            });

            const notifications = document.querySelector('.admin-notifications');
            if (notifications) {
                notifications.parentNode.insertBefore(themeToggle, notifications);
            }
        }
    }

    // System Monitoring
    startSystemMonitoring() {
        // Keep monitoring from original for now
        // This could be enhanced with real backend metrics
    }
}

// CSS Animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-left-color: #10b981;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

/**
 * Display user information in header
 */
function displayUserInfo() {
    const user = AuthManager.getUser();
    if (user) {
        const nameElement = document.getElementById('adminName');
        const emailElement = document.getElementById('adminEmail');
        const avatarElement = document.getElementById('adminAvatar');

        if (nameElement) {
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Admin';
            nameElement.textContent = fullName;

            // Update avatar with user initials
            if (avatarElement) {
                const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
                avatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1a4a3a&color=fff&size=40`;
            }
        }

        if (emailElement) {
            emailElement.textContent = user.email || 'admin@example.com';
        }

        console.log('[Admin Dashboard] User info displayed:', user.email);
    }
}

/**
 * Setup logout button
 */
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();

            if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                console.log('[Admin Dashboard] User logging out...');

                // Call API logout if needed
                // await apiClient.logout();

                // Clear auth and redirect
                AuthManager.logout(false); // Don't auto-redirect yet

                // Redirect to login page
                window.location.href = 'login.html';
            }
        });

        // Add hover effect
        logoutBtn.addEventListener('mouseenter', () => {
            logoutBtn.style.background = 'rgba(220, 38, 38, 0.2)';
            logoutBtn.style.borderColor = 'rgba(220, 38, 38, 0.5)';
            logoutBtn.style.color = '#ff6b6b';
            logoutBtn.style.transform = 'translateY(-1px)';
        });

        logoutBtn.addEventListener('mouseleave', () => {
            logoutBtn.style.background = 'rgba(220, 38, 38, 0.1)';
            logoutBtn.style.borderColor = 'rgba(220, 38, 38, 0.3)';
            logoutBtn.style.color = '#fca5a5';
            logoutBtn.style.transform = 'translateY(0)';
        });

        console.log('[Admin Dashboard] Logout button configured');
    }
}

// ===========================================
// COMMISSIONS MANAGEMENT (Standalone Functions)
// ===========================================

async function loadCommissionsData() {
        try {
            console.log('[Admin Dashboard] Loading commissions...');

            // Get date range (last 30 days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            // Fetch summary
            const summaryRes = await fetch(
                `${apiClient.baseURL}/commissions/admin/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${apiClient.getToken()}`
                    }
                }
            );

            if (!summaryRes.ok) throw new Error('Failed to fetch summary');
            const summaryData = await summaryRes.json();

            // Fetch transactions
            const transactionsRes = await fetch(
                `${apiClient.baseURL}/commissions/admin/all?limit=50`,
                {
                    headers: {
                        'Authorization': `Bearer ${apiClient.getToken()}`
                    }
                }
            );

            if (!transactionsRes.ok) throw new Error('Failed to fetch transactions');
            const transactionsData = await transactionsRes.json();

            renderCommissionSummary(summaryData.data);
            renderCommissionTransactions(transactionsData.data);

        } catch (error) {
            console.error('[Admin Dashboard] Error loading commissions:', error);
            alert('❌ Komisyon verileri yüklenirken hata oluştu: ' + error.message);
        }
    }

function renderCommissionSummary(summary) {
        const container = document.getElementById('commission-summary');
        if (!container) return;

        const totalRevenue = parseFloat(summary.total_commission || 0).toFixed(2);
        const totalSales = parseFloat(summary.total_sales || 0).toFixed(2);
        const pendingPayments = parseFloat(summary.pending_payments || 0).toFixed(2);
        const paidToSellers = parseFloat(summary.total_paid_to_sellers || 0).toFixed(2);

        container.innerHTML = `
            <div class="admin-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
                <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.5rem;">💰 Platform Revenue</div>
                <div style="font-size: 2rem; font-weight: 800;">₺${totalRevenue}</div>
                <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;">Last 30 days</div>
            </div>
            <div class="admin-card" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;">
                <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.5rem;">📊 Total Sales</div>
                <div style="font-size: 2rem; font-weight: 800;">₺${totalSales}</div>
                <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;">${summary.transaction_count || 0} transactions</div>
            </div>
            <div class="admin-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;">
                <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.5rem;">⏳ Pending Payouts</div>
                <div style="font-size: 2rem; font-weight: 800;">₺${pendingPayments}</div>
                <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;">To be paid to sellers</div>
            </div>
            <div class="admin-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white;">
                <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.5rem;">✅ Paid to Sellers</div>
                <div style="font-size: 2rem; font-weight: 800;">₺${paidToSellers}</div>
                <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;">${summary.unique_stores || 0} stores</div>
            </div>
        `;
    }

function renderCommissionTransactions(transactions) {
        const container = document.getElementById('commission-transactions');
        if (!container) return;

        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Komisyon kaydı bulunmamaktadır.</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(16, 185, 129, 0.1); border-bottom: 2px solid var(--admin-border);">
                        <th style="padding: 1rem; text-align: left;">Order</th>
                        <th style="padding: 1rem; text-align: left;">Store</th>
                        <th style="padding: 1rem; text-align: right;">Order Total</th>
                        <th style="padding: 1rem; text-align: center;">Rate</th>
                        <th style="padding: 1rem; text-align: right;">Commission</th>
                        <th style="padding: 1rem; text-align: right;">Seller Amount</th>
                        <th style="padding: 1rem; text-align: center;">Status</th>
                        <th style="padding: 1rem; text-align: center;">Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        transactions.forEach(t => {
            const statusColors = {
                'calculated': '#3b82f6',
                'paid_to_seller': '#10b981',
                'refunded': '#dc2626',
                'cancelled': '#6b7280'
            };

            const statusLabels = {
                'calculated': 'Calculated',
                'paid_to_seller': 'Paid',
                'refunded': 'Refunded',
                'cancelled': 'Cancelled'
            };

            html += `
                <tr style="border-bottom: 1px solid var(--admin-border);">
                    <td style="padding: 1rem;">
                        <span style="font-family: monospace; font-size: 0.9rem;">${t.order?.order_number || 'N/A'}</span>
                    </td>
                    <td style="padding: 1rem;">
                        ${t.store?.name || 'Unknown Store'}
                    </td>
                    <td style="padding: 1rem; text-align: right; font-weight: 600;">
                        ₺${parseFloat(t.order_total).toFixed(2)}
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <span style="color: #10b981; font-weight: 600;">${t.commission_rate}%</span>
                    </td>
                    <td style="padding: 1rem; text-align: right; font-weight: 600; color: #10b981;">
                        ₺${parseFloat(t.commission_amount).toFixed(2)}
                    </td>
                    <td style="padding: 1rem; text-align: right;">
                        ₺${parseFloat(t.seller_amount).toFixed(2)}
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <span style="padding: 0.25rem 0.75rem; background: ${statusColors[t.status]}20; color: ${statusColors[t.status]}; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                            ${statusLabels[t.status] || t.status}
                        </span>
                    </td>
                    <td style="padding: 1rem; text-align: center; font-size: 0.85rem; opacity: 0.7;">
                        ${new Date(t.calculated_at).toLocaleDateString('tr-TR')}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

// ===========================================
// COUPON MANAGEMENT METHODS
// ===========================================

/**
 * Load coupons data from API
 */
async function loadCouponsData() {
        try {
            console.log('[Admin Dashboard] Loading coupons data...');

            // Fetch all coupons
            const response = await apiClient.get('/coupons');

            if (response.success && response.data) {
                const coupons = response.data;

                // Update stats
                const totalCoupons = coupons.length;
                const activeCoupons = coupons.filter(c => c.is_active).length;

                document.getElementById('totalCoupons').textContent = totalCoupons;
                document.getElementById('activeCoupons').textContent = activeCoupons;
                document.getElementById('totalSavings').textContent = '$0'; // TODO: Calculate from usage

                // Render coupons table
                renderCouponsTable(coupons);
            } else {
                throw new Error('Failed to load coupons');
            }

        } catch (error) {
            console.error('[Admin Dashboard] Error loading coupons:', error);
            const table = document.getElementById('coupons-table');
            if (table) {
                table.innerHTML = '<p style="text-align: center; padding: 2rem; color: #dc2626;">Error loading coupons: ' + error.message + '</p>';
            }
        }
    }

/**
 * Render coupons table
 */
function renderCouponsTable(coupons) {
        const container = document.getElementById('coupons-table');
        if (!container) return;

        if (!coupons || coupons.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">No coupons found. Create your first coupon!</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(139, 92, 246, 0.1); border-bottom: 2px solid var(--admin-border);">
                        <th style="padding: 1rem; text-align: left;">Code</th>
                        <th style="padding: 1rem; text-align: left;">Name</th>
                        <th style="padding: 1rem; text-align: center;">Type</th>
                        <th style="padding: 1rem; text-align: center;">Discount</th>
                        <th style="padding: 1rem; text-align: center;">Usage</th>
                        <th style="padding: 1rem; text-align: center;">Status</th>
                        <th style="padding: 1rem; text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        coupons.forEach(coupon => {
            const discountDisplay = coupon.discount_type === 'percentage'
                ? `${coupon.discount_value}%`
                : coupon.discount_type === 'fixed'
                ? `$${coupon.discount_value}`
                : 'Free Shipping';

            const usageDisplay = coupon.usage_limit
                ? `${coupon.times_used || 0} / ${coupon.usage_limit}`
                : `${coupon.times_used || 0} / ∞`;

            const statusColor = coupon.is_active ? '#10b981' : '#6b7280';
            const statusLabel = coupon.is_active ? 'Active' : 'Inactive';

            html += `
                <tr style="border-bottom: 1px solid var(--admin-border);">
                    <td style="padding: 1rem;">
                        <span style="font-family: monospace; font-weight: 600; background: rgba(139, 92, 246, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px;">
                            ${coupon.code}
                        </span>
                    </td>
                    <td style="padding: 1rem;">
                        <div style="font-weight: 600;">${coupon.name}</div>
                        <div style="font-size: 0.85rem; opacity: 0.7;">${coupon.description || ''}</div>
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <span style="text-transform: capitalize; background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem;">
                            ${coupon.discount_type.replace('_', ' ')}
                        </span>
                    </td>
                    <td style="padding: 1rem; text-align: center; font-weight: 600; color: #8b5cf6;">
                        ${discountDisplay}
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        ${usageDisplay}
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <span style="padding: 0.25rem 0.75rem; background: ${statusColor}20; color: ${statusColor}; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                            ${statusLabel}
                        </span>
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <button onclick="adminDashboard.toggleCouponStatus('${coupon.id}', ${!coupon.is_active})"
                                style="background: ${coupon.is_active ? '#dc2626' : '#10b981'}; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; margin-right: 0.5rem; font-size: 0.85rem;">
                            $\{coupon\.is_active\ \?\ 'Disable'\ :\ 'Approve'}
                        </button>
                        <button onclick="adminDashboard.deleteCoupon('${coupon.id}', '${coupon.code}')"
                                style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

/**
 * Toggle coupon active status
 */
async function toggleCouponStatus(couponId, newStatus) {
        try {
            const response = await apiClient.patch(`/coupons/${couponId}`, {
                is_active: newStatus
            });

            if (response.success) {
                alert(`✅ Coupon ${newStatus ? 'activated' : 'deactivated'} successfully!`);
                loadCouponsData();
            } else {
                throw new Error(response.message || 'Failed to update coupon');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error toggling coupon status:', error);
            alert('❌ Error: ' + error.message);
        }
    }

/**
 * Delete coupon
 */
async function deleteCoupon(couponId, couponCode) {
        if (!confirm(`Are you sure you want to delete coupon "${couponCode}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await apiClient.delete(`/coupons/${couponId}`);

            if (response.success) {
                alert('✅ Coupon deleted successfully!');
                loadCouponsData();
            } else {
                throw new Error(response.message || 'Failed to delete coupon');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error deleting coupon:', error);
            alert('❌ Error: ' + error.message);
        }
    }

/**
 * Setup coupon modal handlers
 */
function setupCouponModal() {
        const addBtn = document.getElementById('addCouponBtn');
        const modal = document.getElementById('couponModal');
        const closeBtn = document.getElementById('closeCouponModal');
        const cancelBtn = document.getElementById('cancelCouponBtn');
        const form = document.getElementById('couponForm');
        const discountType = document.getElementById('discountType');

        if (!addBtn || !modal || !closeBtn || !form) {
            console.log('[Admin Dashboard] Coupon modal elements not found');
            return;
        }

        // Expose coupon helpers on dashboard instance for inline handlers
        // These will be bound after instance creation as well
        window.adminDashboard = window.adminDashboard || {};
        window.adminDashboard.toggleCouponStatus = window.adminDashboard.toggleCouponStatus || toggleCouponStatus;
        window.adminDashboard.deleteCoupon = window.adminDashboard.deleteCoupon || deleteCoupon;
        window.adminDashboard.approveCoupon = window.adminDashboard.approveCoupon || approveCoupon;
        window.adminDashboard.rejectCoupon = window.adminDashboard.rejectCoupon || rejectCoupon;

        // Open modal
        addBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            form.reset();
            document.getElementById('isActive').checked = true;
            updateDiscountFields();
        });

        // Close modal
        const closeModal = () => {
            modal.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Update fields when discount type changes
        discountType.addEventListener('change', () => {
            updateDiscountFields();
        });

        // Form submit
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createCoupon();
        });
    }

/**
 * Update discount fields based on type
 */
function updateDiscountFields() {
        const discountType = document.getElementById('discountType').value;
        const discountValueDiv = document.getElementById('discountValueDiv');
        const maxDiscountDiv = document.getElementById('maxDiscountDiv');

        if (discountType === 'free_shipping') {
            // Hide discount value for free shipping
            discountValueDiv.style.display = 'none';
            maxDiscountDiv.style.display = 'none';
        } else {
            discountValueDiv.style.display = 'block';
            // Only show max discount for percentage
            maxDiscountDiv.style.display = discountType === 'percentage' ? 'block' : 'none';
        }
    }

/**
 * Create new coupon
 */
async function createCoupon() {
        try {
            // Collect form data
            const couponData = {
                code: document.getElementById('couponCode').value.trim().toUpperCase(),
                name: document.getElementById('couponName').value.trim(),
                description: document.getElementById('couponDescription').value.trim() || undefined,
                discount_type: document.getElementById('discountType').value,
                discount_value: parseFloat(document.getElementById('discountValue').value) || 0,
                min_order_amount: parseFloat(document.getElementById('minOrderAmount').value) || 0,
                max_discount_amount: parseFloat(document.getElementById('maxDiscount').value) || null,
                usage_limit: parseInt(document.getElementById('usageLimit').value) || null,
                usage_limit_per_user: parseInt(document.getElementById('perUserLimit').value) || 1,
                first_order_only: document.getElementById('firstOrderOnly').checked,
                is_active: document.getElementById('isActive').checked,
                notes: document.getElementById('couponNotes').value.trim() || undefined
            };

            // Handle dates
            const validFrom = document.getElementById('validFrom').value;
            const validUntil = document.getElementById('validUntil').value;

            if (validFrom) {
                couponData.valid_from = new Date(validFrom).toISOString();
            }

            if (validUntil) {
                couponData.valid_until = new Date(validUntil).toISOString();
            }

            // For free shipping, set discount_value to 0
            if (couponData.discount_type === 'free_shipping') {
                couponData.discount_value = 0;
            }

            console.log('[Admin Dashboard] Creating coupon:', couponData);

            const response = await apiClient.post('/coupons', couponData);

            if (response.success) {
                alert('✅ Coupon created successfully!');
                document.getElementById('couponModal').style.display = 'none';
                loadCouponsData();
            } else {
                throw new Error(response.message || 'Failed to create coupon');
            }

        } catch (error) {
            console.error('[Admin Dashboard] Error creating coupon:', error);
            alert('❌ Error creating coupon: ' + error.message);
        }
    }

function editCategoryCommission(categoryId, categoryName, currentRate) {
        const rate = prompt(
            `${categoryName} kategorisi için komisyon oranı girin (%)\n\n` +
            `Mevcut: ${currentRate !== null ? currentRate + '%' : 'Global (15%)'}\n\n` +
            `Not: Boş bırakırsanız global oran (15%) kullanılır.`,
            currentRate || ''
        );

        // User cancelled
        if (rate === null) return;

        // Validate
        const rateNumber = rate.trim() === '' ? null : parseFloat(rate);
        
        if (rateNumber !== null && (isNaN(rateNumber) || rateNumber < 0 || rateNumber > 100)) {
            alert('Lütfen 0-100 arasında geçerli bir oran girin.');
            return;
        }

        updateCategoryCommission(categoryId, categoryName, rateNumber);
    }

async function updateCategoryCommission(categoryId, categoryName, rate) {
        try {
            console.log(`[Admin] Updating commission for ${categoryName}:`, rate);

            const response = await fetch(`${apiClient.baseURL}/categories/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiClient.getToken()}`,
                },
                body: JSON.stringify({ commission_rate: rate })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const result = await response.json();
            console.log('[Admin] Commission updated:', result);

            const rateDisplay = rate !== null ? `${rate}%` : 'Global (15%)';
            alert(`✅ ${categoryName} komisyonu güncellendi: ${rateDisplay}`);

            // Refresh categories table
            // Note: This needs to be called from AdminDashboard instance
            // For now, just reload the page section
            window.location.reload();

        } catch (error) {
            console.error('[Admin] Error updating commission:', error);
            alert('❌ Komisyon güncellenirken hata oluştu: ' + error.message);
        }
    }

// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Admin Dashboard] DOM Content Loaded');

    // Wait for API client to be available
    if (typeof apiClient === 'undefined') {
        console.error('[Admin Dashboard] API Client not loaded! Make sure api-client.js is loaded first.');
        return;
    }

    // Display user information
    displayUserInfo();

    // Setup logout
    setupLogout();

    const dashboard = new AdminDashboard();
    window.adminDashboard = dashboard;

    console.log('[Admin Dashboard] Dashboard initialized and ready');
});

/**
 * Approve coupon (activate)
 */
async function approveCoupon(couponId) {
        try {
            const response = await apiClient.patch(`/coupons/${couponId}/approve`, {});
            if (response.success) {
                alert('? Coupon approved successfully!');
                loadCouponsData();
            } else {
                throw new Error(response.message || 'Failed to approve coupon');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error approving coupon:', error);
            alert('?? Error: ' + error.message);
        }
}

/**
 * Returns: load stores, then list returns for selected store
 */
async function loadReturnsData() {
    try {
        const storeSelect = document.getElementById('returnsStoreSelect');
        const statusSelect = document.getElementById('returnsStatusFilter');
        const table = document.getElementById('returns-table');

        if (!table) return;

        // Populate stores once
        if (storeSelect && storeSelect.options.length <= 1) {
            const storesRes = await apiClient.getStores({ status: 'approved', limit: 1000 });
            if (storesRes?.data) {
                storesRes.data.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = s.name;
                    storeSelect.appendChild(opt);
                });
            }
        }

        const storeId = storeSelect ? storeSelect.value : '';
        const status = statusSelect ? statusSelect.value : '';

        if (!storeId) {
            table.innerHTML = '<p style="text-align:center; padding:2rem; opacity:0.7;">Select a store to view returns.</p>';
            return;
        }

        table.innerHTML = '<div style="text-align:center; padding:2rem;"><div class="spinner"></div><p>Loading returns...</p></div>';

        const query = {};
        if (status) query.status = status;
        const res = await apiClient.get(`/returns/stores/${storeId}`, query);

        if (res.success) {
            renderReturnsTable(res.data || []);
        } else {
            throw new Error(res.message || 'Failed to load returns');
        }
    } catch (e) {
        const table = document.getElementById('returns-table');
        if (table) table.innerHTML = `<p style="text-align:center; color:#dc2626; padding:2rem;">${e.message}</p>`;
    }
}

function renderReturnsTable(returnsList) {
    const container = document.getElementById('returns-table');
    if (!container) return;

    if (!returnsList || returnsList.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:2rem; opacity:0.7;">No returns found for selected filters.</p>';
        return;
    }

    let html = `
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr style="background: rgba(16,185,129,0.1); border-bottom: 2px solid var(--admin-border);">
          <th style="padding:0.75rem; text-align:left;">Return #</th>
          <th style="padding:0.75rem; text-align:left;">Order</th>
          <th style="padding:0.75rem; text-align:left;">Customer</th>
          <th style="padding:0.75rem; text-align:center;">Status</th>
          <th style="padding:0.75rem; text-align:right;">Amount</th>
          <th style="padding:0.75rem; text-align:center;">Actions</th>
        </tr>
      </thead>
      <tbody>
    `;

    returnsList.forEach(r => {
        const statusColors = { pending:'#f59e0b', approved:'#10b981', items_received:'#3b82f6', refund_processed:'#8b5cf6', completed:'#10b981', rejected:'#dc2626', cancelled:'#6b7280' };
        const color = statusColors[r.status] || '#64748b';
        html += `
          <tr style="border-bottom:1px solid var(--admin-border);">
            <td style="padding:0.75rem; font-weight:600;">${r.return_number || r.id.slice(0,8)}</td>
            <td style="padding:0.75rem;">${r.order?.order_number || r.order_id}</td>
            <td style="padding:0.75rem;">${r.customer ? (r.customer.first_name || '') + ' ' + (r.customer.last_name || '') : '-'}</td>
            <td style="padding:0.75rem; text-align:center;"><span style="padding:0.25rem 0.6rem; border-radius:12px; color:${color}; background:${color}20; font-size:0.8rem; font-weight:600; text-transform:capitalize;">${r.status.replace('_',' ')}</span></td>
            <td style="padding:0.75rem; text-align:right; font-weight:700; color:#8b5cf6;">$${Number(r.refund_amount || 0).toFixed(2)}</td>
            <td style="padding:0.75rem; text-align:center;">
              ${r.status==='pending' ? `<button onclick="window.adminDashboard.updateReturnStatus('${r.id}','approved')" style="background:#10b981;color:#fff;border:none;padding:0.4rem 0.7rem;border-radius:6px;cursor:pointer;margin-right:6px;">Approve</button>
              <button onclick="window.adminDashboard.rejectReturn('${r.id}')" style="background:#f59e0b;color:#fff;border:none;padding:0.4rem 0.7rem;border-radius:6px;cursor:pointer;">Reject</button>` : ''}
              ${r.status==='approved' ? `<button onclick="window.adminDashboard.updateReturnStatus('${r.id}','items_received')" style="background:#3b82f6;color:#fff;border:none;padding:0.4rem 0.7rem;border-radius:6px;cursor:pointer;">Items Received</button>` : ''}
              ${r.status==='items_received' ? `<button onclick="window.adminDashboard.updateReturnStatus('${r.id}','refund_processed')" style="background:#8b5cf6;color:#fff;border:none;padding:0.4rem 0.7rem;border-radius:6px;cursor:pointer;">Refund Processed</button>` : ''}
              ${r.status==='refund_processed' ? `<button onclick="window.adminDashboard.updateReturnStatus('${r.id}','completed')" style="background:#10b981;color:#fff;border:none;padding:0.4rem 0.7rem;border-radius:6px;cursor:pointer;">Complete</button>` : ''}
            </td>
          </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function updateReturnStatus(returnId, status) {
    try {
        const payload = { status };
        const res = await apiClient.patch(`/returns/${returnId}/status`, payload);
        if (res.success) {
            alert('✅ Status updated');
            loadReturnsData();
        } else {
            throw new Error(res.message || 'Failed to update status');
        }
    } catch (e) {
        alert('⚠️ ' + e.message);
    }
}

async function rejectReturn(returnId) {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return;
    try {
        const res = await apiClient.patch(`/returns/${returnId}/status`, { status: 'rejected', store_response: reason || undefined });
        if (res.success) {
            alert('✅ Return rejected');
            loadReturnsData();
        } else {
            throw new Error(res.message || 'Failed to reject');
        }
    } catch (e) {
        alert('⚠️ ' + e.message);
    }
}

// Wire up filters
document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('returnsStoreSelect');
    const stat = document.getElementById('returnsStatusFilter');
    const btn = document.getElementById('returnsRefreshBtn');
    if (sel) sel.addEventListener('change', () => loadReturnsData());
    if (stat) stat.addEventListener('change', () => loadReturnsData());
    if (btn) btn.addEventListener('click', () => loadReturnsData());

    // Expose helpers for inline buttons
    window.adminDashboard = window.adminDashboard || {};
    window.adminDashboard.updateReturnStatus = updateReturnStatus;
    window.adminDashboard.rejectReturn = rejectReturn;
});

/**
 * Reject coupon (deactivate with reason)
 */
async function rejectCoupon(couponId) {
        const reason = prompt('Enter rejection reason (optional):');
        try {
            const response = await apiClient.patch(`/coupons/${couponId}/reject`, { reason: reason || undefined });
            if (response.success) {
                alert('? Coupon rejected successfully!');
                loadCouponsData();
            } else {
                throw new Error(response.message || 'Failed to reject coupon');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error rejecting coupon:', error);
            alert('?? Error: ' + error.message);
        }
}

/**
 * Override: toggle using approve/disable endpoints
 */
async function toggleCouponStatus(couponId, newStatus) {
        try {
            let response;
            if (newStatus) {
                response = await apiClient.patch(`/coupons/${couponId}/approve`, {});
            } else {
                response = await apiClient.patch(`/coupons/${couponId}/disable`, {});
            }

            if (response.success) {
                alert(`? Coupon ${newStatus ? 'approved' : 'disabled'} successfully!`);
                loadCouponsData();
            } else {
                throw new Error(response.message || 'Failed to update coupon');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error toggling coupon status:', error);
            alert('?? Error: ' + error.message);
        }
}

