/**
 * Cart Page API Integration
 * Connects cart.html to backend API
 */

class CartPageAPI {
    constructor() {
        this.apiClient = new ApiClient();
        this.cart = [];
        this.isLoggedIn = AuthManager.isLoggedIn();
        this.wishlistItems = [];
        this.recommendations = [];
        this.wishlistUnsubscribe = null;

        console.log('[Cart Page API] Initializing...');
        this.init();
    }

    async init() {
        try {
            if (window.wishlistManager && typeof window.wishlistManager.ensureInitialized === 'function') {
                await window.wishlistManager.ensureInitialized();
            }

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

            this.cart = await window.cartManager.getCart(true);
            console.log('[Cart Page API] Cart loaded:', this.cart.length, 'items');

            this.renderCart();
            this.updateCartSummary();
        } catch (error) {
            console.error('[Cart Page API] Error loading cart:', error);
            this.cart = [];
            this.renderCart();
            this.updateCartSummary();
            this.showMessage('Failed to load cart data', 'error');
        } finally {
            this.hideLoading();
        }
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
            await window.cartManager.clearCart();
            this.cart = [];
            this.renderCart();
            this.updateCartSummary();
            this.showMessage('Cart cleared', 'success');
        } catch (error) {
            console.error('[Cart Page API] Error clearing cart:', error);
            this.showMessage('Failed to clear cart', 'error');
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
                            ? items.map((item) => this.normalizeWishlistItem(item)).filter(Boolean)
                            : [];
                        this.renderWishlist();
                    });
                }
            } else {
                const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
                this.wishlistItems = Array.isArray(stored)
                    ? stored.map((item) => this.normalizeWishlistItem(item)).filter(Boolean)
                    : [];
            }

            this.renderWishlist();
        } catch (error) {
            console.error('[Cart Page API] Failed to load wishlist:', error);
            this.renderWishlist(true);
        }
    }

    normalizeWishlistItem(item) {
        if (!item) return null;

        if (typeof item === 'string') {
            return { product_id: item, product: null };
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

    renderWishlist(showError = false) {
        const grid = document.getElementById('savedItemsGrid');
        const emptyState = document.getElementById('savedItemsEmpty');
        if (!grid) return;

        if (showError) {
            grid.innerHTML = '<p style="color: #dc2626;">Favoriler yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>';
            if (emptyState) emptyState.style.display = 'none';
            return;
        }

        if (!this.wishlistItems || this.wishlistItems.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        grid.innerHTML = this.wishlistItems
            .map((item) => this.renderWishlistCard(item))
            .join('');
    }

    renderWishlistCard(item) {
        const product = item.product || {};
        const image = product.images && product.images.length > 0
            ? product.images[0]
            : 'https://via.placeholder.com/200x200?text=Wishlist';
        const title = product.title || 'Favori Ürün';
        const priceValue = product.price ?? item.price;
        const price = priceValue ? `₺${parseFloat(priceValue).toFixed(2)}` : '';

        return `
            <div class="saved-item" data-product-id="${item.product_id}">
                <img src="${image}" alt="${title}">
                <h4 style="font-size: 1rem; margin-bottom: var(--space-xs);">${title}</h4>
                <p style="font-size: 0.9rem; color: var(--warm-brown); margin-bottom: var(--space-sm);">${price || ''}</p>
                <div style="display: flex; gap: var(--space-xs);">
                    <button class="btn btn-secondary" style="flex: 1; padding: var(--space-xs); font-size: 0.8rem;" data-action="move-to-cart">Move to Cart</button>
                    <button class="btn btn-link" data-action="remove-wishlist" aria-label="Remove from wishlist">🗑️</button>
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
                this.renderWishlist();
            }

            this.showMessage('Favoriden kaldırıldı', 'info');
        } catch (error) {
            console.error('[Cart Page API] Failed to remove wishlist item:', error);
            this.showMessage('Favori kaldırılamadı', 'error');
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
        } catch (_) {
            // ignore legacy errors
        }
    }

    async moveSavedItemToCart(productId) {
        const item = this.wishlistItems.find((entry) => entry.product_id === productId);
        if (!item) {
            this.showMessage('Favori ürünü bulunamadı', 'error');
            return;
        }

        try {
            let productData = item.product;
            if (!productData) {
                const response = await this.apiClient.getProduct(productId);
                if (response.success) {
                    productData = response.data;
                }
            }

            const added = await window.cartManager.addItem(productId, productData || { id: productId, title: 'Wishlist Item' }, 1);
            if (added) {
                this.showMessage('Ürün sepete taşındı', 'success');
                await this.removeWishlistItem(productId);
                await this.loadCart(true, false);
            } else {
                this.showMessage('Ürün sepete eklenemedi', 'error');
            }
        } catch (error) {
            console.error('[Cart Page API] Failed to move wishlist item to cart:', error);
            this.showMessage('Ürün sepete eklenemedi', 'error');
        }
    }

    async loadRecommendations() {
        try {
            const response = await this.apiClient.getCartRecommendations({ limit: 6 });
            this.recommendations = response.success && response.data?.items ? response.data.items : [];
        } catch (error) {
            console.warn('[Cart Page API] Failed to load recommendations:', error);
            this.recommendations = [];
        } finally {
            this.renderRecommendations();
        }
    }

    renderRecommendations() {
        const container = document.getElementById('recommendationCards');
        const emptyState = document.getElementById('recommendationEmpty');
        if (!container) return;

        if (!this.recommendations || this.recommendations.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        container.innerHTML = this.recommendations
            .map((item) => this.renderRecommendationCard(item))
            .join('');
    }

    renderRecommendationCard(item) {
        const image = item.images && item.images.length > 0
            ? item.images[0]
            : 'https://via.placeholder.com/300x200?text=Recommendation';
        const price = item.price ? `₺${parseFloat(item.price).toFixed(2)}` : '';
        const store = item.store?.name ? `<p style="font-size: 0.85rem; color: var(--warm-brown); margin-bottom: var(--space-xs);">${item.store.name}</p>` : '';

        return `
            <div class="recommendation-card" data-product-id="${item.id}">
                <img src="${image}" alt="${item.title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: var(--space-sm);">
                <h4 style="margin-bottom: var(--space-xs);">${item.title}</h4>
                ${store}
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600;">${price}</span>
                    <button class="btn btn-secondary" data-action="add-recommendation" data-product-id="${item.id}" style="padding: var(--space-xs) var(--space-sm); font-size: 0.9rem;">Add to Cart</button>
                </div>
            </div>
        `;
    }

    async addRecommendationToCart(productId) {
        const recommendation = this.recommendations.find((item) => item.id === productId);
        if (!recommendation) {
            this.showMessage('Öneri bulunamadı', 'error');
            return;
        }

        try {
            const added = await window.cartManager.addItem(productId, recommendation, 1);
            if (added) {
                this.showMessage('Önerilen ürün sepete eklendi', 'success');
                await this.loadCart(true, false);
            } else {
                this.showMessage('Ürün sepete eklenemedi', 'error');
            }
        } catch (error) {
            console.error('[Cart Page API] Failed to add recommendation to cart:', error);
            this.showMessage('Ürün sepete eklenemedi', 'error');
        }
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

        // Saved item actions
        document.addEventListener('click', (e) => {
            const moveBtn = e.target.closest('[data-action="move-to-cart"]');
            if (moveBtn) {
                e.preventDefault();
                const card = moveBtn.closest('[data-product-id]');
                const productId = card?.dataset.productId;
                this.moveSavedItemToCart(productId);
                return;
            }

            const removeBtn = e.target.closest('[data-action="remove-wishlist"]');
            if (removeBtn) {
                e.preventDefault();
                const card = removeBtn.closest('[data-product-id]');
                const productId = card?.dataset.productId;
                this.removeWishlistItem(productId);
            }
        });

        // Recommendation add-to-cart
        document.addEventListener('click', (e) => {
            const addBtn = e.target.closest('[data-action="add-recommendation"]');
            if (addBtn) {
                e.preventDefault();
                const productId = addBtn.dataset.productId;
                this.addRecommendationToCart(productId);
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
            const success = await window.cartManager.updateItem(productId, quantity);

            if (!success) {
                this.showMessage('Failed to update cart item', 'error');
            }

            this.cart = await window.cartManager.getCart(true);
            this.renderCart();
            this.updateCartSummary();
        } catch (error) {
            console.error('[Cart Page API] Error updating cart item:', error);
            this.showMessage('Failed to update cart item', 'error');
        }
    }

    async removeItem(index) {
        if (index < 0 || index >= this.cart.length) return;

        const item = this.cart[index];

        if (!confirm(`Remove "${item.product?.title}" from cart?`)) {
            return;
        }

        try {
            await window.cartManager.removeItem(item.product_id);
            this.cart = await window.cartManager.getCart(true);
            this.renderCart();
            this.updateCartSummary();
            this.showMessage('Item removed from cart', 'success');
        } catch (error) {
            console.error('[Cart Page API] Error removing item:', error);
            this.showMessage('Failed to remove item from cart', 'error');
        }
    }

    proceedToCheckout() {
        if (this.cart.length === 0) {
            alert('Your cart is empty');
            return;
        }

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
window.debugCart = async function debugCart() {
    console.log('=== CART DEBUG INFO ===');
    const cart = await window.cartManager.getCart(true);
    console.log('Remote cart:', cart);
    console.log('Total items:', cart.length);
    cart.forEach((item, i) => {
        console.log(`Item ${i + 1}:`, {
            product_id: item.product_id,
            hasProduct: !!item.product,
            product: item.product,
            quantity: item.quantity,
            price: item.price,
        });
    });
    console.log('======================');
};

window.clearCart = async function clearCart() {
    await window.cartManager.clearCart();
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
