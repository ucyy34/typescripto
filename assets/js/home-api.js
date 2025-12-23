/**
 * Home Page API Integration
 * Fetches and displays products from the backend API
 * Enhanced with infinite scroll, skeleton loading, and smooth animations
 */

const HomeAPI = {
    baseURL: (typeof API_CONFIG !== 'undefined' && API_CONFIG.BASE_URL) ? API_CONFIG.BASE_URL : 'http://localhost:8080/api/v1',
    currentPage: 1,
    isLoading: false,
    hasMore: true,
    productsPerPage: 12,
    observer: null,

    /**
     * Fetch approved products from the API
     * @param {number} limit - Number of products to fetch
     * @param {number} page - Page number for pagination
     * @returns {Promise<Object>} Object with products array and pagination info
     */
    async fetchProducts(limit = 12, page = null) {
        try {
            const pageNum = page !== null ? page : this.currentPage;
            const response = await fetch(`${this.baseURL}/products?status=approved&is_active=true&limit=${limit}&page=${pageNum}`);
            const data = await response.json();

            if (data.success) {
                // Check if there are more products
                const hasNext = data.pagination?.hasNext || (data.data?.length === limit);
                return {
                    products: data.data || [],
                    hasMore: hasNext,
                    total: data.pagination?.total || data.data?.length || 0
                };
            } else {
                console.error('Failed to fetch products:', data.message);
                return { products: [], hasMore: false, total: 0 };
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            return { products: [], hasMore: false, total: 0 };
        }
    },

    /**
     * Fetch featured products
     * @param {number} limit - Number of products to fetch
     * @returns {Promise<Array>} Array of featured product objects
     */
    async fetchFeaturedProducts(limit = 4) {
        try {
            const response = await fetch(`${this.baseURL}/products?status=approved&is_active=true&is_featured=true&limit=${limit}`);
            const data = await response.json();

            if (data.success) {
                return data.data;
            } else {
                console.error('Failed to fetch featured products:', data.message);
                return [];
            }
        } catch (error) {
            console.error('Error fetching featured products:', error);
            return [];
        }
    },

    /**
     * Fetch products by category
     * @param {string} categorySlug - Category slug
     * @param {number} limit - Number of products to fetch
     * @returns {Promise<Array>} Array of product objects
     */
    async fetchProductsByCategory(categorySlug, limit = 8) {
        try {
            const response = await fetch(`${this.baseURL}/products?status=approved&is_active=true&category=${categorySlug}&limit=${limit}`);
            const data = await response.json();

            if (data.success) {
                return data.data;
            } else {
                console.error('Failed to fetch products by category:', data.message);
                return [];
            }
        } catch (error) {
            console.error('Error fetching products by category:', error);
            return [];
        }
    },

    /**
     * Fetch top-level categories
     * @returns {Promise<Array>} Array of category objects
     */
    async fetchCategories() {
        try {
            const response = await fetch(`${this.baseURL}/categories/top-level`);
            const data = await response.json();

            if (data.success) {
                return data.data;
            } else {
                console.error('Failed to fetch categories:', data.message);
                return [];
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    },

    /**
     * Create skeleton card HTML for loading state
     * @param {number} count - Number of skeleton cards to create
     * @returns {string} HTML string for skeleton cards
     */
    createSkeletonCards(count = 8) {
        return Array.from({ length: count }).map(() => `
            <div class="product-card skeleton-card">
                <div class="skeleton-image shimmer"></div>
                <div class="skeleton-content">
                    <div class="skeleton-title shimmer"></div>
                    <div class="skeleton-text shimmer"></div>
                    <div class="skeleton-price shimmer"></div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Create product card HTML with animation class and image scrubbing
     * @param {Object} product - Product object
     * @param {number} index - Index for staggered animation
     * @returns {string} HTML string for product card
     */
    createProductCard(product, index = 0) {
        const images = product.images && product.images.length > 0
            ? product.images
            : ['assets/images/placeholder-product.jpg'];

        const imageUrl = images[0];
        const hasMultipleImages = images.length > 1;
        const imagesJson = JSON.stringify(images).replace(/"/g, '&quot;');

        const storeName = product.store?.name || 'Unknown Store';
        const animationDelay = index * 0.05; // 50ms stagger

        const badgeLabels = {
            'handmade': '🖐️ Handmade',
            'limited': '⭐ Limited',
            'eco-friendly': '🌿 Eco-Friendly',
            'spiritual': '🔮 Spiritual',
            'traditional': '🏛️ Traditional',
            'artisan': '🎨 Artisan',
            'bestseller': '🏆 Bestseller',
            'new': '✨ New',
            'organic': '🌱 Organic'
        };

        const badges = Array.isArray(product.badges)
            ? product.badges
                .map(badge => badgeLabels[badge] ? `<span class="badge ${badge}">${badgeLabels[badge]}</span>` : '')
                .filter(Boolean)
                .join('')
            : '';

        // Create image indicator dots
        const indicatorDots = hasMultipleImages
            ? `<div class="image-indicators">${images.map((_, i) =>
                `<span class="indicator-dot${i === 0 ? ' active' : ''}" data-index="${i}"></span>`
            ).join('')}</div>`
            : '';

        return `
            <div class="product-card fade-in-up" data-product-id="${product.id}" style="animation-delay: ${animationDelay}s">
                <div class="product-image${hasMultipleImages ? ' has-multiple-images' : ''}" 
                     data-images="${imagesJson}" 
                     data-current-index="0">
                    <img src="${imageUrl}" alt="${product.title}" loading="lazy">
                    ${indicatorDots}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-artisan">by ${storeName}</p>
                    <p class="product-description">${product.short_description || product.description || ''}</p>
                    ${badges ? `<div class="product-badges">${badges}</div>` : ''}
                </div>
                <div class="product-footer">
                    <div class="product-price">
                        ${product.compare_price ? `<span class="old-price">₺${product.compare_price}</span>` : ''}
                        <span class="current-price">₺${product.price}</span>
                    </div>
                </div>
                <div class="product-actions">
                    <button
                        class="btn-card btn-add-cart"
                        data-action="add-to-cart"
                        data-product-id="${product.id}"
                        ${product.stock === 0 ? 'disabled' : ''}
                    >
                        ${product.stock === 0 ? 'Stokta Yok' : 'Sepete Ekle'}
                    </button>
                    <button class="btn-card btn-wishlist" data-product-id="${product.id}">
                        <span class="heart-icon">♡</span>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Create loading indicator for infinite scroll
     * @returns {string} HTML string for loading indicator
     */
    createLoadingIndicator() {
        return `
            <div class="infinite-scroll-loader" id="infiniteScrollLoader">
                <div class="loader-spinner"></div>
                <span>Daha fazla ürün yükleniyor...</span>
            </div>
        `;
    },

    /**
     * Create "no more products" indicator
     * @returns {string} HTML string for end message
     */
    createEndMessage() {
        return `
            <div class="infinite-scroll-end" id="infiniteScrollEnd">
                <span>🎉 Tüm ürünleri gördünüz!</span>
            </div>
        `;
    },

    /**
     * Render products to a container (append mode for infinite scroll)
     * @param {Array} products - Array of product objects
     * @param {string} containerId - ID of the container element
     * @param {boolean} append - Whether to append or replace
     * @param {number} startIndex - Starting index for animation delay
     */
    renderProducts(products, containerId, append = false, startIndex = 0) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container #${containerId} not found`);
            return;
        }

        // Remove loading indicator if exists
        const loader = document.getElementById('infiniteScrollLoader');
        if (loader) loader.remove();

        if (products.length === 0 && !append) {
            container.innerHTML = '<p class="no-products">Şu anda gösterilecek ürün yok.</p>';
            return;
        }

        const productsHTML = products.map((product, idx) =>
            this.createProductCard(product, startIndex + idx)
        ).join('');

        if (append) {
            container.insertAdjacentHTML('beforeend', productsHTML);
        } else {
            container.innerHTML = productsHTML;
        }

        // Delegate add-to-cart clicks (avoid inline handlers due to CSP)
        if (!this._delegatedEventsBound) {
            container.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action="add-to-cart"]');
                if (btn) {
                    const pid = btn.getAttribute('data-product-id');
                    if (pid) {
                        e.preventDefault();
                        try { addToCart(pid); } catch (err) { console.error('addToCart failed:', err); }
                    }
                }
            });
            this._delegatedEventsBound = true;
        }

        // Update wishlist buttons
        if (window.wishlistManager) {
            window.wishlistManager
                .ensureInitialized()
                .then(() => window.dostanApp?.updateAllWishlistButtons())
                .catch(() => window.dostanApp?.updateAllWishlistButtons());
        } else {
            window.dostanApp?.updateAllWishlistButtons();
        }

        // Initialize Dostik bubbles if available
        if (window.dostikAI) {
            setTimeout(() => window.dostikAI.initializeProductBubbles(), 100);
        }
    },

    /**
     * Setup infinite scroll observer
     */
    setupInfiniteScroll() {
        const container = document.getElementById('products-grid');
        if (!container) return;

        // Create sentinel element at the bottom
        const sentinel = document.createElement('div');
        sentinel.id = 'scrollSentinel';
        sentinel.style.cssText = 'height: 1px; width: 100%;';
        container.parentNode.insertBefore(sentinel, container.nextSibling);

        // Setup IntersectionObserver
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.isLoading && this.hasMore) {
                        this.loadMoreProducts();
                    }
                });
            },
            {
                root: null,
                rootMargin: '200px', // Start loading 200px before reaching bottom
                threshold: 0
            }
        );

        this.observer.observe(sentinel);
    },

    /**
     * Load more products (for infinite scroll)
     */
    async loadMoreProducts() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        this.currentPage++;

        const container = document.getElementById('products-grid');
        if (!container) return;

        // Show loading indicator
        container.insertAdjacentHTML('beforeend', this.createLoadingIndicator());

        try {
            const result = await this.fetchProducts(this.productsPerPage, this.currentPage);

            // Calculate start index for animation
            const existingCards = container.querySelectorAll('.product-card:not(.skeleton-card)').length;

            // Remove loader and render new products
            this.renderProducts(result.products, 'products-grid', true, existingCards);

            this.hasMore = result.hasMore;

            // If no more products, show end message and disconnect observer
            if (!this.hasMore) {
                container.insertAdjacentHTML('beforeend', this.createEndMessage());
                if (this.observer) {
                    this.observer.disconnect();
                }
            }

            console.log(`✅ Loaded ${result.products.length} more products (page ${this.currentPage})`);
        } catch (error) {
            console.error('Error loading more products:', error);
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Initialize homepage with products
     */
    async initHomePage() {
        try {
            // Reset state
            this.currentPage = 1;
            this.isLoading = true;
            this.hasMore = true;

            // Show skeleton loading
            this.showSkeletonLoading();

            // Inject CSS for animations
            this.injectStyles();

            // Fetch first page of products
            const result = await this.fetchProducts(this.productsPerPage, 1);

            // Render products
            this.renderProducts(result.products, 'products-grid');

            // Update state
            this.hasMore = result.hasMore;
            this.isLoading = false;

            // Hide loading overlay
            this.hideLoading();

            // Setup infinite scroll
            this.setupInfiniteScroll();

            // Setup image hover scrub
            this.setupImageScrub();

            console.log(`✅ Loaded ${result.products.length} products (page 1), hasMore: ${this.hasMore}`);
        } catch (error) {
            console.error('Error initializing homepage:', error);
            this.isLoading = false;
            this.hideLoading();
            this.showError('Ürünler yüklenemedi. Lütfen sayfayı yenileyin.');
        }
    },

    /**
     * Inject CSS styles for skeleton and animations
     */
    injectStyles() {
        if (document.getElementById('homeApiStyles')) return;

        const styles = document.createElement('style');
        styles.id = 'homeApiStyles';
        styles.textContent = `
            /* Skeleton Loading */
            .skeleton-card {
                background: var(--glass-bg, #f8f5f0);
                border-radius: var(--radius-lg, 12px);
                overflow: hidden;
                min-height: 380px;
            }

            .skeleton-image {
                height: 200px;
                background: linear-gradient(90deg, #e0ddd8 25%, #f0ede8 50%, #e0ddd8 75%);
                background-size: 200% 100%;
            }

            .skeleton-content {
                padding: 1rem;
            }

            .skeleton-title {
                height: 20px;
                width: 80%;
                margin-bottom: 0.75rem;
                border-radius: 4px;
                background: linear-gradient(90deg, #e0ddd8 25%, #f0ede8 50%, #e0ddd8 75%);
                background-size: 200% 100%;
            }

            .skeleton-text {
                height: 14px;
                width: 60%;
                margin-bottom: 0.5rem;
                border-radius: 4px;
                background: linear-gradient(90deg, #e0ddd8 25%, #f0ede8 50%, #e0ddd8 75%);
                background-size: 200% 100%;
            }

            .skeleton-price {
                height: 24px;
                width: 40%;
                margin-top: 1rem;
                border-radius: 4px;
                background: linear-gradient(90deg, #e0ddd8 25%, #f0ede8 50%, #e0ddd8 75%);
                background-size: 200% 100%;
            }

            .shimmer {
                animation: shimmer 1.5s infinite;
            }

            @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            /* Fade In Up Animation */
            .fade-in-up {
                opacity: 0;
                transform: translateY(20px);
                animation: fadeInUp 0.4s ease forwards;
            }

            @keyframes fadeInUp {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Infinite Scroll Loader */
            .infinite-scroll-loader {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                padding: 2rem;
                color: var(--warm-brown, #8b7355);
                font-size: 0.9rem;
                grid-column: 1 / -1;
            }

            .loader-spinner {
                width: 24px;
                height: 24px;
                border: 3px solid var(--cream-warm, #f0ede8);
                border-top-color: var(--aurora-green, #10b981);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* End Message */
            .infinite-scroll-end {
                text-align: center;
                padding: 2rem;
                color: var(--forest-medium, #4a6741);
                font-size: 1rem;
                grid-column: 1 / -1;
            }

            /* Toast Animations */
            @keyframes slideInUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutDown {
                from {
                    transform: translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateY(100%);
                    opacity: 0;
                }
            }

            /* Image Scrub / Hover Gallery */
            .product-image {
                position: relative;
                overflow: hidden;
            }

            .product-image.has-multiple-images {
                cursor: ew-resize;
            }

            .product-image img {
                transition: opacity 0.15s ease;
            }

            .image-indicators {
                position: absolute;
                bottom: 8px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 6px;
                z-index: 5;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .product-image:hover .image-indicators {
                opacity: 1;
            }

            .indicator-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                border: 1px solid rgba(0, 0, 0, 0.2);
                transition: all 0.15s ease;
            }

            .indicator-dot.active {
                background: white;
                transform: scale(1.2);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            }

            /* Image count badge */
            .product-image.has-multiple-images::after {
                content: attr(data-image-count);
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(0, 0, 0, 0.6);
                color: white;
                font-size: 0.7rem;
                padding: 2px 6px;
                border-radius: 10px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .product-image.has-multiple-images:hover::after {
                opacity: 1;
            }
        `;
        document.head.appendChild(styles);
    },

    /**
     * Setup image scrub functionality for product cards
     */
    setupImageScrub() {
        const container = document.getElementById('products-grid');
        if (!container || this._imageScrubBound) return;

        container.addEventListener('mousemove', (e) => {
            const imageContainer = e.target.closest('.product-image.has-multiple-images');
            if (!imageContainer) return;

            const images = JSON.parse(imageContainer.dataset.images || '[]');
            if (images.length <= 1) return;

            const rect = imageContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            const imageIndex = Math.min(Math.floor(percentage * images.length), images.length - 1);

            const currentIndex = parseInt(imageContainer.dataset.currentIndex || '0');

            if (imageIndex !== currentIndex) {
                const img = imageContainer.querySelector('img');
                if (img) {
                    img.src = images[imageIndex];
                    imageContainer.dataset.currentIndex = imageIndex;

                    // Update indicator dots
                    const dots = imageContainer.querySelectorAll('.indicator-dot');
                    dots.forEach((dot, i) => {
                        dot.classList.toggle('active', i === imageIndex);
                    });
                }
            }
        });

        // Reset to first image on mouse leave
        container.addEventListener('mouseleave', (e) => {
            const imageContainer = e.target.closest('.product-image.has-multiple-images');
            if (!imageContainer) return;

            const images = JSON.parse(imageContainer.dataset.images || '[]');
            if (images.length <= 1) return;

            const img = imageContainer.querySelector('img');
            if (img && images[0]) {
                img.src = images[0];
                imageContainer.dataset.currentIndex = '0';

                // Reset indicator dots
                const dots = imageContainer.querySelectorAll('.indicator-dot');
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === 0);
                });
            }
        }, true);

        this._imageScrubBound = true;
    },

    /**
     * Show skeleton loading state
     */
    showSkeletonLoading() {
        const container = document.getElementById('products-grid');
        if (container) {
            container.innerHTML = this.createSkeletonCards(this.productsPerPage);
        }
    },

    /**
     * Show loading indicator (legacy)
     */
    showLoading() {
        this.showSkeletonLoading();
    },

    /**
     * Hide loading indicator
     */
    hideLoading() {
        try {
            const overlay = document.getElementById('loadingScreen') || document.querySelector('.loading-screen');
            if (overlay) {
                overlay.classList.add('hidden');
                setTimeout(() => {
                    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 600);
            }
        } catch (_) { }
    },

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const container = document.getElementById('products-grid');
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">😔</div>
                    <h3>${message}</h3>
                </div>
            `;
        }
    }
};

// Prevent multiple rapid clicks on SAME product only
const addToCartDebounce = new Set();

/**
 * Add product to cart
 * @param {string} productId - Product ID
 */
async function addToCart(productId) {
    console.log('[addToCart] Starting - Product ID:', productId);

    // Prevent duplicate calls for SAME product while processing
    if (addToCartDebounce.has(productId)) {
        console.warn('[addToCart] Already processing this product, ignoring duplicate call');
        return;
    }

    // Find the button - get from closest product card
    const allButtons = document.querySelectorAll(`[data-action="add-to-cart"][data-product-id="${productId}"]`);
    const button = allButtons.length > 0 ? allButtons[0] : null;
    const originalText = button?.textContent || 'Sepete Ekle';

    try {
        // Mark as processing immediately
        addToCartDebounce.add(productId);

        // Check if cartManager exists
        if (!window.cartManager) {
            console.error('[addToCart] CartManager not found!');
            showToast('Sepet sistemi henüz yüklenmedi. Lütfen sayfayı yenileyin.', 'error');
            addToCartDebounce.delete(productId);
            return;
        }

        // Show loading state on button
        if (button) {
            button.disabled = true;
            button.textContent = '⏳';
            button.style.minWidth = button.offsetWidth + 'px'; // Prevent width change
        }

        // Fetch the product details
        const response = await fetch(`${HomeAPI.baseURL}/products/${productId}`);
        const data = await response.json();

        if (!data.success || !data.data) {
            throw new Error('Ürün bulunamadı');
        }

        const product = data.data;

        // Prepare product data
        const productData = {
            id: product.id,
            title: product.title,
            price: product.price,
            images: product.images || [],
            stock: product.stock || 0,
            store: product.store || null
        };

        // Use CartManager to add item
        const success = await window.cartManager.addItem(productId, productData, 1);

        if (success) {
            console.log('[addToCart] Successfully added to cart');

            // Show success state on button
            if (button) {
                button.textContent = '✓ Eklendi';
                button.style.background = '#10b981';
                button.style.color = 'white';
            }

            updateCartCount();

            // Show Siftah recommendation toast if available
            if (window.SiftahModule && typeof window.SiftahModule.loadForAddToCart === 'function') {
                window.SiftahModule.loadForAddToCart(productId);
            }

            // Show success toast
            showToast('Ürün sepete eklendi!', 'success');

            // Reset button after short delay
            setTimeout(() => {
                if (button) {
                    button.disabled = false;
                    button.textContent = originalText;
                    button.style.background = '';
                    button.style.color = '';
                    button.style.minWidth = '';
                }
                addToCartDebounce.delete(productId);
            }, 800); // Much shorter - just 0.8 seconds

        } else {
            throw new Error('Sepete eklenemedi');
        }
    } catch (error) {
        console.error('[addToCart] ERROR:', error);

        // Restore button state immediately on error
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
            button.style.background = '';
            button.style.color = '';
            button.style.minWidth = '';
        }

        // Remove from debounce set
        addToCartDebounce.delete(productId);

        // Show error toast instead of alert
        showToast('Ürün sepete eklenemedi: ' + error.message, 'error');
    }
}

/**
 * Show success feedback when adding to cart
 */
function showAddToCartSuccess(button, originalText) {
    if (button) {
        button.textContent = '✓ Added!';
        button.style.background = '#10b981';

        setTimeout(() => {
            button.disabled = false;
            button.textContent = originalText || 'Add to Cart';
            button.style.background = '';
        }, 2000);
    }

    // Show toast notification
    showToast('Product added to cart!', 'success');
}

/**
 * Update cart count in header
 */
async function updateCartCount() {
    const cartCountEl = document.querySelector('.cart-count');
    if (!cartCountEl) return;

    try {
        // Use CartManager to get accurate count
        const totalItems = await window.cartManager.getCartCount();

        cartCountEl.textContent = totalItems;

        // Animate the count
        cartCountEl.style.transform = 'scale(1.3)';
        setTimeout(() => {
            cartCountEl.style.transform = 'scale(1)';
        }, 200);
    } catch (error) {
        console.error('Error updating cart count:', error);
        cartCountEl.textContent = '0';
    }
}

window.updateCartCount = updateCartCount;

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
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
        animation: slideInUp 0.3s ease;
        font-family: Inter, sans-serif;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        HomeAPI.initHomePage();
    });
} else {
    HomeAPI.initHomePage();
}





