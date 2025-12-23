/**
 * Cart UI Manager
 * Handles the floating cart button and cart modal interactions
 */

class CartUIManager {
    constructor() {
        this.cartModal = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    async setup() {
        this.createFloatingCart(); // Re-enabled floating cart
        this.createCartModal();
        this.setupEventListeners();

        // Header cart icon listener
        const headerCartIcon = document.querySelector('.cart-icon');
        if (headerCartIcon) {
            headerCartIcon.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal();
            });
        }

        // Initial check - fetch cart and update badge
        if (window.cartManager) {
            try {
                await window.cartManager.getCart();
                const count = window.cartManager.lastCart?.totals?.item_count || 0;
                this.updateCartBadge(count);
                console.log('[CartUI] Initial cart count:', count);
            } catch (error) {
                console.error('[CartUI] Failed to fetch initial cart:', error);
                this.updateCartBadge(0);
            }
        }
    }

    createFloatingCart() {
        let cartTrigger = document.querySelector('.floating-cart-trigger');

        if (!cartTrigger) {
            cartTrigger = document.createElement('button');
            cartTrigger.className = 'floating-cart-trigger';
            cartTrigger.innerHTML = `
                <span style="font-size: 1.5rem;">🛒</span>
                <span class="floating-cart-badge">0</span>
            `;
            cartTrigger.title = 'Sepetim';
            document.body.appendChild(cartTrigger);
        }

        // Clone and replace to remove old listeners
        const newTrigger = cartTrigger.cloneNode(true);
        cartTrigger.parentNode.replaceChild(newTrigger, cartTrigger);

        newTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[CartUI] Floating cart clicked');
            this.openModal();
        });
    }

    createCartModal() {
        if (document.querySelector('.cart-modal')) {
            this.cartModal = document.querySelector('.cart-modal');
            return;
        }

        const cartModal = document.createElement('div');
        cartModal.className = 'cart-modal';
        cartModal.innerHTML = `
            <div class="cart-modal-content">
                <div class="cart-modal-header">
                    <h3>Sepetim</h3>
                    <button class="cart-modal-close">×</button>
                </div>
                <div class="cart-modal-body" id="cart-modal-body">
                    <!-- Cart items will be injected here -->
                    <div class="cart-empty-state">
                        <p>Sepetiniz boş.</p>
                    </div>
                </div>
                <div class="cart-modal-footer">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-weight: bold; color: var(--forest-deep);">
                        <span>Toplam:</span>
                        <span id="cart-modal-total">₺ 0.00</span>
                    </div>
                    <button class="cart-btn cart-btn-primary" id="cart-modal-checkout">Ödemeye Geç</button>
                    <button class="cart-btn cart-btn-secondary" id="cart-modal-view-cart">Sepeti Görüntüle</button>
                    <a href="#" id="cart-modal-clear" style="display: block; text-align: center; margin-top: 15px; color: #e74c3c; font-size: 0.9rem; text-decoration: none;">Sepeti Temizle</a>
                </div>
            </div>
        `;

        document.body.appendChild(cartModal);
        this.cartModal = cartModal;

        // Event Listeners for Modal
        const closeBtn = cartModal.querySelector('.cart-modal-close');
        closeBtn.addEventListener('click', () => this.closeModal());

        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) this.closeModal();
        });

        cartModal.querySelector('#cart-modal-checkout').addEventListener('click', () => {
            window.location.href = 'pages/checkout.html';
        });

        cartModal.querySelector('#cart-modal-view-cart').addEventListener('click', () => {
            window.location.href = 'pages/cart.html';
        });

        cartModal.querySelector('#cart-modal-clear').addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Sepetinizi temizlemek istediğinizden emin misiniz?')) {
                if (window.cartManager) {
                    await window.cartManager.clearCart();
                    // Immediately re-render
                    await this.renderCartModal();
                }
            }
        });
    }

    setupEventListeners() {
        window.addEventListener('cart-updated', (e) => {
            console.log('[CartUI] cart-updated event received:', e.detail);
            const count = e.detail.totals.item_count || 0;
            console.log('[CartUI] Updating badge to count:', count);
            this.updateCartBadge(count);

            if (this.cartModal && this.cartModal.classList.contains('open')) {
                this.renderCartModal();
            }
        });
    }

    updateCartBadge(count) {
        const badges = document.querySelectorAll('.floating-cart-badge, .cart-count');

        badges.forEach(badge => {
            badge.textContent = count;
            if (count > 0) {
                badge.classList.add('visible');
                badge.style.display = 'flex'; // Ensure header badge shows
                badge.classList.add('show'); // For header badge animation
            } else {
                badge.classList.remove('visible');
                badge.style.display = 'none';
                badge.classList.remove('show');
            }
        });
    }

    openModal() {
        if (!this.cartModal) return;

        // Fetch fresh data when opening
        if (window.cartManager) {
            window.cartManager.getCart().catch(console.error);
        }

        this.renderCartModal();
        this.cartModal.classList.add('open');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closeModal() {
        if (!this.cartModal) return;
        this.cartModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    async renderCartModal() {
        if (!window.cartManager || !this.cartModal) return;

        const cartBody = this.cartModal.querySelector('#cart-modal-body');
        const cartTotal = this.cartModal.querySelector('#cart-modal-total');
        const footerEl = this.cartModal.querySelector('.cart-modal-footer');

        // Get latest cart data
        const items = window.cartManager.lastCart.items || [];
        const totals = window.cartManager.lastCart.totals || { subtotal: 0 };

        // Render items
        if (items.length === 0) {
            cartBody.innerHTML = `
                <div class="cart-empty-state">
                    <p>Sepetiniz boş.</p>
                    <p style="font-size: 0.8rem; margin-top: 10px;">Nordic hazinelerimizi sepetinize eklemeye başlayın!</p>
                </div>
            `;
            const clearBtn = this.cartModal.querySelector('#cart-modal-clear');
            if (clearBtn) clearBtn.style.display = 'none';
            cartTotal.textContent = '₺ 0.00';
            return;
        }

        // Show clear button
        const clearBtn = this.cartModal.querySelector('#cart-modal-clear');
        if (clearBtn) clearBtn.style.display = 'block';

        // Group items by store
        const storeGroups = {};
        items.forEach(item => {
            // Try multiple sources for store info
            const storeId = item.store_id || item.store?.id || item.product?.store?.id || 'unknown';
            const storeName = item.store_name || item.store?.name || item.product?.store?.name || 'Mağaza';

            if (!storeGroups[storeId]) {
                storeGroups[storeId] = {
                    storeId,
                    storeName,
                    items: [],
                    subtotal: 0
                };
            }
            storeGroups[storeId].items.push(item);
            storeGroups[storeId].subtotal += parseFloat(item.price) * item.quantity;
        });

        // Calculate shipping support from API
        let shippingData = null;
        try {
            const shippingItems = items.map(item => ({
                store_id: item.store_id || item.product?.store_id,
                price: item.price,
                quantity: item.quantity
            }));

            // Use global apiClient if available for auth headers
            if (typeof window.apiClient !== 'undefined') {
                const response = await window.apiClient.post('/shipping-support/calculate', { items: shippingItems });
                if (response.success) {
                    shippingData = response.data;
                }
            } else {
                // Fallback to fetch with manual auth check
                const headers = { 'Content-Type': 'application/json' };
                // Try to get token from standard storage keys
                const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const response = await fetch('/api/v1/shipping-support/calculate', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ items: shippingItems })
                });
                const result = await response.json();
                if (result.success) {
                    shippingData = result.data;
                }
            }
        } catch (error) {
            console.error('[CartUI] Shipping calculation error:', error);
        }

        // Build store-grouped HTML
        let html = '';
        let totalShippingSupport = 0;

        Object.values(storeGroups).forEach(group => {
            // Find shipping for this store
            let storeShipping = shippingData?.stores?.find(s => s.storeId === group.storeId);
            let shippingText = 'Kargo Desteği: ₺35'; // Default
            let shippingAmount = 35;

            if (storeShipping) {
                shippingAmount = storeShipping.customerPays;
                if (storeShipping.isFree || storeShipping.customerPays <= 0) {
                    shippingText = 'Kargo Desteği: Ücretsiz ✨';
                    shippingAmount = 0;
                } else {
                    shippingText = `Kargo Desteği: ₺${storeShipping.customerPays.toFixed(2)}`;
                }
            }

            totalShippingSupport += shippingAmount;

            html += `
                <div class="cart-store-group" style="margin-bottom: 1rem; border: 1px solid rgba(45, 104, 83, 0.2); border-radius: 10px; overflow: hidden;">
                    <div class="cart-store-header" style="background: linear-gradient(135deg, var(--forest-medium), var(--forest-deep)); color: white; padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600;">🏪 ${group.storeName}</span>
                        <span style="font-size: 0.85rem; opacity: 0.9;">${shippingText}</span>
                    </div>
                    <div class="cart-store-items" style="padding: 0.5rem;">
            `;

            group.items.forEach(item => {
                html += `
                    <div class="cart-item" style="display: flex; gap: 0.75rem; padding: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.05);">
                        <img src="${item.product?.images?.[0] || 'assets/images/placeholder.jpg'}" alt="${item.title}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 500; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem;">
                                <span style="font-size: 0.8rem; color: #666;">Adet: ${item.quantity}</span>
                                <span style="font-weight: 600; color: var(--forest-deep);">₺${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        </div>
                        <button class="cart-item-remove" data-id="${item.product_id}" title="Sil" style="background: none; border: none; color: #999; font-size: 1.2rem; cursor: pointer; padding: 0.25rem;">×</button>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        cartBody.innerHTML = html;

        // Update footer with shipping support summary
        let grandTotal = parseFloat(totals.subtotal) + totalShippingSupport;

        // Insert shipping support row before total
        const summaryHtml = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem; color: #666;">
                <span>Ara Toplam:</span>
                <span>₺${parseFloat(totals.subtotal).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem; color: ${totalShippingSupport > 0 ? '#f59e0b' : '#10b981'};">
                <span>🚚 Kargo Desteği:</span>
                <span>${totalShippingSupport > 0 ? '₺' + totalShippingSupport.toFixed(2) : 'Ücretsiz ✨'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-weight: bold; color: var(--forest-deep); font-size: 1.1rem; padding-top: 8px; border-top: 2px solid rgba(45, 104, 83, 0.2);">
                <span>TOPLAM:</span>
                <span>₺${grandTotal.toFixed(2)}</span>
            </div>
        `;

        // Find and update the footer summary
        const checkoutBtn = footerEl.querySelector('#cart-modal-checkout');
        const viewCartBtn = footerEl.querySelector('#cart-modal-view-cart');
        const clearLink = footerEl.querySelector('#cart-modal-clear');

        footerEl.innerHTML = summaryHtml;

        // Re-add buttons
        const newCheckoutBtn = document.createElement('button');
        newCheckoutBtn.className = 'cart-btn cart-btn-primary';
        newCheckoutBtn.id = 'cart-modal-checkout';
        newCheckoutBtn.textContent = 'Ödemeye Geç';
        newCheckoutBtn.addEventListener('click', () => window.location.href = 'pages/checkout.html');
        footerEl.appendChild(newCheckoutBtn);

        const newViewCartBtn = document.createElement('button');
        newViewCartBtn.className = 'cart-btn cart-btn-secondary';
        newViewCartBtn.id = 'cart-modal-view-cart';
        newViewCartBtn.textContent = 'Sepeti Görüntüle';
        newViewCartBtn.addEventListener('click', () => window.location.href = 'pages/cart.html');
        footerEl.appendChild(newViewCartBtn);

        const newClearLink = document.createElement('a');
        newClearLink.href = '#';
        newClearLink.id = 'cart-modal-clear';
        newClearLink.style.cssText = 'display: block; text-align: center; margin-top: 15px; color: #e74c3c; font-size: 0.9rem; text-decoration: none;';
        newClearLink.textContent = 'Sepeti Temizle';
        newClearLink.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Sepetinizi temizlemek istediğinizden emin misiniz?')) {
                if (window.cartManager) {
                    await window.cartManager.clearCart();
                    await this.renderCartModal();
                }
            }
        });
        footerEl.appendChild(newClearLink);

        // Update old total element if it exists
        if (cartTotal) {
            cartTotal.textContent = `₺${grandTotal.toFixed(2)}`;
        }

        // Add event listeners to remove buttons
        cartBody.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.target.dataset.id;
                if (productId && window.cartManager) {
                    await window.cartManager.removeItem(productId);
                    await this.renderCartModal();
                }
            });
        });
    }
}

// Initialize
window.cartUI = new CartUIManager();
