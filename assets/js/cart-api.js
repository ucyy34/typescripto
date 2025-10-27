/**
 * Cart Page API Integration
 * Connects cart.html to backend API
 */

class CartPageAPI {
    constructor() {
        this.apiClient = new ApiClient();
        this.cart = [];
        this.isLoggedIn = AuthManager.isLoggedIn();
        this.recommendations = [];
        this.wishlistItems = [];

        console.log('[Cart Page API] Initializing...');
        this.init();
    }

    async init() {
        try {
            await this.loadCart();
            await Promise.all([this.loadWishlist(), this.loadRecommendations()]);
            this.setupEventListeners();
            console.log('[Cart Page API] Initialization complete');
        } catch (error) {
            console.error('[Cart Page API] Initialization error:', error);
            this.showError('Failed to initialize cart');
        }
    }

    async loadCart() {
        try {
            console.log('[Cart Page API] Loading cart...');
            this.showLoading();

            // Use CartManager for unified cart loading
            this.cart = await window.cartManager.getCart();
            console.log('[Cart Page API] Cart loaded:', this.cart.length, 'items');

            this.renderCart();
            this.updateCartSummary();
        } catch (error) {
            console.error('[Cart Page API] Error loading cart:', error);
            // Fallback to localStorage
            this.loadLocalCart();
            this.renderCart();
            this.updateCartSummary();
        } finally {
            this.hideLoading();
        }
    }

    loadLocalCart() {
        const localCart = JSON.parse(localStorage.getItem('cart')) || [];
        console.log('[Cart Page API] Raw localStorage cart:', localCart);

        this.cart = localCart.map(item => {
            // Ensure product data exists
            if (!item.product && item.product_id) {
                console.warn('[Cart Page API] Product data missing, attempting to use fallback data');
                // Create minimal product object from available data
                return {
                    product_id: item.product_id,
                    product: {
                        id: item.product_id,
                        title: item.title || 'Unknown Product',
                        price: item.price || 0,
                        images: item.images || [],
                        stock: item.stock || 0,
                        store: item.store || null
                    },
                    quantity: item.quantity || 1,
                    price: parseFloat(item.price || 0)
                };
            }

            return {
                product_id: item.product_id,
                product: item.product,
                quantity: item.quantity || 1,
                price: parseFloat(item.price || item.product?.price || 0)
            };
        }).filter(item => item.product_id); // Remove invalid items

        console.log('[Cart Page API] Cart loaded from localStorage:', this.cart.length, 'items', this.cart);
    }

    async loadWishlist() {
        const grid = document.querySelector('.saved-items-grid');
        const emptyState = document.querySelector('[data-saved-empty]');

        if (!grid) {
            return;
        }

        try {
            if (window.wishlistManager) {
                const items = await window.wishlistManager.getWishlist();
                this.wishlistItems = items;
                this.renderWishlistItems(items);
            } else {
                const fallback = JSON.parse(localStorage.getItem('wishlist') || '[]');
                this.wishlistItems = Array.isArray(fallback)
                    ? fallback.map((entry) =>
                          typeof entry === 'string'
                              ? { product_id: entry }
                              : { product_id: entry.product_id || entry.id, product: entry }
                      )
                    : [];
                this.renderWishlistItems(this.wishlistItems);
            }
        } catch (error) {
            console.error('[Cart Page API] Failed to load wishlist:', error);
            if (emptyState) {
                emptyState.style.display = 'block';
            }
        }
    }

    renderWishlistItems(items) {
        const grid = document.querySelector('.saved-items-grid');
        const emptyState = document.querySelector('[data-saved-empty]');

        if (!grid) {
            return;
        }

        if (!items || items.length === 0) {
            grid.innerHTML = '';
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }

        if (emptyState) {
            emptyState.style.display = 'none';
        }

        grid.innerHTML = items.map((item) => this.createSavedItemCard(item)).join('');

        grid.querySelectorAll('[data-action="saved-move"]').forEach((button) => {
            button.addEventListener('click', () => this.handleSavedMove(button.dataset.productId));
        });

        grid.querySelectorAll('[data-action="saved-remove"]').forEach((button) => {
            button.addEventListener('click', () => this.handleSavedRemove(button.dataset.productId));
        });
    }

    createSavedItemCard(item) {
        const product = item.product || {};
        const productId = item.product_id || product.id;
        const image = (product.images && product.images[0]) || item.image || 'https://via.placeholder.com/200?text=No+Image';
        const title = product.title || item.title || 'Favori Ürün';
        const priceValue = product.price ?? item.price;
        const price = this.formatPrice(priceValue);

        return `
            <div class="saved-item" data-product-id="${productId}">
                <img src="${image}" alt="${title}">
                <h4 style="font-size: 1rem; margin-bottom: var(--space-xs);">${title}</h4>
                <p style="font-size: 0.9rem; color: var(--warm-brown); margin-bottom: var(--space-sm);">₺${price}</p>
                <div style="display: flex; gap: var(--space-xs);">
                    <button class="btn btn-secondary" style="flex: 1; padding: var(--space-xs); font-size: 0.8rem;" data-action="saved-move" data-product-id="${productId}">Sepete Taşı</button>
                    <button class="saved-remove" style="background: none; border: none; color: var(--warm-brown); cursor: pointer;" data-action="saved-remove" data-product-id="${productId}">🗑️</button>
                </div>
            </div>
        `;
    }

    async handleSavedMove(productId) {
        if (!productId) return;

        const item = this.wishlistItems.find((entry) => entry.product_id === productId);
        const productData = this.normalizeProductForCart(item?.product, productId);

        try {
            if (window.cartManager) {
                await window.cartManager.addItem(productId, productData, 1);
            }

            if (window.wishlistManager) {
                await window.wishlistManager.removeItem(productId);
            }

            await Promise.all([this.loadCart(), this.loadWishlist()]);
            this.showMessage('Ürün favorilerden sepete taşındı', 'success');
        } catch (error) {
            console.error('[Cart Page API] Failed to move wishlist item to cart:', error);
            this.showMessage('Ürün sepete taşınamadı', 'error');
        }
    }

    async handleSavedRemove(productId) {
        if (!productId || !window.wishlistManager) {
            return;
        }

        try {
            await window.wishlistManager.removeItem(productId);
            await this.loadWishlist();
            this.showMessage('Ürün favorilerden kaldırıldı', 'info');
        } catch (error) {
            console.error('[Cart Page API] Failed to remove wishlist item:', error);
            this.showMessage('Favorilerden kaldırma başarısız', 'error');
        }
    }

    async loadRecommendations() {
        const container = document.querySelector('.recommendation-cards');
        const emptyState = document.querySelector('[data-recommendations-empty]');

        if (!container) {
            return;
        }

        try {
            if (window.wishlistManager) {
                const seedIds = [
                    ...new Set([
                        ...this.cart.map((item) => item.product_id),
                        ...this.wishlistItems.map((item) => item.product_id),
                    ]),
                ].filter(Boolean);

                const recs = await window.wishlistManager.getRecommendations({
                    limit: 4,
                    seedIds,
                });
                this.recommendations = recs || [];
            } else {
                this.recommendations = await this.fetchRecommendationsFallback();
            }

            this.renderRecommendations(this.recommendations);
        } catch (error) {
            console.error('[Cart Page API] Failed to load recommendations:', error);
            if (emptyState) {
                emptyState.style.display = 'block';
            }
        }
    }

    renderRecommendations(items) {
        const container = document.querySelector('.recommendation-cards');
        const emptyState = document.querySelector('[data-recommendations-empty]');

        if (!container) {
            return;
        }

        if (!items || items.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }

        if (emptyState) {
            emptyState.style.display = 'none';
        }

        container.innerHTML = items.map((product) => this.createRecommendationCard(product)).join('');

        container.querySelectorAll('[data-action="recommendation-add"]').forEach((button) => {
            button.addEventListener('click', () => this.handleRecommendationAdd(button.dataset.productId));
        });
    }

    createRecommendationCard(product) {
        const image = (product.images && product.images[0]) || 'https://via.placeholder.com/300x200?text=Nordic+Treasure';
        const description = product.short_description || product.description || 'Bu ürünü sepetinizdeki ürünlerle eşleştirdik.';
        const price = this.formatPrice(product.price);

        return `
            <div class="recommendation-card" data-product-id="${product.id}">
                <img src="${image}" alt="${product.title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: var(--space-sm);">
                <h4 style="margin-bottom: var(--space-xs);">${product.title}</h4>
                <p style="font-size: 0.9rem; opacity: 0.9; margin-bottom: var(--space-sm);">${description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600;">₺${price}</span>
                    <button class="btn btn-secondary" style="padding: var(--space-xs) var(--space-sm); font-size: 0.9rem;" data-action="recommendation-add" data-product-id="${product.id}">Sepete Ekle</button>
                </div>
            </div>
        `;
    }

    async handleRecommendationAdd(productId) {
        if (!productId) return;

        const product = this.recommendations.find((item) => item.id === productId);
        const productData = this.normalizeProductForCart(product, productId);

        try {
            if (window.cartManager) {
                await window.cartManager.addItem(productId, productData, 1);
            }

            await this.loadCart();
            this.showMessage('Önerilen ürün sepete eklendi', 'success');
        } catch (error) {
            console.error('[Cart Page API] Failed to add recommendation to cart:', error);
            this.showMessage('Önerilen ürün sepete eklenemedi', 'error');
        }
    }

    async fetchRecommendationsFallback() {
        try {
            const response = await this.apiClient.get('/products', {
                status: 'approved',
                is_active: true,
                limit: 4,
                sort: 'popular',
            });

            if (response && response.success && Array.isArray(response.data)) {
                return response.data;
            }
        } catch (error) {
            console.warn('[Cart Page API] Recommendation fallback failed:', error);
        }

        return [];
    }

    normalizeProductForCart(product, fallbackId) {
        const priceValue = typeof product?.price === 'number' ? product.price : parseFloat(product?.price || 0);

        return {
            id: product?.id || fallbackId,
            title: product?.title || 'Nordik Ürün',
            price: Number.isFinite(priceValue) ? priceValue : 0,
            images: product?.images || [],
            stock: product?.stock || 0,
            store: product?.store || null,
        };
    }

    formatPrice(value) {
        const numeric = typeof value === 'number' ? value : parseFloat(`${value}`.replace(/[^0-9.,]/g, '').replace(',', '.'));
        if (!Number.isFinite(numeric)) {
            return '0.00';
        }

        return numeric.toFixed(2);
    }

    renderCart() {
        const container = document.getElementById('cartItems');
        if (!container) {
            console.error('[Cart Page API] Cart items container not found');
            return;
        }

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart" style="text-align: center; padding: 4rem 2rem;">
                    <div class="empty-cart-icon" style="font-size: 5rem; margin-bottom: 1.5rem;">🐉</div>
                    <h2 style="margin-bottom: 1rem; color: var(--forest-deep);">Your cart is empty</h2>
                    <p style="color: var(--warm-brown); margin-bottom: 2rem;">Start adding some Nordic treasures!</p>
                    <a href="../index.html" class="btn btn-primary" style="display: inline-block; padding: 0.75rem 2rem; background: var(--forest-medium); color: white; text-decoration: none; border-radius: 8px;">Browse Products</a>
                </div>
            `;
            return;
        }

        // Add header
        const headerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl);">
                <h2 style="margin: 0;">Selected Treasures</h2>
                <button id="clearCart" style="background: none; border: none; color: var(--warm-brown); cursor: pointer; text-decoration: underline;">Clear All</button>
            </div>
        `;

        const itemsHTML = this.cart.map((item, index) => {
            const product = item.product;
            if (!product) {
                console.error('[Cart Page API] Product data missing for cart item:', item);
                // Try to render with minimal data
                return `
                    <div class="cart-item" data-product-id="${item.product_id}" data-index="${index}" style="opacity: 0.5;">
                        <div class="item-image">
                            <img src="https://via.placeholder.com/300x300?text=Invalid+Product" alt="Invalid Product">
                        </div>
                        <div class="item-details">
                            <h3>Invalid Product Data</h3>
                            <p style="color: #dc2626;">Product data is corrupted</p>
                        </div>
                        <div class="quantity-controls">
                            <button disabled>−</button>
                            <input type="number" value="${item.quantity || 1}" disabled>
                            <button disabled>+</button>
                        </div>
                        <button class="remove-item" data-index="${index}" title="Remove item">🗑️</button>
                    </div>
                `;
            }

            const mainImage = product.images && product.images.length > 0
                ? product.images[0]
                : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23e5e7eb" width="300" height="300"/%3E%3Ctext fill="%236b7280" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

            const price = parseFloat(item.price || product.price || 0);
            const title = product.title || 'Unknown Product';
            const storeName = product.store?.name || 'Unknown Store';

            // Stock check (treat missing/invalid as 99 to avoid false out-of-stock)
            const rawStock = product.stock;
            const stock = Number.isFinite(parseInt(rawStock)) ? parseInt(rawStock) : 99;
            const inStock = stock > 0;
            const maxQuantity = Math.min(stock || 99, 99);

            return `
                <div class="cart-item" data-product-id="${item.product_id}" data-index="${index}">
                    <div class="item-image">
                        <img src="${mainImage}" alt="${title}">
                    </div>
                    <div class="item-details">
                        <h3>${title}</h3>
                        ${storeName !== 'Unknown Store' ? `<p class="item-artisan">by ${storeName}</p>` : ''}
                        <div class="item-price">
                            ₺${price.toFixed(2)}
                        </div>
                        ${!inStock ? '<div style="color: #dc2626; font-size: 0.9rem; margin-top: 0.5rem;">⚠️ Out of Stock</div>' : ''}
                    </div>
                    <div class="quantity-controls">
                        <button class="quantity-btn decrease-qty" data-index="${index}" ${!inStock ? 'disabled' : ''}>−</button>
                        <input type="number"
                            class="quantity-input"
                            value="${item.quantity}"
                            min="1"
                            max="${maxQuantity}"
                            data-index="${index}"
                            ${!inStock ? 'disabled' : ''}>
                        <button class="quantity-btn increase-qty" data-index="${index}" ${!inStock ? 'disabled' : ''}>+</button>
                    </div>
                    <button class="remove-item" data-index="${index}" title="Remove item">🗑️</button>
                </div>
            `;
        }).join('');

        container.innerHTML = headerHTML + itemsHTML;

        // Setup clear cart button
        const clearBtn = document.getElementById('clearCart');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearCart());
        }
    }

    async clearCart() {
        if (!confirm('Are you sure you want to clear your cart?')) {
            return;
        }

        try {
            if (this.isLoggedIn) {
                // Clear on backend
                await this.apiClient.delete('/cart');
            }

            // Clear local cart
            this.cart = [];
            localStorage.removeItem('cart');

            this.renderCart();
            this.updateCartSummary();

            this.showMessage('Cart cleared', 'success');
        } catch (error) {
            console.error('[Cart Page API] Error clearing cart:', error);
            // Still clear locally
            this.cart = [];
            localStorage.removeItem('cart');
            this.renderCart();
            this.updateCartSummary();
        }
    }

    updateCartSummary() {
        // Calculate totals
        const subtotal = this.cart.reduce((sum, item) => {
            const price = parseFloat(item.price || item.product?.price || 0);
            return sum + (price * item.quantity);
        }, 0);

        const shipping = subtotal > 100 ? 0 : (subtotal > 0 ? 10.00 : 0); // Free shipping over $100
        const tax = subtotal * 0.10; // 10% tax
        const total = subtotal + shipping + tax;

        // Calculate total items
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

        // Update summary display (using actual IDs from cart.html)
        const subtotalEl = document.getElementById('subtotal');
        const shippingEl = document.getElementById('shipping');
        const taxEl = document.getElementById('tax');
        const totalEl = document.getElementById('total');

        if (subtotalEl) subtotalEl.textContent = `₺${subtotal.toFixed(2)}`;
        if (shippingEl) {
            if (shipping === 0 && subtotal > 0) {
                shippingEl.textContent = 'ÜCRETSİZ';
                shippingEl.style.color = 'var(--aurora-green)';
            } else {
                shippingEl.textContent = `₺${shipping.toFixed(2)}`;
                shippingEl.style.color = '';
            }
        }
        if (taxEl) taxEl.textContent = `₺${tax.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `₺${total.toFixed(2)}`;

        // Update item count in summary
        const summaryRow = document.querySelector('.summary-row span');
        if (summaryRow && summaryRow.textContent.includes('items')) {
            summaryRow.textContent = `Subtotal (${totalItems} item${totalItems !== 1 ? 's' : ''}):`;
        }

        // Update checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            if (this.cart.length === 0) {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = 'Cart is Empty';
            } else {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = `Proceed to Checkout ($${total.toFixed(2)})`;
            }
        }

        // Update header cart count
        this.updateCartCount();
    }

    setupEventListeners() {
        // Quantity decrease
        document.addEventListener('click', (e) => {
            if (e.target.matches('.decrease-qty') || e.target.closest('.decrease-qty')) {
                const btn = e.target.matches('.decrease-qty') ? e.target : e.target.closest('.decrease-qty');
                const index = parseInt(btn.dataset.index);
                this.decreaseQuantity(index);
            }
        });

        // Quantity increase
        document.addEventListener('click', (e) => {
            if (e.target.matches('.increase-qty') || e.target.closest('.increase-qty')) {
                const btn = e.target.matches('.increase-qty') ? e.target : e.target.closest('.increase-qty');
                const index = parseInt(btn.dataset.index);
                this.increaseQuantity(index);
            }
        });

        // Quantity input change
        document.addEventListener('change', (e) => {
            if (e.target.matches('.quantity-input')) {
                const index = parseInt(e.target.dataset.index);
                const newQty = parseInt(e.target.value);
                this.updateQuantity(index, newQty);
            }
        });

        // Remove item
        document.addEventListener('click', (e) => {
            if (e.target.matches('.remove-item') || e.target.closest('.remove-item')) {
                const btn = e.target.matches('.remove-item') ? e.target : e.target.closest('.remove-item');
                const index = parseInt(btn.dataset.index);
                this.removeItem(index);
            }
        });

        // Checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.proceedToCheckout());
        }

        // Continue shopping button
        const continueBtn = document.getElementById('continueShoppingBtn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                window.location.href = '../index.html';
            });
        }
    }

    async decreaseQuantity(index) {
        if (index < 0 || index >= this.cart.length) return;

        const item = this.cart[index];
        if (item.quantity > 1) {
            item.quantity--;
            await this.updateCartItem(item.product_id, item.quantity);
        }
    }

    async increaseQuantity(index) {
        if (index < 0 || index >= this.cart.length) return;

        const item = this.cart[index];
        const maxQty = item.product?.stock || 99;

        if (item.quantity < maxQty) {
            item.quantity++;
            await this.updateCartItem(item.product_id, item.quantity);
        } else {
            this.showMessage(`Only ${maxQty} items available in stock`, 'warning');
        }
    }

    async updateQuantity(index, newQty) {
        if (index < 0 || index >= this.cart.length) return;

        const item = this.cart[index];
        const maxQty = item.product?.stock || 99;

        if (newQty < 1) {
            newQty = 1;
        } else if (newQty > maxQty) {
            newQty = maxQty;
            this.showMessage(`Only ${maxQty} items available in stock`, 'warning');
        }

        item.quantity = newQty;
        await this.updateCartItem(item.product_id, newQty);
    }

    async updateCartItem(productId, quantity) {
        try {
            if (this.isLoggedIn) {
                // Update on backend
                const response = await this.apiClient.put(`/cart/items/${productId}`, { quantity });

                if (!response.success) {
                    console.warn('[Cart Page API] Backend update failed, updating localStorage only');
                    this.updateLocalCart();
                }
            } else {
                // Update localStorage
                this.updateLocalCart();
            }

            this.renderCart();
            this.updateCartSummary();
        } catch (error) {
            console.error('[Cart Page API] Error updating cart item:', error);
            // Fallback to localStorage
            this.updateLocalCart();
            this.renderCart();
            this.updateCartSummary();
        }
    }

    async removeItem(index) {
        if (index < 0 || index >= this.cart.length) return;

        const item = this.cart[index];

        // Confirm removal
        if (!confirm(`Remove "${item.product?.title}" from cart?`)) {
            return;
        }

        try {
            if (this.isLoggedIn) {
                // Remove from backend
                const response = await this.apiClient.delete(`/cart/items/${item.product_id}`);

                if (!response.success) {
                    console.warn('[Cart Page API] Backend removal failed, removing from localStorage only');
                }
            }

            // Remove from cart array
            this.cart.splice(index, 1);

            // Update localStorage
            this.updateLocalCart();

            this.renderCart();
            this.updateCartSummary();

            this.showMessage('Item removed from cart', 'success');
        } catch (error) {
            console.error('[Cart Page API] Error removing item:', error);
            // Still remove from local state
            this.cart.splice(index, 1);
            this.updateLocalCart();
            this.renderCart();
            this.updateCartSummary();
        }
    }

    updateLocalCart() {
        const localCart = this.cart.map(item => ({
            product_id: item.product_id,
            product: item.product,
            quantity: item.quantity,
            price: item.price
        }));
        localStorage.setItem('cart', JSON.stringify(localCart));
    }

    proceedToCheckout() {
        if (this.cart.length === 0) {
            alert('Your cart is empty');
            return;
        }

        // Save cart to localStorage for checkout page
        this.updateLocalCart();

        // Always allow checkout (guest checkout supported)
        // User can optionally login during checkout
        window.location.href = 'checkout.html';
    }

    updateCartCount() {
        const cartCountEl = document.querySelector('.cart-count');
        if (cartCountEl) {
            const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            cartCountEl.textContent = totalItems;
        }
    }

    showLoading() {
        const container = document.getElementById('cartItems');
        if (container) {
            container.innerHTML = `
                <div class="loading-state" style="text-align: center; padding: 3rem;">
                    <div class="spinner" style="margin: 0 auto 1rem;"></div>
                    <p>Loading your cart...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be replaced by cart items
    }

    showError(message) {
        const container = document.getElementById('cartItems');
        if (container) {
            container.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 3rem; color: #dc2626;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;

        const bgColor = type === 'success' ? '#10b981' :
                       type === 'warning' ? '#f59e0b' :
                       type === 'error' ? '#dc2626' : '#3b82f6';

        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Debug helper function
window.debugCart = function() {
    console.log('=== CART DEBUG INFO ===');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    console.log('localStorage cart:', cart);
    console.log('Total items:', cart.length);
    cart.forEach((item, i) => {
        console.log(`Item ${i + 1}:`, {
            product_id: item.product_id,
            hasProduct: !!item.product,
            product: item.product,
            quantity: item.quantity,
            price: item.price
        });
    });
    console.log('======================');
};

// Helper to clear corrupted cart data
window.clearCart = function() {
    localStorage.removeItem('cart');
    console.log('Cart cleared from localStorage');
    if (window.cartPageAPI) {
        window.cartPageAPI.loadCart();
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.cartPageAPI = new CartPageAPI();
    });
} else {
    window.cartPageAPI = new CartPageAPI();
}
