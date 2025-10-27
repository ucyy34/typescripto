/**
 * Çarşı Pazar Gez Browser
 * Handles marketplace modal, random product fetch, and quick actions
 */
(function() {
    class CarsiPazarBrowser {
        constructor() {
            this.apiBaseUrl = this.resolveApiBaseUrl();
            this.apiClient = typeof ApiClient !== 'undefined' ? new ApiClient() : null;
            this.marketplaceProductsCache = { data: [], expiresAt: 0 };
            this.marketplaceProductMap = new Map();
            this.marketplaceCacheTTL = 60 * 1000;
            this.activeMarketplaceRequest = null;
            this.modal = null;
            this.trigger = null;

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
            } else {
                this.init();
            }
        }

        init() {
            this.createMarketplaceUI();
        }

        resolveApiBaseUrl() {
            if (typeof API_CONFIG !== 'undefined' && API_CONFIG.BASE_URL) {
                return API_CONFIG.BASE_URL;
            }

            if (typeof HomeAPI !== 'undefined' && HomeAPI.baseURL) {
                return HomeAPI.baseURL;
            }

            if (typeof window !== 'undefined' && window.API_BASE_URL) {
                return window.API_BASE_URL;
            }

            return 'http://localhost:5050/api/v1';
        }

        createMarketplaceUI() {
            if (document.querySelector('.marketplace-browse-trigger')) {
                return;
            }

            const trigger = document.createElement('button');
            trigger.className = 'marketplace-browse-trigger';
            trigger.innerHTML = '🏪';
            trigger.title = 'Çarşı Pazar Gez';

            const modal = document.createElement('div');
            modal.className = 'marketplace-modal';
            modal.innerHTML = `
                <div class="marketplace-modal-content">
                    <div class="marketplace-modal-header">
                        <h3>🏪 Çarşı Pazar Gez</h3>
                        <p>Rastgele keşfedilecek hazineler</p>
                        <button class="marketplace-modal-close">×</button>
                    </div>
                    <div class="marketplace-modal-body" id="marketplace-products">
                        <div class="marketplace-loading">
                            <div class="loading-spinner"></div>
                            <p>Hazineler yükleniyor...</p>
                        </div>
                    </div>
                    <div class="marketplace-modal-footer">
                        <button class="btn btn-primary marketplace-refresh">🔄 Yeni Hazineler</button>
                    </div>
                </div>
            `;

            document.body.appendChild(trigger);
            document.body.appendChild(modal);

            trigger.addEventListener('click', () => {
                modal.classList.add('open');
                this.loadRandomProducts();
            });

            modal.querySelector('.marketplace-modal-close').addEventListener('click', () => {
                modal.classList.remove('open');
            });

            modal.querySelector('.marketplace-refresh').addEventListener('click', () => {
                this.loadRandomProducts(true);
            });

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.classList.remove('open');
                    return;
                }

                const actionButton = event.target.closest('[data-marketplace-action]');
                if (actionButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    const action = actionButton.dataset.marketplaceAction;
                    const productId = actionButton.dataset.productId;

                    if (action === 'retry-load') {
                        this.loadRandomProducts(true);
                        return;
                    }

                    if (!productId) return;

                    if (action === 'add-cart') {
                        this.addToCartQuick(productId, actionButton);
                    } else if (action === 'wishlist') {
                        this.addToWishlistQuick(productId, actionButton);
                    }
                    return;
                }

                const infoTarget = event.target.closest('[data-marketplace-info]');
                if (infoTarget) {
                    const productId = infoTarget.dataset.marketplaceInfo;
                    const product = this.marketplaceProductMap.get(productId);
                    if (product) {
                        this.notifyDostik(`${product.title} harika bir seçim! ${(product.store?.name) || 'mağaza'} tarafından hazırlandı.`, false);
                    }
                }
            });

            this.trigger = trigger;
            this.modal = modal;
        }

        async loadRandomProducts(forceRefresh = false) {
            const modalBody = this.modal?.querySelector('#marketplace-products');
            if (!modalBody) return;

            if (forceRefresh) {
                this.marketplaceProductsCache = { data: [], expiresAt: 0 };
            }

            const now = Date.now();
            if (!forceRefresh &&
                this.marketplaceProductsCache.data.length &&
                now < this.marketplaceProductsCache.expiresAt) {
                this.renderMarketplaceProducts(this.marketplaceProductsCache.data);
                return;
            }

            modalBody.innerHTML = `
                <div class="marketplace-loading">
                    <div class="loading-spinner"></div>
                    <p>Hazineler yükleniyor...</p>
                </div>
            `;

            const requestId = Date.now();
            this.activeMarketplaceRequest = requestId;

            try {
                const response = await this.requestRandomProducts(8);
                if (this.activeMarketplaceRequest !== requestId) {
                    return;
                }

                if (!response || response.success !== true || !Array.isArray(response.data)) {
                    throw new Error(response?.message || 'Ürünler alınamadı');
                }

                this.marketplaceProductsCache = {
                    data: response.data,
                    expiresAt: Date.now() + this.marketplaceCacheTTL,
                };

                this.renderMarketplaceProducts(response.data);
                this.notifyDostik('Çarşı pazar gezimiz gerçek ürünlerle dolu! Hadi keşfedelim.', false);
            } catch (error) {
                if (this.activeMarketplaceRequest !== requestId) {
                    return;
                }

                console.error('[ÇarşıPazar] Failed to load random products:', error);
                modalBody.innerHTML = `
                    <div class="marketplace-error">
                        <p>Hazineleri yüklerken bir sorun oluştu.</p>
                        <button class="marketplace-quick-btn" data-marketplace-action="retry-load">
                            Tekrar Dene
                        </button>
                    </div>
                `;
            }
        }

        async requestRandomProducts(limit = 8) {
            if (this.apiClient) {
                return this.apiClient.get('/products/random', { limit }, { useCache: false });
            }

            const response = await fetch(`${this.apiBaseUrl}/products/random?limit=${limit}`);
            if (!response.ok) {
                throw new Error(`API responded with ${response.status}`);
            }

            return response.json();
        }

        renderMarketplaceProducts(products) {
            const modalBody = this.modal?.querySelector('#marketplace-products');
            if (!modalBody) return;

            if (!products || products.length === 0) {
                modalBody.innerHTML = `
                    <div class="marketplace-empty">
                        <p>Şu an listelenecek ürün bulamadık.</p>
                        <button class="marketplace-quick-btn" data-marketplace-action="retry-load">
                            Yenile
                        </button>
                    </div>
                `;
                this.marketplaceProductMap.clear();
                return;
            }

            this.marketplaceProductMap.clear();
            const cards = products.map((product) => {
                if (product && product.id) {
                    this.marketplaceProductMap.set(product.id, product);
                }
                return this.renderMarketplaceProductCard(product);
            }).join('');

            modalBody.innerHTML = `
                <div class="marketplace-products-grid">
                    ${cards}
                </div>
            `;
        }

        renderMarketplaceProductCard(product = {}) {
            const safeTitle = this.escapeHtml(product.title || 'Ürün');
            const safeStore = this.escapeHtml(product.store?.name || 'Bağımsız Mağaza');
            const price = this.formatPrice(product.price);
            const imageUrl = this.escapeHtml(this.resolveMarketplaceImage(product));

            return `
                <div class="marketplace-product-card" data-product-card="${product.id}">
                    <div class="marketplace-product-info" data-marketplace-info="${product.id}">
                        <div class="marketplace-product-image">
                            <img src="${imageUrl}" alt="${safeTitle}" loading="lazy">
                        </div>
                        <div class="marketplace-product-title">${safeTitle}</div>
                        <div class="marketplace-product-store">${safeStore}</div>
                        <div class="marketplace-product-price">${price}</div>
                    </div>
                    <div class="marketplace-product-actions">
                        <button
                            class="marketplace-quick-btn"
                            data-marketplace-action="add-cart"
                            data-product-id="${product.id}"
                            data-default-label="Sepete Ekle"
                        >
                            <span class="marketplace-action-label">Sepete Ekle</span>
                        </button>
                        <button
                            class="marketplace-quick-btn wishlist"
                            data-marketplace-action="wishlist"
                            data-product-id="${product.id}"
                            data-default-label="Beğen"
                        >
                            <span class="marketplace-action-label">Beğen</span>
                        </button>
                    </div>
                </div>
            `;
        }

        resolveMarketplaceImage(product = {}) {
            const candidate = (product.images && product.images[0]) || product.image || '';
            if (!candidate) {
                return 'assets/images/placeholder-product.jpg';
            }
            return candidate;
        }

        formatPrice(value) {
            if (value === null || typeof value === 'undefined') {
                return '₺0,00';
            }

            const normalized = typeof value === 'string' ? value.replace(',', '.') : value;
            const numericValue = Number.parseFloat(normalized);

            if (Number.isFinite(numericValue)) {
                try {
                    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(numericValue);
                } catch (_) {
                    return `${numericValue.toFixed(2)} ₺`;
                }
            }

            return `${value}`;
        }

        escapeHtml(value = '') {
            if (typeof value !== 'string') {
                return value ?? '';
            }

            return value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        async addToCartQuick(productId, triggerButton) {
            const product = this.marketplaceProductMap.get(productId);
            if (!product) {
                console.warn('[ÇarşıPazar] Product not found for cart:', productId);
                return;
            }

            if (!window.cartManager || typeof window.cartManager.addItem !== 'function') {
                alert('Sepet sistemi henüz hazır değil. Lütfen sayfayı yenileyin.');
                return;
            }

            const button = triggerButton || this.modal?.querySelector(`[data-marketplace-action="add-cart"][data-product-id="${productId}"]`);
            const actionLabel = button?.querySelector('.marketplace-action-label');
            const defaultLabel = button?.dataset.defaultLabel || 'Sepete Ekle';

            try {
                if (button && actionLabel) {
                    button.disabled = true;
                    button.classList.add('loading');
                    actionLabel.textContent = 'Ekleniyor...';
                }

                const numericPrice = typeof product.price === 'string'
                    ? parseFloat(product.price.replace(',', '.'))
                    : product.price;

                const productData = {
                    id: product.id,
                    title: product.title,
                    price: Number.isFinite(numericPrice) ? numericPrice : 0,
                    images: product.images || [],
                    stock: product.stock || 0,
                    store: product.store || null
                };

                const added = await window.cartManager.addItem(product.id, productData, 1);
                if (!added) {
                    throw new Error('Sepete eklenemedi');
                }

                if (button && actionLabel) {
                    button.classList.add('added');
                    actionLabel.textContent = 'Eklendi';
                }

                this.updateCartCount();
                this.notifyDostik(`${product.title} sepete eklendi! Harika seçim!`, true);
            } catch (error) {
                console.error('[ÇarşıPazar] addToCartQuick failed:', error);
                if (button && actionLabel) {
                    actionLabel.textContent = 'Tekrar dene';
                }
            } finally {
                if (button && actionLabel) {
                    setTimeout(() => {
                        button.disabled = false;
                        button.classList.remove('loading', 'added');
                        actionLabel.textContent = defaultLabel;
                    }, 1500);
                }
            }
        }

        async addToWishlistQuick(productId, triggerButton) {
            const product = this.marketplaceProductMap.get(productId);
            if (!product) {
                console.warn('[ÇarşıPazar] Product not found for wishlist:', productId);
                return;
            }

            const button = triggerButton || this.modal?.querySelector(`[data-marketplace-action="wishlist"][data-product-id="${productId}"]`);
            const actionLabel = button?.querySelector('.marketplace-action-label');
            const defaultLabel = button?.dataset.defaultLabel || 'Beğen';

            try {
                let inWishlist;
                if (window.wishlistManager) {
                    inWishlist = await window.wishlistManager.toggleItem(product.id, {
                        product_id: product.id,
                        title: product.title,
                        price: product.price,
                        images: product.images || [],
                        store: product.store || null,
                    });
                } else {
                    inWishlist = this.toggleWishlistFallback(product);
                }

                if (button && actionLabel) {
                    if (inWishlist) {
                        button.classList.add('added');
                        actionLabel.textContent = 'Favoride';
                    } else {
                        button.classList.remove('added');
                        actionLabel.textContent = defaultLabel;
                    }
                }

                const message = inWishlist
                    ? `${product.title} favorilere eklendi!`
                    : `${product.title} favorilerden çıkarıldı.`;
                this.notifyDostik(message, false);
            } catch (error) {
                console.error('[ÇarşıPazar] Wishlist toggle failed:', error);
                this.notifyDostik('Favori işlemi sırasında hata oluştu.', false);
            }
        }

        toggleWishlistFallback(product) {
            let wishlist = [];
            try {
                wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
            } catch (_) {
                wishlist = [];
            }

            if (!Array.isArray(wishlist)) {
                wishlist = [];
            }

            const existingIndex = wishlist.findIndex(
                (item) => item.product_id === product.id || item.title === product.title
            );

            if (existingIndex > -1) {
                wishlist.splice(existingIndex, 1);
                localStorage.setItem('wishlist', JSON.stringify(wishlist));
                return false;
            }

            wishlist.push({
                product_id: product.id,
                title: product.title,
                price: product.price,
                images: product.images || [],
                store: product.store || null,
                source: 'marketplace',
            });

            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            return true;
        }

        notifyDostik(message, openChat = false) {
            if (window.dostikAI && typeof window.dostikAI.addChatMessage === 'function') {
                window.dostikAI.addChatMessage(message);
                if (openChat && window.dostikAI.chatWidget && !window.dostikAI.chatWidget.classList.contains('open')) {
                    window.dostikAI.chatWidget.classList.add('open');
                }
            }
        }

        async updateCartCount() {
            if (typeof window.updateCartCount === 'function') {
                try {
                    await window.updateCartCount();
                    return;
                } catch (error) {
                    console.warn('[ÇarşıPazar] updateCartCount fallback:', error);
                }
            }

            // Fallback
            if (window.cartManager && typeof window.cartManager.getCartCount === 'function') {
                try {
                    const count = await window.cartManager.getCartCount();
                    const cartCountEl = document.querySelector('.cart-count');
                    if (cartCountEl) {
                        cartCountEl.textContent = count;
                    }
                } catch (_) {}
            }
        }
    }

    window.carsiPazarBrowser = new CarsiPazarBrowser();
})();
