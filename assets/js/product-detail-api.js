/**
 * Product Detail Page API Integration
 * Connects product-detail.html to backend API
 */

class ProductDetailAPI {
    constructor() {
        this.apiClient = new ApiClient();
        this.product = null;
        this.productId = this.getProductIdFromURL();
        this.productSlug = this.getProductSlugFromURL();
        this.quantity = 1;
        this.selectedVariants = {}; // { variant_name: Set(values) }

        console.log('[Product Detail API] Initializing for product:', this.productId || this.productSlug);
        this.init();
    }

    renderVariantsSection() {
        const container = document.getElementById('productVariants');
        if (!container) return;

        const variants = Array.isArray(this.product.productVariants) ? this.product.productVariants : [];
        if (variants.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Group options by variant_name
        const groups = {};
        variants.forEach(pv => {
            const name = pv.variant_name || 'Variant';
            if (!groups[name]) groups[name] = new Map();
            const opts = Array.isArray(pv.selected_options) ? pv.selected_options : [];
            opts.forEach(opt => {
                const key = String(opt.value);
                if (!groups[name].has(key)) groups[name].set(key, opt);
            });
        });

        let html = '<h3>Options</h3>';
        Object.entries(groups).forEach(([name, map]) => {
            html += `<div class="variant-block"><div class="variant-title">${name}</div><div class="variant-options" data-variant-name="${name}">`;
            map.forEach((opt, key) => {
                const label = opt.label || key;
                html += `
                    <button class="variant-chip" data-variant-name="${name}" data-variant-value="${key}" title="${label}">
                        ${label}
                    </button>
                `;
            });
            html += `</div></div>`;
        });

        container.innerHTML = html;
    }

    attachVariantListeners() {
        const container = document.getElementById('productVariants');
        if (!container) return;
        container.addEventListener('click', (e) => {
            const chip = e.target.closest('.variant-chip');
            if (!chip) return;
            const name = chip.dataset.variantName;
            const value = chip.dataset.variantValue;
            if (!this.selectedVariants[name]) this.selectedVariants[name] = new Set();

            // Toggle selection, single-select per variant group is common. Here we use single select.
            // Clear previous selection in this group
            container.querySelectorAll(`.variant-options[data-variant-name="${name}"] .variant-chip`).forEach(btn => btn.classList.remove('active'));
            this.selectedVariants[name].clear();

            chip.classList.add('active');
            this.selectedVariants[name].add(value);
        });
    }

    getProductIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    getProductSlugFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('slug');
    }

    async init() {
        if (!this.productId && !this.productSlug) {
            this.showError('Product not found');
            return;
        }

        try {
            await this.loadProduct();
            this.setupEventListeners();
            console.log('[Product Detail API] Initialization complete');
        } catch (error) {
            console.error('[Product Detail API] Initialization error:', error);
            this.showError('Failed to load product');
        }
    }

    async loadProduct() {
        try {
            if (this.productId) {
                console.log('[Product Detail API] Loading product by ID:', this.productId);
            } else {
                console.log('[Product Detail API] Loading product by slug:', this.productSlug);
            }
            this.showLoading();

            const response = this.productId
                ? await this.apiClient.getProduct(this.productId)
                : await this.apiClient.getProductBySlug(this.productSlug);

            if (response.success && response.data) {
                this.product = response.data;
                console.log('[Product Detail API] Product loaded:', this.product);
                this.productId = this.product.id;
                this.renderProduct();
                this.renderVariantsSection();
                this.attachVariantListeners();
            } else {
                this.showError('Product not found');
            }
        } catch (error) {
            console.error('[Product Detail API] Error loading product:', error);
            this.showError('Failed to load product details');
        } finally {
            this.hideLoading();
        }
    }

    renderProduct() {
        if (!this.product) return;

        // Update page title
        document.title = `${this.product.title} - DostanWebCSS Nordic Marketplace`;

        // Update meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', this.product.short_description || this.product.description || '');
        }

        // Update SEO meta tags and structured data
        if (window.seoMetaManager) {
            window.seoMetaManager.updateProductMeta(this.product);
        }

        // Render product details
        this.renderProductInfo();
        this.renderProductImages();
        this.renderStoreInfo();
        this.renderProductSpecs();

        this.syncWishlistButton();
    }

    renderProductInfo() {
        const container = document.getElementById('productInfo');
        if (!container) return;

        const price = parseFloat(this.product.price);
        const comparePrice = this.product.compare_price ? parseFloat(this.product.compare_price) : null;

        // Calculate discount
        const discount = comparePrice && comparePrice > price
            ? Math.round(((comparePrice - price) / comparePrice) * 100)
            : null;

        // Stock status
        const stockStatus = this.product.stock > 0
            ? (this.product.stock <= this.product.low_stock_threshold ? `Only ${this.product.stock} left in stock!` : 'In Stock')
            : 'Out of Stock';
        const stockClass = this.product.stock > 0
            ? (this.product.stock <= this.product.low_stock_threshold ? 'low-stock' : 'in-stock')
            : 'out-of-stock';

        // Badges
        const badges = [];
        if (this.product.badges && Array.isArray(this.product.badges)) {
            const badgeLabels = {
                'handmade': '✋ Handmade',
                'limited': '⭐ Limited Edition',
                'eco-friendly': '🌱 Eco-Friendly',
                'spiritual': '🕉️ Spiritual',
                'traditional': '🏛️ Traditional',
                'artisan': '👨‍🎨 Artisan Crafted'
            };
            this.product.badges.forEach(badge => {
                if (badgeLabels[badge]) {
                    badges.push(`<span class="product-badge ${badge}">${badgeLabels[badge]}</span>`);
                }
            });
        }

        container.innerHTML = `
            <h1 class="product-title">${this.product.title}</h1>

            <div class="product-badges-container">
                ${badges.join('')}
                ${discount ? `<span class="product-badge discount">-${discount}% OFF</span>` : ''}
            </div>

            <div class="product-rating">
                <span class="rating-stars">${'★'.repeat(Math.floor(this.product.rating || 0))}${'☆'.repeat(5 - Math.floor(this.product.rating || 0))}</span>
                <span class="rating-value">${Number(this.product.rating || 0).toFixed(1)}</span>
                <span class="reviews-count">(${this.product.total_reviews || 0} reviews)</span>
                <span class="sales-count">${this.product.total_sales || 0} sold</span>
            </div>

            <div class="product-price">
                <span class="price-current">$${price.toFixed(2)}</span>
                ${comparePrice ? `<span class="price-original">$${comparePrice.toFixed(2)}</span>` : ''}
            </div>

            <div class="stock-status ${stockClass}">
                ${stockStatus}
            </div>

            <div class="product-description">
                <h3>Product Description</h3>
                <p>${this.product.description || this.product.short_description || 'No description available.'}</p>
            </div>

            <div id="productVariants" class="product-variants"></div>

            <div class="quantity-selector">
                <label for="quantityInput">Quantity:</label>
                <div class="quantity-controls">
                    <button id="decreaseQty" ${this.product.stock <= 0 ? 'disabled' : ''}>-</button>
                    <input type="number" id="quantityInput" value="1" min="1" max="${this.product.stock}" ${this.product.stock <= 0 ? 'disabled' : ''}>
                    <button id="increaseQty" ${this.product.stock <= 0 ? 'disabled' : ''}>+</button>
                </div>
            </div>

            <div class="product-actions">
                <button class="btn btn-primary btn-add-to-cart" id="addToCartBtn" ${this.product.stock <= 0 ? 'disabled' : ''}>
                    ${this.product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button class="btn btn-secondary btn-wishlist" id="addToWishlistBtn">
                    ♡ Add to Wishlist
                </button>
            </div>
        `;
    }

    renderProductImages() {
        const container = document.getElementById('productImages');
        if (!container) return;

        const images = this.product.images && this.product.images.length > 0
            ? this.product.images
            : ['https://via.placeholder.com/600x400?text=No+Image'];

        const mainImage = images[0];
        const thumbnails = images.slice(1, 5); // Max 4 additional thumbnails

        container.innerHTML = `
            <div class="main-image">
                <img id="mainProductImage" src="${mainImage}" alt="${this.product.title}">
            </div>
            ${thumbnails.length > 0 ? `
                <div class="image-thumbnails">
                    ${images.map((img, idx) => `
                        <img class="thumbnail ${idx === 0 ? 'active' : ''}"
                             src="${img}"
                             alt="${this.product.title} - Image ${idx + 1}"
                             data-image="${img}">
                    `).join('')}
                </div>
            ` : ''}
        `;

        // Add click handlers for thumbnails
        container.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const mainImg = document.getElementById('mainProductImage');
                if (mainImg) {
                    mainImg.src = thumb.dataset.image;
                }
                container.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });
    }

    renderStoreInfo() {
        const container = document.getElementById('storeInfo');
        if (!container || !this.product.store) return;

        const store = this.product.store;

        container.innerHTML = `
            <h3>Seller Information</h3>
            <div class="store-card">
                ${store.logo ? `<img class="store-logo" src="${store.logo}" alt="${store.name}">` : ''}
                <div class="store-details">
                    <h4>${store.name}</h4>
                    ${store.description ? `<p>${store.description.substring(0, 150)}...</p>` : ''}
                    <div class="store-stats">
                        <span>⭐ ${Number(store.rating || 0).toFixed(1)} rating</span>
                        <span>📦 ${store.total_sales || 0} products sold</span>
                    </div>
                    <a href="store.html?id=${store.id}" class="btn btn-secondary">Visit Store</a>
                </div>
            </div>
        `;
    }

    renderProductSpecs() {
        const container = document.getElementById('productSpecs');
        if (!container) return;

        const specs = [];

        if (this.product.sku) {
            specs.push({ label: 'SKU', value: this.product.sku });
        }

        if (this.product.weight) {
            specs.push({ label: 'Weight', value: `${this.product.weight} kg` });
        }

        if (this.product.dimensions) {
            const dim = this.product.dimensions;
            const dimStr = `${dim.length || 0} × ${dim.width || 0} × ${dim.height || 0} cm`;
            specs.push({ label: 'Dimensions', value: dimStr });
        }

        if (this.product.category) {
            specs.push({ label: 'Category', value: this.product.category.name });
        }

        if (specs.length > 0) {
            container.innerHTML = `
                <h3>Product Specifications</h3>
                <table class="specs-table">
                    ${specs.map(spec => `
                        <tr>
                            <td><strong>${spec.label}</strong></td>
                            <td>${spec.value}</td>
                        </tr>
                    `).join('')}
                </table>
            `;
        }
    }

    setupEventListeners() {
        // Quantity controls
        const decreaseBtn = document.getElementById('decreaseQty');
        const increaseBtn = document.getElementById('increaseQty');
        const quantityInput = document.getElementById('quantityInput');

        if (decreaseBtn && quantityInput) {
            decreaseBtn.addEventListener('click', () => {
                const currentQty = parseInt(quantityInput.value);
                if (currentQty > 1) {
                    quantityInput.value = currentQty - 1;
                    this.quantity = currentQty - 1;
                }
            });
        }

        if (increaseBtn && quantityInput) {
            increaseBtn.addEventListener('click', () => {
                const currentQty = parseInt(quantityInput.value);
                const maxQty = this.product.stock;
                if (currentQty < maxQty) {
                    quantityInput.value = currentQty + 1;
                    this.quantity = currentQty + 1;
                }
            });
        }

        if (quantityInput) {
            quantityInput.addEventListener('change', () => {
                const value = parseInt(quantityInput.value);
                if (value < 1) {
                    quantityInput.value = 1;
                    this.quantity = 1;
                } else if (value > this.product.stock) {
                    quantityInput.value = this.product.stock;
                    this.quantity = this.product.stock;
                } else {
                    this.quantity = value;
                }
            });
        }

        // Add to cart button
        const addToCartBtn = document.getElementById('addToCartBtn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => this.addToCart());
        }

        // Add to wishlist button
        const wishlistBtn = document.getElementById('addToWishlistBtn');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', () => this.addToWishlist());
        }

        // Tab switching
        document.querySelectorAll('.product-tab-header').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Initialize reviews if on reviews tab
        if (window.ProductReviews) {
            this.productReviews = new ProductReviews(this.productId);
        }
    }

    switchTab(tabName) {
        // Update tab headers
        document.querySelectorAll('.product-tab-header').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Load tab content
        if (tabName === 'reviews' && this.productReviews) {
            this.productReviews.loadReviews();
        } else if (tabName === 'details') {
            this.loadDetailsTab();
        }
        // Add other tabs as needed
    }

    loadDetailsTab() {
        const container = document.getElementById('productTabContent');
        if (!container) return;

        container.innerHTML = `
            <div class="product-details-content">
                <h3>Ürün Açıklaması</h3>
                <p>${this.product.description || this.product.short_description || 'Açıklama mevcut değil.'}</p>
            </div>
        `;
    }

    async addToCart() {
        try {
            console.log('[Product Detail API] Adding to cart:', this.productId, 'Quantity:', this.quantity);

            if (!this.product) {
                alert('Product data not loaded');
                return;
            }

            if (this.product.stock <= 0) {
                alert('This product is out of stock');
                return;
            }

            if (this.quantity > this.product.stock) {
                alert(`Only ${this.product.stock} items available`);
                return;
            }

            // Serialize selected variants as array
            const variantsSelected = Object.entries(this.selectedVariants || {}).map(([name, set]) => ({
                name,
                values: Array.from(set || []),
            }));

            // Try to add to backend cart if user is logged in
            if (AuthManager.isLoggedIn()) {
                const response = await this.apiClient.post('/cart/items', {
                    product_id: this.productId,
                    quantity: this.quantity,
                    variants: variantsSelected // Backend currently ignores extra fields; kept for future support
                });

                if (response.success) {
                    this.showSuccessMessage(`Added ${this.quantity} item(s) to cart!`);
                    // Update cart count
                    if (window.updateCartCount) {
                        window.updateCartCount();
                    }
                } else {
                    // Fallback to localStorage
                    this.addToLocalCart(variantsSelected);
                }
            } else {
                // User not logged in, use localStorage
                this.addToLocalCart(variantsSelected);
            }
        } catch (error) {
            console.error('[Product Detail API] Error adding to cart:', error);
            this.showError('Failed to add product to cart');
        }
    }

    addToLocalCart(variantsSelected = []) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];

        // Check if product already in cart
        const existingItem = cart.find(item => item.product_id === this.productId);

        if (existingItem) {
            existingItem.quantity += this.quantity;
        } else {
            cart.push({
                product_id: this.productId,
                product: this.product,
                quantity: this.quantity,
                price: parseFloat(this.product.price),
                variants: variantsSelected
            });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        this.showSuccessMessage(`Added ${this.quantity} item(s) to cart!`);

        // Update cart count
        if (window.updateCartCount) {
            window.updateCartCount();
        }
    }

    async addToWishlist() {
        if (!this.productId || !this.product) {
            this.showError('Product details not loaded');
            return;
        }

        try {
            console.log('[Product Detail API] Toggling wishlist:', this.productId);

            const payload = {
                id: this.productId,
                product_id: this.productId,
                product: {
                    id: this.productId,
                    title: this.product.title,
                    price: this.product.price,
                    images: this.product.images,
                    store: this.product.store,
                },
            };

            const added = window.wishlistManager
                ? await window.wishlistManager.toggle(payload)
                : this._fallbackToggleWishlist(payload.id);

            if (added) {
                this.showSuccessMessage('Added to wishlist!');
            } else {
                this.showSuccessMessage('Removed from wishlist');
            }

            this.updateWishlistButtonState(added);
        } catch (error) {
            console.error('[Product Detail API] Error toggling wishlist:', error);
            this.showError('Failed to update wishlist');
        }
    }

    _fallbackToggleWishlist(productId) {
        const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
        const ids = new Set(stored);
        if (ids.has(productId)) {
            ids.delete(productId);
            localStorage.setItem('wishlist', JSON.stringify(Array.from(ids)));
            return false;
        }
        ids.add(productId);
        localStorage.setItem('wishlist', JSON.stringify(Array.from(ids)));
        return true;
    }

    async syncWishlistButton() {
        const wishlistBtn = document.getElementById('addToWishlistBtn');
        if (!wishlistBtn || !this.productId) return;

        try {
            if (window.wishlistManager) {
                await window.wishlistManager.getWishlist();
                const liked = window.wishlistManager.isInWishlist(this.productId);
                this.updateWishlistButtonState(liked);
            } else {
                const stored = JSON.parse(localStorage.getItem('wishlist') || '[]');
                this.updateWishlistButtonState(stored.includes(this.productId));
            }
        } catch (error) {
            console.warn('[Product Detail API] Unable to sync wishlist button', error);
        }
    }

    updateWishlistButtonState(isInWishlist) {
        const wishlistBtn = document.getElementById('addToWishlistBtn');
        if (!wishlistBtn) return;

        if (isInWishlist) {
            wishlistBtn.innerHTML = '♥ Favorilerde';
            wishlistBtn.classList.add('in-wishlist');
        } else {
            wishlistBtn.innerHTML = '♡ Favorilere Ekle';
            wishlistBtn.classList.remove('in-wishlist');
        }
    }

    showLoading() {
        const container = document.getElementById('productInfo') || document.querySelector('.product-detail-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-state" style="text-align: center; padding: 3rem;">
                    <div class="spinner" style="margin: 0 auto 1rem;"></div>
                    <p>Loading product details...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be replaced by product content
    }

    showError(message) {
        const container = document.getElementById('productInfo') || document.querySelector('.product-detail-container');
        if (container) {
            container.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 3rem; color: #dc2626;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.href='products.html'">Browse Products</button>
                </div>
            `;
        }
    }

    showSuccessMessage(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification success';
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: #10b981;
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.productDetailAPI = new ProductDetailAPI();
    });
} else {
    window.productDetailAPI = new ProductDetailAPI();
}
