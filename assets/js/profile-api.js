/**
 * Profile Page API Integration
 * Handles customer profile management, orders, addresses
 */

class ProfileAPI {
    constructor() {
        this.apiClient = new ApiClient();
        this.user = null;
        this.orders = [];
        this.addresses = [];
        this.currentSection = 'overview';
        this.wishlistItems = [];
        this.wishlistUnsubscribe = null;
    }

    /**
     * Initialize profile page
     */
    async init() {
        try {
            console.log('[Profile API] Initializing...');

            // Check authentication
            const token = AuthManager.getToken();
            if (!token) {
                console.warn('[Profile API] User not authenticated, redirecting to login');
                window.location.href = 'login.html';
                return;
            }

            // Load user data
            await this.loadUser();
            if (window.wishlistManager && typeof window.wishlistManager.ensureInitialized === 'function') {
                await window.wishlistManager.ensureInitialized();
            }
            await this.loadWishlist();

            // Render profile UI
            this.renderProfile();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial section
            this.loadSection('overview');

            console.log('[Profile API] Initialized successfully');
        } catch (error) {
            console.error('[Profile API] Initialization error:', error);
            console.error('[Profile API] Error details:', error.message);
            console.error('[Profile API] Error stack:', error.stack);
            this.showError(`Failed to load profile: ${error.message}`);
        }
    }

    /**
     * Load current user data
     */
    async loadUser() {
        try {
            console.log('[Profile API] Loading user data...');

            const response = await this.apiClient.get('/auth/me');
            this.user = response.data || response;

            console.log('[Profile API] User loaded:', this.user.email);
            return this.user;
        } catch (error) {
            console.error('[Profile API] Failed to load user:', error);

            // If token is invalid, redirect to login
            if (error.message.includes('401')) {
                AuthManager.logout();
                window.location.href = 'login.html';
            }

            throw error;
        }
    }

    /**
     * Load user's orders
     */
    async loadOrders() {
        try {
            console.log('[Profile API] Loading orders...');

            const response = await this.apiClient.get('/orders');
            this.orders = response.data || [];

            console.log('[Profile API] Loaded', this.orders.length, 'orders');
            return this.orders;
        } catch (error) {
            console.error('[Profile API] Failed to load orders:', error);
            return [];
        }
    }

    async loadWishlist() {
        try {
            if (window.wishlistManager && typeof window.wishlistManager.getItems === 'function') {
                const rawItems = window.wishlistManager.getItems();
                this.wishlistItems = Array.isArray(rawItems)
                    ? rawItems.map((item) => this.normalizeWishlistItem(item)).filter(Boolean)
                    : [];

                if (!this.wishlistUnsubscribe && typeof window.wishlistManager.onChange === 'function') {
                    this.wishlistUnsubscribe = window.wishlistManager.onChange((items) => {
                        this.wishlistItems = Array.isArray(items)
                            ? items.map((entry) => this.normalizeWishlistItem(entry)).filter(Boolean)
                            : [];
                        if (this.currentSection === 'wishlist') {
                            this.renderWishlistSection();
                        }
                    });
                }
            } else {
                const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
                this.wishlistItems = Array.isArray(stored)
                    ? stored.map((item) => this.normalizeWishlistItem(item)).filter(Boolean)
                    : [];
            }
        } catch (error) {
            console.error('[Profile API] Failed to load wishlist:', error);
            this.wishlistItems = [];
        }
    }

    /**
     * Render profile header
     */
    renderProfile() {
        // Update avatar
        const avatarEl = document.querySelector('.profile-avatar');
        if (avatarEl && this.user) {
            if (this.user.avatar) {
                avatarEl.style.backgroundImage = `url(${this.user.avatar})`;
            } else {
                const initials = `${this.user.first_name?.[0] || ''}${this.user.last_name?.[0] || ''}`.toUpperCase();
                avatarEl.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:600;color:#2d6853">${initials}</div>`;
            }
        }

        // Update user info
        const nameEl = document.querySelector('.profile-name');
        if (nameEl && this.user) {
            nameEl.textContent = `${this.user.first_name || ''} ${this.user.last_name || ''}`.trim();
        }

        const emailEl = document.querySelector('.profile-email');
        if (emailEl && this.user) {
            emailEl.textContent = this.user.email;
        }

        // Update role badge
        const roleEl = document.querySelector('.profile-role');
        if (roleEl && this.user) {
            roleEl.textContent = this.user.role || 'buyer';
        }
    }

    /**
     * Load and display specific section
     */
    async loadSection(section) {
        this.currentSection = section;
        console.log('[Profile API] Loading section:', section);

        // Update active menu item
        document.querySelectorAll('.nav-link').forEach(item => {
            if (item.dataset.section === section) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Get content container
        const contentEl = document.querySelector('.profile-content');
        if (!contentEl) return;

        // Show loading state
        contentEl.innerHTML = '<div class="loading-spinner">Loading...</div>';

        try {
            switch (section) {
                case 'overview':
                    await this.renderOverview();
                    break;
                case 'orders':
                    await this.renderOrders();
                    break;
                case 'returns':
                    await this.renderReturns();
                    break;
                case 'addresses':
                    await this.renderAddresses();
                    break;
                case 'wishlist':
                    await this.renderWishlistSection();
                    break;
                case 'settings':
                    await this.renderSettings();
                    break;
                default:
                    contentEl.innerHTML = '<p>Section not found</p>';
            }
        } catch (error) {
            console.error('[Profile API] Error loading section:', error);
            contentEl.innerHTML = '<div class="error-message">Failed to load section</div>';
        }
    }

    /**
     * Render overview section
     */
    async renderOverview() {
        const orders = await this.loadOrders();
        const recentOrders = orders.slice(0, 3);

        const contentEl = document.querySelector('.profile-content');
        contentEl.innerHTML = `
            <div class="profile-overview">
                <h2>Welcome back, ${this.user.first_name}!</h2>

                <div class="overview-stats">
                    <div class="stat-card">
                        <div class="stat-icon">📦</div>
                        <div class="stat-info">
                            <div class="stat-value">${orders.length}</div>
                            <div class="stat-label">Total Orders</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">🚚</div>
                        <div class="stat-info">
                            <div class="stat-value">${orders.filter(o => o.status === 'shipped').length}</div>
                            <div class="stat-label">In Transit</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-info">
                            <div class="stat-value">${orders.filter(o => o.status === 'delivered').length}</div>
                            <div class="stat-label">Delivered</div>
                        </div>
                    </div>
                </div>

                <h3>Recent Orders</h3>
                <div class="recent-orders">
                    ${recentOrders.length > 0 ? recentOrders.map(order => `
                        <div class="order-card">
                            <div class="order-header">
                                <span class="order-number">#${order.order_number}</span>
                                <span class="order-status status-${order.status}">${order.status}</span>
                            </div>
                            <div class="order-date">${new Date(order.created_at).toLocaleDateString()}</div>
                            <div class="order-total">$${order.total}</div>
                        </div>
                    `).join('') : '<p>No orders yet</p>'}
                </div>

                <button class="btn btn-primary" onclick="profileAPI.loadSection('orders')">View All Orders</button>
            </div>
        `;
    }

    /**
     * Render orders section
     */
    async renderOrders() {
        const orders = await this.loadOrders();

        const contentEl = document.querySelector('.profile-content');
        contentEl.innerHTML = `
            <div class="profile-orders">
                <h2>My Orders</h2>

                ${orders.length > 0 ? `
                    <div class="orders-list">
                        ${orders.map(order => `
                            <div class="order-item">
                                <div class="order-item-header">
                                    <div>
                                        <h4>Order #${order.order_number}</h4>
                                        <p class="order-date">${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                    <span class="order-status status-${order.status}">${order.status.replace('_', ' ')}</span>
                                </div>

                                <div class="order-items">
                                    ${order.items?.map(item => `
                                        <div class="order-product">
                                            <img src="${item.product_snapshot?.image || 'https://via.placeholder.com/60x60'}" alt="${item.product_snapshot?.title}">
                                            <div class="order-product-info">
                                                <h5>${item.product_snapshot?.title}</h5>
                                                <p>Quantity: ${item.quantity} × $${item.price}</p>
                                            </div>
                                            <div class="order-product-price">$${item.total}</div>
                                        </div>
                                    `).join('') || '<p>No items</p>'}
                                </div>

                                <div class="order-footer">
                                    <div class="order-total">
                                        <strong>Total:</strong> $${order.total}
                                    </div>
                                    ${order.tracking_number ? `
                                        <div class="order-tracking">
                                            <strong>Tracking:</strong> ${order.tracking_number}
                                        </div>
                                    ` : ''}
                                    ${order.status === 'delivered' ? `
                                        <button 
                                            onclick="profileAPI.initiateReturn('${order.id}')"
                                            style="padding: 0.75rem 1.5rem; background: #f59e0b; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 500; margin-top: 1rem;"
                                        >
                                            ↩️ İade Talebi Oluştur
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="empty-state">No orders yet. Start shopping to see your orders here!</p>'}
            </div>
        `;
    }

    /**
     * Load user's addresses
     */
    async loadAddresses() {
        try {
            console.log('[Profile API] Loading addresses...');
            const response = await this.apiClient.get('/addresses');
            this.addresses = response.data?.addresses || response.addresses || [];
            console.log('[Profile API] Loaded', this.addresses.length, 'addresses');
            return this.addresses;
        } catch (error) {
            console.error('[Profile API] Failed to load addresses:', error);
            return [];
        }
    }

    /**
     * Render addresses section
     */
    async renderAddresses() {
        const contentEl = document.querySelector('.profile-content');

        // Show loading state
        contentEl.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <p>Loading addresses...</p>
            </div>
        `;

        // Load addresses
        await this.loadAddresses();

        // Render addresses UI
        contentEl.innerHTML = `
            <div class="profile-addresses">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="margin: 0;">Saved Addresses</h2>
                    <button class="btn btn-primary" onclick="profileAPI.showAddressForm()">
                        <span>➕</span> Add New Address
                    </button>
                </div>

                <div id="address-list" style="display: grid; gap: 1.5rem;">
                    ${this.addresses.length === 0
                        ? `<div class="empty-state" style="text-align:center; padding: 3rem; color: #6b7280; background: #f9fafb; border-radius: 16px;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📍</div>
                            <h3>No saved addresses</h3>
                            <p>Add an address to make checkout faster and easier.</p>
                        </div>`
                        : this.addresses.map(addr => this.renderAddressCard(addr)).join('')
                    }
                </div>

                <!-- Address Form Modal (hidden by default) -->
                <div id="address-form-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; padding: 2rem; overflow-y: auto;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 2rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h3 id="form-title" style="margin: 0;">Add New Address</h3>
                            <button onclick="profileAPI.closeAddressForm()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">&times;</button>
                        </div>
                        <form id="address-form" style="display: grid; gap: 1rem;">
                            <input type="hidden" id="address-id" value="">

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Label (e.g., Home, Office)</label>
                                <input type="text" id="address-label" placeholder="Home" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;">
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Full Name *</label>
                                <input type="text" id="address-full-name" required placeholder="John Doe" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;">
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Phone *</label>
                                <input type="tel" id="address-phone" required placeholder="+90 555 123 4567" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;">
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Email</label>
                                <input type="email" id="address-email" placeholder="example@email.com" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;">
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Address Line 1 *</label>
                                <input type="text" id="address-line1" required placeholder="Street address, building number" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;">
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Address Line 2</label>
                                <input type="text" id="address-line2" placeholder="Apartment, floor, door number (optional)" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;">
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">City / İl *</label>
                                    <input type="text" id="address-city" required placeholder="İstanbul (City/İl)" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">District / İlçe</label>
                                    <input type="text" id="address-state" placeholder="Beşiktaş (District/İlçe)" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;">
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Postal Code *</label>
                                    <input type="text" id="address-postal" required placeholder="34000" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Country *</label>
                                    <input type="text" id="address-country" required value="Turkey" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px;">
                                </div>
                            </div>

                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Delivery Notes</label>
                                <textarea id="address-notes" placeholder="Special delivery instructions (optional)" rows="3" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical;"></textarea>
                            </div>

                            <div>
                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                    <input type="checkbox" id="address-default" style="width: 1.25rem; height: 1.25rem;">
                                    <span>Set as default address</span>
                                </label>
                            </div>

                            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                <button type="submit" class="btn btn-primary" style="flex: 1;">Save Address</button>
                                <button type="button" onclick="profileAPI.closeAddressForm()" class="btn btn-secondary" style="flex: 1;">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Setup form submission
        const form = document.getElementById('address-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddressSubmit(e));
        }
    }

    /**
     * Render a single address card
     */
    renderAddressCard(address) {
        const defaultBadge = address.is_default
            ? '<span style="background: #10b981; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">DEFAULT</span>'
            : '';

        const typeBadge = address.type
            ? `<span style="background: #e5e7eb; color: #374151; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; text-transform: capitalize;">${address.type}</span>`
            : '';

        return `
            <div class="address-card" data-address-id="${address.id}" style="background: #f9fafb; padding: 1.5rem; border-radius: 16px; border: 2px solid ${address.is_default ? '#10b981' : 'transparent'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div style="display: flex; gap: 0.5rem;">
                        ${address.label ? `<h4 style="margin: 0;">${address.label}</h4>` : '<h4 style="margin: 0;">Address</h4>'}
                        ${defaultBadge}
                        ${typeBadge}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="profileAPI.editAddress('${address.id}')" class="btn-icon" title="Edit">✏️</button>
                        ${!address.is_default ? `<button onclick="profileAPI.deleteAddress('${address.id}')" class="btn-icon" title="Delete">🗑️</button>` : ''}
                    </div>
                </div>
                <div style="color: #374151; line-height: 1.6;">
                    <p style="margin: 0.25rem 0; font-weight: 600;">${address.full_name}</p>
                    ${address.email ? `<p style="margin: 0.25rem 0; color: #6b7280;">📧 ${address.email}</p>` : ''}
                    <p style="margin: 0.25rem 0; color: #6b7280;">📞 ${address.phone}</p>
                    <p style="margin: 0.25rem 0;">${address.address_line1}</p>
                    ${address.address_line2 ? `<p style="margin: 0.25rem 0;">${address.address_line2}</p>` : ''}
                    <p style="margin: 0.25rem 0;">${address.city}${address.state ? ', ' + address.state : ''} ${address.postal_code}</p>
                    <p style="margin: 0.25rem 0;">${address.country}</p>
                    ${address.notes ? `<p style="margin: 0.5rem 0 0; color: #6b7280; font-size: 0.875rem;">📝 ${address.notes}</p>` : ''}
                </div>
                ${!address.is_default ? `
                    <button onclick="profileAPI.setDefaultAddress('${address.id}')" class="btn btn-secondary" style="margin-top: 1rem; width: 100%;">
                        Set as Default
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Show address form modal
     */
    showAddressForm(addressId = null) {
        const modal = document.getElementById('address-form-modal');
        const form = document.getElementById('address-form');
        const title = document.getElementById('form-title');

        if (!modal || !form) return;

        // Reset form
        form.reset();
        document.getElementById('address-id').value = '';
        document.getElementById('address-country').value = 'Turkey';

        if (addressId) {
            // Edit mode
            title.textContent = 'Edit Address';
            const address = this.addresses.find(a => a.id === addressId);
            if (address) {
                document.getElementById('address-id').value = address.id;
                document.getElementById('address-label').value = address.label || '';
                document.getElementById('address-full-name').value = address.full_name;
                document.getElementById('address-phone').value = address.phone;
                document.getElementById('address-email').value = address.email || '';
                document.getElementById('address-line1').value = address.address_line1;
                document.getElementById('address-line2').value = address.address_line2 || '';
                document.getElementById('address-city').value = address.city;
                document.getElementById('address-state').value = address.state || '';
                document.getElementById('address-postal').value = address.postal_code;
                document.getElementById('address-country').value = address.country;
                document.getElementById('address-notes').value = address.notes || '';
                document.getElementById('address-default').checked = address.is_default;
            }
        } else {
            // Add mode
            title.textContent = 'Add New Address';
        }

        modal.style.display = 'block';
    }

    /**
     * Close address form modal
     */
    closeAddressForm() {
        const modal = document.getElementById('address-form-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Handle address form submission
     */
    async handleAddressSubmit(event) {
        event.preventDefault();

        const addressId = document.getElementById('address-id').value;
        const addressData = {
            label: document.getElementById('address-label').value,
            full_name: document.getElementById('address-full-name').value,
            phone: document.getElementById('address-phone').value,
            email: document.getElementById('address-email').value,
            address_line1: document.getElementById('address-line1').value,
            address_line2: document.getElementById('address-line2').value,
            city: document.getElementById('address-city').value,
            state: document.getElementById('address-state').value,
            postal_code: document.getElementById('address-postal').value,
            country: document.getElementById('address-country').value,
            notes: document.getElementById('address-notes').value,
            is_default: document.getElementById('address-default').checked,
        };

        try {
            if (addressId) {
                // Update existing address
                await this.apiClient.put(`/addresses/${addressId}`, addressData);
                this.showSuccess('Address updated successfully');
            } else {
                // Create new address
                await this.apiClient.post('/addresses', addressData);
                this.showSuccess('Address added successfully');
            }

            this.closeAddressForm();
            await this.renderAddresses();
        } catch (error) {
            console.error('[Profile API] Failed to save address:', error);
            console.error('[Profile API] Error details:', {
                message: error.message,
                response: error.response,
                data: error.response?.data,
                status: error.response?.status
            });
            const errorMsg = error.response?.data?.message || error.message || 'Failed to save address';
            this.showError(errorMsg);
        }
    }

    /**
     * Edit an address
     */
    editAddress(addressId) {
        this.showAddressForm(addressId);
    }

    /**
     * Delete an address
     */
    async deleteAddress(addressId) {
        if (!confirm('Are you sure you want to delete this address?')) {
            return;
        }

        try {
            await this.apiClient.delete(`/addresses/${addressId}`);
            this.showSuccess('Address deleted successfully');
            await this.renderAddresses();
        } catch (error) {
            console.error('[Profile API] Failed to delete address:', error);
            console.error('[Profile API] Error details:', error.response?.data);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to delete address';
            this.showError(errorMsg);
        }
    }

    /**
     * Set an address as default
     */
    async setDefaultAddress(addressId) {
        try {
            await this.apiClient.post(`/addresses/${addressId}/set-default`);
            this.showSuccess('Default address updated');
            await this.renderAddresses();
        } catch (error) {
            console.error('[Profile API] Failed to set default address:', error);
            this.showError(error.message || 'Failed to set default address');
        }
    }

    normalizeWishlistItem(item) {
        if (!item) return null;

        if (typeof item === 'string') {
            return {
                id: item,
                product_id: item,
                product: null,
                added_at: new Date().toISOString(),
            };
        }

        const productId = item.product_id || item.id || item.title;
        if (!productId) {
            return null;
        }

        const product = item.product || {
            id: productId,
            title: item.title || 'Favori Ürün',
            price: item.price ? parseFloat(item.price) : null,
            images: item.images || (item.image ? [item.image] : []),
            store: item.store
                ? typeof item.store === 'string'
                    ? { name: item.store }
                    : item.store
                : item.artisan
                ? { name: item.artisan }
                : null,
        };

        return {
            id: item.id || productId,
            product_id: productId,
            product,
            added_at: item.added_at || item.created_at || new Date().toISOString(),
        };
    }

    async renderWishlistSection() {
        const contentEl = document.querySelector('.profile-content');
        if (!contentEl) return;

        if (!this.wishlistItems || this.wishlistItems.length === 0) {
            contentEl.innerHTML = `
                <div class="empty-state" style="text-align:center; padding: 3rem; color: #6b7280;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">💤</div>
                    <h3>No favorites yet</h3>
                    <p>Beğendiğin ürünleri favorilerine eklediğinde burada göreceksin.</p>
                    <button class="btn btn-primary" onclick="window.location.href='products.html'">Discover Products</button>
                </div>
            `;
            return;
        }

        contentEl.innerHTML = `
            <div class="profile-wishlist" style="display: grid; gap: 1.5rem;">
                ${this.wishlistItems.map((item) => this.renderWishlistCard(item)).join('')}
            </div>
        `;
    }

    renderWishlistCard(item) {
        const product = item.product || {};
        const image = product.images && product.images.length > 0
            ? product.images[0]
            : 'https://via.placeholder.com/240x240?text=Wishlist';
        const title = product.title || 'Favori Ürün';
        const priceValue = product.price ?? item.price;
        const price = priceValue ? `₺${parseFloat(priceValue).toFixed(2)}` : '';
        const store = product.store?.name ? `<p style="margin: 0; color: #6b7280;">${product.store.name}</p>` : '';

        return `
            <div class="wishlist-card" data-product-id="${item.product_id}" style="display: flex; gap: 1.5rem; background: #f9fafb; padding: 1.5rem; border-radius: 16px; align-items: center;">
                <div style="flex: 0 0 120px;">
                    <img src="${image}" alt="${title}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 12px;">
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 0.5rem; font-size: 1.1rem;">${title}</h4>
                    ${store}
                    <p style="margin: 0.25rem 0; font-weight: 600;">${price}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button type="button" class="btn btn-secondary" data-profile-action="move-to-cart" style="padding: 0.5rem 1.25rem;">Move to Cart</button>
                    <button type="button" class="btn btn-link" data-profile-action="remove-wishlist">Remove</button>
                </div>
            </div>
        `;
    }

    async removeWishlistItem(productId) {
        if (!productId) return;

        try {
            if (window.wishlistManager && typeof window.wishlistManager.remove === 'function') {
                await window.wishlistManager.remove(productId);
            } else {
                this.removeLegacyWishlistItem(productId);
                this.wishlistItems = this.wishlistItems.filter((item) => item.product_id !== productId);
                if (this.currentSection === 'wishlist') {
                    this.renderWishlistSection();
                }
            }
        } catch (error) {
            console.error('[Profile API] Failed to remove wishlist item:', error);
        }
    }

    removeLegacyWishlistItem(productId) {
        try {
            let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
            if (Array.isArray(wishlist)) {
                wishlist = wishlist.filter((entry) => {
                    if (typeof entry === 'string') {
                        return entry !== productId;
                    }
                    return entry?.product_id !== productId && entry?.id !== productId && entry?.title !== productId;
                });
                localStorage.setItem('wishlist', JSON.stringify(wishlist));
            }
        } catch (_) {}
    }

    async moveWishlistItemToCart(productId) {
        const item = this.wishlistItems.find((entry) => entry.product_id === productId);
        if (!item) return;

          try {
              if (!window.cartManager || typeof window.cartManager.addItem !== 'function') {
                  alert('Sepet yöneticisi hazır değil. Lütfen sayfayı yenileyin.');
                  return;
              }

              let productData = item.product;
              if (!productData) {
                  const response = await this.apiClient.getProduct(productId);
                  if (response.success) {
                      productData = response.data;
                  }
              }

              const added = await window.cartManager.addItem(productId, productData || { id: productId, title: 'Wishlist Item' }, 1);
              if (added) {
                  await this.removeWishlistItem(productId);
                  alert('Ürün sepete taşındı!');
              } else {
                  alert('Ürün sepete eklenemedi');
              }
          } catch (error) {
              console.error('[Profile API] Failed to move wishlist item to cart:', error);
              alert('Ürün sepete eklenemedi');
          }
    }

    /**
     * Render settings section
     */
    async renderSettings() {
        const contentEl = document.querySelector('.profile-content');
        contentEl.innerHTML = `
            <div class="profile-settings">
                <h2>Account Settings</h2>

                <form id="profileUpdateForm" class="settings-form">
                    <div class="form-group">
                        <label for="firstName">First Name</label>
                        <input type="text" id="firstName" value="${this.user.first_name || ''}" required>
                    </div>

                    <div class="form-group">
                        <label for="lastName">Last Name</label>
                        <input type="text" id="lastName" value="${this.user.last_name || ''}" required>
                    </div>

                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" value="${this.user.email || ''}" disabled>
                    </div>

                    <div class="form-group">
                        <label for="phone">Phone</label>
                        <input type="tel" id="phone" value="${this.user.phone || ''}">
                    </div>

                    <button type="submit" class="btn btn-primary">Update Profile</button>
                </form>

                <hr>

                <h3>Change Password</h3>
                <form id="passwordUpdateForm" class="settings-form">
                    <div class="form-group">
                        <label for="currentPassword">Current Password</label>
                        <input type="password" id="currentPassword" required>
                    </div>

                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" required>
                    </div>

                    <div class="form-group">
                        <label for="confirmPassword">Confirm New Password</label>
                        <input type="password" id="confirmPassword" required>
                    </div>

                    <button type="submit" class="btn btn-primary">Change Password</button>
                </form>

                <hr>

                <button class="btn btn-danger" onclick="profileAPI.logout()">Logout</button>
            </div>
        `;

        // Setup form handlers
        this.setupSettingsForms();
    }

    /**
     * Setup settings forms
     */
    setupSettingsForms() {
        // Profile update form
        const profileForm = document.getElementById('profileUpdateForm');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updateProfile();
            });
        }

        // Password update form
        const passwordForm = document.getElementById('passwordUpdateForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.updatePassword();
            });
        }
    }

    /**
     * Update user profile
     */
    async updateProfile() {
        try {
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const phone = document.getElementById('phone').value;

            const response = await this.apiClient.put('/auth/profile', {
                first_name: firstName,
                last_name: lastName,
                phone: phone
            });

            this.user = response.data || response;
            this.renderProfile();
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('[Profile API] Failed to update profile:', error);
            alert('Failed to update profile. Please try again.');
        }
    }

    /**
     * Update password
     */
    async updatePassword() {
        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match!');
                return;
            }

            await this.apiClient.put('/auth/password', {
                current_password: currentPassword,
                new_password: newPassword
            });

            alert('Password changed successfully!');
            document.getElementById('passwordUpdateForm').reset();
        } catch (error) {
            console.error('[Profile API] Failed to change password:', error);
            alert('Failed to change password. Please check your current password.');
        }
    }

    /**
     * Render returns section
     */
    async renderReturns() {
        try {
            const returnsResponse = await returnAPI.getUserReturns();
            const returns = returnsResponse.data || [];

            const contentEl = document.querySelector('.profile-content');
            contentEl.innerHTML = `
                <div class="profile-returns">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2>İade Taleplerim</h2>
                    </div>

                    ${returns.length > 0 ? `
                        <div class="returns-list">
                            ${returns.map(ret => {
                                const statusInfo = returnAPI.formatReturnStatus(ret.status);
                                const reasonText = returnAPI.formatReturnReason(ret.reason);
                                
                                return `
                                    <div class="return-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1rem;">
                                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                                            <div>
                                                <h4 style="margin: 0 0 0.5rem 0; color: #1f2937;">
                                                    ${statusInfo.icon} İade Talebi #${ret.return_number}
                                                </h4>
                                                <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">
                                                    Sipariş: #${ret.order.order_number}
                                                </p>
                                                <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">
                                                    ${new Date(ret.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                </p>
                                            </div>
                                            <span class="status-badge ${statusInfo.class}" style="padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 500;">
                                                ${statusInfo.label}
                                            </span>
                                        </div>

                                        <div style="margin: 1rem 0; padding: 1rem; background: #f9fafb; border-radius: 0.5rem;">
                                            <p style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: #6b7280;">
                                                <strong>Sebep:</strong> ${reasonText}
                                            </p>
                                            <p style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: #6b7280;">
                                                <strong>Açıklama:</strong> ${ret.description}
                                            </p>
                                            <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">
                                                <strong>İade Tutarı:</strong> <span style="color: #2d6853; font-weight: 600;">₺${ret.refund_amount}</span>
                                            </p>
                                        </div>

                                        <div style="margin-top: 1rem;">
                                            <strong style="font-size: 0.875rem; color: #1f2937;">İade Edilecek Ürünler:</strong>
                                            <ul style="margin: 0.5rem 0 0 0; padding-left: 1.25rem; list-style: none;">
                                                ${ret.items.map(item => `
                                                    <li style="margin-bottom: 0.5rem; font-size: 0.875rem; color: #6b7280;">
                                                        📦 ${item.product_title} × ${item.quantity} - ₺${item.refund_amount}
                                                    </li>
                                                `).join('')}
                                            </ul>
                                        </div>

                                        ${ret.store_response ? `
                                            <div style="margin-top: 1rem; padding: 1rem; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 0.5rem;">
                                                <strong style="font-size: 0.875rem; color: #92400e;">Mağaza Yanıtı:</strong>
                                                <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; color: #78350f;">${ret.store_response}</p>
                                            </div>
                                        ` : ''}

                                        ${ret.tracking_number ? `
                                            <div style="margin-top: 1rem; font-size: 0.875rem;">
                                                <strong>Kargo Takip:</strong> ${ret.carrier || ''} - ${ret.tracking_number}
                                            </div>
                                        ` : ''}

                                        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                            <button 
                                                onclick="profileAPI.viewReturnDetail('${ret.id}')"
                                                style="padding: 0.5rem 1rem; background: #2d6853; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;"
                                            >
                                                Detayları Görüntüle
                                            </button>
                                            ${ret.status === 'pending' || ret.status === 'approved' ? `
                                                <button 
                                                    onclick="profileAPI.cancelReturn('${ret.id}')"
                                                    style="padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem;"
                                                >
                                                    İade Talebini İptal Et
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 3rem; color: #6b7280;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                            <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">Henüz iade talebiniz yok</p>
                            <p style="font-size: 0.875rem;">Teslim edilmiş siparişleriniz için iade talebi oluşturabilirsiniz.</p>
                            <button 
                                onclick="profileAPI.loadSection('orders')"
                                style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #2d6853; color: white; border: none; border-radius: 0.5rem; cursor: pointer;"
                            >
                                Siparişlerime Git
                            </button>
                        </div>
                    `}

                    <style>
                        .status-pending { background: #fef3c7; color: #92400e; }
                        .status-approved { background: #dcfce7; color: #166534; }
                        .status-rejected { background: #fee2e2; color: #991b1b; }
                        .status-received { background: #e0e7ff; color: #3730a3; }
                        .status-refunded { background: #d1fae5; color: #065f46; }
                        .status-completed { background: #dcfce7; color: #14532d; }
                        .status-cancelled { background: #f3f4f6; color: #374151; }
                    </style>
                </div>
            `;
        } catch (error) {
            console.error('[Profile API] Failed to load returns:', error);
            const contentEl = document.querySelector('.profile-content');
            contentEl.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #dc2626;">
                    <p>İade talepleri yüklenirken bir hata oluştu.</p>
                    <button 
                        onclick="profileAPI.renderReturns()"
                        style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #2d6853; color: white; border: none; border-radius: 0.5rem; cursor: pointer;"
                    >
                        Tekrar Dene
                    </button>
                </div>
            `;
        }
    }

    /**
     * View return detail
     */
    async viewReturnDetail(returnId) {
        try {
            const response = await returnAPI.getReturnRequest(returnId);
            const ret = response.data;
            
            // Show detailed return information in a modal or alert
            alert(`İade Detayı:\n\n` +
                `İade No: ${ret.return_number}\n` +
                `Durum: ${returnAPI.formatReturnStatus(ret.status).label}\n` +
                `İade Tutarı: ₺${ret.refund_amount}\n` +
                `Mağaza: ${ret.store.name}`
            );
        } catch (error) {
            console.error('[Profile API] Failed to load return detail:', error);
            alert('İade detayı yüklenirken bir hata oluştu.');
        }
    }

    /**
     * Cancel return request
     */
    async cancelReturn(returnId) {
        if (!confirm('İade talebini iptal etmek istediğinize emin misiniz?')) {
            return;
        }

        const reason = prompt('İptal sebebini belirtiniz (opsiyonel):');
        
        try {
            await returnAPI.cancelReturnRequest(returnId, reason || 'Müşteri tarafından iptal edildi');
            alert('İade talebi iptal edildi.');
            await this.renderReturns(); // Reload returns list
        } catch (error) {
            console.error('[Profile API] Failed to cancel return:', error);
            alert('İade talebi iptal edilirken bir hata oluştu.');
        }
    }

    /**
     * Initiate return request for an order
     */
    async initiateReturn(orderId) {
        try {
            // Get order details
            const order = this.orders.find(o => o.id === orderId);
            if (!order) {
                alert('Sipariş bulunamadı.');
                return;
            }

            // Check if already has a return request
            const existingReturns = await returnAPI.getUserReturns({ status: 'pending' });
            const hasExistingReturn = existingReturns.data?.some(ret => ret.order_id === orderId);
            
            if (hasExistingReturn) {
                alert('Bu sipariş için zaten bir iade talebi mevcut.');
                return;
            }

            // Show return request form
            this.showReturnRequestForm(order);
        } catch (error) {
            console.error('[Profile API] Failed to initiate return:', error);
            alert('İade talebi başlatılırken bir hata oluştu.');
        }
    }

    /**
     * Show return request form
     */
    showReturnRequestForm(order) {
        const contentEl = document.querySelector('.profile-content');
        contentEl.innerHTML = `
            <div class="return-request-form">
                <div style="margin-bottom: 2rem;">
                    <button 
                        onclick="profileAPI.loadSection('orders')"
                        style="padding: 0.5rem 1rem; background: #f3f4f6; border: none; border-radius: 0.5rem; cursor: pointer; color: #374151;"
                    >
                        ← Siparişlere Dön
                    </button>
                </div>

                <h2>İade Talebi Oluştur</h2>
                <p style="color: #6b7280; margin-bottom: 2rem;">Sipariş #${order.order_number} için iade talebi</p>

                <form id="returnRequestForm" style="max-width: 800px;">
                    <div style="margin-bottom: 2rem; padding: 1rem; background: #f9fafb; border-radius: 0.5rem;">
                        <h3 style="margin-bottom: 1rem;">İade Edilecek Ürünler</h3>
                        ${order.items?.map((item, index) => `
                            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 0.5rem;">
                                <input 
                                    type="checkbox" 
                                    id="item_${index}" 
                                    name="return_items"
                                    value="${item.id}"
                                    data-max-qty="${item.quantity}"
                                    data-price="${item.price}"
                                    data-title="${item.product_snapshot?.title || 'Ürün'}"
                                    style="width: 20px; height: 20px; cursor: pointer;"
                                >
                                <img 
                                    src="${item.product_snapshot?.image || 'https://via.placeholder.com/60'}" 
                                    alt="${item.product_snapshot?.title}"
                                    style="width: 60px; height: 60px; object-fit: cover; border-radius: 0.5rem;"
                                >
                                <div style="flex: 1;">
                                    <strong>${item.product_snapshot?.title || 'Ürün'}</strong>
                                    <p style="color: #6b7280; font-size: 0.875rem; margin: 0.25rem 0;">
                                        Adet: ${item.quantity} × ₺${item.price}
                                    </p>
                                </div>
                                <div>
                                    <label style="font-size: 0.875rem; color: #6b7280;">İade Adedi:</label>
                                    <input 
                                        type="number" 
                                        id="qty_${index}"
                                        min="1" 
                                        max="${item.quantity}" 
                                        value="${item.quantity}"
                                        disabled
                                        style="width: 80px; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.5rem; margin-left: 0.5rem;"
                                    >
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">İade Sebebi *</label>
                        <select 
                            id="returnReason" 
                            required
                            style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem;"
                        >
                            <option value="">Seçiniz...</option>
                            <option value="defective">Kusurlu Ürün</option>
                            <option value="wrong_item">Yanlış Ürün Gönderildi</option>
                            <option value="not_as_described">Açıklamaya Uymuyor</option>
                            <option value="damaged">Hasarlı Ürün</option>
                            <option value="changed_mind">Fikrim Değişti</option>
                            <option value="better_price_elsewhere">Başka Yerde Daha Ucuz Buldum</option>
                            <option value="other">Diğer</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Detaylı Açıklama *</label>
                        <textarea 
                            id="returnDescription" 
                            required
                            rows="4"
                            placeholder="İade sebebinizi detaylı olarak açıklayınız (minimum 10 karakter)"
                            style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; font-family: inherit; resize: vertical;"
                        ></textarea>
                    </div>

                    <div style="margin-bottom: 2rem; padding: 1rem; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 0.5rem;">
                        <p style="margin: 0; font-size: 0.875rem; color: #78350f;">
                            <strong>Önemli:</strong> İade talebiniz mağaza tarafından değerlendirilecektir. 
                            Onaylandıktan sonra ürünleri kargo ile göndermeniz gerekecektir.
                        </p>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <button 
                            type="submit"
                            style="flex: 1; padding: 1rem; background: #2d6853; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; font-weight: 500;"
                        >
                            İade Talebini Gönder
                        </button>
                        <button 
                            type="button"
                            onclick="profileAPI.loadSection('orders')"
                            style="padding: 1rem 2rem; background: #f3f4f6; color: #374151; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;"
                        >
                            İptal
                        </button>
                    </div>
                </form>
            </div>

            <style>
                .return-request-form h2 { color: #1f2937; margin-bottom: 0.5rem; }
                .return-request-form h3 { color: #1f2937; font-size: 1.125rem; }
            </style>

            <script>
                // Enable/disable quantity input based on checkbox
                document.querySelectorAll('input[name="return_items"]').forEach((checkbox, index) => {
                    checkbox.addEventListener('change', (e) => {
                        const qtyInput = document.getElementById('qty_' + index);
                        qtyInput.disabled = !e.target.checked;
                    });
                });

                // Handle form submission
                document.getElementById('returnRequestForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const selectedItems = Array.from(document.querySelectorAll('input[name="return_items"]:checked'));
                    
                    if (selectedItems.length === 0) {
                        alert('Lütfen en az bir ürün seçiniz.');
                        return;
                    }

                    const items = selectedItems.map((checkbox, idx) => {
                        const qtyInput = document.getElementById('qty_' + Array.from(document.querySelectorAll('input[name="return_items"]')).indexOf(checkbox));
                        return {
                            order_item_id: checkbox.value,
                            quantity: parseInt(qtyInput.value),
                            item_reason: ''
                        };
                    });

                    const returnData = {
                        order_id: '${order.id}',
                        reason: document.getElementById('returnReason').value,
                        description: document.getElementById('returnDescription').value,
                        items: items
                    };

                    if (!returnData.reason) {
                        alert('Lütfen iade sebebini seçiniz.');
                        return;
                    }

                    if (returnData.description.length < 10) {
                        alert('Açıklama en az 10 karakter olmalıdır.');
                        return;
                    }

                    try {
                        const submitBtn = e.target.querySelector('button[type="submit"]');
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Gönderiliyor...';

                        await returnAPI.createReturnRequest(returnData);
                        alert('✅ İade talebiniz başarıyla oluşturuldu! Mağaza tarafından değerlendirilecektir.');
                        profileAPI.loadSection('returns');
                    } catch (error) {
                        console.error('Return request error:', error);
                        alert('İade talebi oluşturulurken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'İade Talebini Gönder';
                    }
                });
            </script>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Profile menu navigation
        document.querySelectorAll('.nav-link').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) {
                    this.loadSection(section);
                }
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        document.addEventListener('click', async (e) => {
            const actionBtn = e.target.closest('[data-profile-action]');
            if (!actionBtn) {
                return;
            }

            const action = actionBtn.dataset.profileAction;
            const productId = actionBtn.closest('[data-product-id]')?.dataset.productId;
            if (!productId) {
                return;
            }

            if (action === 'remove-wishlist') {
                e.preventDefault();
                await this.removeWishlistItem(productId);
            } else if (action === 'move-to-cart') {
                e.preventDefault();
                await this.moveWishlistItemToCart(productId);
            }
        });
    }

    /**
     * Logout user
     */
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            AuthManager.logout();
            window.location.href = '../index.html';
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // Create a toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create a toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

// Initialize profile API when DOM is loaded
let profileAPI;
document.addEventListener('DOMContentLoaded', () => {
    profileAPI = new ProfileAPI();
    profileAPI.init();
});
