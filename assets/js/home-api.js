/**
 * Home Page API Integration
 * Fetches and displays products from the backend API
 */

const HomeAPI = {
    baseURL: (typeof API_CONFIG !== 'undefined' && API_CONFIG.BASE_URL) ? API_CONFIG.BASE_URL : 'http://localhost:5050/api/v1',
    currentPage: 1,

    /**
     * Fetch approved products from the API
     * @param {number} limit - Number of products to fetch
     * @param {number} page - Page number for pagination
     * @returns {Promise<Array>} Array of product objects
     */
    async fetchProducts(limit = 8, page = null) {
        try {
            // Use provided page or increment current page
            const pageNum = page !== null ? page : this.currentPage;

            const response = await fetch(`${this.baseURL}/products?status=approved&is_active=true&limit=${limit}&page=${pageNum}`);
            const data = await response.json();

            if (data.success) {
                // Only increment currentPage if we didn't specify a page
                if (page === null) {
                    this.currentPage++;
                }
                return data.data;
            } else {
                console.error('Failed to fetch products:', data.message);
                return [];
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
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
     * Create product card HTML
     * @param {Object} product - Product object
     * @returns {string} HTML string for product card
     */
    createProductCard(product) {
        const imageUrl = product.images && product.images.length > 0
            ? product.images[0]
            : 'assets/images/placeholder-product.jpg';

        const storeName = product.store?.name || 'Unknown Store';

        const badgeLabels = {
            'handmade': '🖐️ Handmade',
            'limited': '⭐ Limited',
            'eco-friendly': '🌿 Eco-Friendly',
            'spiritual': '🔮 Spiritual',
            'traditional': '🏛️ Traditional',
            'artisan': '🎨 Artisan'
        };

        const badges = Array.isArray(product.badges)
            ? product.badges
                .map(badge => badgeLabels[badge] ? `<span class="badge ${badge}">${badgeLabels[badge]}</span>` : '')
                .filter(Boolean)
                .join('')
            : '';

        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.title}" loading="lazy">
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
     * Create star rating HTML
     * @param {number} rating - Rating value (0-5)
     * @returns {string} HTML string for star rating
     */
    createStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    },

    /**
     * Render products to a container
     * @param {Array} products - Array of product objects
     * @param {string} containerId - ID of the container element
     */
    renderProducts(products, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container #${containerId} not found`);
            return;
        }

        if (products.length === 0) {
            container.innerHTML = '<p class="no-products">No products available at the moment.</p>';
            return;
        }

        const productsHTML = products.map(product => this.createProductCard(product)).join('');
        container.innerHTML = productsHTML;

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

        if (window.wishlistManager) {
            window.wishlistManager
                .getWishlist()
                .then(() => window.dostanApp?.refreshWishlistButtons())
                .catch(() => window.dostanApp?.refreshWishlistButtons());
        } else {
            window.dostanApp?.refreshWishlistButtons();
        }
    },

    /**
     * Initialize homepage with products
     */
    async initHomePage() {
        try {
            // Show loading state
            this.showLoading();

            // Reset pagination
            this.currentPage = 1;

            // Fetch first page of products
            const products = await this.fetchProducts(8, 1);

            // Render products
            this.renderProducts(products, 'products-grid');

            // Hide loading state
            this.hideLoading();

            console.log(`✅ Loaded ${products.length} products (page 1)`);
        } catch (error) {
            console.error('Error initializing homepage:', error);
            this.hideLoading();
            this.showError('Failed to load products. Please try again later.');
        }
    },

    /**
     * Show loading indicator
     */
    showLoading() {
        const container = document.getElementById('products-grid');
        if (container) {
            container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading products...</div>';
        }
    },

    /**
     * Hide loading indicator
     */
    hideLoading() {
        // Hide page-level loading overlay if present
        try {
            const overlay = document.getElementById('loadingScreen') || document.querySelector('.loading-screen');
            if (overlay) {
                overlay.classList.add('hidden');
                // Remove from DOM after transition
                setTimeout(() => {
                    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 600);
            }
        } catch (_) {}
    },

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const container = document.getElementById('products-grid');
        if (container) {
            container.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${message}</div>`;
        }
    }
};

// Prevent multiple rapid clicks
const addToCartDebounce = new Set();

/**
 * Add product to cart
 * @param {string} productId - Product ID
 */
async function addToCart(productId) {
    console.log('[addToCart] Starting - Product ID:', productId);

    // Prevent duplicate calls while processing
    if (addToCartDebounce.has(productId)) {
        console.warn('[addToCart] Already processing this product, ignoring duplicate call');
        return;
    }

    try {
        // Mark as processing
        addToCartDebounce.add(productId);

        // Check if cartManager exists
        if (!window.cartManager) {
            console.error('[addToCart] CartManager not found!');
            alert('Sepet sistemi henüz yüklenmedi. Lütfen sayfayı yenileyin.');
            addToCartDebounce.delete(productId);
            return;
        }

        // Get the button that was clicked
        const button = event?.target;
        const originalText = button?.textContent;

        console.log('[addToCart] Button:', button, 'Original text:', originalText);

        // Show loading state
        if (button) {
            button.disabled = true;
            button.textContent = 'Ekleniyor...';
        }

        // First, fetch the product details
        console.log('[addToCart] Fetching product details from:', `${HomeAPI.baseURL}/products/${productId}`);
        const response = await fetch(`${HomeAPI.baseURL}/products/${productId}`);
        const data = await response.json();

        console.log('[addToCart] Product fetch response:', data);

        if (!data.success || !data.data) {
            throw new Error('Ürün bulunamadı');
        }

        const product = data.data;

        // Ensure product has all required fields
        const productData = {
            id: product.id,
            title: product.title,
            price: product.price,
            images: product.images || [],
            stock: product.stock || 0,
            store: product.store || null
        };

        console.log('[addToCart] Prepared product data:', productData);
        console.log('[addToCart] Calling cartManager.addItem...');

        // Use CartManager to add item
        const success = await window.cartManager.addItem(productId, productData, 1);

        console.log('[addToCart] CartManager.addItem result:', success);

        if (success) {
            console.log('[addToCart] Successfully added to cart');
            showAddToCartSuccess(button, originalText);
            updateCartCount();
        } else {
            throw new Error('Sepete eklenemedi');
        }
    } catch (error) {
        console.error('[addToCart] ERROR:', error);
        console.error('[addToCart] Error stack:', error.stack);

        // Restore button state
        const button = event?.target;
        if (button) {
            button.disabled = false;
            button.textContent = 'Sepete Ekle';
        }

        // Show error message
        alert('Ürün sepete eklenemedi: ' + error.message);
    } finally {
        // Remove from processing set after button is re-enabled (2.5s total)
        setTimeout(() => {
            addToCartDebounce.delete(productId);
        }, 2500);
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





/**

 * Add product to cart

 * @param {string} productId - Product ID

 */

async function addToCart(productId) {

    console.log('Adding product to cart:', productId);



    try {

        // Get the button that was clicked

        const button = event?.target;

        const originalText = button?.textContent;



        // Show loading state

        if (button) {

            button.disabled = true;

            button.textContent = 'Adding...';

        }



        // First, fetch the product details

        const response = await fetch(`${HomeAPI.baseURL}/products/${productId}`);

        const data = await response.json();



        if (!data.success || !data.data) {

            throw new Error('Product not found');

        }



        const product = data.data;



        const success = await window.cartManager.addItem(productId, product, 1);

        if (!success) {
            throw new Error('Failed to add to cart');
        }

        showAddToCartSuccess(button, originalText);
        await window.updateCartCount?.();

    } catch (error) {

        console.error('Error adding to cart:', error);



        // Restore button state

        if (button) {

            button.disabled = false;

            button.textContent = originalText || 'Add to Cart';

        }



        // Show error message

        alert('Failed to add product to cart. Please try again.');

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



