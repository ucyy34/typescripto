/**
 * Products Page API Integration
 * Connects products.html to backend API
 */

class ProductsPageAPI {
    constructor() {
        this.apiClient = new ApiClient();
        this.allProducts = [];
        this.filteredProducts = [];
        this.categories = [];
        this.currentView = 'grid';
        this.currentPage = 1;
        this.totalPages = 1;
        this.urlParams = new URLSearchParams(window.location.search);
        this.filters = {
            categories: [],
            priceRange: 1000,
            rating: '',
            search: '',
            sort: 'featured',
            storeId: this.urlParams.get('store') || null,
        };
        const initialSearch = this.urlParams.get('search');
        if (initialSearch) {
            this.filters.search = initialSearch.trim();
        }
        this.storeName = this.urlParams.get('storeName')
            ? decodeURIComponent(this.urlParams.get('storeName'))
            : null;

        console.log('[Products Page API] Initializing...');
        this.init();
    }

    async init() {
        try {
            // Load categories first
            await this.loadCategories();

            // Load products
            await this.loadProducts();

            // Setup event listeners
            this.setupEventListeners();

            console.log('[Products Page API] Initialization complete');
        } catch (error) {
            console.error('[Products Page API] Initialization error:', error);
            this.showError('Failed to initialize products page');
        }
    }

    async loadCategories() {
        try {
            console.log('[Products Page API] Loading categories...');
            const response = await this.apiClient.getTopLevelCategories();

            if (response.success && response.data) {
                this.categories = response.data;
                console.log('[Products Page API] Categories loaded:', this.categories.length);
                this.renderCategoryFilters();
            }
        } catch (error) {
            console.error('[Products Page API] Error loading categories:', error);
        }
    }

    async loadProducts() {
        try {
            console.log('[Products Page API] Loading products...');

            // Show loading state
            this.showLoading();

            // Build query parameters
            const params = {
                page: this.currentPage,
                limit: 20,
                sort: this.getSortParam()
            };

            if (this.filters.storeId) {
                params.store_id = this.filters.storeId;
                params.includeAllStatuses = false;
            }

            // Add category filter
            if (this.filters.categories.length > 0) {
                params.category_id = this.filters.categories[0]; // Backend expects single category for now
            }

            // Add price filter
            if (this.filters.priceRange < 1000) {
                params.max_price = this.filters.priceRange;
            }

            // Add search
            if (this.filters.search) {
                params.search = this.filters.search;
            }

            // Add rating filter (only approved products shown by default)
            // Backend returns only approved & active products by default

            const response = await this.apiClient.getProducts(params);

            if (response.success && response.data) {
                this.allProducts = response.data;
                this.filteredProducts = this.allProducts;

                // Update pagination
                if (response.pagination) {
                    if (Number.isFinite(response.pagination.page)) {
                        this.currentPage = response.pagination.page;
                    } else {
                        this.currentPage = 1;
                    }

                    if (Number.isFinite(response.pagination.totalPages)) {
                        this.totalPages = response.pagination.totalPages;
                    } else if (
                        Number.isFinite(response.pagination.total) &&
                        Number.isFinite(response.pagination.limit)
                    ) {
                        const total = Number(response.pagination.total);
                        const limit = Number(response.pagination.limit) || 20;
                        this.totalPages = Math.max(1, Math.ceil(total / limit));
                    } else {
                        this.totalPages = 1;
                    }
                }

                console.log('[Products Page API] Products loaded:', this.allProducts.length);

                this.renderProducts();
                this.updateResultsCount();
                this.updateStoreContext();
                this.syncSearchInput();
            } else {
                this.showError('No products found');
            }
        } catch (error) {
            console.error('[Products Page API] Error loading products:', error);
            this.showError('Failed to load products');
        } finally {
            this.hideLoading();
        }
    }

    getSortParam() {
        switch (this.filters.sort) {
            case 'price-low':
                return 'price';
            case 'price-high':
                return '-price';
            case 'rating':
                return '-rating';
            case 'newest':
                return '-created_at';
            case 'popular':
                return '-total_sales';
            case 'featured':
            default:
                return '-created_at'; // Default to newest
        }
    }

    renderCategoryFilters() {
        const container = document.getElementById('categoryFilters');
        if (!container) return;

        container.innerHTML = this.categories.map(category => `
            <label class="filter-option">
                <input type="checkbox"
                    value="${category.id}"
                    data-category="${category.slug}"
                    ${this.filters.categories.includes(category.id) ? 'checked' : ''}>
                <span>${category.icon || ''} ${category.name}</span>
            </label>
        `).join('');

        // Add event listeners
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.handleCategoryFilter());
        });
    }

    handleCategoryFilter() {
        const checkboxes = document.querySelectorAll('#categoryFilters input[type="checkbox"]:checked');
        this.filters.categories = Array.from(checkboxes).map(cb => cb.value);
        this.loadProducts();
    }

    syncSearchInput() {
        const searchInput = document.getElementById('globalSearch') || document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = this.filters.search || '';
        }
    }

    updateQueryParams() {
        const params = new URLSearchParams(window.location.search);

        if (this.filters.search) {
            params.set('search', this.filters.search);
        } else {
            params.delete('search');
        }

        if (this.filters.storeId) {
            params.set('store', this.filters.storeId);
            if (this.storeName) {
                params.set('storeName', this.storeName);
            }
        } else {
            params.delete('store');
            params.delete('storeName');
        }

        const queryString = params.toString();
        const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
        window.history.replaceState({}, '', nextUrl);
    }

    setupEventListeners() {
        // Sort dropdown
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.loadProducts();
            });
            if (this.filters.storeId) {
                sortSelect.value = 'newest';
            }
        }

        // Search (use globalSearch from header)
        const searchInput = document.getElementById('globalSearch') || document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            this.syncSearchInput();
            searchInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.search = value;
                    this.currentPage = 1;
                    this.updateQueryParams();
                    this.loadProducts();
                }, 400);
            });
        } else {
            this.syncSearchInput();
        }

        document.addEventListener('global-search:submit', (event) => {
            if (!event || !event.detail) return;
            event.preventDefault();
            this.filters.search = (event.detail.query || '').trim();
            this.currentPage = 1;
            this.updateQueryParams();
            this.syncSearchInput();
            this.loadProducts();
        });

        document.addEventListener('global-search:clear', () => {
            if (!this.filters.search) return;
            this.filters.search = '';
            this.currentPage = 1;
            this.updateQueryParams();
            this.syncSearchInput();
            this.loadProducts();
        });

        // Price range slider
        const priceRange = document.getElementById('priceRange');
        const priceValue = document.getElementById('priceValue');
        if (priceRange) {
            priceRange.addEventListener('input', (e) => {
                this.filters.priceRange = parseInt(e.target.value);
                if (priceValue) {
                    priceValue.textContent = `$${this.filters.priceRange}`;
                }
            });

            priceRange.addEventListener('change', () => {
                this.loadProducts();
            });
        }

        // View toggle
        const gridBtn = document.getElementById('gridView');
        const listBtn = document.getElementById('listView');

        if (gridBtn) {
            gridBtn.addEventListener('click', () => this.setView('grid'));
        }

        if (listBtn) {
            listBtn.addEventListener('click', () => this.setView('list'));
        }

        // Add to cart buttons (delegated event)
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-add-cart') || e.target.closest('.btn-add-cart')) {
                const btn = e.target.matches('.btn-add-cart') ? e.target : e.target.closest('.btn-add-cart');
                const productId = btn.dataset.productId;
                if (productId) {
                    this.addToCart(productId);
                }
            }
        });
    }

    renderProducts() {
        const container = document.getElementById('productsContainer');
        if (!container) {
            console.error('[Products Page API] Products container not found');
            return;
        }

        if (this.filteredProducts.length === 0) {
            container.innerHTML = `
                <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🏺</div>
                    <h3>No products found</h3>
                    <p>Try adjusting your filters or search terms</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        this.filteredProducts.forEach(product => {
            const productElement = this.createProductCard(product);
            fragment.appendChild(productElement);
        });

        container.appendChild(fragment);

        // Re-initialize Dostik bubbles if available
        if (window.dostikAI) {
            setTimeout(() => window.dostikAI.initializeProductBubbles(), 100);
        }
    }

    updateStoreContext() {
        if (!this.filters.storeId) return;

        const resultsInfo = document.getElementById('resultsCount');
        if (resultsInfo) {
            const storeLabel = this.storeName || (this.filteredProducts[0]?.store?.name ?? 'selected artisan');
            const count = this.filteredProducts.length;
            resultsInfo.textContent = `Showing ${count} treasures from ${storeLabel}`;
        }

        const pageTitle = document.querySelector('.page-title') || document.querySelector('.section-title h2');
        if (pageTitle && this.storeName) {
            pageTitle.textContent = `${this.storeName} Treasures`;
        }
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card fade-in';
        card.dataset.productId = product.id;

        // Get category name
        const category = this.categories.find(c => c.id === product.category_id);
        const categoryName = category ? category.name : '';
        const categoryIcon = category ? category.icon : '';

        // Product images
        const fallbackImage = 'https://via.placeholder.com/400x300?text=No+Image';
        const mainImage = product.primary_image
            || (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : fallbackImage);

        // Format price
        const price = parseFloat(product.price);
        const comparePrice = product.compare_price ? parseFloat(product.compare_price) : null;

        // Calculate discount
        const discount = comparePrice && comparePrice > price
            ? Math.round(((comparePrice - price) / comparePrice) * 100)
            : null;

        // Badges
        const badges = [];

        // Category badge
        if (categoryName) {
            badges.push(`<span class="badge category">${categoryIcon} ${categoryName}</span>`);
        }

        // Discount badge
        if (discount) {
            badges.push(`<span class="badge discount">-${discount}%</span>`);
        }

        // Product badges (handmade, eco-friendly, etc.)
        if (product.badges && Array.isArray(product.badges)) {
            product.badges
                .map(badge => (typeof badge === 'string' ? badge.trim() : badge))
                .filter(Boolean)
                .forEach(badge => {
                    const badgeLabels = {
                        'handmade': '✋ Handmade',
                        'limited': '⭐ Limited',
                        'eco-friendly': '🌱 Eco',
                        'spiritual': '🕉️ Spiritual',
                        'traditional': '🏛️ Traditional',
                        'artisan': '👨‍🎨 Artisan'
                    };
                    if (badgeLabels[badge]) {
                        badges.push(`<span class="badge ${badge}">${badgeLabels[badge]}</span>`);
                    }
                });
        }

        // Stock status
        const stockStatus = product.stock > 0
            ? (product.stock <= product.low_stock_threshold ? 'Low Stock' : 'In Stock')
            : 'Out of Stock';
        const stockClass = product.stock > 0
            ? (product.stock <= product.low_stock_threshold ? 'low-stock' : 'in-stock')
            : 'out-of-stock';

        // Store information (if available)
        const storeName = product.store ? product.store.name : 'Nordic Artisan';

        card.innerHTML = `
            <div class="journey-indicator"></div>
            <div class="product-image">
                <img src="${mainImage}" alt="${product.title}" loading="lazy">
                <span class="stock-badge ${stockClass}">${stockStatus}</span>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-artisan">by ${storeName}</p>
                <p class="product-description">${product.short_description || product.description?.substring(0, 100) + '...' || ''}</p>
                <div class="social-proof">
                    <span class="rating-stars">${'★'.repeat(Math.floor(product.rating || 0))}${'☆'.repeat(5 - Math.floor(product.rating || 0))}</span>
                    <span class="rating-value">${Number(product.rating || 0).toFixed(1)}</span>
                    <span class="purchases-count">${product.total_sales || 0} sold</span>
                </div>
                <div class="product-badges">
                    ${badges.join('')}
                </div>
                <div class="product-price">
                    <span class="price-current">$${price.toFixed(2)}</span>
                    ${comparePrice ? `<span class="price-original">$${comparePrice.toFixed(2)}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="btn btn-card btn-add-cart" data-product-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>
                        ${product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button class="btn btn-card btn-wishlist" data-product-id="${product.id}">
                        <span class="heart-icon">♡</span>
                    </button>
                </div>
            </div>
        `;

        // Click to view details
        card.addEventListener('click', (e) => {
            // Don't navigate if clicking on buttons
            if (!e.target.closest('button')) {
                window.location.href = `product-detail.html?id=${product.id}`;
            }
        });

        return card;
    }

    async addToCart(productId) {
        try {
            console.log('[Products Page API] Adding to cart:', productId);

            // Find product
            const product = this.allProducts.find(p => p.id === productId);
            if (!product) {
                alert('Product not found');
                return;
            }

            // Check stock
            if (product.stock <= 0) {
                alert('This product is out of stock');
                return;
            }

            // Try to add to backend cart if user is logged in
            if (AuthManager.isLoggedIn()) {
                const response = await this.apiClient.post('/cart/items', {
                    product_id: productId,
                    quantity: 1
                });

                if (response.success) {
                    this.showSuccessMessage('Product added to cart!');
                    // Update cart count if available
                    if (window.updateCartCount) {
                        window.updateCartCount();
                    }
                } else {
                    // Fallback to localStorage
                    this.addToLocalCart(product);
                }
            } else {
                // User not logged in, use localStorage
                this.addToLocalCart(product);
            }
        } catch (error) {
            console.error('[Products Page API] Error adding to cart:', error);
            this.showError('Failed to add product to cart');
        }
    }

    addToLocalCart(product) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];

        // Check if product already in cart
        const existingItem = cart.find(item => item.product_id === product.id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                product_id: product.id,
                product: product,
                quantity: 1,
                price: parseFloat(product.price)
            });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        this.showSuccessMessage('Product added to cart!');

        // Update cart count if available
        if (window.updateCartCount) {
            window.updateCartCount();
        }
    }

    setView(view) {
        this.currentView = view;
        const container = document.querySelector('.products-content');
        const gridBtn = document.getElementById('gridView');
        const listBtn = document.getElementById('listView');

        if (!container) return;

        if (view === 'grid') {
            container.className = 'products-content products-grid-view';
            if (gridBtn) gridBtn.classList.add('active');
            if (listBtn) listBtn.classList.remove('active');
        } else {
            container.className = 'products-content products-list-view';
            if (listBtn) listBtn.classList.add('active');
            if (gridBtn) gridBtn.classList.remove('active');
        }
    }

    updateResultsCount() {
        const count = this.filteredProducts.length;
        const resultsElement = document.getElementById('resultsCount');

        if (resultsElement) {
            resultsElement.textContent = `Showing ${count} product${count !== 1 ? 's' : ''}`;
        }
    }

    showLoading() {
        const container = document.getElementById('productsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <div class="spinner" style="margin: 0 auto 1rem;"></div>
                    <p>Loading products...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be replaced by products
    }

    showError(message) {
        const container = document.getElementById('productsContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #dc2626;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
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
        window.productsPageAPI = new ProductsPageAPI();
    });
} else {
    window.productsPageAPI = new ProductsPageAPI();
}
