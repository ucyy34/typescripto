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

        // Get latest cart data (already updated in cartManager)
        const items = window.cartManager.lastCart.items || [];
        const totals = window.cartManager.lastCart.totals || { subtotal: 0 };

        // Update total
        cartTotal.textContent = `₺ ${parseFloat(totals.subtotal).toFixed(2)}`;

        // Render items
        if (items.length === 0) {
            cartBody.innerHTML = `
                <div class="cart-empty-state">
                    <p>Sepetiniz boş.</p>
                    <p style="font-size: 0.8rem; margin-top: 10px;">Nordic hazinelerimizi sepetinize eklemeye başlayın!</p>
                </div>
            `;
            // Hide clear button if empty
            const clearBtn = this.cartModal.querySelector('#cart-modal-clear');
            if (clearBtn) clearBtn.style.display = 'none';
            return;
        }

        // Show clear button
        const clearBtn = this.cartModal.querySelector('#cart-modal-clear');
        if (clearBtn) clearBtn.style.display = 'block';

        cartBody.innerHTML = items.map(item => `
            <div class="cart-item">
                <img src="${item.product?.images?.[0] || 'assets/images/placeholder.jpg'}" alt="${item.title}">
                <div class="cart-item-details">
                    <span class="cart-item-title">${item.title}</span>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8rem; color: var(--forest-medium);">Adet: ${item.quantity}</span>
                        <span class="cart-item-price">₺ ${parseFloat(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                </div>
                <button class="cart-item-remove" data-id="${item.product_id}" title="Ürünü Sil">×</button>
            </div>
        `).join('');

        // Add event listeners to remove buttons
        cartBody.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = e.target.dataset.id;
                if (productId && window.cartManager) {
                    await window.cartManager.removeItem(productId);
                    // Immediately re-render
                    await this.renderCartModal();
                }
            });
        });
    }
}

// Initialize
window.cartUI = new CartUIManager();
