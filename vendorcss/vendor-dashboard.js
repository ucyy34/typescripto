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
        this.user = currentUser;
        this.userId = currentUser.id;
        this.categories = [];

        vdLog('Initializing for user:', this.userId);
        this.init();
    }

    async init() {
        vdLog('Starting initialization...');

        // Initialize edit mode tracking
        this.currentEditProductId = null;

        // Load store information first
        await this.loadStoreInfo();

        // Setup UI components
        this.setupNavigation();
        this.setupNotifications();
        this.setupTheme();
        this.setupLogout();
        this.displayUserInfo();
        this.setupProductModal();
        this.setupCampaignModal();

        // Load categories for product form
        await this.loadCategories();

        // Load initial dashboard data
        if (this.storeId) {
            await this.loadDashboardData();
        }

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

                vdLog('Store loaded:', this.storeName, this.storeId);

                // Update UI with store name
                this.updateStoreNameInUI();

                // Prefill return policy inputs if already mounted
                this.prefillReturnPolicy();

                return true;
            } else {
                console.warn('[Vendor Dashboard] No store found for user');
                this.showNoStoreMessage();
                return false;
            }
        } catch (error) {
            console.error('[Vendor Dashboard] Error loading store:', error);
            this.showError('Mağaza bilgileri yüklenemedi: ' + error.message);
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
        } catch (_) { }
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
                const row = input.closest('.variant-option-row');
                const labelText = row?.querySelector('span')?.textContent?.trim() || input.value;
                const sku = row?.querySelector('.variant-sku-input')?.value?.trim();
                const priceStr = row?.querySelector('.variant-price-input')?.value;
                const stockStr = row?.querySelector('.variant-stock-input')?.value;

                const option = { label: labelText, value: input.value };
                if (sku) option.sku = sku;
                const price = priceStr ? parseFloat(priceStr) : null;
                if (!Number.isNaN(price) && price !== null) option.price = price;
                const stock = stockStr ? parseInt(stockStr, 10) : null;
                if (!Number.isNaN(stock) && stock !== null) option.stock = stock;

                selected.push(option);
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
            const defaultEmail = this.user?.email || '';

            mainContent.innerHTML = `
                <section class="vendor-card no-store-card">
                    <h2 style="margin-bottom: var(--space-md);">Henüz Mağazanız Yok</h2>
                    <p style="opacity: 0.8; margin-bottom: var(--space-lg);">Nordik pazarında satışa başlamak için mağaza bilgilerinizi tamamlayın.</p>
                    <form id="createStoreForm" class="vendor-store-form">
                        <div class="form-row">
                            <div>
                                <label for="createStoreName">Mağaza Adı *</label>
                                <input type="text" id="createStoreName" name="name" placeholder="Nordik Atölye" required>
                            </div>
                            <div>
                                <label for="createStoreEmail">Mağaza E-postası</label>
                                <input type="email" id="createStoreEmail" name="email" placeholder="store@email.com" value="${defaultEmail}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div>
                                <label for="createStorePhone">Telefon</label>
                                <input type="tel" id="createStorePhone" name="phone" placeholder="+90 555 555 55 55">
                            </div>
                            <div>
                                <label for="createStoreCity">Şehir</label>
                                <input type="text" id="createStoreCity" name="city" placeholder="İstanbul">
                            </div>
                        </div>
                        <div class="form-row">
                            <div>
                                <label for="createStoreAddress">Adres</label>
                                <input type="text" id="createStoreAddress" name="address" placeholder="Sokak, İlçe">
                            </div>
                            <div>
                                <label for="createStoreTax">Vergi Numarası</label>
                                <input type="text" id="createStoreTax" name="tax_number" placeholder="VKN / TCKN">
                            </div>
                        </div>
                        <div>
                            <label for="createStoreDescription">Mağaza Açıklaması</label>
                            <textarea id="createStoreDescription" name="description" rows="4" placeholder="El işçiliğinizi ve hikayenizi paylaşın"></textarea>
                        </div>
                        <button type="submit">Mağaza Oluştur</button>
                    </form>
                    <div id="createStoreMessage" class="vendor-alert"></div>
                </section>
            `;

            const form = document.getElementById('createStoreForm');
            const messageEl = document.getElementById('createStoreMessage');
            const submitBtn = form?.querySelector('button[type="submit"]');

            if (form && submitBtn) {
                form.addEventListener('submit', async (event) => {
                    event.preventDefault();

                    const nameInput = document.getElementById('createStoreName');
                    const storeName = nameInput?.value.trim();

                    if (!storeName) {
                        this.setVendorMessage(messageEl, 'Mağaza adı gereklidir.', 'error');
                        if (nameInput) nameInput.focus();
                        return;
                    }

                    const payload = {
                        name: storeName,
                        email: document.getElementById('createStoreEmail')?.value.trim(),
                        phone: document.getElementById('createStorePhone')?.value.trim(),
                        city: document.getElementById('createStoreCity')?.value.trim(),
                        address: document.getElementById('createStoreAddress')?.value.trim(),
                        tax_number: document.getElementById('createStoreTax')?.value.trim(),
                        description: document.getElementById('createStoreDescription')?.value.trim(),
                    };

                    Object.keys(payload).forEach((key) => {
                        if (typeof payload[key] === 'string' && payload[key].trim() === '') {
                            delete payload[key];
                        }
                    });

                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Oluşturuluyor...';
                    this.setVendorMessage(messageEl, 'Mağazanız oluşturuluyor, lütfen bekleyin...');

                    try {
                        const response = await this.apiClient.createStore(payload);
                        if (!response.success) {
                            throw new Error(response.message || 'Mağaza oluşturulamadı');
                        }

                        this.storeInfo = response.data || response;
                        this.storeId = this.storeInfo?.id || null;
                        this.storeName = this.storeInfo?.name || storeName;

                        this.setVendorMessage(messageEl, '✅ Mağazanız oluşturuldu! Panel yeniden yükleniyor...', 'success');
                        setTimeout(() => {
                            window.location.reload();
                        }, 1200);
                    } catch (error) {
                        console.error('[Vendor Dashboard] Store creation failed:', error);
                        this.setVendorMessage(messageEl, error.message || 'Mağaza oluşturulamadı. Lütfen bilgileri kontrol edin.', 'error');
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Mağaza Oluştur';
                    }
                });
            }
        }
    }

    setVendorMessage(element, message, type = 'info') {
        if (!element) return;

        if (!message) {
            element.textContent = '';
            element.classList.remove('show', 'success', 'error');
            return;
        }

        element.textContent = message;
        element.classList.add('show');
        element.classList.remove('success', 'error');

        if (type === 'success') {
            element.classList.add('success');
        } else if (type === 'error') {
            element.classList.add('error');
        }
    }

    // ==========================================
    // DASHBOARD DATA
    // ==========================================

    async loadDashboardData() {
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
        try {
            vdLog('Loading recent orders...');

            const response = await this.apiClient.get(`/stores/${this.storeId}/orders`, {
                limit: 5
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

        switch (sectionName) {
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
            case 'messages':
                this.loadMessagesData();
                break;
            case 'shipping':
                this.loadShippingSettings();
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
            }, { useCache: false });

            vdLog('Products response:', response);

            // Handle different response structures
            // API returns: { success: true, data: { products: [], pagination: {} } }
            const products = response.data?.products || response.data || response;

            if (!products || !Array.isArray(products) || products.length === 0) {
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

                        <!-- Rejection Reason (if rejected) -->
                        ${isRejected && product.rejection_reason ? `
                            <div style="
                                grid-column: 1 / -1;
                                background: #fee2e2;
                                padding: 0.75rem 1rem;
                                border-radius: 8px;
                                border-left: 4px solid #dc2626;
                                margin-top: 0.5rem;
                            ">
                                <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
                                    <span style="font-size: 1.2rem;">❌</span>
                                    <div>
                                        <strong style="color: #dc2626; display: block; margin-bottom: 0.25rem;">Ret Sebebi:</strong>
                                        <p style="color: #7f1d1d; margin: 0; line-height: 1.5;">${product.rejection_reason}</p>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <!-- Actions -->
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; min-width: 120px;">
                            <button class="full-edit-product-btn" data-product-id="${product.id}" style="
                                padding: 0.6rem 1rem;
                                background: #3b82f6;
                                color: white;
                                border: none;
                                border-radius: 8px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s;
                                font-size: 0.9rem;
                            " onmouseover="this.style.background='#2563eb';" onmouseout="this.style.background='#3b82f6';">
                                ✏️ Düzenle
                            </button>
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

        try {
            // Fetch all analytics data in parallel
            const [dashboardRes, salesRes, topProductsRes, recentOrdersRes] = await Promise.all([
                this.apiClient.get('/analytics/vendor/dashboard'),
                this.apiClient.get('/analytics/vendor/sales?days=7'),
                this.apiClient.get('/analytics/vendor/top-products?limit=5'),
                this.apiClient.get('/analytics/vendor/recent-orders?limit=5'),
            ]);

            // Update stat cards
            if (dashboardRes.success) {
                const stats = dashboardRes.data;
                this.updateAnalyticsStats(stats);
            }

            // Update sales chart
            if (salesRes.success) {
                this.renderSalesChart(salesRes.data);
            }

            // Update top products
            if (topProductsRes.success) {
                this.renderTopProducts(topProductsRes.data);
            }

            // Update recent orders
            if (recentOrdersRes.success) {
                this.renderRecentOrders(recentOrdersRes.data);
            }

            // Setup chart controls
            this.setupChartControls();

        } catch (error) {
            vdLog('Analytics load error:', error);
            const container = document.querySelector('#analytics-section');
            if (container) {
                container.innerHTML = `
                    <h2>📊 Analitik Paneli</h2>
                    <div style="text-align:center;padding:2rem;color:#ef4444;">
                        <p>Analitik verileri yüklenirken hata oluştu.</p>
                        <button onclick="window.vendorDashboard.loadAnalyticsData()" 
                                style="margin-top:1rem;padding:0.5rem 1rem;background:#10b981;color:white;border:none;border-radius:0.5rem;cursor:pointer;">
                            Tekrar Dene
                        </button>
                    </div>
                `;
            }
        }
    }

    updateAnalyticsStats(stats) {
        const { overview, products, returns } = stats;

        // Revenue
        const totalRevenueEl = document.getElementById('statTotalRevenue');
        const revenue30DaysEl = document.getElementById('statRevenue30Days');
        if (totalRevenueEl) totalRevenueEl.textContent = `₺${overview.totalRevenue.toLocaleString('tr-TR')}`;
        if (revenue30DaysEl) revenue30DaysEl.textContent = `Son 30 gün: ₺${overview.revenue30Days.toLocaleString('tr-TR')}`;

        // Orders
        const totalOrdersEl = document.getElementById('statTotalOrders');
        const pendingOrdersEl = document.getElementById('statPendingOrders');
        if (totalOrdersEl) totalOrdersEl.textContent = overview.totalOrders;
        if (pendingOrdersEl) pendingOrdersEl.textContent = `Bekleyen: ${overview.pendingOrders}`;

        // Products
        const totalProductsEl = document.getElementById('statTotalProducts');
        const activeProductsEl = document.getElementById('statActiveProducts');
        if (totalProductsEl) totalProductsEl.textContent = products.total;
        if (activeProductsEl) activeProductsEl.textContent = `Aktif: ${products.active}`;

        // Returns
        const returnRateEl = document.getElementById('statReturnRate');
        const totalReturnsEl = document.getElementById('statTotalReturns');
        if (returnRateEl) returnRateEl.textContent = `%${returns.returnRate}`;
        if (totalReturnsEl) totalReturnsEl.textContent = `Toplam: ${returns.total} iade`;
    }

    renderSalesChart(salesData) {
        const canvas = document.getElementById('salesChart');
        if (!canvas) return;

        // Simple bar chart using canvas
        const ctx = canvas.getContext('2d');
        const wrapper = document.getElementById('salesChartWrapper');
        canvas.width = wrapper.offsetWidth || 600;
        canvas.height = 250;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!salesData || salesData.length === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Henüz satış verisi yok', canvas.width / 2, canvas.height / 2);
            return;
        }

        const maxRevenue = Math.max(...salesData.map(d => d.revenue), 1);
        const barWidth = (canvas.width - 60) / salesData.length - 4;
        const chartHeight = canvas.height - 50;

        // Draw bars
        salesData.forEach((day, i) => {
            const barHeight = (day.revenue / maxRevenue) * (chartHeight - 20);
            const x = 40 + i * (barWidth + 4);
            const y = chartHeight - barHeight;

            // Bar gradient
            const gradient = ctx.createLinearGradient(x, y, x, chartHeight);
            gradient.addColorStop(0, '#10b981');
            gradient.addColorStop(1, '#059669');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Date label
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            const dateLabel = new Date(day.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            ctx.fillText(dateLabel, x + barWidth / 2, canvas.height - 5);
        });

        // Y-axis label
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`₺${maxRevenue.toLocaleString('tr-TR')}`, 35, 15);
        ctx.fillText('₺0', 35, chartHeight);
    }

    renderTopProducts(products) {
        const container = document.getElementById('topProductsList');
        if (!container) return;

        if (!products || products.length === 0) {
            container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 1rem;">Henüz satış yapılmadı</p>';
            return;
        }

        container.innerHTML = products.map((p, i) => `
            <div class="top-product-item">
                <span class="product-rank">#${i + 1}</span>
                <img src="${p.image || '/assets/images/placeholder.png'}" alt="${p.title}" class="product-thumb">
                <div class="product-info">
                    <span class="product-name">${p.title}</span>
                    <span class="product-sales">${p.totalSales} satış · ₺${p.price.toLocaleString('tr-TR')}</span>
                </div>
            </div>
        `).join('');
    }

    renderRecentOrders(orders) {
        const container = document.getElementById('recentOrdersList');
        if (!container) return;

        if (!orders || orders.length === 0) {
            container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 1rem;">Henüz sipariş yok</p>';
            return;
        }

        const statusColors = {
            pending: '#f59e0b',
            processing: '#3b82f6',
            shipped: '#8b5cf6',
            delivered: '#10b981',
            completed: '#10b981',
            cancelled: '#ef4444',
        };

        const statusLabels = {
            pending: 'Bekliyor',
            processing: 'İşleniyor',
            shipped: 'Kargoda',
            delivered: 'Teslim Edildi',
            completed: 'Tamamlandı',
            cancelled: 'İptal',
        };

        container.innerHTML = orders.map(o => `
            <div class="recent-order-item">
                <div class="order-info">
                    <span class="order-number">${o.orderNumber}</span>
                    <span class="order-date">${new Date(o.date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div class="order-meta">
                    <span class="order-total">₺${o.total.toLocaleString('tr-TR')}</span>
                    <span class="order-status" style="background: ${statusColors[o.status] || '#64748b'}">
                        ${statusLabels[o.status] || o.status}
                    </span>
                </div>
            </div>
        `).join('');
    }

    setupChartControls() {
        const buttons = document.querySelectorAll('.chart-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const days = parseInt(btn.dataset.days) || 7;
                const res = await this.apiClient.get(`/analytics/vendor/sales?days=${days}`);
                if (res.success) {
                    this.renderSalesChart(res.data);
                }
            });
        });
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

    async loadShippingSettings() {
        if (!this.storeId) return;

        try {
            // Load platform default
            const defaultRes = await this.apiClient.get('/shipping-support/default');
            if (defaultRes.success) {
                const defaultCostEl = document.getElementById('platformDefaultShippingCost');
                if (defaultCostEl) {
                    defaultCostEl.textContent = '₺' + defaultRes.data.defaultCost.toFixed(2);
                }
            }

            // Load store settings
            const storeRes = await this.apiClient.get(`/shipping-support/store/${this.storeId}`);
            if (storeRes.success) {
                const settings = storeRes.data;
                // NOTE: Backend returns camelCase field names (shippingCost, freeShippingThreshold, isFreeShipping)
                const shippingCostInput = document.getElementById('storeShippingCost');
                const freeThresholdInput = document.getElementById('storeFreeShippingThreshold');
                const isFreeCheckbox = document.getElementById('storeIsFreeShipping');

                if (shippingCostInput) {
                    shippingCostInput.value = settings.shippingCost ?? settings.shipping_cost ?? '';
                }
                if (freeThresholdInput) {
                    freeThresholdInput.value = settings.freeShippingThreshold ?? settings.free_shipping_threshold ?? '';
                }
                if (isFreeCheckbox) {
                    isFreeCheckbox.checked = !!(settings.isFreeShipping ?? settings.is_free_shipping);
                }

                // Show current effective cost
                this.updateShippingSettingsPreview(settings);

                vdLog('Shipping settings loaded:', settings);
            }

            // Setup form listener
            const form = document.getElementById('shippingSettingsForm');
            if (form) {
                // Remove old listener to avoid duplicates
                const newForm = form.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);

                newForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.saveShippingSettings();
                });
            }

            // Setup shipping campaign form and load active campaigns
            this.setupShippingCampaignForm();
            await this.loadActiveShippingCampaigns();

        } catch (error) {
            console.error('Failed to load shipping settings:', error);
            this.showNotification('Kargo ayarları yüklenemedi', 'error');
        }
    }

    updateShippingSettingsPreview(settings) {
        // Create or update preview element
        let previewEl = document.getElementById('shippingSettingsPreview');
        if (!previewEl) {
            const form = document.getElementById('shippingSettingsForm');
            if (!form) return;

            previewEl = document.createElement('div');
            previewEl.id = 'shippingSettingsPreview';
            previewEl.style.cssText = 'margin-top: 1rem; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border-left: 4px solid #10b981;';
            form.parentNode.insertBefore(previewEl, form.nextSibling);
        }

        const effectiveCost = settings.effectiveCost || settings.shippingCost || settings.shipping_cost || 35;
        const threshold = settings.freeShippingThreshold || settings.free_shipping_threshold;
        const isFree = settings.isFreeShipping || settings.is_free_shipping;

        let statusText = '';
        if (isFree) {
            statusText = '🎉 <strong>Mevcut Durum:</strong> Tüm siparişlerde ücretsiz kargo!';
        } else if (threshold) {
            statusText = `📦 <strong>Mevcut Durum:</strong> ₺${parseFloat(threshold).toFixed(2)} üzeri siparişlerde ücretsiz, altında ₺${parseFloat(effectiveCost).toFixed(2)} kargo ücreti`;
        } else {
            statusText = `📦 <strong>Mevcut Durum:</strong> Tüm siparişlerde ₺${parseFloat(effectiveCost).toFixed(2)} kargo ücreti`;
        }

        previewEl.innerHTML = statusText;
    }

    async saveShippingSettings() {
        const costInput = document.getElementById('storeShippingCost');
        const thresholdInput = document.getElementById('storeFreeShippingThreshold');
        const isFreeCheckbox = document.getElementById('storeIsFreeShipping');

        const cost = costInput?.value;
        const threshold = thresholdInput?.value;
        const isFree = isFreeCheckbox?.checked || false;

        const data = {
            shipping_cost: cost ? parseFloat(cost) : null,
            free_shipping_threshold: threshold ? parseFloat(threshold) : null,
            is_free_shipping: isFree
        };

        try {
            const result = await this.apiClient.put(`/shipping-support/store/${this.storeId}`, data);
            if (result.success) {
                this.showNotification('Kargo ayarları başarıyla kaydedildi! ✅', 'success');
                // Update local info
                if (this.storeInfo) {
                    this.storeInfo = { ...this.storeInfo, ...data };
                }

                // Update the preview with new settings
                this.updateShippingSettingsPreview({
                    shippingCost: data.shipping_cost,
                    freeShippingThreshold: data.free_shipping_threshold,
                    isFreeShipping: data.is_free_shipping,
                    effectiveCost: data.shipping_cost || 35
                });

                vdLog('Shipping settings saved:', data);
            } else {
                this.showNotification('Ayarlar kaydedilemedi: ' + (result.message || 'Bilinmeyen hata'), 'error');
            }
        } catch (error) {
            console.error('Failed to save shipping settings:', error);
            this.showNotification('Ayarlar kaydedilemedi: ' + (error.message || 'Sunucu hatası') + ' ❌', 'error');
        }
    }

    setupShippingCampaignForm() {
        const form = document.getElementById('shippingCampaignForm');
        if (!form) return;

        // Set default dates
        const now = new Date();
        const startDateInput = document.getElementById('shippingCampaignStartDate');
        const endDateInput = document.getElementById('shippingCampaignEndDate');

        if (startDateInput) {
            startDateInput.value = now.toISOString().slice(0, 16);
        }
        if (endDateInput) {
            // Default to 7 days from now
            const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            endDateInput.value = endDate.toISOString().slice(0, 16);
        }

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createShippingCampaign();
        });
    }

    async loadActiveShippingCampaigns() {
        const container = document.getElementById('activeShippingCampaigns');
        if (!container || !this.storeId) return;

        try {
            const response = await this.apiClient.get('/campaigns', {
                store_id: this.storeId,
                campaign_type: 'FREE_SHIPPING'
            });

            const campaigns = response.data?.campaigns || response.data || [];
            const activeCampaigns = campaigns.filter(c => {
                const now = new Date();
                const start = new Date(c.start_date);
                const end = new Date(c.end_date);
                return c.is_active && now >= start && now <= end;
            });

            if (activeCampaigns.length === 0) {
                container.innerHTML = `
                    <div style="padding: 1rem; background: rgba(100, 116, 139, 0.1); border-radius: 8px; text-align: center;">
                        <p style="margin: 0; opacity: 0.7;">Aktif kargo kampanyası yok. Yeni bir kampanya oluşturun!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <h4 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--vendor-primary);">📦 Aktif Kargo Kampanyaları</h4>
                <div style="display: grid; gap: 1rem;">
                    ${activeCampaigns.map(c => {
                const endDate = new Date(c.end_date);
                const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
                return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border-left: 4px solid #10b981;">
                                <div>
                                    <div style="font-weight: 600;">${c.name}</div>
                                    <div style="font-size: 0.85rem; opacity: 0.7;">
                                        ${c.min_order_amount > 0 ? `₺${c.min_order_amount} üzeri` : 'Tüm siparişlerde'} ücretsiz kargo
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 600; color: ${daysLeft <= 3 ? '#f59e0b' : '#10b981'};">
                                        ${daysLeft} gün kaldı
                                    </div>
                                    <div style="font-size: 0.8rem; opacity: 0.7;">
                                        ${c.approval_status === 'approved' ? '✓ Onaylı' : c.approval_status === 'pending' ? '⏳ Onay bekliyor' : '✗ Reddedildi'}
                                    </div>
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Failed to load shipping campaigns:', error);
            container.innerHTML = '';
        }
    }

    async createShippingCampaign() {
        const name = document.getElementById('shippingCampaignName')?.value?.trim();
        const startDate = document.getElementById('shippingCampaignStartDate')?.value;
        const endDate = document.getElementById('shippingCampaignEndDate')?.value;
        const minAmount = document.getElementById('shippingCampaignMinAmount')?.value;
        const showBadge = document.getElementById('shippingCampaignShowBadge')?.checked;

        if (!name) {
            this.showNotification('Lütfen kampanya adı girin', 'error');
            return;
        }

        if (!startDate || !endDate) {
            this.showNotification('Lütfen başlangıç ve bitiş tarihlerini seçin', 'error');
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            this.showNotification('Bitiş tarihi başlangıç tarihinden sonra olmalı', 'error');
            return;
        }

        const campaignData = {
            name: name,
            description: minAmount ? `₺${minAmount} ve üzeri siparişlerde ücretsiz kargo` : 'Tüm siparişlerde ücretsiz kargo',
            campaign_type: 'FREE_SHIPPING',
            discount_type: 'free_shipping',
            discount_value: 0,
            start_date: startDate,
            end_date: endDate,
            min_order_amount: minAmount ? parseFloat(minAmount) : 0,
            applicable_to: 'all_store',
            badge_text: 'ÜCRETSİZ KARGO',
            badge_color: '#10b981',
            show_countdown: showBadge
        };

        try {
            vdLog('Creating shipping campaign:', campaignData);

            const response = await this.apiClient.createStoreCampaign(this.storeId, campaignData);

            if (response.success) {
                this.showNotification('Kargo kampanyası oluşturuldu! Admin onayından sonra aktif olacak. ✅', 'success');

                // Reset form
                const form = document.getElementById('shippingCampaignForm');
                if (form) form.reset();

                // Set default dates again
                this.setupShippingCampaignForm();

                // Reload active campaigns
                await this.loadActiveShippingCampaigns();
            } else {
                this.showNotification('Kampanya oluşturulamadı: ' + (response.message || 'Bilinmeyen hata'), 'error');
            }
        } catch (error) {
            console.error('Failed to create shipping campaign:', error);
            this.showNotification('Kampanya oluşturulamadı: ' + (error.message || 'Sunucu hatası') + ' ❌', 'error');
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

            if (!this.storeId) {
                throw new Error('Mağaza bilgisi bulunamadı');
            }

            const userStore = { id: this.storeId };

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

        // Open modal for creating new product
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                // Reset edit mode
                this.currentEditProductId = null;

                // Reset modal title
                const modalTitle = modal?.querySelector('h2');
                if (modalTitle) {
                    modalTitle.textContent = '➕ Yeni Ürün Ekle';
                }

                // Reset submit button text
                const submitBtn = document.getElementById('submitProductBtn');
                if (submitBtn) {
                    submitBtn.textContent = '➕ Ürün Ekle';
                }

                // Clear form
                productForm.reset();

                // Explicitly reset category dropdown
                const categorySelect = document.getElementById('productCategory');
                if (categorySelect) {
                    categorySelect.value = '';
                }

                // Clear badges
                document.querySelectorAll('input[name="badge"]').forEach(checkbox => {
                    checkbox.checked = false;
                });

                // Clear image preview
                const imagePreview = document.getElementById('productImagePreview');
                if (imagePreview) {
                    imagePreview.innerHTML = '<div style="color: #94a3b8; font-size: 0.9rem;">Resim seçilmedi</div>';
                    delete imagePreview.dataset.imageUrl;
                }

                // Show modal
                if (modal) {
                    modal.style.display = 'flex';
                }

                vdLog('Product modal opened for new product. Categories available:', this.categories ? this.categories.length : 0);
            });
        }

        // Close modal
        const closeModalFunc = () => {
            modal.style.display = 'none';
            productForm.reset();

            // Reset edit mode
            this.currentEditProductId = null;

            // Reset modal title
            const modalTitle = modal?.querySelector('h2');
            if (modalTitle) {
                modalTitle.textContent = '➕ Yeni Ürün Ekle';
            }

            // Reset submit button
            const submitBtn = document.getElementById('submitProductBtn');
            if (submitBtn) {
                submitBtn.textContent = '➕ Ürün Ekle';
            }

            vdLog('Modal closed and edit mode reset');
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

        // Image upload handler
        this.setupImageUpload();

        // SEO character counters
        this.setupSEOCounters();

        // Old category-based variant system removed - now using cascading dropdown variant system

        vdLog('Product modal configured');
    }

    openProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    /**
     * Setup image upload handler with variant image dropdown update
     */
    setupImageUpload() {
        const fileInput = document.getElementById('productImageFile');
        const imagePreview = document.getElementById('productImagePreview');

        if (!fileInput) {
            vdLog('Image file input not found');
            return;
        }

        // Track uploaded images for variant selection
        this.uploadedProductImages = [];

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Show loading state
            if (imagePreview) {
                imagePreview.innerHTML = '<div style="color: #64748b; font-size: 0.9rem;">Yükleniyor...</div>';
            }

            try {
                // Create a local preview first
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (imagePreview) {
                        imagePreview.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover;" alt="Ürün görseli">`;
                    }
                };
                reader.readAsDataURL(file);

                // Upload to server
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch(`${window.API_BASE_URL || 'http://localhost:3001/api'}/uploads/image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${AuthManager.getToken()}`
                    },
                    body: formData
                });

                const result = await response.json();

                if (result.success && result.data?.url) {
                    const imageUrl = result.data.url;

                    // Store in preview element for later use
                    if (imagePreview) {
                        imagePreview.dataset.imageUrl = imageUrl;
                        imagePreview.innerHTML = `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Ürün görseli">`;
                    }

                    // Add to uploaded images list
                    this.uploadedProductImages.push({
                        url: imageUrl,
                        name: file.name
                    });

                    // Update variant image selector
                    this.updateVariantImageSelector();

                    this.showSuccess('Görsel başarıyla yüklendi!');
                    vdLog('Image uploaded:', imageUrl);
                } else {
                    throw new Error(result.message || 'Görsel yüklenemedi');
                }
            } catch (error) {
                console.error('Image upload error:', error);
                this.showError('Görsel yüklenirken hata oluştu: ' + error.message);
                if (imagePreview) {
                    imagePreview.innerHTML = '<span style="color: #dc2626;">Yükleme hatası</span>';
                }
            }
        });

        vdLog('Image upload handler configured');
    }

    /**
     * Update variant image selector dropdown with uploaded images
     */
    updateVariantImageSelector() {
        const variantImageSelect = document.getElementById('variantImageSelect');
        if (!variantImageSelect) return;

        // Keep the default option
        variantImageSelect.innerHTML = '<option value="">Görsel seçin (ürün görsellerinden)</option>';

        // Add uploaded images
        if (this.uploadedProductImages && this.uploadedProductImages.length > 0) {
            this.uploadedProductImages.forEach((img, index) => {
                const option = document.createElement('option');
                option.value = img.url;
                option.textContent = `📷 Görsel ${index + 1}: ${img.name || 'Yüklenen görsel'}`;
                variantImageSelect.appendChild(option);
            });

            vdLog('Variant image selector updated with', this.uploadedProductImages.length, 'images');
        }
    }

    async loadCategories() {
        try {
            vdLog('Loading categories...');

            const response = await this.apiClient.getTopLevelCategories();

            if (response.success && response.data) {
                this.categories = response.data;
                this.populateCategoryDropdown();
                vdLog('Categories loaded successfully:', this.categories.length, 'categories');
                vdLog('Category IDs:', this.categories.map(c => ({ id: c.id, name: c.name })));
            } else {
                console.error('[Vendor Dashboard] Failed to load categories:', response);
                this.showError('Kategoriler yüklenemedi. Lütfen sayfayı yenileyin.');
            }
        } catch (error) {
            console.error('[Vendor Dashboard] Error loading categories:', error);
            this.showError('Kategoriler yüklenirken hata oluştu: ' + error.message);
        }
    }

    populateCategoryDropdown() {
        const categorySelect = document.getElementById('productCategory');
        if (!categorySelect) {
            console.error('[Vendor Dashboard] Category select element not found!');
            return;
        }

        if (!this.categories || this.categories.length === 0) {
            console.error('[Vendor Dashboard] No categories available to populate');
            return;
        }

        // Clear existing options (keep the first placeholder)
        categorySelect.innerHTML = '<option value="">Select a category...</option>';

        // Add categories
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.icon || '📦'} ${category.name}`;
            categorySelect.appendChild(option);
            vdLog('Added category option:', category.id, category.name);
        });

        vdLog('Category dropdown populated with', this.categories.length, 'categories');
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
            group.dataset.isRequired = v.is_required ? 'true' : 'false';

            const labelEl = document.createElement('div');
            labelEl.style.margin = '0.5rem 0';
            labelEl.textContent = v.name + (v.is_required ? ' *' : '');
            group.appendChild(labelEl);

            const optionsWrap = document.createElement('div');
            optionsWrap.style.display = 'grid';
            optionsWrap.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
            optionsWrap.style.gap = '0.5rem';

            (v.options || []).forEach(opt => {
                const row = document.createElement('div');
                row.className = 'variant-option-row';
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '0.5rem';
                row.style.padding = '0.35rem 0.5rem';
                row.style.border = '1px solid #e5e7eb';
                row.style.borderRadius = '6px';
                row.style.background = '#fff';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = `variant_${v.id}`;
                checkbox.value = opt.value;
                row.appendChild(checkbox);

                const span = document.createElement('span');
                span.textContent = opt.label || opt.value;
                if (v.type === 'color' && opt.value) {
                    span.style.display = 'inline-flex';
                    span.style.width = '16px';
                    span.style.height = '16px';
                    span.style.borderRadius = '50%';
                    span.style.background = opt.value;
                    span.style.marginLeft = '6px';
                    span.title = opt.label || opt.value;
                } else {
                    span.style.marginLeft = '6px';
                }
                row.appendChild(span);

                const skuInput = document.createElement('input');
                skuInput.type = 'text';
                skuInput.placeholder = 'SKU';
                skuInput.className = 'variant-sku-input';
                skuInput.style.flex = '1';
                skuInput.style.minWidth = '80px';
                skuInput.disabled = true;
                row.appendChild(skuInput);

                const priceInput = document.createElement('input');
                priceInput.type = 'number';
                priceInput.placeholder = 'Fiyat';
                priceInput.step = '0.01';
                priceInput.min = '0';
                priceInput.className = 'variant-price-input';
                priceInput.style.width = '90px';
                priceInput.disabled = true;
                row.appendChild(priceInput);

                const stockInput = document.createElement('input');
                stockInput.type = 'number';
                stockInput.placeholder = 'Stok';
                stockInput.min = '0';
                stockInput.className = 'variant-stock-input';
                stockInput.style.width = '70px';
                stockInput.disabled = true;
                row.appendChild(stockInput);

                // Enable/disable detail inputs based on checkbox
                checkbox.addEventListener('change', () => {
                    const enabled = checkbox.checked;
                    [skuInput, priceInput, stockInput].forEach(inp => { inp.disabled = !enabled; });
                });

                // Prefill defaults if provided
                if (opt.sku) skuInput.value = opt.sku;
                if (opt.price !== undefined && opt.price !== null) priceInput.value = opt.price;
                if (opt.stock !== undefined && opt.stock !== null) stockInput.value = opt.stock;

                optionsWrap.appendChild(row);
            });
            group.appendChild(optionsWrap);
            container.appendChild(group);
        });
    }

    // ==========================================
    // FULL PRODUCT EDIT MODAL
    // ==========================================

    async openEditProductModal(productId) {
        try {
            vdLog('Opening edit modal for product:', productId);

            // Ensure categories are loaded
            if (!this.categories || this.categories.length === 0) {
                vdLog('Categories not loaded, loading now...');
                await this.loadCategories();
            }

            // Fetch product details
            const response = await this.apiClient.get(`/products/${productId}`);
            if (!response.success || !response.data) {
                this.showError('Ürün bilgileri yüklenemedi');
                return;
            }

            const product = response.data;
            vdLog('Product loaded for editing:', product);

            // Store current edit product ID
            this.currentEditProductId = productId;

            // Open the product modal
            const modal = document.getElementById('productModal');
            if (!modal) {
                console.error('[Vendor Dashboard] Product modal element not found');
                return;
            }

            // Change modal title
            const modalTitle = modal.querySelector('h2');
            if (modalTitle) {
                modalTitle.textContent = '✏️ Ürünü Düzenle';
            }

            // Fill form fields (use correct element IDs from HTML)
            document.getElementById('productTitle').value = product.title || '';
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productShortDesc').value = product.short_description || '';
            document.getElementById('productPrice').value = product.price || '';
            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productCategory').value = product.category_id || '';

            // Fill SEO fields (if they exist)
            const seoTitleEl = document.getElementById('productSeoTitle');
            const seoDescEl = document.getElementById('productSeoDescription');
            if (seoTitleEl) seoTitleEl.value = product.seo_title || '';
            if (seoDescEl) seoDescEl.value = product.seo_description || '';

            // Fill badges
            document.querySelectorAll('input[name="badge"]').forEach(checkbox => {
                checkbox.checked = product.badges && product.badges.includes(checkbox.value);
            });

            // Fill product details fields (Material, Technique, Weight, Dimensions)
            const materialEl = document.getElementById('productMaterial');
            const techniqueEl = document.getElementById('productTechnique');
            const weightEl = document.getElementById('productWeight');
            const dimLengthEl = document.getElementById('productDimLength');
            const dimWidthEl = document.getElementById('productDimWidth');
            const dimHeightEl = document.getElementById('productDimHeight');

            if (materialEl) materialEl.value = product.material || '';
            if (techniqueEl) techniqueEl.value = product.technique || '';
            if (weightEl) weightEl.value = product.weight || '';
            if (product.dimensions) {
                if (dimLengthEl) dimLengthEl.value = product.dimensions.length || '';
                if (dimWidthEl) dimWidthEl.value = product.dimensions.width || '';
                if (dimHeightEl) dimHeightEl.value = product.dimensions.height || '';
            }

            // Fill image
            const imagePreview = document.getElementById('productImagePreview');
            if (imagePreview && product.images && product.images.length > 0) {
                const imageUrl = product.images[0];
                const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${this.apiClient.baseURL}${imageUrl}`;
                imagePreview.dataset.imageUrl = imageUrl;
                imagePreview.innerHTML = `
                    <img src="${fullUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                    <button type="button" onclick="vendorDashboard.removeProductImage()" style="
                        position: absolute;
                        top: 5px;
                        right: 5px;
                        background: #dc2626;
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 30px;
                        height: 30px;
                        cursor: pointer;
                        font-size: 18px;
                        line-height: 1;
                    ">×</button>
                `;
            }

            // Change submit button text
            const submitBtn = document.getElementById('submitProductBtn');
            if (submitBtn) {
                submitBtn.textContent = '💾 Güncelle';
            }

            // Show modal (use display instead of class to match existing pattern)
            modal.style.display = 'flex';

            // Load category variants if category is selected
            if (product.category_id) {
                await this.loadCategoryVariantsForForm(product.category_id);
            }

        } catch (error) {
            console.error('[Vendor Dashboard] Error opening edit modal:', error);
            this.showError('Ürün düzenleme ekranı açılamadı: ' + error.message);
        }
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

            // Get image URL from preview or file input
            const imagePreview = document.getElementById('productImagePreview');
            const imageUrl = imagePreview && imagePreview.dataset.imageUrl ? imagePreview.dataset.imageUrl.trim() : '';

            vdLog('Form values:', {
                title,
                shortDesc,
                description,
                categoryId,
                categoryIdType: typeof categoryId,
                categoryIdLength: categoryId ? categoryId.length : 0,
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
                console.error('[Vendor Dashboard] Category not selected');
                console.error('Available categories:', this.categories);
                console.error('Category select element:', document.getElementById('productCategory'));
                console.error('Category select value:', document.getElementById('productCategory')?.value);
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

            // Ensure required variants are selected
            const variantContainer = document.getElementById('variantContainer');
            if (variantContainer) {
                const missingRequired = [];
                variantContainer.querySelectorAll('.variant-group').forEach(group => {
                    const isRequired = group.dataset.isRequired === 'true';
                    const hasSelection = group.querySelectorAll('input[type="checkbox"]:checked').length > 0;
                    if (isRequired && !hasSelection) {
                        missingRequired.push(group.dataset.variantName || 'Zorunlu varyant');
                    }
                });
                if (missingRequired.length > 0) {
                    this.showError(`LÇ¬tfen zorunlu varyantlarŽñ seÇõin: ${missingRequired.join(', ')}`);
                    return;
                }
            }

            // Prepare product data (matching backend schema exactly)
            const productData = {
                store_id: this.storeId,
                category_id: categoryId,  // Send as-is (should be UUID string)
                title: title,
                price: price,
                stock: stock
            };

            vdLog('Product data being sent:', productData);
            vdLog('Category ID type:', typeof categoryId, 'value:', categoryId);

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

            // Use new cascading dropdown variant system
            const pendingVariants = this.getPendingVariants();
            if (pendingVariants.length > 0) {
                productData.variants = pendingVariants;
            }

            // Collect selected badges
            const selectedBadges = [];
            document.querySelectorAll('input[name="badge"]:checked').forEach(checkbox => {
                selectedBadges.push(checkbox.value);
            });

            if (selectedBadges.length > 0) {
                productData.badges = selectedBadges;
            }

            // Collect product details (Material, Technique, Weight, Dimensions)
            const material = document.getElementById('productMaterial')?.value?.trim();
            const technique = document.getElementById('productTechnique')?.value?.trim();
            const weightInput = document.getElementById('productWeight')?.value;
            const dimLength = document.getElementById('productDimLength')?.value;
            const dimWidth = document.getElementById('productDimWidth')?.value;
            const dimHeight = document.getElementById('productDimHeight')?.value;

            if (material) productData.material = material;
            if (technique) productData.technique = technique;
            if (weightInput && !isNaN(parseFloat(weightInput))) {
                productData.weight = parseFloat(weightInput);
            }
            if (dimLength || dimWidth || dimHeight) {
                productData.dimensions = {
                    length: dimLength ? parseFloat(dimLength) : null,
                    width: dimWidth ? parseFloat(dimWidth) : null,
                    height: dimHeight ? parseFloat(dimHeight) : null
                };
            }

            // Auto-generate SEO data from title and description
            // SEO title: use product title (max 60 chars)
            productData.seo_title = title.substring(0, 60);

            // SEO description: use short description or truncated full description (max 160 chars)
            if (shortDesc) {
                productData.seo_description = shortDesc.substring(0, 160);
            } else if (description) {
                productData.seo_description = description.substring(0, 160);
            }

            // Determine if this is create or update
            const isEdit = !!this.currentEditProductId;
            const actionText = isEdit ? 'güncelleniyor' : 'oluşturuluyor';
            const successText = isEdit ? 'Ürün başarıyla güncellendi!' : 'Ürün başarıyla oluşturuldu! Admin onayı bekleniyor.';

            vdLog(isEdit ? 'Updating product' : 'Creating product', 'with data:', productData);

            // Show loading
            const submitBtn = document.querySelector('#productForm button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = `⏳ ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}...`;

            // Call API (POST for create, PUT for update)
            let response;
            if (isEdit) {
                response = await this.apiClient.put(`/products/${this.currentEditProductId}`, productData);
            } else {
                response = await this.apiClient.post('/products', productData);
            }

            vdLog('API response:', response);

            submitBtn.disabled = false;
            submitBtn.textContent = originalText;

            if (response.success) {
                this.showSuccess(`✅ ${successText}`);

                // Close modal and reset
                const modal = document.getElementById('productModal');
                modal.classList.remove('show');
                modal.style.display = 'none';
                document.getElementById('productForm').reset();

                // Clear image preview
                const imagePreview = document.getElementById('productImagePreview');
                if (imagePreview) {
                    imagePreview.innerHTML = '<div style="color: #94a3b8; font-size: 0.9rem;">Resim seçilmedi</div>';
                    delete imagePreview.dataset.imageUrl;
                }

                // Reset edit mode
                this.currentEditProductId = null;

                // Reset modal title to default
                const modalTitle = modal.querySelector('h2');
                if (modalTitle) {
                    modalTitle.textContent = '➕ Yeni Ürün Ekle';
                }

                // Reload products
                if (this.currentSection === 'products') {
                    await this.loadProductsData();
                }
            } else {
                // Show detailed error message
                const errorMsg = response.message || response.error || (isEdit ? 'Ürün güncellenemedi' : 'Ürün oluşturulamadı');
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

        // Full edit product buttons
        document.querySelectorAll('.full-edit-product-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.currentTarget.dataset.productId;
                await this.openEditProductModal(productId);
            });
        });

        // Save product buttons
        document.querySelectorAll('.save-product-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.currentTarget.dataset.productId;
                await this.updateProduct(productId);
            });
        });

        // Delete product buttons
        document.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.currentTarget.dataset.productId;
                if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
                    await this.deleteProduct(productId);
                }
            });
        });

        // Toggle active/inactive buttons
        document.querySelectorAll('.toggle-active-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.currentTarget.dataset.productId;
                const isActive = e.currentTarget.dataset.active === 'true';
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

                // Optimistically update UI
                const btn = document.querySelector(`.toggle-active-btn[data-product-id="${productId}"]`);
                if (btn) {
                    btn.dataset.active = newActiveState.toString();
                    btn.textContent = newActiveState ? '✓ Aktif' : '○ Pasif';
                    btn.style.background = newActiveState ? '#dcfce7' : '#fff3cd';
                    btn.style.color = newActiveState ? '#10b981' : '#f59e0b';
                    btn.style.borderColor = newActiveState ? '#10b981' : '#f59e0b';

                    // Also update the status badge above the button
                    const statusBadge = btn.previousElementSibling;
                    if (statusBadge) {
                        // Keep the approval status label but maybe update style if needed
                        // Actually, active/passive doesn't change approval status (Approved/Pending/Rejected)
                        // So we don't need to change the badge text, just the button state is enough
                    }

                    // Update row appearance
                    const row = btn.closest('.product-row');
                    if (row) {
                        if (!newActiveState) {
                            row.style.background = '#fafafa';
                            row.style.borderColor = '#e5e7eb';
                            row.style.opacity = '0.75';
                        } else {
                            row.style.background = 'white';
                            row.style.borderColor = 'var(--vendor-border)';
                            row.style.opacity = '1';
                        }
                    }
                }

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
VendorDashboard.prototype.setupSEOCounters = function () {
    const seoTitleInput = document.getElementById('productSeoTitle');
    const seoDescInput = document.getElementById('productSeoDescription');
    const seoTitleCounter = document.getElementById('seoTitleCounter');
    const seoDescCounter = document.getElementById('seoDescCounter');

    if (seoTitleInput && seoTitleCounter) {
        seoTitleInput.addEventListener('input', () => {
            const length = seoTitleInput.value.length;
            seoTitleCounter.textContent = `Characters: ${length}/200`;

            // Color coding (50-60 is optimal for search results, but 200 is backend limit)
            if (length >= 50 && length <= 60) {
                seoTitleCounter.style.color = '#10b981'; // Green - optimal for SEO
            } else if (length > 200) {
                seoTitleCounter.style.color = '#ef4444'; // Red - exceeds backend limit
            } else if (length > 60 && length <= 200) {
                seoTitleCounter.style.color = '#f59e0b'; // Orange - acceptable but long
            } else {
                seoTitleCounter.style.color = '#666'; // Gray - default
            }
        });
    }

    if (seoDescInput && seoDescCounter) {
        seoDescInput.addEventListener('input', () => {
            const length = seoDescInput.value.length;
            seoDescCounter.textContent = `Characters: ${length}/500`;

            // Color coding (150-160 is optimal for search results, but 500 is backend limit)
            if (length >= 150 && length <= 160) {
                seoDescCounter.style.color = '#10b981'; // Green - optimal for SEO
            } else if (length > 500) {
                seoDescCounter.style.color = '#ef4444'; // Red - exceeds backend limit
            } else if (length > 160 && length <= 500) {
                seoDescCounter.style.color = '#f59e0b'; // Orange - acceptable but long
            } else {
                seoDescCounter.style.color = '#666'; // Gray - default
            }
        });
    }
}; // Close setupSEOCounters function

// ==========================================
// IMAGE UPLOAD HANDLER
// ==========================================

VendorDashboard.prototype.setupImageUpload = function () {
    const fileInput = document.getElementById('productImageFile');
    const dropzone = document.querySelector('.image-upload-dropzone');
    const preview = document.getElementById('productImagePreview');

    if (!fileInput || !dropzone || !preview) {
        console.warn('[Vendor Dashboard] Image upload elements not found');
        return;
    }

    // Click dropzone to open file picker
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Lütfen bir resim dosyası seçin (JPEG, PNG, WebP, GIF)');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            this.showError('Resim boyutu 5MB\'dan küçük olmalıdır');
            return;
        }

        // Show loading state
        preview.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%;"><div class="spinner"></div><span style="margin-left: 0.5rem;">Yükleniyor...</span></div>';

        try {
            vdLog('Uploading image:', file.name, file.size, 'bytes');

            // Create FormData
            const formData = new FormData();
            formData.append('image', file);

            // Get auth token
            const token = this.apiClient.getAuthToken();
            if (!token) {
                throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
            }

            // Upload to backend
            const response = await fetch(`${this.apiClient.baseURL}/uploads/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Resim yüklenemedi');
            }

            vdLog('Image uploaded successfully:', data.data.url);

            // Store URL in preview element's dataset
            preview.dataset.imageUrl = data.data.url;

            // Show preview
            const fullUrl = `${this.apiClient.baseURL}${data.data.url}`;
            preview.innerHTML = `
                <img src="${fullUrl}"
                     alt="Product preview"
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                <button type="button"
                        onclick="vendorDashboard.removeProductImage()"
                        style="position: absolute; top: 8px; right: 8px; background: rgba(220, 38, 38, 0.9); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                    ×
                </button>
            `;

            this.showSuccess('Resim başarıyla yüklendi!');

        } catch (error) {
            console.error('[Vendor Dashboard] Image upload error:', error);
            this.showError('Resim yüklenirken hata oluştu: ' + error.message);

            // Reset preview
            preview.innerHTML = '<span style="color: #94a3b8;">Seçilmiş görsel yok</span>';
            delete preview.dataset.imageUrl;
            fileInput.value = '';
        }
    });

    vdLog('Image upload handler configured');
};

VendorDashboard.prototype.removeProductImage = function () {
    const fileInput = document.getElementById('productImageFile');
    const preview = document.getElementById('productImagePreview');

    if (fileInput) fileInput.value = '';
    if (preview) {
        preview.innerHTML = '<span style="color: #94a3b8;">Seçilmiş görsel yok</span>';
        delete preview.dataset.imageUrl;
    }

    vdLog('Product image removed');
};

// ==========================================
// CAMPAIGNS MANAGEMENT
// ==========================================

VendorDashboard.prototype.loadCampaignsData = async function () {
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
};

VendorDashboard.prototype.renderCampaigns = function (campaigns) {
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
};

VendorDashboard.prototype.setupCampaignModal = function () {
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
};

VendorDashboard.prototype.loadCampaignProducts = async function () {
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
};

VendorDashboard.prototype.createCampaign = async function () {
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
};

VendorDashboard.prototype.toggleCampaignStatus = async function (campaignId, newStatus) {
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
};

VendorDashboard.prototype.deleteCampaign = async function (campaignId) {
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
};

VendorDashboard.prototype.viewCampaignStats = async function (campaignId) {
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

// ==========================================
// CASCADING VARIANT SYSTEM
// ==========================================

/**
 * Setup the variant dropdown system
 */
VendorDashboard.prototype.setupVariantSystem = async function () {
    vdLog('Setting up cascading variant system');

    // Initialize variant list storage
    this.pendingVariants = [];

    // Load variant types into dropdown
    await this.loadVariantTypes();

    // Setup type dropdown change handler
    const typeSelect = document.getElementById('variantTypeSelect');
    if (typeSelect) {
        typeSelect.addEventListener('change', async (e) => {
            await this.onVariantTypeChange(e.target.value);
        });
    }

    // Setup add variant button
    const addBtn = document.getElementById('addVariantBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            this.addVariantToList();
        });
    }

    // Setup variant image selector preview
    const variantImageSelect = document.getElementById('variantImageSelect');
    if (variantImageSelect) {
        variantImageSelect.addEventListener('change', (e) => {
            const imageUrl = e.target.value;
            const previewContainer = document.getElementById('variantImagePreview');
            if (previewContainer) {
                if (imageUrl) {
                    previewContainer.innerHTML = `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Varyant görseli">`;
                } else {
                    previewContainer.innerHTML = '<span style="color: #94a3b8; font-size: 1.2rem;">📷</span>';
                }
            }
        });
    }

    vdLog('Variant system setup complete');
};

/**
 * Load variant types from API
 */
VendorDashboard.prototype.loadVariantTypes = async function () {
    try {
        const response = await this.apiClient.get('/variants/types');
        if (response.success && response.data) {
            const typeSelect = document.getElementById('variantTypeSelect');
            if (typeSelect) {
                typeSelect.innerHTML = '<option value="">Tip seçin...</option>';
                response.data.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.key;
                    option.textContent = `${type.icon} ${type.label}`;
                    option.dataset.hasPresetValues = type.hasPresetValues;
                    typeSelect.appendChild(option);
                });
            }
            vdLog('Loaded', response.data.length, 'variant types');
        }
    } catch (error) {
        console.error('[Variant] Error loading types:', error);
    }
};

/**
 * Handle variant type change - load values for cascading dropdown
 */
VendorDashboard.prototype.onVariantTypeChange = async function (typeKey) {
    const valueSelect = document.getElementById('variantValueSelect');
    if (!valueSelect) return;

    if (!typeKey) {
        valueSelect.innerHTML = '<option value="">Önce tip seçin...</option>';
        valueSelect.disabled = true;
        return;
    }

    // Check if it's "diger" (free text)
    if (typeKey === 'diger') {
        // Replace select with text input
        const parent = valueSelect.parentElement;
        valueSelect.style.display = 'none';

        let textInput = document.getElementById('variantValueText');
        if (!textInput) {
            textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.id = 'variantValueText';
            textInput.placeholder = 'Değer girin...';
            textInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid var(--vendor-border); border-radius: 6px;';
            parent.appendChild(textInput);
        }
        textInput.style.display = 'block';
        return;
    }

    // Hide text input if exists
    const textInput = document.getElementById('variantValueText');
    if (textInput) textInput.style.display = 'none';
    valueSelect.style.display = 'block';

    try {
        const response = await this.apiClient.get(`/variants/types/${typeKey}/values`);
        if (response.success && response.data) {
            valueSelect.innerHTML = '<option value="">Değer seçin...</option>';
            response.data.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                valueSelect.appendChild(option);
            });
            valueSelect.disabled = false;
            vdLog('Loaded', response.data.length, 'values for type:', typeKey);
        }
    } catch (error) {
        console.error('[Variant] Error loading values:', error);
        valueSelect.innerHTML = '<option value="">Değerler yüklenemedi</option>';
        valueSelect.disabled = true;
    }
};

/**
 * Add variant to pending list
 */
VendorDashboard.prototype.addVariantToList = function () {
    const colorPicker = document.getElementById('variantColorPicker');
    const colorName = document.getElementById('variantColorName');
    const typeSelect = document.getElementById('variantTypeSelect');
    const valueSelect = document.getElementById('variantValueSelect');
    const valueText = document.getElementById('variantValueText');
    const priceInput = document.getElementById('variantPrice');
    const stockInput = document.getElementById('variantStock');
    const imageSelect = document.getElementById('variantImageSelect');

    // Get values
    const colorHex = colorName?.value.trim() ? colorPicker?.value : null;
    const colorNameVal = colorName?.value.trim() || null;
    const variantType = typeSelect?.value || null;

    let variantValue = null;
    if (variantType === 'diger' && valueText) {
        variantValue = valueText.value.trim();
    } else if (valueSelect) {
        variantValue = valueSelect.value;
    }

    const price = parseFloat(priceInput?.value);
    const stock = parseInt(stockInput?.value);
    const imageUrl = imageSelect?.value || null;

    // Validation
    if (!price || price <= 0) {
        this.showError('Lütfen geçerli bir fiyat girin');
        return;
    }

    if (isNaN(stock) || stock < 0) {
        this.showError('Lütfen geçerli bir stok değeri girin');
        return;
    }

    if (!colorNameVal && !variantValue) {
        this.showError('Lütfen renk veya varyant değeri girin');
        return;
    }

    // Create variant object
    const variant = {
        id: Date.now(), // Temp ID for UI
        color_hex: colorHex,
        color_name: colorNameVal,
        variant_type: variantType,
        variant_value: variantValue,
        price: price,
        stock: stock,
        image_url: imageUrl
    };

    // Check for duplicates
    const isDuplicate = this.pendingVariants.some(v =>
        v.color_hex === variant.color_hex &&
        v.variant_type === variant.variant_type &&
        v.variant_value === variant.variant_value
    );

    if (isDuplicate) {
        this.showError('Bu varyant zaten eklenmiş');
        return;
    }

    this.pendingVariants.push(variant);
    this.renderVariantsList();

    // Reset inputs (keep type selected)
    if (colorName) colorName.value = '';
    if (valueSelect) valueSelect.value = '';
    if (valueText) valueText.value = '';
    if (priceInput) priceInput.value = '';
    if (stockInput) stockInput.value = '';
    if (imageSelect) imageSelect.value = '';

    // Reset image preview
    const imagePreview = document.getElementById('variantImagePreview');
    if (imagePreview) {
        imagePreview.innerHTML = '<span style="color: #94a3b8; font-size: 1.2rem;">📷</span>';
    }


    this.showSuccess('Varyant eklendi!');
};

/**
 * Render variants list
 */
VendorDashboard.prototype.renderVariantsList = function () {
    const listContainer = document.getElementById('variantsList');
    const listContent = document.getElementById('variantsListContent');

    if (!listContainer || !listContent) return;

    if (this.pendingVariants.length === 0) {
        listContainer.style.display = 'none';
        return;
    }

    listContainer.style.display = 'block';

    listContent.innerHTML = this.pendingVariants.map((v, index) => `
        <div style="display: flex; align-items: center; padding: 0.75rem; border-bottom: 1px solid var(--vendor-border); background: ${index % 2 === 0 ? '#fff' : '#f9fafb'};">
            ${v.image_url ? `<img src="${v.image_url}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; margin-right: 0.5rem; border: 1px solid #ddd;" alt="Varyant görseli">` : ''}
            ${v.color_hex ? `<span style="width: 20px; height: 20px; border-radius: 50%; background: ${v.color_hex}; margin-right: 0.5rem; border: 1px solid #ddd;"></span>` : ''}
            <span style="flex: 1;">
                ${v.color_name || ''} 
                ${v.color_name && v.variant_value ? '-' : ''} 
                ${v.variant_value || ''}
            </span>
            <span style="width: 100px; text-align: right; font-weight: 600; color: var(--vendor-primary);">${v.price.toFixed(2)} ₺</span>
            <span style="width: 80px; text-align: center; color: #666;">${v.stock} adet</span>
            <button type="button" onclick="vendorDashboard.removeVariant(${v.id})" style="background: none; border: none; color: #dc2626; cursor: pointer; padding: 0.25rem; font-size: 1rem;">🗑️</button>
        </div>
    `).join('');
};

/**
 * Remove variant from pending list
 */
VendorDashboard.prototype.removeVariant = function (variantId) {
    this.pendingVariants = this.pendingVariants.filter(v => v.id !== variantId);
    this.renderVariantsList();
};

/**
 * Get pending variants for form submission
 */
VendorDashboard.prototype.getPendingVariants = function () {
    return this.pendingVariants.map(v => ({
        color_hex: v.color_hex,
        color_name: v.color_name,
        variant_type: v.variant_type,
        variant_value: v.variant_value,
        price: v.price,
        stock: v.stock,
        image_url: v.image_url
    }));
};

/**
 * Reset variant form
 */
VendorDashboard.prototype.resetVariantForm = function () {
    this.pendingVariants = [];
    this.renderVariantsList();

    const colorName = document.getElementById('variantColorName');
    const typeSelect = document.getElementById('variantTypeSelect');
    const valueSelect = document.getElementById('variantValueSelect');
    const valueText = document.getElementById('variantValueText');
    const priceInput = document.getElementById('variantPrice');
    const stockInput = document.getElementById('variantStock');

    if (colorName) colorName.value = '';
    if (typeSelect) typeSelect.value = '';
    if (valueSelect) {
        valueSelect.innerHTML = '<option value="">Önce tip seçin...</option>';
        valueSelect.disabled = true;
    }
    if (valueText) valueText.value = '';
    if (priceInput) priceInput.value = '';
    if (stockInput) stockInput.value = '';
};

// Initialize variant system when dashboard loads
const originalInit = VendorDashboard.prototype.init;
VendorDashboard.prototype.init = async function () {
    await originalInit.call(this);
    await this.setupVariantSystem();
    this.setupPayoutRequestButton();
};

// ==========================================
// PAYOUT MANAGEMENT
// ==========================================

/**
 * Load payout data (balance + history)
 */
VendorDashboard.prototype.loadPayoutsData = async function () {
    vdLog('Loading payouts data...');

    try {
        // Fetch balance
        const balanceRes = await this.apiClient.get('/payouts/balance');
        if (balanceRes.success && balanceRes.data) {
            this.renderPayoutBalance(balanceRes.data);
        }

        // Fetch history
        const historyRes = await this.apiClient.get('/payouts/history');
        if (historyRes.success && historyRes.data) {
            this.renderPayoutHistory(historyRes.data.payouts || []);
        }
    } catch (error) {
        console.error('[Vendor Dashboard] Error loading payouts:', error);
    }
};

/**
 * Render payout balance cards
 */
VendorDashboard.prototype.renderPayoutBalance = function (balance) {
    const totalEarnings = document.getElementById('payoutTotalEarnings');
    const totalPaid = document.getElementById('payoutTotalPaid');
    const pending = document.getElementById('payoutPending');
    const available = document.getElementById('payoutAvailable');

    if (totalEarnings) totalEarnings.textContent = `₺${balance.totalEarnings.toLocaleString('tr-TR')}`;
    if (totalPaid) totalPaid.textContent = `₺${balance.totalPaidOut.toLocaleString('tr-TR')}`;
    if (pending) pending.textContent = `₺${balance.pendingPayouts.toLocaleString('tr-TR')}`;
    if (available) available.textContent = `₺${balance.availableBalance.toLocaleString('tr-TR')}`;

    // Update form input max
    const input = document.getElementById('payoutAmountInput');
    if (input) {
        input.max = balance.availableBalance;
        input.placeholder = `Min. ₺${balance.minimumPayoutAmount} - Max. ₺${balance.availableBalance}`;
    }

    // Update message
    const msg = document.getElementById('payoutMessage');
    if (msg) {
        if (balance.canRequestPayout) {
            msg.textContent = `✅ Çekilebilir bakiyeniz: ₺${balance.availableBalance.toLocaleString('tr-TR')}`;
            msg.style.color = '#10b981';
        } else {
            msg.textContent = `⚠️ Minimum çekim tutarı ₺${balance.minimumPayoutAmount}. Mevcut bakiye: ₺${balance.availableBalance}`;
            msg.style.color = '#f59e0b';
        }
    }
};

/**
 * Render payout history list
 */
VendorDashboard.prototype.renderPayoutHistory = function (payouts) {
    const container = document.getElementById('payoutHistoryList');
    if (!container) return;

    if (!payouts || payouts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b;">Henüz ödeme talebi yok</p>';
        return;
    }

    const statusColors = {
        pending: '#f59e0b',
        approved: '#3b82f6',
        processing: '#8b5cf6',
        completed: '#10b981',
        rejected: '#dc2626'
    };

    const statusLabels = {
        pending: 'Bekliyor',
        approved: 'Onaylandı',
        processing: 'İşleniyor',
        completed: 'Tamamlandı',
        rejected: 'Reddedildi'
    };

    container.innerHTML = payouts.map(p => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border: 1px solid var(--vendor-border); border-radius: 8px; margin-bottom: 0.5rem; border-left: 3px solid ${statusColors[p.status] || '#64748b'};">
            <div>
                <div style="font-weight: 600; margin-bottom: 0.25rem;">₺${parseFloat(p.requested_amount).toLocaleString('tr-TR')}</div>
                <div style="font-size: 0.8rem; color: #64748b;">
                    ${new Date(p.requested_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                ${p.rejection_reason ? `<div style="font-size: 0.75rem; color: #dc2626; margin-top: 0.25rem;">📝 ${p.rejection_reason}</div>` : ''}
            </div>
            <span style="background: ${statusColors[p.status]}; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem;">
                ${statusLabels[p.status] || p.status}
            </span>
        </div>
    `).join('');
};

/**
 * Setup payout request button
 */
VendorDashboard.prototype.setupPayoutRequestButton = function () {
    const btn = document.getElementById('requestPayoutBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const input = document.getElementById('payoutAmountInput');
        const msg = document.getElementById('payoutMessage');
        const amount = parseFloat(input?.value);

        if (!amount || amount < 100) {
            if (msg) {
                msg.textContent = '❌ Minimum çekim tutarı ₺100';
                msg.style.color = '#dc2626';
            }
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Gönderiliyor...';

        try {
            const res = await this.apiClient.post('/payouts/request', { amount });

            if (res.success) {
                if (msg) {
                    msg.textContent = '✅ Ödeme talebiniz başarıyla oluşturuldu! Admin onayı bekleniyor.';
                    msg.style.color = '#10b981';
                }
                input.value = '';
                // Reload payouts data
                this.loadPayoutsData();
            } else {
                throw new Error(res.message || 'Talep oluşturulamadı');
            }
        } catch (error) {
            if (msg) {
                msg.textContent = '❌ ' + error.message;
                msg.style.color = '#dc2626';
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Talep Oluştur';
        }
    });
};
