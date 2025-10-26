/* ===============================================
   DOSTANWEBCSS VENDOR DASHBOARD JAVASCRIPT
   Nordic Artisan Management Panel with Backend API Integration
   =============================================== */

// ==========================================
// AUTH CHECK - MUST BE FIRST
// ==========================================

const vendorDebugEnabled = (() => {
    try {
        if (typeof window !== 'undefined') {
            if (window.VENDOR_DEBUG === true) {
                return true;
            }
            if (window.localStorage) {
                return window.localStorage.getItem('VENDOR_DEBUG') === 'true';
            }
        }
    } catch (_) {
        return false;
    }
    return false;
})();

const vdLog = (...args) => {
    if (vendorDebugEnabled) {
        console.log('[Vendor Dashboard]', ...args);
    }
};

const vdVariantLog = (...args) => {
    if (vendorDebugEnabled) {
        console.log('[Variant]', ...args);
    }
};

// Check if user is logged in
if (!AuthManager.isLoggedIn()) {
    console.warn('[Vendor Dashboard] Not logged in, redirecting to login');
    window.location.href = 'login.html';
}

// Check if user has seller or admin role
const currentUser = AuthManager.getUser();
vdLog('Current user:', currentUser);

if (currentUser.role !== 'seller' && currentUser.role !== 'admin') {
    console.warn('[Vendor Dashboard] User is not seller or admin:', currentUser.role);
    alert('Bu panel sadece satıcılar içindir!');
    AuthManager.logout();
    window.location.href = 'login.html';
}

// ==========================================
// VENDOR DASHBOARD CLASS
// ==========================================

class VendorDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.apiClient = new ApiClient();
        this.storeId = null;
        this.storeName = null;
        this.storeInfo = null;
        this.storeStatus = null;
        this.user = currentUser;
        this.userId = currentUser.id;
        this.categories = [];

        vdLog('Initializing for user:', this.userId);
        this.init();
    }

    async init() {
        vdLog('Starting initialization...');

        // Load store information first
        await this.loadStoreInfo();

        // Setup UI components
        this.setupNavigation();
        this.setupNotifications();
        this.setupTheme();
        this.setupLogout();
        this.displayUserInfo();

        if (!this.storeId) {
            vdLog('No store yet. Awaiting application submission.');
            return;
        }

        if (this.storeStatus !== 'approved') {
            vdLog('Store is not approved yet. Limiting dashboard features.', this.storeStatus);
            this.applyPendingStateUI();
            return;
        }

        this.setupProductModal();
        this.setupCampaignModal();

        // Load categories for product form
        await this.loadCategories();

        // Load initial dashboard data
        await this.loadDashboardData();

        // Setup return policy form if elements exist
        this.setupReturnPolicyUI();

        vdLog('Initialization complete');
    }

    // ==========================================
    // STORE INFORMATION
    // ==========================================

    async loadStoreInfo() {
        try {
            vdLog('Loading store info for user:', this.userId);

            this.storeId = null;
            this.storeName = null;
            this.storeInfo = null;
            this.storeStatus = null;

            // Fetch the authenticated seller's store using the dedicated endpoint
            const response = await this.apiClient.getMyStore();
            vdLog('My store API response:', response);

            let store = null;

            if (response?.success && response.data) {
                store = response.data;
            } else if (Array.isArray(response?.data) && response.data.length > 0) {
                // Fallback for older API responses that still return an array
                store = response.data[0];
            }

            if (store) {
                this.storeId = store.id;
                this.storeName = store.name;
                this.storeInfo = store;
                this.storeStatus = store.status || 'pending';

                vdLog('Store loaded:', this.storeName, this.storeId);

                // Update UI with store name
                this.updateStoreNameInUI();

                // Prefill return policy inputs if already mounted
                this.prefillReturnPolicy();

                return true;
            } else {
                console.warn('[Vendor Dashboard] No store found for user');
                this.storeStatus = null;
                this.showNoStoreMessage();
                return false;
            }
        } catch (error) {
            console.error('[Vendor Dashboard] Error loading store:', error);
            this.showError('Mağaza bilgileri yüklenemedi: ' + error.message);
            this.storeStatus = null;
            return false;
        }
    }

    prefillReturnPolicy() {
        try {
            const settings = this.storeInfo?.settings || {};
            const win = document.getElementById('returnWindowInput');
            const ship = document.getElementById('shippingPolicySelect');
            const tax = document.getElementById('taxPolicySelect');
            if (win) win.value = typeof settings.return_window_days === 'number' ? settings.return_window_days : 14;
            if (ship) ship.value = settings.return_shipping_policy || 'none';
            if (tax) tax.value = settings.tax_refund_policy || 'pro_rata';
        } catch (_) {}
    }

    setupReturnPolicyUI() {
        const btn = document.getElementById('saveReturnPolicyBtn');
        if (!btn) return;

        // Prefill current values
        this.prefillReturnPolicy();

        btn.addEventListener('click', async () => {
            if (!this.storeId) {
                alert('Store not loaded');
                return;
            }

            const win = document.getElementById('returnWindowInput');
            const ship = document.getElementById('shippingPolicySelect');
            const tax = document.getElementById('taxPolicySelect');
            const msg = document.getElementById('returnPolicySaveMsg');

            const return_window_days = parseInt(win?.value || '14', 10);
            const return_shipping_policy = ship?.value || 'none';
            const tax_refund_policy = tax?.value || 'pro_rata';

            const newSettings = {
                ...(this.storeInfo?.settings || {}),
                return_window_days,
                return_shipping_policy,
                tax_refund_policy,
            };

            try {
                btn.disabled = true;
                if (msg) { msg.textContent = 'Saving...'; msg.style.color = '#6b7280'; }
                const res = await this.apiClient.put(`/stores/${this.storeId}`, { settings: newSettings });
                btn.disabled = false;
                if (res.success) {
                    this.storeInfo = res.data || this.storeInfo;
                    if (msg) { msg.textContent = 'Saved'; msg.style.color = '#10b981'; }
                } else {
                    throw new Error(res.message || 'Failed to save');
                }
            } catch (e) {
                btn.disabled = false;
                if (msg) { msg.textContent = 'Error: ' + e.message; msg.style.color = '#dc2626'; }
            }
        });
    }

    collectSelectedVariants() {
        const result = [];
        const container = document.getElementById('variantContainer');
        if (!container) return result;
        container.querySelectorAll('.variant-group').forEach(group => {
            const variantId = group.dataset.variantId;
            const variantName = group.dataset.variantName;
            const selected = [];
            group.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
                const labelText = input.nextSibling && input.nextSibling.textContent ? input.nextSibling.textContent.trim() : input.value;
                selected.push({ label: labelText, value: input.value });
            });
            if (selected.length > 0) {
                result.push({
                    category_variant_id: variantId,
                    variant_name: variantName,
                    selected_options: selected,
                });
            }
        });
        return result;
    }

    updateStoreNameInUI() {
        // Update store name in header or sidebar if elements exist
        const storeNameElements = document.querySelectorAll('.store-name');
        storeNameElements.forEach(el => {
            el.textContent = this.storeName;
        });
    }

    showNoStoreMessage() {
        const mainContent = document.querySelector('.vendor-main');
        if (mainContent) {
            mainContent.innerHTML = `
                <section style="max-width: 720px; margin: 4rem auto; background: white; border: 1px solid var(--vendor-border); border-radius: 16px; padding: 2.5rem; box-shadow: 0 12px 40px rgba(0,0,0,0.08);">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="font-size: 3.5rem; margin-bottom: 1rem;">🏪</div>
                        <h2 style="margin: 0 0 0.75rem 0; color: var(--vendor-primary);">İlk Mağazanızı Oluşturun</h2>
                        <p style="margin: 0; opacity: 0.7;">Nordik pazarında satışa başlamak için mağaza bilgilerinizi doldurun.</p>
                    </div>

                    <form id="createStoreForm" style="display: grid; gap: 1.25rem;">
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Mağaza Adı *</label>
                            <input type="text" name="storeName" required placeholder="Örn: Erik'in Ahşap Atölyesi"
                                   style="width: 100%; padding: 0.9rem; border: 1px solid var(--vendor-border); border-radius: 10px; font-size: 1rem;">
                        </div>

                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Mağaza Açıklaması</label>
                            <textarea name="storeDescription" rows="4" placeholder="Kısa bir mağaza açıklaması..."
                                      style="width: 100%; padding: 0.9rem; border: 1px solid var(--vendor-border); border-radius: 10px; font-size: 1rem; resize: vertical;"></textarea>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Şehir</label>
                                <input type="text" name="storeCity" placeholder="İstanbul"
                                       style="width: 100%; padding: 0.9rem; border: 1px solid var(--vendor-border); border-radius: 10px;">
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Telefon</label>
                                <input type="tel" name="storePhone" placeholder="+90 555 123 45 67"
                                       style="width: 100%; padding: 0.9rem; border: 1px solid var(--vendor-border); border-radius: 10px;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Mağaza E-postası</label>
                                <input type="email" name="storeEmail" placeholder="magaza@ornek.com"
                                       style="width: 100%; padding: 0.9rem; border: 1px solid var(--vendor-border); border-radius: 10px;">
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem;">Vergi / Kimlik No</label>
                                <input type="text" name="taxNumber" placeholder="Opsiyonel"
                                       style="width: 100%; padding: 0.9rem; border: 1px solid var(--vendor-border); border-radius: 10px;">
                            </div>
                        </div>

                        <div id="createStoreStatus" style="display: none; font-weight: 600; border-radius: 10px; padding: 0.85rem 1rem;"></div>

                        <button id="createStoreBtn" type="submit"
                                style="background: var(--vendor-primary); color: white; border: none; padding: 1rem 2rem; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 1rem; transition: all 0.3s ease;">
                            Mağaza Oluştur
                        </button>
                        <p style="margin: 0; font-size: 0.9rem; opacity: 0.7; text-align: center;">Mağazanız oluşturulduktan sonra admin onayına gönderilecektir.</p>
                    </form>
                </section>
            `;

            const form = document.getElementById('createStoreForm');
            const statusEl = document.getElementById('createStoreStatus');
            const submitBtn = document.getElementById('createStoreBtn');

            const setStatus = (message, type = 'info') => {
                if (!statusEl) return;
                statusEl.textContent = message;
                statusEl.style.display = message ? 'block' : 'none';
                if (type === 'error') {
                    statusEl.style.background = '#fef2f2';
                    statusEl.style.color = '#b91c1c';
                    statusEl.style.border = '1px solid #fecaca';
                } else {
                    statusEl.style.background = '#ecfdf5';
                    statusEl.style.color = '#047857';
                    statusEl.style.border = '1px solid #bbf7d0';
                }
            };

            if (form && submitBtn) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const formData = new FormData(form);
                    const name = (formData.get('storeName') || '').toString().trim();
                    const description = (formData.get('storeDescription') || '').toString().trim();
                    const city = (formData.get('storeCity') || '').toString().trim();
                    const phone = (formData.get('storePhone') || '').toString().trim();
                    const email = (formData.get('storeEmail') || '').toString().trim();
                    const taxNumber = (formData.get('taxNumber') || '').toString().trim();

                    if (!name || name.length < 3) {
                        setStatus('Lütfen en az 3 karakterden oluşan bir mağaza adı girin.', 'error');
                        return;
                    }

                    const payload = { name };
                    if (description) payload.description = description;
                    if (city) payload.city = city;
                    if (phone) payload.phone = phone;
                    if (email) payload.email = email;
                    if (taxNumber) payload.tax_number = taxNumber;

                    try {
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Mağaza Oluşturuluyor...';
                        setStatus('Mağazanız oluşturuluyor, lütfen bekleyin...', 'info');

                        const response = await this.apiClient.createStore(payload);

                        if (!response.success) {
                            throw new Error(response.message || 'Mağaza oluşturulamadı.');
                        }

                        const store = response.data || {};
                        this.storeInfo = store;
                        this.storeId = store.id;
                        this.storeName = store.name;

                        setStatus('Mağaza başvurunuz alındı! Durum ekranına yönlendiriliyorsunuz...', 'info');

                        setTimeout(() => {
                            window.location.reload();
                        }, 1200);
                    } catch (error) {
                        console.error('[Vendor Dashboard] Store creation failed:', error);
                        setStatus(error.message || 'Mağaza oluşturulamadı. Lütfen tekrar deneyin.', 'error');
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Mağaza Oluştur';
                    }
                });
            }
        }
    }

    applyPendingStateUI() {
        this.disableNavigationForPending();
        this.showPendingApprovalMessage();
    }

    disableNavigationForPending() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.classList.add('disabled');
            item.style.pointerEvents = 'none';
            item.style.opacity = '0.45';
            item.setAttribute('aria-disabled', 'true');
        });

        const quickActions = document.querySelector('.vendor-quick-actions');
        if (quickActions) {
            quickActions.style.display = 'none';
        }
    }

    getStoreStatusLabel(status) {
        const labels = {
            pending: 'Onay Bekliyor',
            approved: 'Onaylandı',
            rejected: 'Reddedildi',
            suspended: 'Askıya Alındı'
        };
        return labels[status] || status;
    }

    getStoreStatusColor(status) {
        const colors = {
            pending: '#f59e0b',
            approved: '#10b981',
            rejected: '#ef4444',
            suspended: '#6b7280'
        };
        return colors[status] || '#6b7280';
    }

    showPendingApprovalMessage() {
        const mainContent = document.querySelector('.vendor-main');
        if (!mainContent) return;

        const status = this.storeStatus || 'pending';
        const statusLabel = this.getStoreStatusLabel(status);
        const statusColor = this.getStoreStatusColor(status);
        const createdAt = this.storeInfo?.created_at || this.storeInfo?.createdAt;
        let createdAtText = '';

        if (createdAt) {
            const createdDate = new Date(createdAt);
            if (!Number.isNaN(createdDate.getTime())) {
                createdAtText = createdDate.toLocaleString('tr-TR', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });
            }
        }

        const rejectionReason = this.storeInfo?.rejection_reason;

        mainContent.innerHTML = `
            <section style="max-width: 720px; margin: 4rem auto; background: white; border: 1px solid var(--vendor-border); border-radius: 16px; padding: 2.75rem; box-shadow: 0 14px 48px rgba(0,0,0,0.08); text-align: center;">
                <div style="font-size: 3.5rem; margin-bottom: 1rem;">🕒</div>
                <h2 style="margin-bottom: 0.75rem; color: var(--vendor-primary);">Mağaza Başvurunuz Alındı</h2>
                <p style="margin: 0 auto 2rem; max-width: 520px; font-size: 1rem; line-height: 1.6; opacity: 0.75;">
                    ${this.storeName ? `<strong>${this.storeName}</strong> mağazanız için başvurunuz alındı.` : 'Mağaza başvurunuz alındı.'}
                    Başvurunuz yönetici onayına iletildi. Onaylandıktan sonra ürün ekleme ve sipariş yönetimi gibi tüm panel özellikleri otomatik olarak açılacaktır.
                </p>
                <div style="display: inline-flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.35rem; border-radius: 999px; background: rgba(17,24,39,0.04); margin-bottom: 1.5rem;">
                    <span style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 600; color: ${statusColor};">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColor}; display: inline-block;"></span>
                        ${statusLabel}
                    </span>
                    ${createdAtText ? `<span style="opacity: 0.65; font-size: 0.95rem;">Başvuru tarihi: ${createdAtText}</span>` : ''}
                </div>
                ${rejectionReason ? `<div style="border: 1px solid #fecaca; background: #fef2f2; color: #991b1b; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; text-align: left;">
                    <strong>Reddedilme sebebi:</strong>
                    <p style="margin: 0.65rem 0 0; line-height: 1.5;">${rejectionReason}</p>
                </div>` : ''}
                <button id="refreshStoreStatusBtn" style="background: var(--vendor-primary); color: white; border: none; padding: 0.9rem 1.8rem; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 1rem; transition: all 0.3s ease;">
                    Durumu Yenile
                </button>
                <p style="margin: 1.5rem 0 0; font-size: 0.9rem; opacity: 0.65;">Onay alındığında bu ekran otomatik olarak mağaza paneline dönüşecektir.</p>
            </section>
        `;

        const refreshBtn = document.getElementById('refreshStoreStatusBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                refreshBtn.disabled = true;
                const originalText = refreshBtn.textContent;
                refreshBtn.textContent = 'Durum yenileniyor...';
                try {
                    await this.refreshStoreStatus();
                } finally {
                    refreshBtn.disabled = false;
                    refreshBtn.textContent = originalText;
                }
            });
        }
    }

    async refreshStoreStatus() {
        await this.loadStoreInfo();

        if (!this.storeId) {
            this.showNoStoreMessage();
            return;
        }

        if (this.storeStatus === 'approved') {
            window.location.reload();
            return;
        }

        this.applyPendingStateUI();
    }

    // ==========================================
    // DASHBOARD DATA
    // ==========================================

    async loadDashboardData() {
        if (!this.storeId || this.storeStatus !== 'approved') {
            vdLog('Skipping dashboard data load because store is not approved.');
            return;
        }
        try {
            vdLog('Loading dashboard data...');

            // Load stats and recent orders in parallel
            await Promise.all([
                this.loadDashboardStats(),
                this.loadRecentOrders()
            ]);

            vdLog('Dashboard data loaded');
        } catch (error) {
            console.error('[Vendor Dashboard] Error loading dashboard:', error);
            this.showError('Dashboard verileri yüklenemedi');
        }
    }

    async loadDashboardStats() {
        if (!this.storeId || this.storeStatus !== 'approved') {
            return;
        }
        try {
            vdLog('Loading stats for store:', this.storeId);

            // Get products count
            const productsResponse = await this.apiClient.get('/products', {
                store_id: this.storeId,  // Backend expects snake_case
                limit: 1
            });

            // Get orders count
            const ordersResponse = await this.apiClient.get(`/stores/${this.storeId}/orders`, {
                limit: 1
            });

            vdLog('Stats loaded:', {
                products: productsResponse.pagination?.total || 0,
                orders: ordersResponse.pagination?.total || 0
            });

            // Update stats in UI (you can enhance this)
            this.updateStatsUI({
                totalProducts: productsResponse.pagination?.total || 0,
                totalOrders: ordersResponse.pagination?.total || 0,
                revenue: 0, // Would need a dedicated endpoint
                rating: this.storeInfo?.rating || 0
            });

        } catch (error) {
            console.error('[Vendor Dashboard] Error loading stats:', error);
        }
    }

    updateStatsUI(stats) {
        vdLog('Updating stats UI:', stats);
        // Update stat cards if they exist
        // This is a placeholder - you can enhance based on your HTML structure
    }

    async loadRecentOrders() {
        if (!this.storeId || this.storeStatus !== 'approved') {
            return;
        }
        try {
            vdLog('Loading recent orders...');

            const response = await this.apiClient.get(`/stores/${this.storeId}/orders`, {
                limit: 5,
                sort: '-createdAt'
            });

            if (response.success && response.data) {
                vdLog('Recent orders loaded:', response.data.length);
                this.renderRecentOrders(response.data);
            }
        } catch (error) {
            console.error('[Vendor Dashboard] Error loading recent orders:', error);
        }
    }

    renderRecentOrders(orders) {
        const container = document.getElementById('recent-orders-list');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Henüz sipariş yok</p>';
            return;
        }

        let html = '<div class="orders-list">';
        orders.forEach(order => {
            const statusColor = this.getOrderStatusColor(order.status);
            const statusLabel = this.getOrderStatusLabel(order.status);

            html += `
                <div class="order-item" style="padding: 1rem; border: 1px solid var(--vendor-border); border-radius: 8px; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; margin-bottom: 0.25rem;">Sipariş #${order.order_number}</div>
                            <div style="font-size: 0.9rem; opacity: 0.7;">${order.items?.length || 0} ürün - ${order.total} ${order.currency}</div>
                        </div>
                        <span style="background: ${statusColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.85rem;">
                            ${statusLabel}
                        </span>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    // ==========================================
    // SECTION DATA LOADING
    // ==========================================

    loadSectionData(sectionName) {
        vdLog(`Loading section data: ${sectionName}`);

        if (this.storeStatus !== 'approved') {
            vdLog('Section data request ignored because store is not approved yet.');
            return;
        }

        switch(sectionName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'products':
                this.loadProductsData();
                break;
            case 'orders':
                this.loadOrdersData();
                break;
            case 'inventory':
                this.loadInventoryData();
                break;
            case 'analytics':
                this.loadAnalyticsData();
                break;
            case 'returns':
                this.loadReturnsData();
                break;
            case 'earnings':
                this.loadEarningsData();
                break;
            case 'store':
                this.loadStoreData();
                break;
            case 'shipping':
                this.loadShippingData();
                break;
            case 'campaigns':
                this.loadCampaignsData();
                break;
            case 'seo':
                this.loadSeoData();
                break;
            case 'messages':
                this.loadMessagesData();
                break;
            case 'profile':
                this.loadProfileData();
                break;
            default:
                vdLog(`No loader for section: ${sectionName}`);
        }
    }

    async loadProductsData() {
        if (!this.storeId) {
            console.error('[Vendor Dashboard] Store ID yok!');
            const container = document.getElementById('products-list');
            if (container) {
                container.innerHTML = '<div style="text-align:center;padding:3rem;color:#dc2626;">❌ Mağaza bulunamadı!</div>';
            }
            return;
        }

        const container = document.getElementById('products-list');
        if (!container) {
            console.error('[Vendor Dashboard] products-list container bulunamadı!');
            return;
        }

        // Show loading
        container.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner"></div><p>Ürünler yükleniyor...</p></div>';

        try {
            vdLog('Loading products for store:', this.storeId);

            // For vendors, fetch ALL products (pending, approved, rejected, active, inactive)
            // We explicitly fetch all statuses for the vendor's own store
            const response = await this.apiClient.get('/products', {
                store_id: this.storeId,  // Backend expects snake_case
                limit: 50,
                includeAllStatuses: 'true'  // Query param must be string
            });

            vdLog('Products response:', response);

            // Handle different response structures
            const products = response.data || response;

            if (!products || products.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:3rem;color:#64748b;">
                        <div style="font-size:3rem;margin-bottom:1rem;">📦</div>
                        <h3 style="margin:0 0 0.5rem 0;">Henüz ürün yok</h3>
                        <p style="opacity:0.7;">Yukarıdaki "➕ Add New Product" butonuna tıklayarak ilk ürününüzü ekleyin</p>
                    </div>
                `;
                return;
            }

            // Render products in list/table style with inline edit
            let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';

            products.forEach(product => {
                const statusColor = product.status === 'approved' ? '#10b981' : product.status === 'pending' ? '#f59e0b' : '#dc2626';
                const statusBgColor = product.status === 'approved' ? '#dcfce7' : product.status === 'pending' ? '#fef3c7' : '#fee2e2';
                const statusLabel = product.status === 'approved' ? '✓ Onaylı' : product.status === 'pending' ? '⏳ Onay Bekliyor' : '✗ Reddedildi';
                const isActive = product.is_active;
                const isPending = product.status === 'pending';
                const isRejected = product.status === 'rejected';

                // Active/Inactive toggle styling
                let activeToggleText, activeToggleBg, activeToggleBorder, activeToggleColor, activeToggleDisabled;

                if (isPending) {
                    // Pending products: show "Beklemede" (waiting for approval)
                    activeToggleText = '⏳ Beklemede';
                    activeToggleBg = '#fef3c7';  // Yellow background
                    activeToggleBorder = '#f59e0b';
                    activeToggleColor = '#f59e0b';
                    activeToggleDisabled = true;  // Cannot toggle until approved
                } else if (isRejected) {
                    // Rejected products: show "Reddedildi" (rejected)
                    activeToggleText = '✗ Reddedildi';
                    activeToggleBg = '#fee2e2';  // Red background
                    activeToggleBorder = '#dc2626';
                    activeToggleColor = '#dc2626';
                    activeToggleDisabled = true;  // Cannot toggle if rejected
                } else {
                    // Approved products: can toggle active/inactive
                    activeToggleText = isActive ? '✓ Aktif' : '○ Pasif';
                    activeToggleBg = isActive ? '#dcfce7' : '#fff3cd';  // Green for active, yellow for passive
                    activeToggleBorder = isActive ? '#10b981' : '#f59e0b';
                    activeToggleColor = isActive ? '#10b981' : '#f59e0b';
                    activeToggleDisabled = false;
                }

                // Product row appearance
                let productBg, productBorder, productOpacity;

                if (isPending) {
                    // Pending: yellow tint
                    productBg = '#fffbeb';
                    productBorder = '#fef3c7';
                    productOpacity = '0.9';
                } else if (isRejected) {
                    // Rejected: red tint
                    productBg = '#fef2f2';
                    productBorder = '#fee2e2';
                    productOpacity = '0.7';
                } else if (!isActive) {
                    // Approved but inactive: gray
                    productBg = '#fafafa';
                    productBorder = '#e5e7eb';
                    productOpacity = '0.75';
                } else {
                    // Approved and active: normal
                    productBg = 'white';
                    productBorder = 'var(--vendor-border)';
                    productOpacity = '1';
                }

                html += `
                    <div class="product-row" data-product-id="${product.id}" style="
                        border: 2px solid ${productBorder};
                        border-radius: 12px;
                        background: ${productBg};
                        padding: 1rem;
                        display: grid;
                        grid-template-columns: 100px 1fr auto;
                        gap: 1.5rem;
                        align-items: center;
                        transition: all 0.3s ease;
                        opacity: ${productOpacity};
                    ">
                        <!-- Product Image -->
                        <div style="
                            width: 100px;
                            height: 100px;
                            background: #f8fafc;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            overflow: hidden;
                            border: 1px solid #e2e8f0;
                        ">
                            ${product.images && product.images.length > 0 ?
                                `<img src="${product.images[0]}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\"font-size: 2rem; opacity: 0.3;\\">🏺</div>';">` :
                                '<div style="font-size: 2rem; opacity: 0.3;">🏺</div>'
                            }
                        </div>

                        <!-- Product Info (Editable) -->
                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 1rem; align-items: center;">
                            <!-- Title -->
                            <div>
                                <label style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 0.25rem;">Ürün Adı</label>
                                <input type="text"
                                    class="product-edit-field"
                                    data-field="title"
                                    value="${product.title}"
                                    style="
                                        width: 100%;
                                        padding: 0.5rem 0.75rem;
                                        border: 1px solid #e2e8f0;
                                        border-radius: 6px;
                                        font-size: 0.95rem;
                                        font-weight: 600;
                                        color: var(--vendor-text);
                                        transition: all 0.2s;
                                    "
                                    onfocus="this.style.borderColor='var(--vendor-primary)'; this.style.boxShadow='0 0 0 3px rgba(45, 104, 83, 0.1)';"
                                    onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';"
                                >
                            </div>

                            <!-- Price -->
                            <div>
                                <label style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 0.25rem;">Fiyat (TL)</label>
                                <input type="number"
                                    class="product-edit-field"
                                    data-field="price"
                                    value="${product.price}"
                                    min="0"
                                    step="0.01"
                                    style="
                                        width: 100%;
                                        padding: 0.5rem 0.75rem;
                                        border: 1px solid #e2e8f0;
                                        border-radius: 6px;
                                        font-size: 0.95rem;
                                        font-weight: 700;
                                        color: var(--vendor-primary);
                                        transition: all 0.2s;
                                    "
                                    onfocus="this.style.borderColor='var(--vendor-primary)'; this.style.boxShadow='0 0 0 3px rgba(45, 104, 83, 0.1)';"
                                    onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';"
                                >
                            </div>

                            <!-- Stock -->
                            <div>
                                <label style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 0.25rem;">Stok</label>
                                <input type="number"
                                    class="product-edit-field"
                                    data-field="stock"
                                    value="${product.stock}"
                                    min="0"
                                    style="
                                        width: 100%;
                                        padding: 0.5rem 0.75rem;
                                        border: 1px solid #e2e8f0;
                                        border-radius: 6px;
                                        font-size: 0.95rem;
                                        font-weight: 600;
                                        color: ${product.stock > 0 ? '#10b981' : '#dc2626'};
                                        transition: all 0.2s;
                                    "
                                    onfocus="this.style.borderColor='var(--vendor-primary)'; this.style.boxShadow='0 0 0 3px rgba(45, 104, 83, 0.1)';"
                                    onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';"
                                >
                            </div>

                            <!-- Status & Active -->
                            <div>
                                <label style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 0.25rem;">Durum</label>
                                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <span style="background: ${statusBgColor}; color: ${statusColor}; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; text-align: center;">
                                        ${statusLabel}
                                    </span>
                                    <button class="toggle-active-btn" data-product-id="${product.id}" data-active="${isActive}" ${activeToggleDisabled ? 'disabled' : ''} style="
                                        padding: 0.4rem 0.8rem;
                                        border: 1px solid ${activeToggleBorder};
                                        background: ${activeToggleBg};
                                        color: ${activeToggleColor};
                                        border-radius: 6px;
                                        font-size: 0.8rem;
                                        font-weight: 600;
                                        cursor: ${activeToggleDisabled ? 'not-allowed' : 'pointer'};
                                        opacity: ${activeToggleDisabled ? '0.6' : '1'};
                                        transition: all 0.2s;
                                    ">
                                        ${activeToggleText}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; min-width: 120px;">
                            <button class="save-product-btn" data-product-id="${product.id}" style="
                                padding: 0.6rem 1rem;
                                background: var(--vendor-primary);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s;
                                font-size: 0.9rem;
                            " onmouseover="this.style.background='#1a4a3a';" onmouseout="this.style.background='var(--vendor-primary)';">
                                💾 Kaydet
                            </button>
                            <button class="delete-product-btn" data-product-id="${product.id}" style="
                                padding: 0.6rem 1rem;
                                background: #fee2e2;
                                color: #dc2626;
                                border: 1px solid #fca5a5;
                                border-radius: 8px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s;
                                font-size: 0.9rem;
                            " onmouseover="this.style.background='#fecaca';" onmouseout="this.style.background='#fee2e2';">
                                🗑️ Sil
                            </button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;

            // Attach event listeners for save, delete, and toggle buttons
            this.attachProductActionListeners();

            vdLog('Products rendered successfully:', products.length);

        } catch (error) {
            console.error('[Vendor Dashboard] Error loading products:', error);
            container.innerHTML = `
                <div style="color:#dc2626;padding:2rem;text-align:center;background:#fee2e2;border-radius:8px;">
                    <div style="font-size:2rem;margin-bottom:1rem;">⚠️</div>
                    <h3 style="margin:0 0 0.5rem 0;">Ürünler yüklenirken hata oluştu</h3>
                    <p style="opacity:0.8;margin:0;">${error.message}</p>
                </div>
            `;
        }
    }

    async loadOrdersData() {
        if (!this.storeId) {
            console.error('[Vendor Dashboard] Store ID yok!');
            const container = document.getElementById('orders-list');
            if (container) {
                container.innerHTML = '<div style="text-align:center;padding:3rem;color:#dc2626;">❌ Mağaza bulunamadı!</div>';
            }
            return;
        }

        const container = document.getElementById('orders-list');
        if (!container) {
            console.error('[Vendor Dashboard] orders-list container bulunamadı!');
            return;
        }

        // Show loading
        container.innerHTML = '<div style="text-align:center;padding:2rem;"><div class="spinner"></div><p>Siparişler yükleniyor...</p></div>';

        try {
            vdLog('Loading orders for store:', this.storeId);

            const response = await this.apiClient.get(`/stores/${this.storeId}/orders`, {
                limit: 50
            });

            vdLog('Orders response:', response);

            // Handle different response structures
            const orders = response.data || response;

            if (!orders || orders.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:3rem;color:#64748b;">
                        <div style="font-size:3rem;margin-bottom:1rem;">📦</div>
                        <h3 style="margin:0 0 0.5rem 0;">Henüz sipariş yok</h3>
                        <p style="opacity:0.7;">İlk siparişiniz geldiğinde burada görünecek</p>
                    </div>
                `;
                return;
            }

            // Render orders table
            let html = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; background: white;">
                        <thead>
                            <tr style="background: rgba(45, 104, 83, 0.1); border-bottom: 2px solid var(--vendor-border);">
                                <th style="padding: 1rem; text-align: left; font-weight: 600;">Sipariş No</th>
                                <th style="padding: 1rem; text-align: left; font-weight: 600;">Müşteri</th>
                                <th style="padding: 1rem; text-align: center; font-weight: 600;">Ürün</th>
                                <th style="padding: 1rem; text-align: right; font-weight: 600;">Tutar</th>
                                <th style="padding: 1rem; text-align: center; font-weight: 600;">Durum</th>
                                <th style="padding: 1rem; text-align: left; font-weight: 600;">Tarih</th>
                                <th style="padding: 1rem; text-align: center; font-weight: 600;">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            orders.forEach(order => {
                const statusColor = this.getOrderStatusColor(order.status);
                const statusLabel = this.getOrderStatusLabel(order.status);
                const date = new Date(order.createdAt || order.created_at).toLocaleDateString('tr-TR');
                const customerName = order.customer
                    ? `${order.customer.first_name} ${order.customer.last_name}`
                    : order.User
                        ? `${order.User.first_name || order.User.firstName || ''} ${order.User.last_name || order.User.lastName || ''}`.trim()
                        : 'Misafir';

                // Get next available statuses for this order
                const nextStatuses = this.getNextOrderStatuses(order.status);

                html += `
                    <tr style="border-bottom: 1px solid var(--vendor-border); transition: background 0.2s;" data-order-id="${order.id}">
                        <td style="padding: 1rem; font-weight: 600; color: var(--vendor-primary);">#${order.order_number || order.orderNumber || order.id}</td>
                        <td style="padding: 1rem;">${customerName}</td>
                        <td style="padding: 1rem; text-align: center;">${order.items?.length || order.order_items?.length || 0}</td>
                        <td style="padding: 1rem; text-align: right; font-weight: 700; color: var(--vendor-primary);">${order.total || order.total_amount || order.totalAmount || 0} ${order.currency || 'TL'}</td>
                        <td style="padding: 1rem; text-align: center;">
                            <span style="background: ${statusColor}; color: white; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; white-space: nowrap;">
                                ${statusLabel}
                            </span>
                        </td>
                        <td style="padding: 1rem; color: #64748b;">${date}</td>
                        <td style="padding: 1rem; text-align: center;">
                            ${nextStatuses.length > 0 ? `
                                <select class="order-status-select" data-order-id="${order.id}" data-current-status="${order.status}" style="
                                    padding: 0.4rem 0.8rem;
                                    border: 2px solid var(--vendor-border);
                                    border-radius: 6px;
                                    font-size: 0.85rem;
                                    cursor: pointer;
                                    background: white;
                                    color: var(--vendor-text);
                                    transition: all 0.2s;
                                ">
                                    <option value="">Durum Değiştir</option>
                                    ${nextStatuses.map(status => `<option value="${status}">${this.getOrderStatusLabel(status)}</option>`).join('')}
                                </select>
                            ` : '<span style="color: #64748b; font-size: 0.85rem;">-</span>'}
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = html;
            vdLog('Orders rendered successfully:', orders.length);

            // Attach event listeners to status selects
            this.attachOrderStatusListeners();

        } catch (error) {
            console.error('[Vendor Dashboard] Error loading orders:', error);
            container.innerHTML = `
                <div style="color:#dc2626;padding:2rem;text-align:center;background:#fee2e2;border-radius:8px;">
                    <div style="font-size:2rem;margin-bottom:1rem;">⚠️</div>
                    <h3 style="margin:0 0 0.5rem 0;">Siparişler yüklenirken hata oluştu</h3>
                    <p style="opacity:0.8;margin:0;">${error.message}</p>
                </div>
            `;
        }
    }

    // Other section loaders
    async loadInventoryData() {
        vdLog('Loading inventory...');
        const container = document.querySelector('#inventory-section');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:4rem;color:#64748b;">
                    <div style="font-size:4rem;margin-bottom:1rem;">📦</div>
                    <h3 style="margin:0 0 0.5rem 0;">Envanter Yönetimi</h3>
                    <p style="opacity:0.7;">Gelişmiş envanter yönetimi özelliği yakında eklenecek</p>
                </div>
            `;
        }
    }

    async loadAnalyticsData() {
        vdLog('Loading analytics...');
        const container = document.querySelector('#analytics-section');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:4rem;color:#64748b;">
                    <div style="font-size:4rem;margin-bottom:1rem;">📊</div>
                    <h3 style="margin:0 0 0.5rem 0;">Analitik Raporları</h3>
                    <p style="opacity:0.7;">Detaylı satış analitiği ve raporlar yakında eklenecek</p>
                </div>
            `;
        }
    }

    async loadReturnsData() {
        vdLog('Loading returns...');
        const container = document.querySelector('#returns-section');
        if (!container || !this.storeId) return;

        try {
            // Show loading state
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <div class="spinner"></div>
                    <p>İade talepleri yükleniyor...</p>
                </div>
            `;

            // Fetch returns from API
            const response = await this.apiClient.get(`/returns/stores/${this.storeId}`);
            const returns = response.data || [];

            vdLog('Loaded', returns.length, 'returns');

            // Render returns
            this.renderReturns(returns);
        } catch (error) {
            console.error('[Vendor Dashboard] Error loading returns:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #dc2626;">
                    <p>İade talepleri yüklenirken bir hata oluştu.</p>
                    <button onclick="vendorDashboard.loadReturnsData()" 
                            style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--vendor-primary); color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                        Tekrar Dene
                    </button>
                </div>
            `;
        }
    }

    renderReturns(returns) {
        const container = document.querySelector('#returns-section');
        if (!container) return;

        // Stats by status
        const stats = {
            pending: returns.filter(r => r.status === 'pending').length,
            approved: returns.filter(r => r.status === 'approved').length,
            items_received: returns.filter(r => r.status === 'items_received').length,
            refund_processed: returns.filter(r => r.status === 'refund_processed').length,
            completed: returns.filter(r => r.status === 'completed').length,
            rejected: returns.filter(r => r.status === 'rejected').length,
        };

        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h2 style="margin: 0 0 0.5rem 0; color: var(--vendor-primary);">İade Talepleri</h2>
                <p style="margin: 0; opacity: 0.8;">Müşterilerinizden gelen iade taleplerini yönetin</p>
            </div>

            <!-- Stats Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div class="vendor-card" style="padding: 1rem;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">⏳</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">${stats.pending}</div>
                    <div style="opacity: 0.7; font-size: 0.875rem;">Bekleyen</div>
                </div>
                <div class="vendor-card" style="padding: 1rem;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">✓</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">${stats.approved}</div>
                    <div style="opacity: 0.7; font-size: 0.875rem;">Onaylanan</div>
                </div>
                <div class="vendor-card" style="padding: 1rem;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📦</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">${stats.items_received}</div>
                    <div style="opacity: 0.7; font-size: 0.875rem;">Ürün Alındı</div>
                </div>
                <div class="vendor-card" style="padding: 1rem;">
                    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">✅</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">${stats.completed}</div>
                    <div style="opacity: 0.7; font-size: 0.875rem;">Tamamlanan</div>
                </div>
            </div>

            ${returns.length > 0 ? `
                <!-- Returns List -->
                <div class="vendor-card">
                    <h3 style="margin: 0 0 1.5rem 0;">Tüm İade Talepleri</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--vendor-border);">
                                    <th style="padding: 1rem; text-align: left;">İade No</th>
                                    <th style="padding: 1rem; text-align: left;">Müşteri</th>
                                    <th style="padding: 1rem; text-align: left;">Sipariş</th>
                                    <th style="padding: 1rem; text-align: left;">Sebep</th>
                                    <th style="padding: 1rem; text-align: right;">Tutar</th>
                                    <th style="padding: 1rem; text-align: center;">Durum</th>
                                    <th style="padding: 1rem; text-align: center;">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${returns.map(ret => `
                                    <tr style="border-bottom: 1px solid var(--vendor-border);">
                                        <td style="padding: 1rem;">
                                            <strong>${ret.return_number}</strong>
                                            <div style="font-size: 0.75rem; opacity: 0.7;">${new Date(ret.created_at).toLocaleDateString('tr-TR')}</div>
                                        </td>
                                        <td style="padding: 1rem;">
                                            ${ret.customer.first_name} ${ret.customer.last_name}
                                            <div style="font-size: 0.75rem; opacity: 0.7;">${ret.customer.email}</div>
                                        </td>
                                        <td style="padding: 1rem;">
                                            <strong>#${ret.order.order_number}</strong>
                                        </td>
                                        <td style="padding: 1rem;">
                                            ${this.formatReturnReason(ret.reason)}
                                        </td>
                                        <td style="padding: 1rem; text-align: right; font-weight: 600;">
                                            ₺${ret.refund_amount}
                                        </td>
                                        <td style="padding: 1rem; text-align: center;">
                                            ${this.getReturnStatusBadge(ret.status)}
                                        </td>
                                        <td style="padding: 1rem; text-align: center;">
                                            <button 
                                                onclick="vendorDashboard.viewReturnDetail('${ret.id}')"
                                                style="padding: 0.5rem 1rem; background: var(--vendor-primary); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem; margin-right: 0.5rem;"
                                            >
                                                Detay
                                            </button>
                                            ${ret.status === 'pending' ? `
                                                <button 
                                                    onclick="vendorDashboard.approveReturn('${ret.id}')"
                                                    style="padding: 0.5rem 1rem; background: #22c55e; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem; margin-right: 0.5rem;"
                                                >
                                                    Onayla
                                                </button>
                                                <button 
                                                    onclick="vendorDashboard.rejectReturn('${ret.id}')"
                                                    style="padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;"
                                                >
                                                    Reddet
                                                </button>
                                            ` : ret.status === 'approved' ? `
                                                <button 
                                                    onclick="vendorDashboard.markItemsReceived('${ret.id}')"
                                                    style="padding: 0.5rem 1rem; background: #f59e0b; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;"
                                                >
                                                    Ürün Alındı
                                                </button>
                                            ` : ret.status === 'items_received' ? `
                                                <button 
                                                    onclick="vendorDashboard.processRefund('${ret.id}')"
                                                    style="padding: 0.5rem 1rem; background: #8b5cf6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;"
                                                >
                                                    İade Yap
                                                </button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : `
                <div class="vendor-card" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                    <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">Henüz iade talebi yok</p>
                    <p style="font-size: 0.875rem; opacity: 0.7;">Müşterilerinizden iade talebi geldiğinde burada görünecek.</p>
                </div>
            `}
        `;
    }

    formatReturnReason(reason) {
        const reasonMap = {
            defective: 'Kusurlu Ürün',
            wrong_item: 'Yanlış Ürün',
            not_as_described: 'Açıklamaya Uymuyor',
            damaged: 'Hasarlı',
            changed_mind: 'Fikir Değişikliği',
            better_price_elsewhere: 'Fiyat',
            other: 'Diğer',
        };
        return reasonMap[reason] || reason;
    }

    getReturnStatusBadge(status) {
        const statusMap = {
            pending: { label: 'Beklemede', class: 'background: #fef3c7; color: #92400e;' },
            approved: { label: 'Onaylandı', class: 'background: #dcfce7; color: #166534;' },
            rejected: { label: 'Reddedildi', class: 'background: #fee2e2; color: #991b1b;' },
            items_received: { label: 'Ürün Alındı', class: 'background: #e0e7ff; color: #3730a3;' },
            refund_processed: { label: 'İade Yapıldı', class: 'background: #d1fae5; color: #065f46;' },
            completed: { label: 'Tamamlandı', class: 'background: #dcfce7; color: #14532d;' },
            cancelled: { label: 'İptal', class: 'background: #f3f4f6; color: #374151;' },
        };

        const statusInfo = statusMap[status] || { label: status, class: 'background: #f3f4f6; color: #374151;' };
        return `<span style="padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 500; ${statusInfo.class}">${statusInfo.label}</span>`;
    }

    async viewReturnDetail(returnId) {
        try {
            const response = await this.apiClient.get(`/returns/${returnId}`);
            const ret = response.data;

            const items = ret.items.map(item => `
                • ${item.product_title} × ${item.quantity} - ₺${item.refund_amount}
            `).join('\n');

            alert(
                `İade Detayı\n\n` +
                `İade No: ${ret.return_number}\n` +
                `Müşteri: ${ret.customer.first_name} ${ret.customer.last_name}\n` +
                `Sipariş: #${ret.order.order_number}\n` +
                `Durum: ${this.formatReturnReason(ret.reason)}\n\n` +
                `Açıklama:\n${ret.description}\n\n` +
                `Ürünler:\n${items}\n\n` +
                `İade Tutarı: ₺${ret.refund_amount}`
            );
        } catch (error) {
            console.error('[Vendor Dashboard] Error loading return detail:', error);
            alert('İade detayı yüklenirken bir hata oluştu.');
        }
    }

    async approveReturn(returnId) {
        const response = prompt('İadeyi onaylıyor musunuz? Müşteriye bir mesaj bırakabilirsiniz (opsiyonel):');
        if (response === null) return; // Cancelled

        try {
            await this.apiClient.patch(`/returns/${returnId}/status`, {
                status: 'approved',
                store_response: response || 'İade talebiniz onaylandı. Lütfen ürünleri kargo ile gönderin.',
            });

            this.showSuccess('İade talebi onaylandı!');
            await this.loadReturnsData();
        } catch (error) {
            console.error('[Vendor Dashboard] Error approving return:', error);
            alert('İade onaylanırken bir hata oluştu: ' + error.message);
        }
    }

    async rejectReturn(returnId) {
        const reason = prompt('İadeyi reddetme sebebinizi belirtiniz:');
        if (!reason) return;

        try {
            await this.apiClient.patch(`/returns/${returnId}/status`, {
                status: 'rejected',
                store_response: reason,
            });

            this.showSuccess('İade talebi reddedildi.');
            await this.loadReturnsData();
        } catch (error) {
            console.error('[Vendor Dashboard] Error rejecting return:', error);
            alert('İade reddedilirken bir hata oluştu: ' + error.message);
        }
    }

    async markItemsReceived(returnId) {
        const trackingNumber = prompt('Kargo takip numarasını giriniz (opsiyonel):');
        if (trackingNumber === null) return; // Cancelled

        const carrier = trackingNumber ? prompt('Kargo firması:') : null;

        try {
            await this.apiClient.patch(`/returns/${returnId}/status`, {
                status: 'items_received',
                tracking_number: trackingNumber || undefined,
                carrier: carrier || undefined,
            });

            this.showSuccess('Ürün teslim alındı olarak işaretlendi!');
            await this.loadReturnsData();
        } catch (error) {
            console.error('[Vendor Dashboard] Error marking items received:', error);
            alert('İşlem sırasında bir hata oluştu: ' + error.message);
        }
    }

    async processRefund(returnId) {
        if (!confirm('İade işlemini gerçekleştirmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
            return;
        }

        try {
            await this.apiClient.patch(`/returns/${returnId}/status`, {
                status: 'refund_processed',
            });

            this.showSuccess('İade işlemi tamamlandı! Ürün stoğa geri eklendi.');
            await this.loadReturnsData();
        } catch (error) {
            console.error('[Vendor Dashboard] Error processing refund:', error);
            alert('İade işlenirken bir hata oluştu: ' + error.message);
        }
    }

    async loadStoreData() {
        vdLog('Loading store management...');
        const container = document.querySelector('#store-section');
        if (container) {
            // Already has content in HTML
            vdLog('Store section already has static content');
        }
    }

    async loadShippingData() {
        vdLog('Loading shipping...');
        const container = document.querySelector('#shipping-section');
        if (!container) return;

        try {
            // Get pending shipments (orders that are processing or paid)
            const ordersResponse = await this.apiClient.get(`/orders?storeId=${this.storeId}`);
            const orders = ordersResponse.success ? ordersResponse.data.orders || [] : [];
            
            // Filter orders that need shipping
            const needsShipping = orders.filter(o => 
                o.status === 'paid' || o.status === 'processing'
            );

            container.innerHTML = `
                <div style="margin-bottom: 2rem;">
                    <h2 style="margin: 0 0 0.5rem 0; color: var(--vendor-primary);">🚚 Kargo Yönetimi</h2>
                    <p style="margin: 0; opacity: 0.8;">Siparişleriniz için kargo oluşturun ve takip edin</p>
                </div>

                ${needsShipping.length > 0 ? `
                    <div class="vendor-card">
                        <h3 style="margin: 0 0 1rem 0;">📦 Kargo Bekleyen Siparişler (${needsShipping.length})</h3>
                        <div id="ordersNeedingShipment"></div>
                    </div>
                ` : `
                    <div class="vendor-card" style="text-align:center;padding:3rem;">
                        <div style="font-size:3rem;margin-bottom:1rem;opacity:0.5;">✅</div>
                        <h3 style="margin:0 0 0.5rem 0;color:#10b981;">Harika!</h3>
                        <p style="opacity:0.7;margin:0;">Şu anda kargo bekleyen sipariş yok</p>
                    </div>
                `}

                <div class="vendor-card" style="margin-top:2rem;">
                    <h3 style="margin: 0 0 1rem 0;">ℹ️ Kargo Nasıl Oluşturulur?</h3>
                    <ol style="opacity:0.8;line-height:1.8;">
                        <li>Sipariş "Processing" durumuna geldiğinde kargo oluşturabilirsiniz</li>
                        <li>"Create Shipment" butonuna tıklayın</li>
                        <li>Kargo seçeneklerini görün (STANDARD veya EXPRESS)</li>
                        <li>Bir seçenek seçin ve onaylayın</li>
                        <li>Takip numaranız otomatik oluşturulacak</li>
                        <li>Sipariş otomatik olarak "Shipped" durumuna geçecek</li>
                    </ol>
                </div>
            `;

            // Render orders needing shipment
            if (needsShipping.length > 0) {
                const ordersContainer = document.getElementById('ordersNeedingShipment');
                ordersContainer.innerHTML = needsShipping.map(order => `
                    <div style="border:1px solid var(--vendor-border);border-radius:8px;padding:1.5rem;margin-bottom:1rem;">
                        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem;">
                            <div>
                                <div style="font-weight:600;font-size:1.1rem;margin-bottom:0.5rem;">
                                    Sipariş #${order.order_number}
                                </div>
                                <div style="font-size:0.9rem;opacity:0.7;">
                                    📅 ${new Date(order.created_at).toLocaleDateString('tr-TR')}
                                </div>
                                <div style="font-size:0.9rem;opacity:0.7;">
                                    💰 ${order.currency} ${parseFloat(order.total).toFixed(2)}
                                </div>
                                <div style="font-size:0.9rem;opacity:0.7;margin-top:0.5rem;">
                                    📦 ${order.items?.length || 0} ürün
                                </div>
                            </div>
                            <span style="background:${order.status === 'processing' ? '#fef3c7' : '#dbeafe'};
                                         color:${order.status === 'processing' ? '#92400e' : '#1e40af'};
                                         padding:0.25rem 0.75rem;border-radius:12px;font-size:0.85rem;font-weight:500;">
                                ${this.getOrderStatusLabel(order.status)}
                            </span>
                        </div>

                        <div style="background:rgba(45,104,83,0.05);padding:1rem;border-radius:6px;margin-bottom:1rem;">
                            <div style="font-weight:600;margin-bottom:0.5rem;">📍 Teslimat Adresi:</div>
                            <div style="font-size:0.9rem;opacity:0.8;line-height:1.6;">
                                ${order.shipping_address?.full_name || 'N/A'}<br>
                                ${order.shipping_address?.address_line1 || ''}<br>
                                ${order.shipping_address?.city || ''} ${order.shipping_address?.postal_code || ''}<br>
                                ${order.shipping_address?.country || ''}
                            </div>
                        </div>

                        <button class="vendor-btn primary" 
                                onclick="vendorDashboard.createShipmentForOrder('${order.id}')"
                                style="width:100%;">
                            🚚 Create Shipment
                        </button>
                    </div>
                `).join('');
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error loading shipping:', error);
            container.innerHTML = `
                <div class="vendor-card" style="text-align:center;padding:3rem;color:#ef4444;">
                    <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
                    <h3 style="margin:0 0 0.5rem 0;">Hata</h3>
                    <p style="opacity:0.8;margin:0;">Kargo bilgileri yüklenemedi: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Create shipment for order
     */
    async createShipmentForOrder(orderId) {
        try {
            vdLog('Creating shipment for order:', orderId);

            // Get order details
            const orderResponse = await this.apiClient.get(`/orders/${orderId}`);
            if (!orderResponse.success) {
                throw new Error('Sipariş bilgileri alınamadı');
            }
            const order = orderResponse.data;

            // Calculate total weight (estimate 0.5kg per item)
            const totalWeight = (order.items?.length || 1) * 0.5;

            // Get shipping rates
            this.showInfo('⏳ Kargo fiyatları hesaplanıyor...');
            const ratesResponse = await this.apiClient.post('/shipping/rates', {
                orderId: order.id,
                storeId: this.storeId,
                destination: {
                    fullName: order.shipping_address?.full_name || 'Customer',
                    phone: order.shipping_address?.phone || '0000000000',
                    country: order.shipping_address?.country || 'Turkey',
                    city: order.shipping_address?.city || 'Istanbul',
                    district: order.shipping_address?.state || '',
                    postalCode: order.shipping_address?.postal_code || '',
                    addressLine1: order.shipping_address?.address_line1 || '',
                    addressLine2: order.shipping_address?.address_line2 || '',
                },
                totalWeight: totalWeight,
                dimensions: { length: 20, width: 15, height: 10 },
            });

            if (!ratesResponse.success) {
                throw new Error('Kargo fiyatları alınamadı');
            }

            const rates = ratesResponse.data.rates || [];
            
            // Show rate selection modal
            const selectedRate = await this.showRateSelectionModal(rates, order);
            if (!selectedRate) return; // User cancelled

            // Create shipment
            this.showInfo('⏳ Kargo oluşturuluyor...');
            const shipmentResponse = await this.apiClient.post(`/shipping/stores/${this.storeId}/shipments`, {
                orderId: order.id,
                storeId: this.storeId,
                destination: {
                    fullName: order.shipping_address?.full_name || 'Customer',
                    phone: order.shipping_address?.phone || '0000000000',
                    country: order.shipping_address?.country || 'Turkey',
                    city: order.shipping_address?.city || 'Istanbul',
                    district: order.shipping_address?.state || '',
                    postalCode: order.shipping_address?.postal_code || '',
                    addressLine1: order.shipping_address?.address_line1 || '',
                    addressLine2: order.shipping_address?.address_line2 || '',
                },
                totalWeight: totalWeight,
                selectedRate: selectedRate,
                items: (order.items || []).map(item => ({
                    orderItemId: item.id,
                    qty: item.quantity,
                })),
            });

            if (!shipmentResponse.success) {
                throw new Error(shipmentResponse.message || 'Kargo oluşturulamadı');
            }

            const shipment = shipmentResponse.data;
            
            // Success!
            this.showSuccess(`✅ Kargo başarıyla oluşturuldu!<br>
                             📋 Takip No: <strong>${shipment.tracking_number}</strong><br>
                             🚚 Kargo: ${shipment.carrier} - ${shipment.service}<br>
                             💰 Ücret: ${shipment.currency} ${shipment.cost}`);

            // Reload shipping data
            await this.loadShippingData();

        } catch (error) {
            console.error('[Vendor Dashboard] Create shipment error:', error);
            this.showError('Kargo oluşturulurken hata: ' + error.message);
        }
    }

    /**
     * Show rate selection modal
     */
    async showRateSelectionModal(rates, order) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            `;

            modal.innerHTML = `
                <div style="background:white;border-radius:12px;padding:2rem;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;">
                    <h3 style="margin:0 0 1rem 0;color:var(--vendor-primary);">🚚 Kargo Seçeneğini Seçin</h3>
                    <div style="background:rgba(45,104,83,0.1);padding:1rem;border-radius:8px;margin-bottom:1.5rem;">
                        <div style="font-weight:600;margin-bottom:0.5rem;">Sipariş: ${order.order_number}</div>
                        <div style="font-size:0.9rem;opacity:0.8;">Toplam: ${order.currency} ${parseFloat(order.total).toFixed(2)}</div>
                    </div>
                    ${rates.map((rate, index) => `
                        <div class="rate-option" data-rate-index="${index}" style="
                            border: 2px solid var(--vendor-border);
                            border-radius: 8px;
                            padding: 1.5rem;
                            margin-bottom: 1rem;
                            cursor: pointer;
                            transition: all 0.2s;
                        " onmouseover="this.style.borderColor='var(--vendor-primary)';this.style.background='rgba(45,104,83,0.05)';"
                           onmouseout="this.style.borderColor='var(--vendor-border)';this.style.background='white';">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                                <div style="font-weight:600;font-size:1.1rem;">${rate.carrier}</div>
                                <div style="font-weight:700;color:var(--vendor-primary);font-size:1.2rem;">
                                    ${rate.currency} ${rate.amount}
                                </div>
                            </div>
                            <div style="font-size:0.9rem;color:#666;">
                                ${rate.service === 'STANDARD' ? '📦 Standart Teslimat' : '⚡ Hızlı Teslimat'}
                            </div>
                            <div style="font-size:0.85rem;color:#666;margin-top:0.5rem;">
                                ⏱️ Tahmini: ${rate.etaDays} gün
                            </div>
                        </div>
                    `).join('')}
                    <button onclick="this.closest('[style*=fixed]').remove()" 
                            style="width:100%;padding:1rem;background:#dc2626;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;margin-top:1rem;">
                        İptal
                    </button>
                </div>
            `;

            document.body.appendChild(modal);

            // Rate selection handler
            modal.querySelectorAll('.rate-option').forEach((el, index) => {
                el.onclick = () => {
                    resolve(rates[index]);
                    modal.remove();
                };
            });

            // Close on backdrop click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    resolve(null);
                    modal.remove();
                }
            };
        });
    }

    // ===========================================
    // EARNINGS MANAGEMENT
    // ===========================================

    async loadEarningsData() {
        try {
            vdLog('Loading earnings...');

            const userStore = this.currentUser.store;
            if (!userStore || !userStore.id) {
                throw new Error('Mağaza bilgisi bulunamadı');
            }

            // Get date range (last 30 days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            // Fetch earnings summary
            const summaryRes = await fetch(
                `${this.apiClient.baseURL}/commissions/store/${userStore.id}/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiClient.getAuthToken()}`
                    }
                }
            );

            if (!summaryRes.ok) throw new Error('Failed to fetch earnings summary');
            const summaryData = await summaryRes.json();

            // Fetch commission transactions
            const transactionsRes = await fetch(
                `${this.apiClient.baseURL}/commissions/store/${userStore.id}?limit=50`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiClient.getAuthToken()}`
                    }
                }
            );

            if (!transactionsRes.ok) throw new Error('Failed to fetch commissions');
            const transactionsData = await transactionsRes.json();

            this.renderEarningsSummary(summaryData.data);
            this.renderEarningsTransactions(transactionsData.data);

        } catch (error) {
            console.error('[Vendor Dashboard] Error loading earnings:', error);
            alert('Kazanç verileri yüklenirken hata oluştu: ' + error.message);
        }
    }

    renderEarningsSummary(summary) {
        const container = document.getElementById('earnings-summary');
        if (!container) return;

        const totalSales = parseFloat(summary.total_sales || 0).toFixed(2);
        const commission = parseFloat(summary.total_commission || 0).toFixed(2);
        const myEarnings = parseFloat(summary.total_seller_amount || 0).toFixed(2);
        const avgRate = parseFloat(summary.average_commission_rate || 0).toFixed(1);

        container.innerHTML = `
            <div class="vendor-card" style="background: linear-gradient(135deg, #2d6853 0%, #1e4836 100%); color: white;">
                <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">💰 My Total Earnings</div>
                <div style="font-size: 2.25rem; font-weight: 800;">₺${myEarnings}</div>
                <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.5rem;">After commission</div>
            </div>
            <div class="vendor-card" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;">
                <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">📊 Total Sales</div>
                <div style="font-size: 2.25rem; font-weight: 800;">₺${totalSales}</div>
                <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.5rem;">${summary.transaction_count || 0} orders</div>
            </div>
            <div class="vendor-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;">
                <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">💸 Platform Fee</div>
                <div style="font-size: 2.25rem; font-weight: 800;">₺${commission}</div>
                <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.5rem;">Avg ${avgRate}% commission</div>
            </div>
        `;
    }

    renderEarningsTransactions(transactions) {
        const container = document.getElementById('earnings-transactions');
        if (!container) return;

        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">Henüz komisyon kaydı bulunmamaktadır.</p>';
            return;
        }

        let html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(45, 104, 83, 0.1); border-bottom: 2px solid #e0e0e0;">
                        <th style="padding: 1rem; text-align: left;">Order</th>
                        <th style="padding: 1rem; text-align: right;">Order Total</th>
                        <th style="padding: 1rem; text-align: center;">Commission</th>
                        <th style="padding: 1rem; text-align: right; color: var(--vendor-primary); font-weight: 700;">My Earnings</th>
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
                'calculated': 'Bekliyor',
                'paid_to_seller': 'Ödendi',
                'refunded': 'İade',
                'cancelled': 'İptal'
            };

            html += `
                <tr style="border-bottom: 1px solid #e0e0e0;">
                    <td style="padding: 1rem;">
                        <span style="font-family: monospace; font-size: 0.9rem;">${t.order?.order_number || 'N/A'}</span>
                    </td>
                    <td style="padding: 1rem; text-align: right; font-weight: 600;">
                        ₺${parseFloat(t.order_total).toFixed(2)}
                    </td>
                    <td style="padding: 1rem; text-align: center;">
                        <span style="color: #f59e0b; font-weight: 600;">-₺${parseFloat(t.commission_amount).toFixed(2)}</span>
                        <div style="font-size: 0.75rem; opacity: 0.7;">(${t.commission_rate}%)</div>
                    </td>
                    <td style="padding: 1rem; text-align: right; font-weight: 700; color: var(--vendor-primary); font-size: 1.1rem;">
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

    async loadSeoData() {
        vdLog('Loading SEO...');
        const container = document.querySelector('#seo-section');
        if (container) {
            // Already has content in HTML
            vdLog('SEO section already has static content');
        }
    }

    async loadMessagesData() {
        vdLog('Loading messages...');
        const container = document.querySelector('#messages-section');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:4rem;color:#64748b;">
                    <div style="font-size:4rem;margin-bottom:1rem;">💬</div>
                    <h3 style="margin:0 0 0.5rem 0;">Mesajlar</h3>
                    <p style="opacity:0.7;">Müşteri mesajlaşma sistemi yakında eklenecek</p>
                </div>
            `;
        }
    }

    async loadProfileData() {
        vdLog('Loading profile...');
        const container = document.querySelector('#profile-section');
        if (container) {
            const user = this.user || AuthManager.getUser();
            container.innerHTML = `
                <div class="vendor-card">
                    <h3 style="margin:0 0 1.5rem 0;color:var(--vendor-primary);">👤 Profil Bilgileri</h3>
                    <div style="display:grid;gap:1rem;">
                        <div style="padding:1rem;background:#f8fafc;border-radius:8px;">
                            <div style="font-size:0.85rem;opacity:0.7;margin-bottom:0.25rem;">İsim</div>
                            <div style="font-weight:600;">${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}</div>
                        </div>
                        <div style="padding:1rem;background:#f8fafc;border-radius:8px;">
                            <div style="font-size:0.85rem;opacity:0.7;margin-bottom:0.25rem;">Email</div>
                            <div style="font-weight:600;">${user.email || ''}</div>
                        </div>
                        <div style="padding:1rem;background:#f8fafc;border-radius:8px;">
                            <div style="font-size:0.85rem;opacity:0.7;margin-bottom:0.25rem;">Rol</div>
                            <div style="font-weight:600;">${user.role === 'seller' ? 'Satıcı' : user.role === 'admin' ? 'Yönetici' : user.role || ''}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

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

    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="spinner"></div><p>Yükleniyor...</p></div>';
        }
    }

    hideLoading(containerId) {
        // Loading is automatically hidden when content is rendered
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
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

    // ==========================================
    // NAVIGATION
    // ==========================================

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
        vdLog(`Switching to section: ${sectionName}`);

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none'; // Force hide with inline style
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block'; // Force show with inline style
            this.currentSection = sectionName;

            // Load section data
            this.loadSectionData(sectionName);
        } else {
            console.error(`[Vendor Dashboard] Section not found: ${sectionName}-section`);
        }
    }

    updateActiveMenuItem(activeItem) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    // ==========================================
    // UI COMPONENTS
    // ==========================================

    displayUserInfo() {
        const user = AuthManager.getUser();
        if (!user) return;

        // Update user name
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = `${user.first_name} ${user.last_name}`;
        });

        // Update user email
        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(el => {
            el.textContent = user.email;
        });

        vdLog('User info displayed');
    }

    setupNotifications() {
        // Notification system setup
        vdLog('Notifications setup complete');
    }

    setupTheme() {
        // Theme management
        const savedTheme = localStorage.getItem('vendorTheme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                    vdLog('Logging out...');
                    AuthManager.logout(false);
                    window.location.href = 'login.html';
                }
            });
            vdLog('Logout button configured');
        }
    }

    // ==========================================
    // PRODUCT MODAL & MANAGEMENT
    // ==========================================

    setupProductModal() {
        const addProductBtn = document.getElementById('addProductBtn');
        const modal = document.getElementById('productModal');
        const closeModal = document.getElementById('closeProductModal');
        const cancelBtn = document.getElementById('cancelProductBtn');
        const productForm = document.getElementById('productForm');

        // Open modal
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                this.openProductModal();
            });
        }

        // Close modal
        const closeModalFunc = () => {
            modal.style.display = 'none';
            productForm.reset();
        };

        if (closeModal) {
            closeModal.addEventListener('click', closeModalFunc);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModalFunc);
        }

        // Close on background click
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModalFunc();
            }
        });

        // Form submission
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createProduct();
            });
        }

        // SEO character counters
        this.setupSEOCounters();

        const categorySelect = document.getElementById('productCategory');
        if (categorySelect) {
            categorySelect.addEventListener('change', async () => {
                const categoryId = categorySelect.value;
                if (categoryId) {
                    vdVariantLog(`Fetching variants for category: ${categoryId}`);
                    const variants = await this.loadCategoryVariantsForForm(categoryId);
                    vdVariantLog(`Loaded ${variants?.length || 0} variants for category: ${categoryId}`);
                    this.renderVariantSelectors(variants || []);
                } else {
                    vdVariantLog('No category selected');
                    this.renderVariantSelectors([]);
                }
            });
        }

        vdLog('Product modal configured');
    }

    openProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    async loadCategories() {
        try {
            vdLog('Loading categories...');

            const response = await this.apiClient.getTopLevelCategories();

            if (response.success && response.data) {
                this.categories = response.data;
                this.populateCategoryDropdown();
                vdLog('Categories loaded:', this.categories.length);
            }
        } catch (error) {
            console.error('[Vendor Dashboard] Error loading categories:', error);
        }
    }

    populateCategoryDropdown() {
        const categorySelect = document.getElementById('productCategory');
        if (!categorySelect || !this.categories) return;

        // Clear existing options (keep the first placeholder)
        categorySelect.innerHTML = '<option value="">Select a category...</option>';

        // Add categories
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.icon || '📦'} ${category.name}`;
            categorySelect.appendChild(option);
        });
    }

    async loadCategoryVariantsForForm(categoryId) {
        try {
            vdVariantLog('Fetching variants for category:', categoryId);
            const res = await this.apiClient.get(`/categories/${categoryId}/variants`);
            vdVariantLog('API response:', res);
            if (res && res.success) {
                vdVariantLog('Returning', res.data?.length || 0, 'variants');
                return res.data;
            }
            console.warn('[Variant] API returned no success');
            return [];
        } catch (e) {
            console.error('[Variant] Error loading variants:', e);
            return [];
        }
    }

    renderVariantSelectors(variants) {
        vdVariantLog('Rendering', variants?.length || 0, 'variant selectors');
        const form = document.getElementById('productForm');
        if (!form) {
            console.error('[Variant] productForm not found!');
            return;
        }
        let container = document.getElementById('variantContainer');
        if (!container) {
            vdVariantLog('Creating new variantContainer');
            container = document.createElement('div');
            container.id = 'variantContainer';
            container.style.marginTop = '1.5rem';
            container.style.padding = '1rem';
            container.style.border = '1px solid #ddd';
            container.style.borderRadius = '8px';
            container.style.background = '#f9f9f9';
            form.appendChild(container);
        }
        container.innerHTML = '';
        
        if (!variants || variants.length === 0) {
            vdVariantLog('No variants to render');
            return;
        }
        variants.forEach(v => {
            const group = document.createElement('div');
            group.className = 'variant-group';
            group.dataset.variantId = v.id;
            group.dataset.variantName = v.name;

            const labelEl = document.createElement('div');
            labelEl.style.margin = '0.5rem 0';
            labelEl.textContent = v.name + (v.is_required ? ' *' : '');
            group.appendChild(labelEl);

            const optionsWrap = document.createElement('div');
            (v.options || []).forEach(opt => {
                const lbl = document.createElement('label');
                lbl.style.marginRight = '0.75rem';
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.name = `variant_${v.id}`;
                input.value = opt.value;
                lbl.appendChild(input);
                const span = document.createElement('span');
                span.textContent = opt.label || opt.value;
                if (v.type === 'color' && opt.value) {
                    span.style.display = 'inline-block';
                    span.style.width = '14px';
                    span.style.height = '14px';
                    span.style.borderRadius = '50%';
                    span.style.background = opt.value;
                    span.style.marginLeft = '6px';
                    span.title = opt.label || opt.value;
                } else {
                    span.style.marginLeft = '6px';
                }
                lbl.appendChild(span);
                optionsWrap.appendChild(lbl);
            });
            group.appendChild(optionsWrap);
            container.appendChild(group);
        });
    }

    async createProduct() {
        try {
            if (!this.storeId) {
                this.showError('Mağaza bulunamadı. Lütfen önce bir mağaza oluşturun.');
                return;
            }

            // Get form data
            const title = document.getElementById('productTitle').value.trim();
            const shortDesc = document.getElementById('productShortDesc').value.trim();
            const description = document.getElementById('productDescription').value.trim();
            const categoryId = document.getElementById('productCategory').value;
            const priceInput = document.getElementById('productPrice').value;
            const stockInput = document.getElementById('productStock').value;
            const imageUrl = document.getElementById('productImage').value.trim();

            vdLog('Form values:', {
                title,
                shortDesc,
                description,
                categoryId,
                priceInput,
                stockInput,
                imageUrl
            });

            // Validate required fields (only title, category, price are required by backend)
            if (!title || title.length < 5) {
                this.showError('Ürün başlığı en az 5 karakter olmalıdır.');
                return;
            }

            if (!categoryId) {
                this.showError('Lütfen bir kategori seçin.');
                return;
            }

            if (!priceInput || priceInput === '') {
                this.showError('Lütfen ürün fiyatını girin.');
                return;
            }

            const price = parseFloat(priceInput);
            if (isNaN(price) || price <= 0) {
                this.showError('Fiyat 0\'dan büyük bir sayı olmalıdır.');
                return;
            }

            // Stock is optional, default to 0 if not provided
            let stock = 0;
            if (stockInput && stockInput !== '') {
                stock = parseInt(stockInput);
                if (isNaN(stock) || stock < 0) {
                    this.showError('Stok 0 veya pozitif bir sayı olmalıdır.');
                    return;
                }
            }

            // Prepare product data (matching backend schema exactly)
            const productData = {
                store_id: this.storeId,
                category_id: categoryId,
                title: title,
                price: price,
                stock: stock
            };

            // Add optional fields only if they have values
            if (shortDesc) {
                productData.short_description = shortDesc;
            }

            if (description) {
                productData.description = description;
            }

            if (imageUrl) {
                productData.images = [imageUrl];
            }

            const selectedVariants = this.collectSelectedVariants();
            if (selectedVariants.length > 0) {
                productData.variants = selectedVariants;
            }

            // Collect selected badges
            const selectedBadges = [];
            document.querySelectorAll('input[name="badge"]:checked').forEach(checkbox => {
                selectedBadges.push(checkbox.value);
            });

            if (selectedBadges.length > 0) {
                productData.badges = selectedBadges;
            }

            // Collect SEO data
            const seoTitle = document.getElementById('productSeoTitle')?.value.trim();
            const seoDescription = document.getElementById('productSeoDescription')?.value.trim();
            const metaKeywords = document.getElementById('productMetaKeywords')?.value.trim();

            if (seoTitle) {
                productData.seo_title = seoTitle;
            }

            if (seoDescription) {
                productData.seo_description = seoDescription;
            }

            if (metaKeywords) {
                // Split by comma and trim each keyword
                productData.meta_keywords = metaKeywords.split(',').map(k => k.trim()).filter(k => k);
            }

            vdLog('Creating product with data:', productData);

            // Show loading
            const submitBtn = document.querySelector('#productForm button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Oluşturuluyor...';

            // Call API
            const response = await this.apiClient.post('/products', productData);

            vdLog('API response:', response);

            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            if (response.success) {
                this.showSuccess('✅ Ürün başarıyla oluşturuldu! Admin onayı bekleniyor.');

                // Close modal
                document.getElementById('productModal').style.display = 'none';
                document.getElementById('productForm').reset();

                // Reload products
                if (this.currentSection === 'products') {
                    await this.loadProductsData();
                }
            } else {
                // Show detailed error message
                const errorMsg = response.message || response.error || 'Ürün oluşturulamadı';
                console.error('[Vendor Dashboard] API error:', response);
                this.showError(errorMsg);
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error creating product:', error);

            // Show more detailed error
            let errorMessage = 'Ürün oluşturulurken bir hata oluştu';
            if (error.message) {
                errorMessage += ': ' + error.message;
            }

            this.showError(errorMessage);

            // Re-enable button
            const submitBtn = document.querySelector('#productForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '✓ Create Product';
            }
        }
    }

    // ==========================================
    // PRODUCT INLINE EDIT METHODS
    // ==========================================

    attachProductActionListeners() {
        vdLog('Attaching product action listeners');

        // Save product buttons
        document.querySelectorAll('.save-product-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.target.dataset.productId;
                await this.updateProduct(productId);
            });
        });

        // Delete product buttons
        document.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.target.dataset.productId;
                if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
                    await this.deleteProduct(productId);
                }
            });
        });

        // Toggle active/inactive buttons
        document.querySelectorAll('.toggle-active-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.target.dataset.productId;
                const isActive = e.target.dataset.active === 'true';
                await this.toggleProductActive(productId, !isActive);
            });
        });
    }

    async updateProduct(productId) {
        try {
            vdLog('Updating product:', productId);

            // Get the product row
            const productRow = document.querySelector(`.product-row[data-product-id="${productId}"]`);
            if (!productRow) {
                console.error('[Vendor Dashboard] Product row not found');
                return;
            }

            // Get updated values from input fields
            const fields = productRow.querySelectorAll('.product-edit-field');
            const updateData = {};

            fields.forEach(field => {
                const fieldName = field.dataset.field;
                let value = field.value;

                // Parse numbers
                if (fieldName === 'price') {
                    value = parseFloat(value);
                } else if (fieldName === 'stock') {
                    value = parseInt(value);
                }

                updateData[fieldName] = value;
            });

            vdLog('Update data:', updateData);

            // Validate
            if (!updateData.title || updateData.title.length < 5) {
                this.showError('Ürün başlığı en az 5 karakter olmalıdır.');
                return;
            }

            if (updateData.price <= 0) {
                this.showError('Fiyat 0\'dan büyük olmalıdır.');
                return;
            }

            if (updateData.stock < 0) {
                this.showError('Stok negatif olamaz.');
                return;
            }

            // Show loading on button
            const saveBtn = productRow.querySelector('.save-product-btn');
            const originalText = saveBtn.textContent;
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Kaydediliyor...';

            // Call API
            const response = await this.apiClient.put(`/products/${productId}`, updateData);

            saveBtn.disabled = false;
            saveBtn.textContent = originalText;

            if (response.success) {
                this.showSuccess('✅ Ürün başarıyla güncellendi!');

                // Note: We don't auto-disable when stock is 0
                // Vendor can manually toggle active/inactive
                // Warning if stock is 0 and product is still active
                if (updateData.stock === 0 && response.data.is_active) {
                    console.warn('[Vendor Dashboard] Warning: Product has 0 stock but is still active');
                    this.showSuccess('⚠️ Uyarı: Stok 0 ama ürün hala aktif. Satışa kapatmak için "Aktif" butonuna tıklayın.');
                }

                // Reload products to reflect changes
                await this.loadProductsData();
            } else {
                this.showError(response.message || 'Ürün güncellenemedi');
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error updating product:', error);
            this.showError('Ürün güncellenirken bir hata oluştu: ' + error.message);
        }
    }

    async deleteProduct(productId) {
        try {
            vdLog('Deleting product:', productId);

            const response = await this.apiClient.delete(`/products/${productId}`);

            if (response.success) {
                this.showSuccess('✅ Ürün başarıyla silindi!');
                await this.loadProductsData();
            } else {
                this.showError(response.message || 'Ürün silinemedi');
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error deleting product:', error);
            this.showError('Ürün silinirken bir hata oluştu: ' + error.message);
        }
    }

    async toggleProductActive(productId, newActiveState) {
        try {
            vdLog('Toggling product active state:', productId, newActiveState);

            const response = await this.apiClient.put(`/products/${productId}`, {
                is_active: newActiveState
            });

            if (response.success) {
                const statusText = newActiveState ? 'aktif' : 'pasif';
                this.showSuccess(`✅ Ürün ${statusText} duruma getirildi!`);
                await this.loadProductsData();
            } else {
                this.showError(response.message || 'Durum değiştirilemedi');
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error toggling product active:', error);
            this.showError('Durum değiştirilirken bir hata oluştu: ' + error.message);
        }
    }

    /**
     * Get next available order statuses based on current status (FSM)
     */
    getNextOrderStatuses(currentStatus) {
        const transitions = {
            'pending_payment': ['paid', 'cancelled'],
            'paid': ['processing', 'cancelled', 'refunded'],
            'processing': ['shipped', 'cancelled'],
            'shipped': ['delivered', 'cancelled'],
            'delivered': ['refunded'],
            'cancelled': [],
            'refunded': [],
        };

        return transitions[currentStatus] || [];
    }

    /**
     * Attach event listeners to order status selects
     */
    attachOrderStatusListeners() {
        vdLog('Attaching order status listeners');

        document.querySelectorAll('.order-status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const orderId = e.target.dataset.orderId;
                const currentStatus = e.target.dataset.currentStatus;
                const newStatus = e.target.value;

                if (!newStatus) return;

                // Show confirmation dialog
                const confirmed = confirm(`Sipariş durumunu "${this.getOrderStatusLabel(currentStatus)}" → "${this.getOrderStatusLabel(newStatus)}" olarak değiştirmek istediğinizden emin misiniz?`);

                if (confirmed) {
                    await this.updateOrderStatus(orderId, newStatus);
                } else {
                    // Reset select to default
                    e.target.value = '';
                }
            });
        });
    }

    /**
     * Update order status via API
     */
    async updateOrderStatus(orderId, newStatus) {
        try {
            vdLog('Updating order status:', orderId, newStatus);

            // Prepare update data
            const updateData = {
                status: newStatus
            };

            // If status is shipped, ask for tracking info with better UX
            if (newStatus === 'shipped') {
                const trackingNumber = prompt('Kargo takip numarasını girin (opsiyonel):\n\nÖnerilen: Shipping & Logistics menüsünden "Create Shipment" kullanın!');
                if (trackingNumber && trackingNumber.trim()) {
                    updateData.tracking_number = trackingNumber.trim();
                    const carrier = prompt('Kargo firması adını girin (ör: UPS, DHL, Aras Kargo):');
                    updateData.carrier = carrier && carrier.trim() ? carrier.trim() : 'Unknown';
                } else if (!trackingNumber || !trackingNumber.trim()) {
                    // Show warning but continue
                    const continueWithout = confirm('Takip numarası olmadan devam edilsin mi?\n\nÖnemli: Müşteri kargo takibi yapamayacak!');
                    if (!continueWithout) {
                        return; // Cancel the update
                    }
                }
            }

            // If status is cancelled, could ask for reason (simplified for now)
            if (newStatus === 'cancelled') {
                const reason = prompt('İptal nedenini girin (opsiyonel):');
                if (reason) {
                    updateData.cancellation_reason = reason;
                }
            }

            // Call API
            const response = await this.apiClient.patch(`/orders/${orderId}/status`, updateData);

            if (response.success) {
                this.showSuccess(`✅ Sipariş durumu başarıyla güncellendi: ${this.getOrderStatusLabel(newStatus)}`);
                // Reload orders
                await this.loadOrdersData();
            } else {
                this.showError(response.message || 'Sipariş durumu güncellenemedi');
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error updating order status:', error);
            this.showError('Sipariş durumu güncellenirken bir hata oluştu: ' + error.message);
            // Reload to reset UI
            await this.loadOrdersData();
        }
    }
}

// ==========================================
// INITIALIZE DASHBOARD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    vdLog('DOM loaded, initializing dashboard');

    // Debug: Log all sections
    const sections = document.querySelectorAll('.content-section');
    vdLog('Found sections:', Array.from(sections).map(s => s.id));

    // Debug: Log all menu items
    const menuItems = document.querySelectorAll('.menu-item');
    vdLog('Found menu items:', Array.from(menuItems).map(m => m.dataset.section));

    // Check if API client is available
    if (typeof ApiClient === 'undefined') {
        console.error('[Vendor Dashboard] API Client not loaded!');
        alert('Sistem hatası: API Client yüklenemedi');
        return;
    }

    // Initialize dashboard
    const dashboard = new VendorDashboard();
    window.vendorDashboard = dashboard;

    vdLog('Dashboard initialized successfully');
    vdLog('Current section:', dashboard.currentSection);
    vdLog('Store ID:', dashboard.storeId);
});

// Add setupSEOCounters method to VendorDashboard class
VendorDashboard.prototype.setupSEOCounters = function() {
    const seoTitleInput = document.getElementById('productSeoTitle');
    const seoDescInput = document.getElementById('productSeoDescription');
    const seoTitleCounter = document.getElementById('seoTitleCounter');
    const seoDescCounter = document.getElementById('seoDescCounter');

    if (seoTitleInput && seoTitleCounter) {
        seoTitleInput.addEventListener('input', () => {
            const length = seoTitleInput.value.length;
            seoTitleCounter.textContent = `Characters: ${length}/60`;
            
            // Color coding
            if (length >= 50 && length <= 60) {
                seoTitleCounter.style.color = '#10b981'; // Green - optimal
            } else if (length > 60) {
                seoTitleCounter.style.color = '#ef4444'; // Red - too long
            } else {
                seoTitleCounter.style.color = '#666'; // Gray - default
            }
        });
    }

    if (seoDescInput && seoDescCounter) {
        seoDescInput.addEventListener('input', () => {
            const length = seoDescInput.value.length;
            seoDescCounter.textContent = `Characters: ${length}/160`;
            
            // Color coding
            if (length >= 150 && length <= 160) {
                seoDescCounter.style.color = '#10b981'; // Green - optimal
            } else if (length > 160) {
                seoDescCounter.style.color = '#ef4444'; // Red - too long
            } else {
                seoDescCounter.style.color = '#666'; // Gray - default
            }
        });
    }

    // ==========================================
    // CAMPAIGNS MANAGEMENT
    // ==========================================

    async loadCampaignsData() {
        try {
            if (!this.storeId) {
                console.warn('[Vendor Dashboard] Cannot load campaigns without storeId');
                return;
            }
            vdLog('Loading campaigns...');

            const container = document.getElementById('campaigns-list');
            if (!container) {
                console.error('[Vendor Dashboard] campaigns-list container not found!');
                return;
            }

            // Show loading
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div class="spinner"></div>
                    <p>Loading campaigns...</p>
                </div>
            `;

            // Fetch campaigns for this store
            const response = await this.apiClient.getStoreCampaigns(this.storeId);
            vdLog('Campaigns response:', response);

            const campaigns = response.success ? response.data : [];

            if (!campaigns || campaigns.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 3rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🎯</div>
                        <h3 style="margin: 0 0 0.5rem 0; color: var(--vendor-text);">No Campaigns Yet</h3>
                        <p style="margin: 0; opacity: 0.7;">Create your first marketing campaign to boost sales!</p>
                    </div>
                `;
                return;
            }

            // Render campaigns
            this.renderCampaigns(campaigns);

        } catch (error) {
            console.error('[Vendor Dashboard] Error loading campaigns:', error);
            const container = document.getElementById('campaigns-list');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: #ef4444;">
                        <p>⚠️ Failed to load campaigns</p>
                        <button onclick="vendorDashboard.loadCampaignsData()" 
                                style="background: var(--vendor-primary); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; margin-top: 1rem;">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    renderCampaigns(campaigns) {
        const container = document.getElementById('campaigns-list');
        
        const html = campaigns.map(campaign => {
            const statusColor = campaign.is_active ? '#10b981' : '#6b7280';
            const statusText = campaign.is_active ? 'Active' : 'Inactive';
            const approvalColor = {
                'pending': '#f59e0b',
                'approved': '#10b981',
                'rejected': '#ef4444'
            }[campaign.approval_status] || '#6b7280';
            
            const startDate = new Date(campaign.start_date).toLocaleDateString('tr-TR');
            const endDate = new Date(campaign.end_date).toLocaleDateString('tr-TR');
            
            const campaignTypeLabels = {
                'FLASH_SALE': '⚡ Flash Sale',
                'BUY_X_GET_Y': '🎁 Buy X Get Y',
                'CATEGORY_DISCOUNT': '📂 Category Discount',
                'FREE_SHIPPING': '🚚 Free Shipping',
                'BUNDLE_DEAL': '📦 Bundle Deal',
                'MINIMUM_PURCHASE': '💰 Minimum Purchase'
            };

            return `
                <div style="border: 1px solid var(--vendor-border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <h3 style="margin: 0; color: var(--vendor-primary);">${campaign.name}</h3>
                                <span style="background: ${statusColor}; color: white; font-size: 0.7rem; padding: 2px 8px; border-radius: 12px;">${statusText}</span>
                                <span style="background: ${approvalColor}; color: white; font-size: 0.7rem; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">${campaign.approval_status}</span>
                            </div>
                            <p style="margin: 0.5rem 0; opacity: 0.7; font-size: 0.9rem;">${campaign.description || 'No description'}</p>
                            <div style="display: flex; gap: 1rem; font-size: 0.85rem; opacity: 0.8;">
                                <span>${campaignTypeLabels[campaign.campaign_type] || campaign.campaign_type}</span>
                                <span>•</span>
                                <span>📅 ${startDate} - ${endDate}</span>
                                <span>•</span>
                                <span>${campaign.discount_type === 'percentage' ? `${campaign.discount_value}% OFF` : `₺${campaign.discount_value} OFF`}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="vendorDashboard.toggleCampaignStatus('${campaign.id}', ${!campaign.is_active})"
                                    style="background: ${campaign.is_active ? '#f3f4f6' : 'var(--vendor-primary)'}; color: ${campaign.is_active ? '#374151' : 'white'}; border: 1px solid var(--vendor-border); padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                ${campaign.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onclick="vendorDashboard.viewCampaignStats('${campaign.id}')"
                                    style="background: #f3f4f6; color: #374151; border: 1px solid var(--vendor-border); padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                📊 Stats
                            </button>
                            <button onclick="vendorDashboard.deleteCampaign('${campaign.id}')"
                                    style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                                🗑️
                            </button>
                        </div>
                    </div>
                    
                    <!-- Stats Row -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--vendor-border);">
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--vendor-primary);">${campaign.view_count || 0}</div>
                            <div style="font-size: 0.75rem; opacity: 0.7;">Views</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--vendor-primary);">${campaign.click_count || 0}</div>
                            <div style="font-size: 0.75rem; opacity: 0.7;">Clicks</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--vendor-primary);">${campaign.conversion_count || 0}</div>
                            <div style="font-size: 0.75rem; opacity: 0.7;">Conversions</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--vendor-primary);">₺${(campaign.total_revenue || 0).toFixed(2)}</div>
                            <div style="font-size: 0.75rem; opacity: 0.7;">Revenue</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    setupCampaignModal() {
        const createBtn = document.getElementById('createCampaignBtn');
        const modal = document.getElementById('campaignModal');
        const closeBtn = document.getElementById('closeCampaignModal');
        const cancelBtn = document.getElementById('cancelCampaignBtn');
        const form = document.getElementById('campaignForm');
        const campaignType = document.getElementById('campaignType');
        const applicableTo = document.getElementById('campaignApplicableTo');

        if (!createBtn || !modal) return;

        // Open modal
        createBtn.addEventListener('click', () => {
            form.reset();
            document.getElementById('campaignStartDate').value = new Date().toISOString().slice(0, 16);
            modal.style.display = 'block';
        });

        // Close modal
        const closeModal = () => {
            modal.style.display = 'none';
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);

        // Show/hide conditional fields based on campaign type
        campaignType?.addEventListener('change', (e) => {
            const buyXGetYSettings = document.getElementById('buyXGetYSettings');
            if (e.target.value === 'BUY_X_GET_Y') {
                buyXGetYSettings.style.display = 'grid';
            } else {
                buyXGetYSettings.style.display = 'none';
            }
        });

        // Show/hide product selection
        applicableTo?.addEventListener('change', (e) => {
            const productSelection = document.getElementById('productSelection');
            if (e.target.value === 'products') {
                productSelection.style.display = 'block';
                this.loadCampaignProducts();
            } else {
                productSelection.style.display = 'none';
            }
        });

        // Form submission
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createCampaign();
        });
    }

    async loadCampaignProducts() {
        try {
            const response = await this.apiClient.get('/products', {
                store_id: this.storeId,
                status: 'approved',
                is_active: true
            });

            const products = response.success ? response.data : [];
            const container = document.getElementById('campaignProductsList');

            if (!container) return;

            if (products.length === 0) {
                container.innerHTML = '<p style="text-align: center; opacity: 0.7;">No products available</p>';
                return;
            }

            container.innerHTML = products.map(product => `
                <div style="padding: 0.5rem; border-bottom: 1px solid var(--vendor-border);">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" name="campaign_products" value="${product.id}" style="width: 16px; height: 16px;">
                        <span>${product.title}</span>
                    </label>
                </div>
            `).join('');

        } catch (error) {
            console.error('[Vendor Dashboard] Error loading products for campaign:', error);
        }
    }

    async createCampaign() {
        try {
            if (!this.storeId) {
                this.showError('Store bilgisi yüklenemedi. Lütfen sayfayı yenileyin.');
                return;
            }
            const campaignData = {
                name: document.getElementById('campaignName').value,
                description: document.getElementById('campaignDescription').value,
                campaign_type: document.getElementById('campaignType').value,
                discount_type: document.getElementById('campaignDiscountType').value,
                discount_value: parseFloat(document.getElementById('campaignDiscountValue').value),
                start_date: document.getElementById('campaignStartDate').value,
                end_date: document.getElementById('campaignEndDate').value,
                applicable_to: document.getElementById('campaignApplicableTo').value,
                badge_text: document.getElementById('campaignBadgeText').value,
                badge_color: document.getElementById('campaignBadgeColor').value,
                min_order_amount: parseFloat(document.getElementById('campaignMinAmount').value) || 0,
                usage_limit: parseInt(document.getElementById('campaignUsageLimit').value) || null,
                show_countdown: document.getElementById('campaignShowCountdown').checked
            };

            // Add BUY_X_GET_Y specific fields
            if (campaignData.campaign_type === 'BUY_X_GET_Y') {
                campaignData.buy_quantity = parseInt(document.getElementById('campaignBuyQuantity').value);
                campaignData.get_quantity = parseInt(document.getElementById('campaignGetQuantity').value);
            }

            // Add selected products
            if (campaignData.applicable_to === 'products') {
                const checkboxes = document.querySelectorAll('input[name="campaign_products"]:checked');
                campaignData.product_ids = Array.from(checkboxes).map(cb => cb.value);
            }

            vdLog('Creating campaign:', campaignData);

            const response = await this.apiClient.createStoreCampaign(this.storeId, campaignData);

            if (response.success) {
                this.showSuccess('Campaign created successfully! It will be activated after admin approval.');
                document.getElementById('campaignModal').style.display = 'none';
                this.loadCampaignsData();
            } else {
                this.showError(response.message || 'Failed to create campaign');
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error creating campaign:', error);
            this.showError('Failed to create campaign');
        }
    }

    async toggleCampaignStatus(campaignId, newStatus) {
        try {
            if (!this.storeId) {
                this.showError('Store bilgisi bulunamadı.');
                return;
            }
            const response = await this.apiClient.updateStoreCampaign(this.storeId, campaignId, {
                is_active: newStatus
            });

            if (response.success) {
                this.showSuccess(`Campaign ${newStatus ? 'activated' : 'deactivated'} successfully`);
                this.loadCampaignsData();
            } else {
                this.showError(response.message || 'Failed to update campaign');
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error toggling campaign status:', error);
            this.showError('Failed to update campaign');
        }
    }

    async deleteCampaign(campaignId) {
        if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            return;
        }

        try {
            if (!this.storeId) {
                this.showError('Store bilgisi bulunamadı.');
                return;
            }
            const response = await this.apiClient.deleteStoreCampaign(this.storeId, campaignId);

            if (response.success) {
                this.showSuccess('Campaign deleted successfully');
                this.loadCampaignsData();
            } else {
                this.showError(response.message || 'Failed to delete campaign');
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error deleting campaign:', error);
            this.showError('Failed to delete campaign');
        }
    }

    async viewCampaignStats(campaignId) {
        try {
            if (!this.storeId) {
                this.showError('Store bilgisi bulunamadı.');
                return;
            }
            const response = await this.apiClient.getStoreCampaignStats(this.storeId, campaignId);

            if (response.success) {
                const stats = response.data;
                alert(`Campaign Statistics:\n\nViews: ${stats.view_count}\nClicks: ${stats.click_count}\nConversions: ${stats.conversion_count}\nRevenue: ₺${stats.total_revenue}\nConversion Rate: ${stats.conversion_rate}%\nCTR: ${stats.click_through_rate}%`);
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error loading campaign stats:', error);
            this.showError('Failed to load campaign statistics');
        }
    }
};

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
        border-left-color: #2d6853;
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
