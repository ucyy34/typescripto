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

        this.storeFilters = {
            page: 1,
            limit: 10,
            status: 'pending',
        };
        this.storePagination = null;

        // Check authentication before initializing
        if (!AuthManager.checkAdminAuth()) {
            console.warn('[Admin Dashboard] Authentication failed, redirecting to login');
            // Redirect to admin login page
            window.location.href = 'login.html';
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
            const [storesResult, productsResult, ordersResult, pendingStoresCount, pendingProductsCount] = await Promise.all([
                this.api.getStores({ limit: 1 }),
                this.api.getProducts({ limit: 1 }),
                this.api.getAllOrders({ limit: 1 }),
                this.api.getPendingStoresCount(),
                this.api.getPendingProductsCount()
            ]);

            console.log('[Admin Dashboard] API responses:', { storesResult, productsResult, ordersResult, pendingStoresCount, pendingProductsCount });

            const extractTotal = (result, label) => {
                if (result?.success) {
                    return Number(result.pagination?.total ?? (Array.isArray(result.data) ? result.data.length : 0)) || 0;
                }

                console.warn(`[Admin Dashboard] ${label} response was not successful`, result);
                return 0;
            };

            // Update real-time data
            this.realTimeData.stores = extractTotal(storesResult, 'Stores');
            this.realTimeData.products = extractTotal(productsResult, 'Products');
            this.realTimeData.orders = extractTotal(ordersResult, 'Orders');

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
     * Load Shipping Support Data
     */
    async loadShippingSupportData() {
        try {
            // Listener Setup (One time)
            if (!this.shippingListenersSetup) {
                const form = document.getElementById('shippingRuleForm');
                if (form) {
                    const newForm = form.cloneNode(true);
                    form.parentNode.replaceChild(newForm, form);
                    newForm.addEventListener('submit', (e) => this.handleShippingRuleSubmit(e));
                }

                // Save default shipping cost button
                const saveDefaultBtn = document.getElementById('saveDefaultShippingBtn');
                if (saveDefaultBtn) {
                    saveDefaultBtn.onclick = () => this.saveDefaultShippingCost();
                }

                this.shippingListenersSetup = true;
            }

            // Load default cost
            const defaultRes = await this.api.request('/shipping-support/default');
            if (defaultRes.success) {
                document.getElementById('defaultShippingCost').value = defaultRes.data.defaultCost;

                // Also update store charge percentage if present
                if (defaultRes.data.storeChargePercentage !== undefined) {
                    const slider = document.getElementById('storeShippingChargePercentage');
                    const display = document.getElementById('storeChargePercentageValue');
                    if (slider) {
                        slider.value = defaultRes.data.storeChargePercentage;
                    }
                    if (display) {
                        display.textContent = `%${defaultRes.data.storeChargePercentage}`;
                    }
                }

                // Also update max shipping cap if present
                if (defaultRes.data.maxShippingCap !== undefined) {
                    const capInput = document.getElementById('maxShippingCap');
                    if (capInput) {
                        capInput.value = defaultRes.data.maxShippingCap;
                    }
                }
            }

            // Setup store charge percentage slider
            const chargeSlider = document.getElementById('storeShippingChargePercentage');
            const chargeDisplay = document.getElementById('storeChargePercentageValue');
            if (chargeSlider && chargeDisplay) {
                chargeSlider.oninput = () => {
                    chargeDisplay.textContent = `%${chargeSlider.value}`;
                };
            }

            // Setup save store charge button
            const saveChargeBtn = document.getElementById('saveStoreChargeBtn');
            if (saveChargeBtn) {
                saveChargeBtn.onclick = () => this.saveStoreChargePercentage();
            }

            // Setup save max cap button
            const saveMaxCapBtn = document.getElementById('saveMaxCapBtn');
            if (saveMaxCapBtn) {
                saveMaxCapBtn.onclick = () => this.saveMaxShippingCap();
            }

            // Load rules
            const rulesRes = await this.api.request('/shipping-support/admin/rules', { method: 'GET' });
            if (rulesRes.success) {
                this.shippingRules = rulesRes.data.rules;
                this.renderShippingRules(rulesRes.data.rules);
            }

            // Load report (current month)
            const date = new Date();
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

            const reportRes = await this.api.request('/shipping-support/report', {
                method: 'GET',
                params: { startDate: firstDay, endDate: lastDay }
            });
            if (reportRes.success) {
                this.updateShippingReport(reportRes.data);
            }

            this.dostikComment('shipping-support');
        } catch (error) {
            console.error('Failed to load shipping support data:', error);
            this.showNotification('Kargo verileri yüklenirken hata oluştu', 'error');
        }
    }

    renderShippingRules(rules) {
        const listEl = document.getElementById('shippingRulesList');
        if (!rules || rules.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 3rem; opacity: 0.5;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                    Henüz tanımlanmış kural yok.
                </div>
            `;
            return;
        }

        listEl.innerHTML = rules.map(rule => `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; opacity: ${rule.is_active ? 1 : 0.6};">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <span style="font-weight: 600; font-size: 1.1rem;">${rule.name}</span>
                        ${!rule.is_active ? '<span style="background: #e2e8f0; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px;">Pasif</span>' : ''}
                        <span style="background: #eff6ff; color: #3b82f6; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px;">Öncelik: ${rule.priority}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: #64748b;">
                        Koşul: ${this.getRuleConditionLabel(rule)} • 
                        Platform Katkısı: <span style="color: #10b981; font-weight: 600;">%${rule.platform_contribution}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="window.adminDashboard.editShippingRule('${rule.id}')" style="background: none; border: none; cursor: pointer; font-size: 1.2rem;" title="Düzenle">✏️</button>
                    <button onclick="window.adminDashboard.deleteShippingRule('${rule.id}')" style="background: none; border: none; cursor: pointer; font-size: 1.2rem;" title="Sil">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    getRuleConditionLabel(rule) {
        switch (rule.condition_type) {
            case 'cart_total': return `Sepet > ₺${rule.threshold_amount}`;
            case 'multi_store': return 'Çoklu Mağaza';
            case 'first_order': return 'İlk Sipariş';
            case 'campaign': return 'Kampanya';
            default: return rule.condition_type;
        }
    }

    updateShippingReport(data) {
        document.getElementById('shippingReportOrderCount').textContent = data.orderCount;
        document.getElementById('shippingReportActualCost').textContent = '₺' + data.totalActualCost;
        document.getElementById('shippingReportCustomerPaid').textContent = '₺' + data.totalCustomerPaid;
        document.getElementById('shippingReportPlatformCovered').textContent = '₺' + data.totalPlatformCovered;
    }

    async editShippingRule(id) {
        const rule = this.shippingRules?.find(r => r.id === id);
        if (!rule) return;

        document.getElementById('shippingRuleId').value = rule.id;
        document.getElementById('ruleName').value = rule.name;
        document.getElementById('ruleCondition').value = rule.condition_type;
        document.getElementById('ruleAmount').value = rule.threshold_amount || '';
        document.getElementById('ruleContribution').value = rule.platform_contribution;
        document.getElementById('rulePriority').value = rule.priority;
        document.getElementById('ruleScope').value = rule.scope;
        document.getElementById('ruleActive').checked = rule.is_active;

        document.getElementById('shippingRuleModal').style.display = 'flex';
    }

    async handleShippingRuleSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('shippingRuleId').value;
        const data = {
            name: document.getElementById('ruleName').value,
            condition_type: document.getElementById('ruleCondition').value,
            threshold_amount: document.getElementById('ruleAmount').value || 0,
            platform_contribution: document.getElementById('ruleContribution').value,
            priority: document.getElementById('rulePriority').value,
            scope: document.getElementById('ruleScope').value,
            is_active: document.getElementById('ruleActive').checked
        };

        try {
            let result;
            const endpoint = id ? `/shipping-support/admin/rules/${id}` : '/shipping-support/admin/rules';
            const method = id ? 'PUT' : 'POST';

            result = await this.api.request(endpoint, { method, data });

            if (result.success) {
                this.showNotification(`Kural ${id ? 'güncellendi' : 'oluşturuldu'}`, 'success');
                document.getElementById('shippingRuleModal').style.display = 'none';
                document.getElementById('shippingRuleForm').reset();
                this.loadShippingSupportData();
            }
        } catch (error) {
            console.error(error);
            this.showNotification('İşlem başarısız', 'error');
        }
    }

    async deleteShippingRule(id) {
        if (!confirm('Bu kuralı silmek istediğinizden emin misiniz?')) return;

        try {
            const result = await this.api.request(`/shipping-support/admin/rules/${id}`, { method: 'DELETE' });
            if (result.success) {
                this.showNotification('Kural silindi', 'success');
                this.loadShippingSupportData();
            }
        } catch (error) {
            console.error(error);
            this.showNotification('Kural silinemedi', 'error');
        }
    }

    async saveDefaultShippingCost() {
        const costInput = document.getElementById('defaultShippingCost');
        const cost = parseFloat(costInput?.value);

        if (isNaN(cost) || cost < 0) {
            this.showNotification('Geçerli bir kargo maliyeti girin', 'error');
            return;
        }

        try {
            const result = await this.api.request('/shipping-support/default', {
                method: 'PUT',
                data: { defaultCost: cost }
            });

            if (result.success) {
                this.showNotification('Varsayılan kargo maliyeti güncellendi: ₺' + cost.toFixed(2), 'success');
            } else {
                this.showNotification('Güncelleme başarısız: ' + (result.message || 'Bilinmeyen hata'), 'error');
            }
        } catch (error) {
            console.error('Failed to save default shipping cost:', error);
            this.showNotification('Güncelleme başarısız: ' + error.message, 'error');
        }
    }

    async saveStoreChargePercentage() {
        const slider = document.getElementById('storeShippingChargePercentage');
        const percentage = parseInt(slider?.value) || 50;

        if (percentage < 0 || percentage > 100) {
            this.showNotification('Oran %0-100 arasında olmalı', 'error');
            return;
        }

        try {
            const result = await this.api.request('/shipping-support/admin/store-charge', {
                method: 'PUT',
                data: { percentage }
            });

            if (result.success) {
                this.showNotification(`Mağaza yansıtma oranı güncellendi: %${percentage}`, 'success');
            } else {
                this.showNotification('Güncelleme başarısız: ' + (result.message || 'Bilinmeyen hata'), 'error');
            }
        } catch (error) {
            console.error('Failed to save store charge percentage:', error);
            this.showNotification('Güncelleme başarısız: ' + error.message, 'error');
        }
    }

    async saveMaxShippingCap() {
        const input = document.getElementById('maxShippingCap');
        const cap = parseFloat(input?.value) || 0;

        if (cap < 0) {
            this.showNotification('Tavan negatif olamaz', 'error');
            return;
        }

        try {
            const result = await this.api.request('/shipping-support/admin/max-cap', {
                method: 'PUT',
                data: { cap }
            });

            if (result.success) {
                if (cap === 0) {
                    this.showNotification('Kargo tavanı kaldırıldı (sınırsız)', 'success');
                } else {
                    this.showNotification(`Maksimum kargo tavanı: ₺${cap}`, 'success');
                }
            } else {
                this.showNotification('Güncelleme başarısız: ' + (result.message || 'Bilinmeyen hata'), 'error');
            }
        } catch (error) {
            console.error('Failed to save max shipping cap:', error);
            this.showNotification('Güncelleme başarısız: ' + error.message, 'error');
        }
    }

    /**
     * Load pending stores
     */
    async loadVendorsData() {
        try {
            console.log('[Admin Dashboard] Loading vendors data...');
            this.showLoading('stores-table');

            const params = {
                page: this.storeFilters.page,
                limit: this.storeFilters.limit,
            };

            if (this.storeFilters.status && this.storeFilters.status !== 'all') {
                params.status = this.storeFilters.status;
            }

            const result = await this.api.getStores(params);
            console.log('[Admin Dashboard] Vendors API result:', result);

            if (!result?.success || !Array.isArray(result.data)) {
                console.warn('[Admin Dashboard] Vendors data request failed', result);

                const tableContainer = document.getElementById('stores-table');
                if (tableContainer) {
                    const errorMessage = result?.message ? `: ${result.message}` : '';
                    tableContainer.innerHTML = `<p style="text-align: center; padding: 2rem; opacity: 0.7;">Mağaza verileri yüklenemedi${errorMessage}</p>`;
                }

                this.storePagination = {
                    page: this.storeFilters.page,
                    limit: this.storeFilters.limit,
                    total: 0,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: this.storeFilters.page > 1,
                };

                this.hideLoading('stores-table');
                return;
            }

            const pagination = {
                page: Number(result.pagination?.page) || this.storeFilters.page,
                limit: Number(result.pagination?.limit) || this.storeFilters.limit,
                total: Number(result.pagination?.total ?? result.data.length) || 0,
                totalPages: Number(result.pagination?.totalPages) || Math.max(1, Math.ceil((Number(result.pagination?.total ?? result.data.length) || 0) / (Number(result.pagination?.limit) || this.storeFilters.limit))),
                hasNext: Boolean(result.pagination?.hasNext),
                hasPrev: Boolean(result.pagination?.hasPrev),
            };

            this.storeFilters.page = pagination.page;
            this.storeFilters.limit = pagination.limit;
            this.storePagination = pagination;

            console.log('[Admin Dashboard] Rendering vendors table, count:', result.data.length, 'pagination:', pagination);
            this.renderStoresTable(result.data, pagination);

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
    renderStoresTable(stores, pagination = {}) {
        const tableContainer = document.getElementById('stores-table');
        if (!tableContainer) {
            console.error('[Admin Dashboard] stores-table container not found');
            return;
        }

        const currentPage = Number(pagination.page) || this.storeFilters.page || 1;
        const totalPages = Math.max(1, Number(pagination.totalPages) || 1);
        const hasPrev = Boolean(pagination.hasPrev);
        const hasNext = Boolean(pagination.hasNext);
        const selectedStatus = this.storeFilters.status || 'all';

        const statusOptions = [
            { value: 'all', label: 'Tümü' },
            { value: 'pending', label: 'Bekleyen' },
            { value: 'approved', label: 'Onaylanan' },
            { value: 'rejected', label: 'Reddedilen' },
            { value: 'suspended', label: 'Askıya Alınan' },
        ];

        const controlsHtml = `
            <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label for="store-status-filter" style="font-weight: 600; font-size: 0.85rem; color: var(--admin-text-secondary, #64748b);">Durum:</label>
                    <select id="store-status-filter" style="padding: 0.4rem 0.75rem; border: 1px solid var(--admin-border); border-radius: 6px; background: #fff; min-width: 160px;">
                        ${statusOptions.map(option => `<option value="${option.value}" ${option.value === selectedStatus ? 'selected' : ''}>${option.label}</option>`).join('')}
                    </select>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 0.85rem; opacity: 0.75;">Sayfa ${currentPage} / ${totalPages}</span>
                    <div style="display: flex; gap: 0.5rem;">
                        <button id="stores-page-prev" ${hasPrev ? '' : 'disabled'} style="padding: 0.4rem 0.9rem; border: 1px solid var(--admin-border); background: ${hasPrev ? '#fff' : 'rgba(148, 163, 184, 0.2)'}; color: ${hasPrev ? 'var(--admin-primary)' : '#94a3b8'}; border-radius: 6px; cursor: ${hasPrev ? 'pointer' : 'not-allowed'}; font-weight: 600;">Önceki</button>
                        <button id="stores-page-next" ${hasNext ? '' : 'disabled'} style="padding: 0.4rem 0.9rem; border: 1px solid var(--admin-border); background: ${hasNext ? '#fff' : 'rgba(148, 163, 184, 0.2)'}; color: ${hasNext ? 'var(--admin-primary)' : '#94a3b8'}; border-radius: 6px; cursor: ${hasNext ? 'pointer' : 'not-allowed'}; font-weight: 600;">Sonraki</button>
                    </div>
                </div>
            </div>
        `;

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
                                <option value=\"none\" ${(store.settings?.return_shipping_policy === 'none') ? 'selected' : ''}>None</option>
                                <option value=\"pro_rata\" ${(store.settings?.return_shipping_policy === 'pro_rata') ? 'selected' : ''}>Pro-rata</option>
                                <option value=\"full\" ${(store.settings?.return_shipping_policy === 'full') ? 'selected' : ''}>Full</option>
                              </select>
                            </label>
                            <label>Tax
                              <select data-store-id=\"${store.id}\" class=\"rt-tax\" style=\"width:100%; padding:0.4rem; border:1px solid var(--admin-border); border-radius:6px;\">
                                <option value=\"none\" ${(store.settings?.tax_refund_policy === 'none') ? 'selected' : ''}>None</option>
                                <option value=\"pro_rata\" ${(store.settings?.tax_refund_policy === 'pro_rata') ? 'selected' : ''}>Pro-rata</option>
                                <option value=\"full\" ${(store.settings?.tax_refund_policy === 'full') ? 'selected' : ''}>Full</option>
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
        const contentHtml = stores && stores.length > 0
            ? html
            : '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Seçili filtre için mağaza bulunamadı.</p>';

        tableContainer.innerHTML = controlsHtml + contentHtml;
        this.attachStoreTableControls();
    }

    attachStoreTableControls() {
        const statusSelect = document.getElementById('store-status-filter');
        if (statusSelect) {
            statusSelect.value = this.storeFilters.status || 'all';
            statusSelect.onchange = async (event) => {
                const newStatus = event.target.value;
                this.storeFilters.status = newStatus === 'all' ? null : newStatus;
                this.storeFilters.page = 1;

                try {
                    await this.loadVendorsData();
                } catch (error) {
                    console.error('[Admin Dashboard] Error reloading vendors after status change:', error);
                }
            };
        }

        const prevButton = document.getElementById('stores-page-prev');
        if (prevButton) {
            prevButton.onclick = async () => {
                if (!this.storePagination?.hasPrev) {
                    return;
                }

                const targetPage = Math.max(1, (this.storePagination.page || 1) - 1);
                if (targetPage === this.storeFilters.page) {
                    return;
                }

                this.storeFilters.page = targetPage;

                try {
                    await this.loadVendorsData();
                } catch (error) {
                    console.error('[Admin Dashboard] Error loading previous vendors page:', error);
                }
            };
        }

        const nextButton = document.getElementById('stores-page-next');
        if (nextButton) {
            nextButton.onclick = async () => {
                if (!this.storePagination?.hasNext) {
                    return;
                }

                const targetPage = (this.storePagination.page || 1) + 1;
                this.storeFilters.page = targetPage;

                try {
                    await this.loadVendorsData();
                } catch (error) {
                    console.error('[Admin Dashboard] Error loading next vendors page:', error);
                }
            };
        }
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
        const reason = prompt('Reddetme sebebini girin (zorunlu):');
        if (!reason || reason.trim().length === 0) {
            this.showError('Reddetme sebebi boş olamaz!');
            return;
        }

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

    // ===========================================
    // CAMPAIGN METHODS
    // ===========================================

    async loadCampaignsData() {
        const pendingContainerId = 'pending-campaigns-list';
        const allContainerId = 'all-campaigns-list';

        try {
            console.log('[Admin Dashboard] Loading campaigns for review...');
            this.showLoading(pendingContainerId);
            this.showLoading(allContainerId);

            const [pendingResponse, allResponse] = await Promise.all([
                this.api.getCampaigns({ approval_status: 'pending', limit: 50, sort_by: 'created_at', sort_order: 'desc' }),
                this.api.getCampaigns({ limit: 50, sort_by: 'created_at', sort_order: 'desc' })
            ]);

            this.renderPendingCampaigns(pendingResponse.success ? pendingResponse.data : []);
            this.renderAllCampaigns(allResponse.success ? allResponse.data : []);

            console.log('[Admin Dashboard] Campaign data loaded');
        } catch (error) {
            console.error('[Admin Dashboard] Error loading campaigns:', error);
            const pendingContainer = document.getElementById(pendingContainerId);
            const allContainer = document.getElementById(allContainerId);
            const errorHtml = `
                <div style="text-align: center; padding: 2rem; color: #dc2626;">
                    <p>⚠️ Kampanyalar yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>
                    <button onclick="window.adminDashboard.loadCampaignsData()"
                            style="background: var(--admin-primary); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                        Tekrar Dene
                    </button>
                </div>`;
            if (pendingContainer) pendingContainer.innerHTML = errorHtml;
            if (allContainer) allContainer.innerHTML = errorHtml;
        }
    }

    renderPendingCampaigns(campaigns = []) {
        const container = document.getElementById('pending-campaigns-list');
        if (!container) {
            console.error('[Admin Dashboard] pending-campaigns-list container not found');
            return;
        }

        if (!campaigns || campaigns.length === 0) {
            container.innerHTML = '<p style="padding: 1.5rem; opacity: 0.7;">Bekleyen kampanya bulunmuyor.</p>';
            return;
        }

        container.innerHTML = campaigns
            .map(campaign => this.renderCampaignCard(campaign, { showApprovalActions: true }))
            .join('');
    }

    renderAllCampaigns(campaigns = []) {
        const container = document.getElementById('all-campaigns-list');
        if (!container) {
            console.error('[Admin Dashboard] all-campaigns-list container not found');
            return;
        }

        if (!campaigns || campaigns.length === 0) {
            container.innerHTML = '<p style="padding: 1.5rem; opacity: 0.7;">Henüz kampanya bulunmuyor.</p>';
            return;
        }

        container.innerHTML = campaigns
            .map(campaign => this.renderCampaignCard(campaign))
            .join('');
    }

    renderCampaignCard(campaign, options = {}) {
        const { showApprovalActions = false } = options;

        const storeName = campaign.store?.name || 'Bilinmeyen Mağaza';
        const approvalStatus = (campaign.approval_status || 'pending').toLowerCase();
        const approvalColor = this.getApprovalStatusColor(approvalStatus);
        const activeColor = campaign.is_active ? '#10b981' : '#6b7280';
        const campaignTypeLabel = this.getCampaignTypeLabel(campaign.campaign_type);
        const discountLabel = this.getCampaignDiscountLabel(campaign);
        const startDate = this.formatCampaignDate(campaign.start_date);
        const endDate = this.formatCampaignDate(campaign.end_date);
        const createdAt = this.formatCampaignDate(campaign.created_at || campaign.createdAt);
        const description = campaign.description ? campaign.description : 'Açıklama belirtilmemiş.';

        const metricsHtml = `
            <div style="display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--admin-border);">
                <div style="text-align: center;">
                    <div style="font-size: 1.4rem; font-weight: 700; color: var(--admin-primary);">${campaign.view_count || 0}</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">Görüntülenme</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.4rem; font-weight: 700; color: var(--admin-primary);">${campaign.click_count || 0}</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">Tıklama</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.4rem; font-weight: 700; color: var(--admin-primary);">${campaign.conversion_count || 0}</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">Dönüşüm</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.4rem; font-weight: 700; color: var(--admin-primary);">₺${Number(campaign.total_revenue || 0).toFixed(2)}</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">Ciro</div>
                </div>
            </div>`;

        const actionButtons = showApprovalActions
            ? `
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                    <button onclick="window.adminDashboard.approveCampaign('${campaign.id}')"
                            style="background: #10b981; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        ✅ Onayla
                    </button>
                    <button onclick="window.adminDashboard.rejectCampaign('${campaign.id}')"
                            style="background: #dc2626; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        ❌ Reddet
                    </button>
                </div>`
            : `
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.85rem; opacity: 0.75;">
                    <span>Oluşturma: ${createdAt}</span>
                    ${campaign.creator?.name ? `<span>• Oluşturan: ${campaign.creator.name}</span>` : ''}
                    ${campaign.notes ? `<span>• Not: ${campaign.notes}</span>` : ''}
                </div>`;

        return `
            <div style="border: 1px solid var(--admin-border); border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; background: white; box-shadow: 0 8px 20px rgba(15, 118, 110, 0.05);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
                            <h3 style="margin: 0; color: var(--admin-primary);">${campaign.name}</h3>
                            <span style="background: ${approvalColor}; color: white; font-size: 0.7rem; padding: 0.2rem 0.75rem; border-radius: 999px; text-transform: uppercase;">${approvalStatus}</span>
                            <span style="background: ${activeColor}20; color: ${activeColor}; font-size: 0.7rem; padding: 0.2rem 0.75rem; border-radius: 999px;">${campaign.is_active ? 'Aktif' : 'Pasif'}</span>
                        </div>
                        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.9rem; opacity: 0.85; margin-bottom: 0.75rem;">
                            <span>🏪 ${storeName}</span>
                            <span>•</span>
                            <span>${campaignTypeLabel}</span>
                            <span>•</span>
                            <span>${discountLabel}</span>
                            <span>•</span>
                            <span>📅 ${startDate} - ${endDate}</span>
                        </div>
                        <p style="margin: 0; opacity: 0.75; font-size: 0.9rem;">${description}</p>
                    </div>
                    ${actionButtons}
                </div>
                ${metricsHtml}
            </div>`;
    }

    getApprovalStatusColor(status) {
        const colors = {
            pending: '#f59e0b',
            approved: '#10b981',
            rejected: '#dc2626'
        };
        return colors[status] || '#6b7280';
    }

    getCampaignTypeLabel(type) {
        const labels = {
            'FLASH_SALE': '⚡ Hızlı Satış',
            'BUY_X_GET_Y': '🎁 Al X Ver Y',
            'CATEGORY_DISCOUNT': '📂 Kategori İndirimi',
            'FREE_SHIPPING': '🚚 Ücretsiz Kargo',
            'BUNDLE_DEAL': '📦 Paket Kampanyası',
            'GIFT_WITH_PURCHASE': '🎀 Hediyeli Satış',
            'MINIMUM_PURCHASE': '💰 Minimum Harcama'
        };
        return labels[type] || type || 'Kampanya';
    }

    getCampaignDiscountLabel(campaign) {
        if (!campaign) return '-';
        switch (campaign.discount_type) {
            case 'percentage':
                return `%${campaign.discount_value || 0} indirim`;
            case 'fixed':
                return `₺${Number(campaign.discount_value || 0).toFixed(2)} indirim`;
            case 'free_shipping':
                return 'Ücretsiz kargo';
            case 'buy_x_get_y':
                return `${campaign.buy_quantity || 1} al ${campaign.get_quantity || 1} öde`;
            default:
                return 'Özel teklif';
        }
    }

    formatCampaignDate(date) {
        if (!date) return '-';
        try {
            return new Date(date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
        } catch (error) {
            return '-';
        }
    }

    async approveCampaign(campaignId) {
        try {
            const result = await this.api.updateCampaignApproval(campaignId, 'approved');
            if (result.success) {
                this.showSuccess('Kampanya onaylandı');
                await this.loadCampaignsData();
            } else {
                this.showError(result.message || 'Kampanya onaylanamadı');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error approving campaign:', error);
            this.showError('Kampanya onaylanırken bir hata oluştu');
        }
    }

    async rejectCampaign(campaignId) {
        const reason = prompt('Reddetme sebebini girin:');
        if (reason === null) return;

        const trimmedReason = reason.trim();
        if (trimmedReason.length === 0) {
            alert('Reddetme sebebi boş bırakılamaz.');
            return;
        }

        try {
            const result = await this.api.updateCampaignApproval(campaignId, 'rejected', trimmedReason);
            if (result.success) {
                this.showSuccess('Kampanya reddedildi');
                await this.loadCampaignsData();
            } else {
                this.showError(result.message || 'Kampanya reddedilemedi');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error rejecting campaign:', error);
            this.showError('Kampanya reddedilirken bir hata oluştu');
        }
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

        switch (sectionName) {
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
            case 'campaigns':
                this.loadCampaignsData();
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
            case 'payouts':
                this.loadPayoutsData();
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

    // =============================================
    // ADMIN ANALYTICS DASHBOARD
    // =============================================
    async loadAnalyticsData() {
        console.log('[Admin Dashboard] Loading analytics data from API...');

        try {
            // Fetch all analytics data in parallel
            const [overviewRes, topStoresRes, revenueRes, activityRes] = await Promise.all([
                fetch(`${this.api.baseURL}/analytics/admin/overview`, {
                    headers: { 'Authorization': `Bearer ${this.api.getToken()}` }
                }),
                fetch(`${this.api.baseURL}/analytics/admin/top-stores?limit=5`, {
                    headers: { 'Authorization': `Bearer ${this.api.getToken()}` }
                }),
                fetch(`${this.api.baseURL}/analytics/admin/revenue?days=7`, {
                    headers: { 'Authorization': `Bearer ${this.api.getToken()}` }
                }),
                fetch(`${this.api.baseURL}/analytics/admin/activity?limit=15`, {
                    headers: { 'Authorization': `Bearer ${this.api.getToken()}` }
                })
            ]);

            // Parse responses
            const overview = overviewRes.ok ? await overviewRes.json() : null;
            const topStores = topStoresRes.ok ? await topStoresRes.json() : null;
            const revenue = revenueRes.ok ? await revenueRes.json() : null;
            const activity = activityRes.ok ? await activityRes.json() : null;

            // Update UI
            if (overview?.success) {
                this.updateAdminOverviewStats(overview.data);
            }

            if (topStores?.success) {
                this.renderAdminTopStores(topStores.data);
            }

            if (revenue?.success) {
                this.renderAdminRevenueChart(revenue.data);
            }

            if (activity?.success) {
                this.renderAdminActivityFeed(activity.data);
            }

            // Setup chart controls
            this.setupAdminChartControls();

        } catch (error) {
            console.error('[Admin Dashboard] Analytics load error:', error);
        }
    }

    updateAdminOverviewStats(data) {
        const { users, stores, products, orders, revenue, returns } = data;

        // Revenue
        const revenueEl = document.getElementById('adminStatRevenue');
        const revenue30El = document.getElementById('adminStatRevenue30');
        if (revenueEl) revenueEl.textContent = `₺${revenue.total.toLocaleString('tr-TR')}`;
        if (revenue30El) revenue30El.textContent = `Son 30 gün: ₺${revenue.last30Days.toLocaleString('tr-TR')}`;

        // Users
        const usersEl = document.getElementById('adminStatUsers');
        const newUsersEl = document.getElementById('adminStatNewUsers');
        if (usersEl) usersEl.textContent = users.total;
        if (newUsersEl) newUsersEl.textContent = `Yeni (7 gün): ${users.new7Days}`;

        // Orders
        const ordersEl = document.getElementById('adminStatOrders');
        const orders7El = document.getElementById('adminStatOrders7');
        if (ordersEl) ordersEl.textContent = orders.total;
        if (orders7El) orders7El.textContent = `Son 7 gün: ${orders.last7Days}`;

        // Stores
        const storesEl = document.getElementById('adminStatStores');
        const pendingStoresEl = document.getElementById('adminStatPendingStores');
        if (storesEl) storesEl.textContent = stores.total;
        if (pendingStoresEl) pendingStoresEl.textContent = `Bekleyen: ${stores.pending}`;

        // Products
        const productsEl = document.getElementById('adminStatProducts');
        const pendingProductsEl = document.getElementById('adminStatPendingProducts');
        if (productsEl) productsEl.textContent = products.total;
        if (pendingProductsEl) pendingProductsEl.textContent = `Bekleyen: ${products.pending}`;

        // Returns
        const returnsEl = document.getElementById('adminStatReturns');
        const pendingReturnsEl = document.getElementById('adminStatPendingReturns');
        if (returnsEl) returnsEl.textContent = returns.total;
        if (pendingReturnsEl) pendingReturnsEl.textContent = `Bekleyen: ${returns.pending}`;
    }

    renderAdminTopStores(stores) {
        const container = document.getElementById('adminTopStoresList');
        if (!container) return;

        if (!stores || stores.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b;">Henüz mağaza yok</p>';
            return;
        }

        container.innerHTML = stores.map((s, i) => `
            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: #fafafa; border-radius: 6px;">
                <span style="font-weight: 700; color: var(--admin-primary); width: 25px;">#${i + 1}</span>
                <img src="${s.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(s.name)}" 
                     style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" alt="${s.name}">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${s.orders} sipariş · ${s.products} ürün</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; color: #10b981; font-size: 0.9rem;">₺${s.revenue.toLocaleString('tr-TR')}</div>
                    <div style="font-size: 0.7rem; color: #f59e0b;">⭐ ${s.rating.toFixed(1)}</div>
                </div>
            </div>
        `).join('');
    }

    renderAdminRevenueChart(salesData) {
        const canvas = document.getElementById('adminRevenueChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const wrapper = document.getElementById('adminChartWrapper');
        canvas.width = wrapper.offsetWidth - 32 || 500;
        canvas.height = 180;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!salesData || salesData.length === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Henüz gelir verisi yok', canvas.width / 2, canvas.height / 2);
            return;
        }

        const maxRevenue = Math.max(...salesData.map(d => d.revenue), 1);
        const barWidth = (canvas.width - 50) / salesData.length - 4;
        const chartHeight = canvas.height - 40;

        salesData.forEach((day, i) => {
            const barHeight = (day.revenue / maxRevenue) * (chartHeight - 20);
            const x = 40 + i * (barWidth + 4);
            const y = chartHeight - barHeight;

            const gradient = ctx.createLinearGradient(x, y, x, chartHeight);
            gradient.addColorStop(0, '#10b981');
            gradient.addColorStop(1, '#059669');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);

            ctx.fillStyle = '#64748b';
            ctx.font = '9px Inter, sans-serif';
            ctx.textAlign = 'center';
            const dateLabel = new Date(day.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            ctx.fillText(dateLabel, x + barWidth / 2, canvas.height - 5);
        });

        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`₺${maxRevenue.toLocaleString('tr-TR')}`, 35, 12);
    }

    renderAdminActivityFeed(activities) {
        const container = document.getElementById('adminActivityFeed');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b;">Henüz aktivite yok</p>';
            return;
        }

        const typeColors = {
            order: '#10b981',
            store: '#8b5cf6',
            product: '#3b82f6'
        };

        container.innerHTML = activities.map(a => `
            <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: #f8fafc; border-radius: 6px; border-left: 3px solid ${typeColors[a.type] || '#64748b'};">
                <span style="font-size: 1.2rem;">${a.icon}</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.title}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${a.subtitle}</div>
                </div>
                <div style="font-size: 0.7rem; color: #94a3b8; white-space: nowrap;">
                    ${new Date(a.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        `).join('');
    }

    setupAdminChartControls() {
        const buttons = document.querySelectorAll('.admin-chart-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                buttons.forEach(b => {
                    b.style.background = 'white';
                    b.style.color = 'var(--admin-text)';
                    b.classList.remove('active');
                });
                btn.style.background = 'var(--admin-primary)';
                btn.style.color = 'white';
                btn.classList.add('active');

                const days = parseInt(btn.dataset.days) || 7;
                const res = await fetch(`${this.api.baseURL}/analytics/admin/revenue?days=${days}`, {
                    headers: { 'Authorization': `Bearer ${this.api.getToken()}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        this.renderAdminRevenueChart(data.data);
                    }
                }
            });
        });
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
                            ${coupon.is_active ? 'Disable' : 'Approve'}
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
            alert('✅ Kupon başarıyla onaylandı!');
            loadCouponsData();
        } else {
            throw new Error(response.message || 'Failed to approve coupon');
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error approving coupon:', error);
        alert('⚠️ Hata: ' + error.message);
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
        const statusColors = { pending: '#f59e0b', approved: '#10b981', items_received: '#3b82f6', refund_processed: '#8b5cf6', completed: '#10b981', rejected: '#dc2626', cancelled: '#6b7280' };
        const color = statusColors[r.status] || '#64748b';
        html += `
          <tr style="border-bottom:1px solid var(--admin-border);">
            <td style="padding:0.75rem; font-weight:600;">${r.return_number || r.id.slice(0, 8)}</td>
            <td style="padding:0.75rem;">${r.order?.order_number || r.order_id}</td>
            <td style="padding:0.75rem;">${r.customer ? (r.customer.first_name || '') + ' ' + (r.customer.last_name || '') : '-'}</td>
            <td style="padding:0.75rem; text-align:center;"><span style="padding:0.25rem 0.6rem; border-radius:12px; color:${color}; background:${color}20; font-size:0.8rem; font-weight:600; text-transform:capitalize;">${r.status.replace('_', ' ')}</span></td>
            <td style="padding:0.75rem; text-align:right; font-weight:700; color:#8b5cf6;">$${Number(r.refund_amount || 0).toFixed(2)}</td>
            <td style="padding:0.75rem; text-align:center;">
              ${r.status === 'pending' ? `<button onclick="window.adminDashboard.updateReturnStatus('${r.id}','approved')" style="background:#10b981;color:#fff;border:none;padding:0.4rem 0.7rem;border-radius:6px;cursor:pointer;margin-right:6px;">Approve</button>
              <button onclick="window.adminDashboard.rejectReturn('${r.id}')" style="background:#f59e0b;color:#fff;border:none;padding:0.4rem 0.7rem;border-radius:6px;cursor:pointer;">Reject</button>` : ''}
              ${r.status === 'approved' ? `<button onclick="window.adminDashboard.updateReturnStatus('${r.id}','items_received')" style="background:#3b82f6;color:#fff;border:none;padding:0.4rem 0.7rem;border-radius:6px;cursor:pointer;">Items Received</button>` : ''}
              ${r.status === 'items_received' ? `<button onclick="window.adminDashboard.updateReturnStatus('${r.id}','refund_processed')" style="background:#8b5cf6;color:#fff;border:none;padding:0.4rem 0.7rem;border-radius:6px;cursor:pointer;">Refund Processed</button>` : ''}
              ${r.status === 'refund_processed' ? `<button onclick="window.adminDashboard.updateReturnStatus('${r.id}','completed')" style="background:#10b981;color:#fff;border:none;padding:0.4rem 0.7rem;border-radius:6px;cursor:pointer;">Complete</button>` : ''}
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
            alert('✅ Kupon reddedildi ve devre dışı bırakıldı.');
            loadCouponsData();
        } else {
            throw new Error(response.message || 'Failed to reject coupon');
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error rejecting coupon:', error);
        alert('⚠️ Hata: ' + error.message);
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
            alert(`✅ Kupon ${newStatus ? 'aktifleştirildi' : 'devre dışı bırakıldı'}!`);
            loadCouponsData();
        } else {
            throw new Error(response.message || 'Failed to update coupon');
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error toggling coupon status:', error);
        alert('⚠️ Hata: ' + error.message);
    }
}

// ===========================================
// CATEGORY MANAGEMENT
// ===========================================

let categoriesData = [];

async function loadCategoriesData() {
    const container = document.getElementById('categories-table');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div><p>Kategoriler yükleniyor...</p></div>';

    try {
        const response = await apiClient.get('/categories');
        if (response.success && response.data) {
            categoriesData = response.data;
            renderCategoriesTable(response.data);
        } else {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Kategori bulunamadı.</p>';
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error loading categories:', error);
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #dc2626;">Kategoriler yüklenirken hata oluştu.</p>';
    }
}

function renderCategoriesTable(categories) {
    const container = document.getElementById('categories-table');
    if (!container) return;

    if (!categories || categories.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Kategori bulunamadı. Yeni kategori ekleyin.</p>';
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: rgba(16, 185, 129, 0.1); border-bottom: 2px solid var(--admin-border);">
                    <th style="padding: 1rem; text-align: left;">İkon</th>
                    <th style="padding: 1rem; text-align: left;">Kategori Adı</th>
                    <th style="padding: 1rem; text-align: left;">Açıklama</th>
                    <th style="padding: 1rem; text-align: center;">Öne Çıkan</th>
                    <th style="padding: 1rem; text-align: center;">Sıra</th>
                    <th style="padding: 1rem; text-align: center;">İşlemler</th>
                </tr>
            </thead>
            <tbody>
    `;

    categories.forEach(cat => {
        html += `
            <tr style="border-bottom: 1px solid var(--admin-border);">
                <td style="padding: 1rem; font-size: 1.5rem;">${cat.icon || '📁'}</td>
                <td style="padding: 1rem;">
                    <div style="font-weight: 600;">${cat.name}</div>
                    <div style="opacity: 0.6; font-size: 0.85rem;">${cat.slug}</div>
                </td>
                <td style="padding: 1rem; opacity: 0.8;">${cat.description || '-'}</td>
                <td style="padding: 1rem; text-align: center;">
                    ${cat.is_featured ? '<span style="color: #10b981;">✓</span>' : '<span style="opacity: 0.4;">-</span>'}
                </td>
                <td style="padding: 1rem; text-align: center;">${cat.sort_order || 0}</td>
                <td style="padding: 1rem; text-align: center;">
                    <button onclick="openVariantModal('${cat.id}', '${cat.name}')" 
                            style="background: #8b5cf6; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem; font-size: 0.85rem;">
                        🎨 Varyantlar
                    </button>
                    <button onclick="openCategoryModal('${cat.id}')" 
                            style="background: #3b82f6; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; margin-right: 0.5rem; font-size: 0.85rem;">
                        ✏️ Düzenle
                    </button>
                    <button onclick="deleteCategory('${cat.id}')" 
                            style="background: #dc2626; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                        🗑️ Sil
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const form = document.getElementById('categoryForm');

    // Reset form
    form.reset();
    document.getElementById('categoryId').value = '';

    if (categoryId) {
        // Edit mode
        title.textContent = '✏️ Kategori Düzenle';
        const cat = categoriesData.find(c => c.id === categoryId);
        if (cat) {
            document.getElementById('categoryId').value = cat.id;
            document.getElementById('categoryName').value = cat.name || '';
            document.getElementById('categoryDescription').value = cat.description || '';
            document.getElementById('categoryIcon').value = cat.icon || '';
            document.getElementById('categorySortOrder').value = cat.sort_order || 0;
            document.getElementById('categoryFeatured').checked = cat.is_featured || false;
        }
    } else {
        // Create mode
        title.textContent = '📂 Yeni Kategori';
    }

    modal.style.display = 'flex';
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    modal.style.display = 'none';
}

async function saveCategory(event) {
    event.preventDefault();

    const categoryId = document.getElementById('categoryId').value;
    const data = {
        name: document.getElementById('categoryName').value,
        description: document.getElementById('categoryDescription').value,
        icon: document.getElementById('categoryIcon').value,
        sort_order: parseInt(document.getElementById('categorySortOrder').value) || 0,
        is_featured: document.getElementById('categoryFeatured').checked,
        is_active: true
    };

    try {
        let response;
        if (categoryId) {
            // Update
            response = await apiClient.put(`/categories/${categoryId}`, data);
        } else {
            // Create
            response = await apiClient.post('/categories', data);
        }

        if (response.success) {
            alert(`✅ Kategori ${categoryId ? 'güncellendi' : 'oluşturuldu'}!`);
            closeCategoryModal();
            loadCategoriesData();
        } else {
            throw new Error(response.message || 'İşlem başarısız');
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error saving category:', error);
        alert('⚠️ Hata: ' + error.message);
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const response = await apiClient.delete(`/categories/${categoryId}`);
        if (response.success || response.status === 204) {
            alert('✅ Kategori silindi!');
            loadCategoriesData();
        } else {
            throw new Error(response.message || 'Silme işlemi başarısız');
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error deleting category:', error);
        alert('⚠️ Hata: ' + error.message);
    }
}

// ===========================================
// VARIANT MANAGEMENT
// ===========================================

let currentVariantCategoryId = null;

function openVariantModal(categoryId, categoryName) {
    currentVariantCategoryId = categoryId;
    const modal = document.getElementById('variantModal');
    const nameEl = document.getElementById('variantCategoryName');

    document.getElementById('variantCategoryId').value = categoryId;
    nameEl.textContent = `Kategori: ${categoryName}`;

    // Clear form
    document.getElementById('newVariantName').value = '';
    document.getElementById('newVariantOptions').value = '';
    document.getElementById('newVariantType').value = 'text';
    document.getElementById('newVariantRequired').checked = false;

    // Load existing variants
    loadExistingVariants(categoryId);

    modal.style.display = 'flex';
}

function closeVariantModal() {
    const modal = document.getElementById('variantModal');
    modal.style.display = 'none';
    currentVariantCategoryId = null;
}

async function loadExistingVariants(categoryId) {
    const container = document.getElementById('existingVariants');
    container.innerHTML = '<p style="opacity: 0.6;">Varyantlar yükleniyor...</p>';

    try {
        const response = await apiClient.get(`/categories/${categoryId}/variants`);
        if (response.success && response.data && response.data.length > 0) {
            let html = '<h4 style="margin: 0 0 1rem 0; color: var(--admin-primary);">Mevcut Varyantlar</h4>';
            response.data.forEach(variant => {
                const optionsText = variant.options ? variant.options.map(o => o.label || o.value).join(', ') : '-';
                html += `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: white; border: 1px solid var(--admin-border); border-radius: 8px; margin-bottom: 0.5rem;">
                        <div>
                            <strong>${variant.name}</strong>
                            <span style="opacity: 0.6; margin-left: 0.5rem; font-size: 0.85rem;">(${variant.type})</span>
                            ${variant.is_required ? '<span style="background: #f59e0b; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; margin-left: 0.5rem;">Zorunlu</span>' : ''}
                            <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.25rem;">${optionsText}</div>
                        </div>
                        <button onclick="deleteVariant('${variant.id}')" 
                                style="background: #dc2626; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                            🗑️
                        </button>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p style="opacity: 0.6; padding: 1rem; text-align: center;">Bu kategoride henüz varyant yok.</p>';
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error loading variants:', error);
        container.innerHTML = '<p style="color: #dc2626;">Varyantlar yüklenirken hata oluştu.</p>';
    }
}

async function addVariant() {
    const categoryId = document.getElementById('variantCategoryId').value;
    const name = document.getElementById('newVariantName').value.trim();
    const type = document.getElementById('newVariantType').value;
    const optionsInput = document.getElementById('newVariantOptions').value.trim();
    const isRequired = document.getElementById('newVariantRequired').checked;

    if (!name) {
        alert('Varyant adı gereklidir!');
        return;
    }

    // Parse options
    const options = optionsInput.split(',')
        .map(o => o.trim())
        .filter(o => o.length > 0)
        .map(o => ({ label: o, value: o.toLowerCase().replace(/\s+/g, '_') }));

    const data = {
        name: name,
        type: type,
        options: options,
        is_required: isRequired,
        sort_order: 1
    };

    try {
        const response = await apiClient.post(`/categories/${categoryId}/variants`, data);
        if (response.success) {
            alert('✅ Varyant eklendi!');
            // Clear form
            document.getElementById('newVariantName').value = '';
            document.getElementById('newVariantOptions').value = '';
            document.getElementById('newVariantRequired').checked = false;
            // Reload variants
            loadExistingVariants(categoryId);
        } else {
            throw new Error(response.message || 'Varyant eklenemedi');
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error adding variant:', error);
        alert('⚠️ Hata: ' + error.message);
    }
}

async function deleteVariant(variantId) {
    if (!confirm('Bu varyantı silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const categoryId = document.getElementById('variantCategoryId').value;
        const response = await apiClient.delete(`/categories/${categoryId}/variants/${variantId}`);
        if (response.success || response.status === 204) {
            alert('✅ Varyant silindi!');
            loadExistingVariants(categoryId);
        } else {
            throw new Error(response.message || 'Silme işlemi başarısız');
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error deleting variant:', error);
        alert('⚠️ Hata: ' + error.message);
    }
}

// Setup category modal events
document.addEventListener('DOMContentLoaded', () => {
    // Add Category Button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => openCategoryModal());
    }

    // Category Modal Close
    const closeCategoryModalBtn = document.getElementById('closeCategoryModal');
    if (closeCategoryModalBtn) {
        closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
    }
    const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
    if (cancelCategoryBtn) {
        cancelCategoryBtn.addEventListener('click', closeCategoryModal);
    }

    // Category Form Submit
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', saveCategory);
    }

    // Variant Modal Close
    const closeVariantModalBtn = document.getElementById('closeVariantModal');
    if (closeVariantModalBtn) {
        closeVariantModalBtn.addEventListener('click', closeVariantModal);
    }

    // Add Variant Button
    const addVariantBtn = document.getElementById('addVariantBtn');
    if (addVariantBtn) {
        addVariantBtn.addEventListener('click', addVariant);
    }

    // Close modals on background click
    const categoryModal = document.getElementById('categoryModal');
    if (categoryModal) {
        categoryModal.addEventListener('click', (e) => {
            if (e.target === categoryModal) closeCategoryModal();
        });
    }
    const variantModal = document.getElementById('variantModal');
    if (variantModal) {
        variantModal.addEventListener('click', (e) => {
            if (e.target === variantModal) closeVariantModal();
        });
    }

    // =============================================
    // Campaign Modal Setup
    // =============================================
    const campaignModal = document.getElementById('campaignModal');
    const addCampaignBtn = document.getElementById('addCampaignBtn');
    const closeCampaignModalBtn = document.getElementById('closeCampaignModal');
    const cancelCampaignBtn = document.getElementById('cancelCampaignBtn');
    const campaignForm = document.getElementById('campaignForm');

    function openCampaignModal() {
        if (campaignModal) {
            campaignModal.style.display = 'flex';
            // Set default dates
            const now = new Date();
            const startDate = document.getElementById('campaignStartDate');
            const endDate = document.getElementById('campaignEndDate');
            if (startDate) {
                startDate.value = now.toISOString().slice(0, 16);
            }
            if (endDate) {
                const endDefault = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
                endDate.value = endDefault.toISOString().slice(0, 16);
            }
        }
    }

    function closeCampaignModal() {
        if (campaignModal) {
            campaignModal.style.display = 'none';
            if (campaignForm) campaignForm.reset();
        }
    }

    async function handleCampaignSubmit(e) {
        e.preventDefault();

        const submitBtn = campaignForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Oluşturuluyor...';
        submitBtn.disabled = true;

        try {
            const formData = {
                name: document.getElementById('campaignName').value.trim(),
                description: document.getElementById('campaignDescription').value.trim() || null,
                campaign_type: document.getElementById('campaignType').value,
                discount_type: document.getElementById('campaignDiscountType').value,
                discount_value: parseFloat(document.getElementById('campaignDiscountValue').value) || 0,
                max_discount_amount: parseFloat(document.getElementById('campaignMaxDiscount').value) || null,
                start_date: new Date(document.getElementById('campaignStartDate').value).toISOString(),
                end_date: new Date(document.getElementById('campaignEndDate').value).toISOString(),
                applicable_to: document.getElementById('campaignApplicableTo').value,
                min_order_amount: parseFloat(document.getElementById('campaignMinOrder').value) || 0,
                priority: parseInt(document.getElementById('campaignPriority').value) || 0,
                is_active: document.getElementById('campaignIsActive').checked,
                is_featured: document.getElementById('campaignIsFeatured').checked,
                show_countdown: document.getElementById('campaignShowCountdown').checked,
            };

            console.log('[Admin Dashboard] Creating campaign:', formData);
            const result = await apiClient.createCampaign(formData);

            if (result.success) {
                closeCampaignModal();
                window.adminDashboard.showSuccess('Kampanya başarıyla oluşturuldu!');
                // Reload campaigns data
                if (window.adminDashboard && typeof window.adminDashboard.loadCampaignsData === 'function') {
                    await window.adminDashboard.loadCampaignsData();
                }
            } else {
                window.adminDashboard.showError(result.message || 'Kampanya oluşturulamadı');
            }
        } catch (error) {
            console.error('[Admin Dashboard] Error creating campaign:', error);
            window.adminDashboard.showError('Kampanya oluşturulurken bir hata oluştu: ' + error.message);
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    if (addCampaignBtn) {
        addCampaignBtn.addEventListener('click', openCampaignModal);
    }
    if (closeCampaignModalBtn) {
        closeCampaignModalBtn.addEventListener('click', closeCampaignModal);
    }
    if (cancelCampaignBtn) {
        cancelCampaignBtn.addEventListener('click', closeCampaignModal);
    }
    if (campaignForm) {
        campaignForm.addEventListener('submit', handleCampaignSubmit);
    }
    if (campaignModal) {
        campaignModal.addEventListener('click', (e) => {
            if (e.target === campaignModal) closeCampaignModal();
        });
    }
});


// ==========================================
// ADMIN PAYOUT MANAGEMENT
// ==========================================

/**
 * Load admin payouts data
 */
AdminDashboard.prototype.loadPayoutsData = async function () {
    console.log('[Admin Dashboard] Loading payouts data...');

    try {
        // Fetch stats and pending payouts in parallel
        const [statsRes, pendingRes] = await Promise.all([
            fetch(`${this.api.baseURL}/payouts/admin/stats`, {
                headers: { 'Authorization': `Bearer ${this.api.getToken()}` }
            }),
            fetch(`${this.api.baseURL}/payouts/admin/pending`, {
                headers: { 'Authorization': `Bearer ${this.api.getToken()}` }
            })
        ]);

        const stats = statsRes.ok ? await statsRes.json() : null;
        const pending = pendingRes.ok ? await pendingRes.json() : null;

        if (stats?.success) {
            this.updatePayoutStats(stats.data);
        }

        if (pending?.success) {
            this.renderPendingPayouts(pending.data.payouts || []);
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error loading payouts:', error);
    }
};

/**
 * Update payout stats cards
 */
AdminDashboard.prototype.updatePayoutStats = function (data) {
    const { counts, amounts } = data;

    const pendingEl = document.getElementById('payoutStatPending');
    const processingEl = document.getElementById('payoutStatProcessing');
    const totalPaidEl = document.getElementById('payoutStatTotalPaid');
    const pendingAmountEl = document.getElementById('payoutStatPendingAmount');

    if (pendingEl) pendingEl.textContent = counts.pending || 0;
    if (processingEl) processingEl.textContent = counts.processing || 0;
    if (totalPaidEl) totalPaidEl.textContent = `₺${amounts.totalPaid.toLocaleString('tr-TR')}`;
    if (pendingAmountEl) pendingAmountEl.textContent = `₺${amounts.pendingAmount.toLocaleString('tr-TR')}`;
};

/**
 * Render pending payouts list
 */
AdminDashboard.prototype.renderPendingPayouts = function (payouts) {
    const container = document.getElementById('adminPayoutsList');
    if (!container) return;

    if (!payouts || payouts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">Bekleyen ödeme talebi yok 🎉</p>';
        return;
    }

    let html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: rgba(16, 185, 129, 0.1); border-bottom: 2px solid var(--admin-border);">
                    <th style="padding: 1rem; text-align: left;">Mağaza</th>
                    <th style="padding: 1rem; text-align: right;">Tutar</th>
                    <th style="padding: 1rem; text-align: left;">IBAN</th>
                    <th style="padding: 1rem; text-align: center;">Tarih</th>
                    <th style="padding: 1rem; text-align: center;">İşlem</th>
                </tr>
            </thead>
            <tbody>
    `;

    payouts.forEach(p => {
        const date = new Date(p.requested_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        const storeName = p.store?.name || 'Bilinmiyor';
        const iban = p.iban ? p.iban.replace(/(.{4})/g, '$1 ').trim() : 'N/A';

        html += `
            <tr style="border-bottom: 1px solid var(--admin-border);">
                <td style="padding: 1rem;">
                    <div style="font-weight: 600;">${storeName}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">${p.account_holder || ''}</div>
                </td>
                <td style="padding: 1rem; text-align: right; font-weight: 700; color: #10b981;">
                    ₺${parseFloat(p.requested_amount).toLocaleString('tr-TR')}
                </td>
                <td style="padding: 1rem; font-family: monospace; font-size: 0.85rem;">${iban}</td>
                <td style="padding: 1rem; text-align: center;">${date}</td>
                <td style="padding: 1rem; text-align: center;">
                    <button onclick="adminDashboard.approvePayout('${p.id}')"
                        style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; margin-right: 0.5rem;">
                        ✅ Onayla
                    </button>
                    <button onclick="adminDashboard.rejectPayout('${p.id}')"
                        style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                        ❌ Reddet
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
};

/**
 * Approve a payout request
 */
AdminDashboard.prototype.approvePayout = async function (payoutId) {
    if (!confirm('Bu ödeme talebini onaylamak istediğinize emin misiniz?')) {
        return;
    }

    try {
        const res = await fetch(`${this.api.baseURL}/payouts/admin/${payoutId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.api.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const data = await res.json();

        if (data.success) {
            alert('✅ Ödeme talebi onaylandı!');
            this.loadPayoutsData();
        } else {
            throw new Error(data.message || 'Onaylama başarısız');
        }
    } catch (error) {
        alert('❌ Hata: ' + error.message);
    }
};

/**
 * Reject a payout request
 */
AdminDashboard.prototype.rejectPayout = async function (payoutId) {
    const reason = prompt('Ret sebebini giriniz:');

    if (!reason || reason.trim().length === 0) {
        alert('Ret sebebi gereklidir');
        return;
    }

    try {
        const res = await fetch(`${this.api.baseURL}/payouts/admin/${payoutId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.api.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });

        const data = await res.json();

        if (data.success) {
            alert('❌ Ödeme talebi reddedildi');
            this.loadPayoutsData();
        } else {
            throw new Error(data.message || 'Reddetme başarısız');
        }
    } catch (error) {
        alert('❌ Hata: ' + error.message);
    }
};
