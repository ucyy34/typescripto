/**
 * Category Page API Integration
 * Dynamically loads category metadata and products from the backend API.
 */

class CategoryPageAPI {
    constructor(options = {}) {
        this.apiClient = new ApiClient();
        this.slug = options.slug || document.body.dataset.categorySlug || null;
        this.limit = options.limit || 12;
        this.currentPage = 1;
        this.totalPages = 1;
        this.hasNextPage = false;
        this.category = null;
        this.products = [];
        this.filteredProducts = [];
        this.totalProducts = null;
        this.storeCount = null;
        this.loading = false;
        this.searchTerm = '';
        this.priceRangeMax = null;
        this.priceRangeDefault = null;
        this.filters = {
            maxPrice: null,
            inStock: false,
            discounted: false,
            rating: null,
            badges: new Set(),
        };
        this.sort = options.defaultSort || '-created_at';

        this.elements = {
            productsContainer: document.getElementById(options.productsContainerId || 'categoryProducts'),
            loadMoreButton: document.getElementById(options.loadMoreButtonId || 'loadMoreCategory'),
            resultsInfo: document.getElementById(options.resultsInfoId || 'categoryResultsInfo'),
            sortSelect: document.getElementById(options.sortSelectId || 'categorySort'),
            priceRange: document.getElementById(options.priceRangeId || 'priceRange'),
            priceValue: document.getElementById(options.priceValueId || 'priceValue'),
            filters: document.querySelectorAll('[data-category-filter]'),
            clearFilters: document.getElementById(options.clearFiltersId || 'clearFilters'),
            heroTitle: document.getElementById(options.heroTitleId || 'categoryHeroTitle'),
            heroSubtitle: document.getElementById(options.heroSubtitleId || 'categoryHeroSubtitle'),
            heroStats: document.getElementById(options.heroStatsId || 'categoryHeroStats'),
            breadcrumbs: document.getElementById(options.breadcrumbsId || 'categoryBreadcrumbs'),
            searchInput:
                document.querySelector(options.searchSelector || '[data-category-search]') ||
                document.getElementById('globalSearch'),
        };

        if (this.elements.priceRange) {
            this.priceRangeDefault = Number(this.elements.priceRange.value) || null;
            this.priceRangeMax = Number(this.elements.priceRange.max) || this.priceRangeDefault;
        }

        this.init();
    }

    async init() {
        if (!this.slug) {
            console.error('[Category Page API] Missing category slug');
            this.showError('Category not found');
            return;
        }

        try {
            await this.loadCategory();
            await this.loadProducts(true);
            this.setupEventListeners();
        } catch (error) {
            console.error('[Category Page API] Initialization failed:', error);
            this.showError('Unable to load category products.');
        }
    }

    async loadCategory() {
        try {
            const response = await this.apiClient.getCategoryBySlug(this.slug);
            if (response.success && response.data) {
                this.category = response.data;
            }
        } catch (error) {
            console.warn('[Category Page API] Failed to fetch category by slug, attempting fallback', error);
        }

        if (!this.category) {
            try {
                const fallback = await this.apiClient.getCategories();
                if (fallback.success && Array.isArray(fallback.data)) {
                    this.category = this.findCategoryInTree(fallback.data, this.slug);
                }
            } catch (error) {
                console.error('[Category Page API] Fallback category lookup failed:', error);
            }
        }

        if (!this.category) {
            throw new Error('Category not found');
        }

        this.updateHero();
    }

    findCategoryInTree(categories, slug) {
        for (const category of categories) {
            if (category.slug === slug || category.slug === encodeURIComponent(slug)) {
                return category;
            }

            if (Array.isArray(category.children) && category.children.length > 0) {
                const childMatch = this.findCategoryInTree(category.children, slug);
                if (childMatch) return childMatch;
            }
        }
        return null;
    }

    async loadProducts(reset = false) {
        if (!this.category || this.loading) return;

        this.loading = true;

        if (reset) {
            this.currentPage = 1;
            this.products = [];
            this.filteredProducts = [];
            this.totalProducts = null;
            this.storeCount = null;
            this.renderLoadingState();
        }

        const params = {
            category_id: this.category.id,
            page: this.currentPage,
            limit: this.limit,
            sort: this.sort,
        };

        if (this.filters.inStock) {
            params.in_stock = true;
        }

        if (this.filters.maxPrice) {
            params.max_price = this.filters.maxPrice;
        }

        if (this.searchTerm) {
            params.search = this.searchTerm;
        }

        try {
            const response = await this.apiClient.getProducts(params);
            if (response.success && Array.isArray(response.data)) {
                if (reset) {
                    this.products = response.data;
                } else {
                    this.products = this.products.concat(response.data);
                }

                if (response.pagination) {
                    this.currentPage = response.pagination.page;
                    this.totalPages = response.pagination.totalPages || 1;
                    this.hasNextPage = Boolean(response.pagination.hasNext);
                    this.totalProducts =
                        typeof response.pagination.total === 'number'
                            ? response.pagination.total
                            : this.products.length;
                } else {
                    this.hasNextPage = false;
                    this.totalProducts = this.products.length;
                }

                if (response.meta && typeof response.meta.storeCount === 'number') {
                    this.storeCount = response.meta.storeCount;
                }

                this.applyFilters();
            } else if (reset) {
                this.showError('No products found in this category.');
            }
        } catch (error) {
            console.error('[Category Page API] Failed to load products:', error);
            if (reset) {
                this.showError('Unable to load products for this category.');
            }
        } finally {
            this.toggleLoadMore();
            this.loading = false;
        }
    }

    applyFilters() {
        let items = [...this.products];

        if (this.filters.discounted) {
            items = items.filter((product) => {
                const price = Number(product.price || 0);
                const comparePrice = Number(product.compare_price || 0);
                return comparePrice > price;
            });
        }

        if (this.filters.rating) {
            items = items.filter((product) => Number(product.rating || 0) >= this.filters.rating);
        }

        if (this.filters.badges.size > 0) {
            items = items.filter((product) => {
                if (!Array.isArray(product.badges) || product.badges.length === 0) return false;
                return Array.from(this.filters.badges).every((badge) => product.badges.includes(badge));
            });
        }

        this.filteredProducts = items;
        this.renderProducts();
        this.updateResultsInfo();
        this.updateHeroStats();
    }

    renderLoadingState() {
        if (!this.elements.productsContainer) return;
        const skeletons = Array.from({ length: 3 })
            .map(
                () => `
                <div class="product-card skeleton">
                    <div class="product-image"></div>
                    <div class="product-info">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
            `
            )
            .join('');
        this.elements.productsContainer.innerHTML = skeletons;
    }

    renderProducts() {
        const container = this.elements.productsContainer;
        if (!container) return;

        if (this.filteredProducts.length === 0) {
            container.innerHTML = `
                <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🧺</div>
                    <h3>No products found</h3>
                    <p>Try adjusting your filters or search terms.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        this.filteredProducts.forEach((product) => {
            container.appendChild(this.createProductCard(product));
        });

        if (window.dostikAI) {
            setTimeout(() => window.dostikAI.initializeProductBubbles(), 100);
        }
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card fade-in';
        card.dataset.productId = product.id;

        const mainImage = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : 'https://via.placeholder.com/400x300?text=No+Image';

        const price = Number(product.price || 0);
        const comparePrice = product.compare_price ? Number(product.compare_price) : null;
        const discount = comparePrice && comparePrice > price
            ? Math.round(((comparePrice - price) / comparePrice) * 100)
            : null;

        const stockStatus = product.stock > 0
            ? (product.stock <= product.low_stock_threshold ? `Only ${product.stock} left` : 'In Stock')
            : 'Out of Stock';
        const stockClass = product.stock > 0
            ? (product.stock <= product.low_stock_threshold ? 'low-stock' : 'in-stock')
            : 'out-of-stock';

        const badges = [];
        if (this.category?.name) {
            badges.push(`<span class="badge category">${this.category.icon || '🏷️'} ${this.category.name}</span>`);
        }
        if (discount) {
            badges.push(`<span class="badge discount">-${discount}%</span>`);
        }
        if (Array.isArray(product.badges)) {
            const badgeLabels = {
                handmade: '✋ Handmade',
                limited: '⭐ Limited',
                'eco-friendly': '🌱 Eco',
                spiritual: '🕉️ Spiritual',
                traditional: '🏛️ Traditional',
                artisan: '👨‍🎨 Artisan',
            };
            product.badges.forEach((badge) => {
                if (badgeLabels[badge]) {
                    badges.push(`<span class="badge ${badge}">${badgeLabels[badge]}</span>`);
                }
            });
        }

        const storeName = product.store?.name || 'Nordic Artisan';
        const productDetailUrl = product.slug
            ? `product-detail.html?slug=${encodeURIComponent(product.slug)}`
            : `product-detail.html?id=${encodeURIComponent(product.id)}`;

        card.innerHTML = `
            <div class="journey-indicator"></div>
            <div class="product-image">
                <img src="${mainImage}" alt="${product.title}" loading="lazy">
                <span class="stock-badge ${stockClass}">${stockStatus}</span>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-artisan">by ${storeName}</p>
                <p class="product-description">${
                    product.short_description ||
                    (product.description ? `${product.description.substring(0, 100)}...` : '')
                }</p>
                <div class="social-proof">
                    <span class="rating-stars">${'★'.repeat(Math.floor(product.rating || 0))}${'☆'.repeat(5 - Math.floor(product.rating || 0))}</span>
                    <span class="rating-value">${Number(product.rating || 0).toFixed(1)}</span>
                    <span class="purchases-count">${product.total_sales || 0} sold</span>
                </div>
                <div class="product-badges">${badges.join('')}</div>
                <div class="product-price">
                    <span class="price-current">$${price.toFixed(2)}</span>
                    ${comparePrice ? `<span class="price-compare">$${comparePrice.toFixed(2)}</span>` : ''}
                </div>
                <div class="product-actions">
                    <a class="btn btn-outline" href="${productDetailUrl}">View Details</a>
                    <button class="btn btn-primary btn-add-cart" data-product-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        `;

        return card;
    }

    updateResultsInfo() {
        if (!this.elements.resultsInfo) return;

        const total = Number.isFinite(this.totalProducts) ? this.totalProducts : this.products.length;
        const filtered = this.filteredProducts.length;
        this.elements.resultsInfo.textContent = `${filtered} of ${total} handcrafted treasures`;
    }

    toggleLoadMore() {
        if (!this.elements.loadMoreButton) return;

        if (this.hasNextPage) {
            this.elements.loadMoreButton.disabled = false;
            this.elements.loadMoreButton.textContent = 'Load more products';
            this.elements.loadMoreButton.classList.remove('is-hidden');
        } else {
            this.elements.loadMoreButton.disabled = true;
            this.elements.loadMoreButton.textContent = 'No more products';
            this.elements.loadMoreButton.classList.add('is-hidden');
        }
    }

    updateHero() {
        if (!this.category) return;

        if (this.elements.heroTitle) {
            this.elements.heroTitle.textContent = this.category.name;
        }

        if (this.elements.heroSubtitle && this.category.description) {
            this.elements.heroSubtitle.textContent = this.category.description;
        }

        if (this.elements.breadcrumbs) {
            this.elements.breadcrumbs.textContent = this.category.name;
        }
    }

    updateHeroStats() {
        if (!this.elements.heroStats) return;

        const totalProducts = Number.isFinite(this.totalProducts) ? this.totalProducts : this.products.length;
        const fallbackStoreCount = new Set(
            this.products
                .map((product) => product.store?.id || product.store?.name)
                .filter((identifier) => typeof identifier === 'string' && identifier.trim().length > 0)
        ).size;
        const storeCount = Number.isFinite(this.storeCount) ? this.storeCount : fallbackStoreCount;
        const averageRating = this.filteredProducts.length
            ? (
                  this.filteredProducts.reduce((sum, product) => sum + Number(product.rating || 0), 0) /
                  this.filteredProducts.length
              ).toFixed(1)
            : '—';

        this.elements.heroStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-number">${Number.isFinite(totalProducts) ? totalProducts : '—'}</span>
                <span class="stat-label">Live Products</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${Number.isFinite(storeCount) ? storeCount : '—'}</span>
                <span class="stat-label">Artisan Stores</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${averageRating}</span>
                <span class="stat-label">Avg. Rating</span>
            </div>
        `;
    }

    setupEventListeners() {
        if (this.elements.loadMoreButton) {
            this.elements.loadMoreButton.addEventListener('click', () => {
                if (this.hasNextPage) {
                    this.currentPage += 1;
                    this.loadProducts();
                }
            });
        }

        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', (event) => {
                this.sort = event.target.value;
                this.loadProducts(true);
            });
        }

        if (this.elements.priceRange) {
            this.elements.priceRange.addEventListener('input', (event) => {
                const value = Number(event.target.value);
                this.filters.maxPrice = value;
                if (this.elements.priceValue) {
                    this.elements.priceValue.textContent = `$${value}`;
                }
            });

            this.elements.priceRange.addEventListener('change', () => {
                this.loadProducts(true);
            });
        }

        if (this.elements.filters && this.elements.filters.length > 0) {
            this.elements.filters.forEach((input) => {
                input.addEventListener('change', () => this.handleFilterChange(input));
            });
        }

        if (this.elements.clearFilters) {
            this.elements.clearFilters.addEventListener('click', () => this.resetFilters());
        }

        if (this.elements.searchInput) {
            let searchTimeout;
            this.elements.searchInput.addEventListener('input', (event) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchTerm = event.target.value.trim().toLowerCase();
                    this.loadProducts(true);
                }, 400);
            });
        }
    }

    handleFilterChange(input) {
        const filterType = input.dataset.categoryFilter;
        const value = input.value;

        switch (filterType) {
            case 'availability':
                if (value === 'in-stock') {
                    this.filters.inStock = input.checked;
                    this.loadProducts(true);
                    return;
                }
                if (value === 'discounted') {
                    this.filters.discounted = input.checked;
                    this.applyFilters();
                    return;
                }
                break;
            case 'badge':
                if (input.checked) {
                    this.filters.badges.add(value);
                } else {
                    this.filters.badges.delete(value);
                }
                this.applyFilters();
                return;
            case 'rating':
                if (input.type === 'radio') {
                    this.filters.rating = value === 'all' ? null : Number(value);
                } else {
                    this.filters.rating = input.checked ? Number(value) : null;
                }
                this.applyFilters();
                return;
            default:
                break;
        }

        this.loadProducts(true);
    }

    resetFilters() {
        this.filters = {
            maxPrice: null,
            inStock: false,
            discounted: false,
            rating: null,
            badges: new Set(),
        };

        if (this.elements.filters && this.elements.filters.length > 0) {
            this.elements.filters.forEach((input) => {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    if (input.dataset.categoryFilter === 'rating' && input.value === 'all') {
                        input.checked = true;
                    } else {
                        input.checked = false;
                    }
                }
            });
        }

        if (this.elements.priceRange) {
            const targetValue = this.priceRangeMax || this.priceRangeDefault || this.elements.priceRange.max;
            this.elements.priceRange.value = targetValue;
            if (this.elements.priceValue) {
                this.elements.priceValue.textContent = `$${targetValue}`;
            }
        }

        this.loadProducts(true);
    }

    showError(message) {
        if (!this.elements.productsContainer) return;
        this.elements.productsContainer.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3>${message}</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

window.CategoryPageAPI = CategoryPageAPI;
