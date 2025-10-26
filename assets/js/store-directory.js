/**
 * Store Directory API Integration
 * Powers the artisan/stores listing page with live data from the backend.
 */

class StoreDirectory {
    constructor(options = {}) {
        this.apiClient = new ApiClient();
        this.limit = options.limit || 12;
        this.currentPage = 1;
        this.totalPages = 1;
        this.hasNextPage = false;
        this.stores = [];
        this.loading = false;
        this.sort = options.defaultSort || '-rating';
        this.filters = {
            status: 'approved',
            is_featured: null,
        };
        this.searchTerm = '';

        this.elements = {
            grid: document.getElementById(options.gridId || 'artisanGrid'),
            filterButtons: document.querySelectorAll(options.filterButtonSelector || '[data-store-filter]'),
            loadMore: document.getElementById(options.loadMoreId || 'loadMoreStores'),
            searchInput:
                document.querySelector(options.searchSelector || '[data-store-search]') ||
                document.getElementById('globalSearch'),
            featuredSection: document.getElementById(options.featuredSectionId || 'featuredStore'),
            featuredName: document.getElementById(options.featuredNameId || 'featuredStoreName'),
            featuredTagline: document.getElementById(options.featuredTaglineId || 'featuredStoreTagline'),
            featuredDescription: document.getElementById(options.featuredDescriptionId || 'featuredStoreDescription'),
            featuredStats: document.getElementById(options.featuredStatsId || 'featuredStoreStats'),
            storeCount: document.getElementById(options.storeCountId || 'storeCount'),
        };

        this.init();
    }

    async init() {
        try {
            await this.loadStores(true);
            this.setupEventListeners();
        } catch (error) {
            console.error('[Store Directory] Initialization failed:', error);
            this.showError('Unable to load stores at the moment.');
        }
    }

    async loadStores(reset = false) {
        if (this.loading) return;
        this.loading = true;

        if (reset) {
            this.currentPage = 1;
            this.stores = [];
            this.renderLoadingState();
        }

        const params = {
            page: this.currentPage,
            limit: this.limit,
            sort: this.sort,
            status: this.filters.status,
        };

        if (this.filters.is_featured !== null) {
            params.is_featured = this.filters.is_featured;
        }

        if (this.searchTerm) {
            params.search = this.searchTerm;
        }

        try {
            const response = await this.apiClient.getStores(params);
            if (response.success && Array.isArray(response.data)) {
                if (reset) {
                    this.stores = response.data;
                } else {
                    this.stores = this.stores.concat(response.data);
                }

                if (response.pagination) {
                    this.currentPage = response.pagination.page;
                    this.totalPages = response.pagination.totalPages || 1;
                    this.hasNextPage = Boolean(response.pagination.hasNext);
                } else {
                    this.hasNextPage = false;
                }

                this.renderStores();
                this.renderFeaturedStore();
                this.updateStoreCount();
            } else if (reset) {
                this.showError('No stores found.');
            }
        } catch (error) {
            console.error('[Store Directory] Failed to load stores:', error);
            if (reset) {
                this.showError('Unable to load stores at the moment.');
            }
        } finally {
            this.toggleLoadMore();
            this.loading = false;
        }
    }

    renderLoadingState() {
        if (!this.elements.grid) return;
        const placeholders = Array.from({ length: 3 })
            .map(
                () => `
                <div class="artisan-card skeleton">
                    <div class="artisan-image"></div>
                    <div class="artisan-info">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
            `
            )
            .join('');
        this.elements.grid.innerHTML = placeholders;
    }

    renderStores() {
        const container = this.elements.grid;
        if (!container) return;

        if (this.stores.length === 0) {
            container.innerHTML = `
                <div class="no-stores" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🏪</div>
                    <h3>No artisan stores available</h3>
                    <p>Try adjusting your filters or check back soon.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        this.stores.forEach((store) => container.appendChild(this.createStoreCard(store)));
    }

    renderFeaturedStore() {
        if (!this.elements.featuredSection || this.stores.length === 0) return;

        const featured = this.stores[0];
        if (this.elements.featuredName) {
            this.elements.featuredName.textContent = featured.name;
        }
        if (this.elements.featuredTagline) {
            this.elements.featuredTagline.textContent = featured.city
                ? `${featured.city}, ${featured.country || 'Turkey'}`
                : featured.country || 'Turkey';
        }
        if (this.elements.featuredDescription) {
            this.elements.featuredDescription.textContent =
                featured.description || 'Our artisans blend tradition with innovation to craft unforgettable pieces.';
        }
        if (this.elements.featuredStats) {
            this.elements.featuredStats.innerHTML = `
                <div class="stat">
                    <span class="stat-number">${Number(featured.rating || 0).toFixed(1)}</span>
                    <span class="stat-label">Rating</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${featured.total_sales || 0}</span>
                    <span class="stat-label">Sales</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${featured.total_reviews || 0}</span>
                    <span class="stat-label">Reviews</span>
                </div>
            `;
        }

        this.elements.featuredSection.classList.remove('is-hidden');
    }

    updateStoreCount() {
        if (!this.elements.storeCount) return;
        this.elements.storeCount.textContent = `${this.stores.length} artisan stores found`;
    }

    createStoreCard(store) {
        const card = document.createElement('div');
        card.className = 'artisan-card';
        card.dataset.storeId = store.id;

        const badge = store.is_featured ? '<div class="artisan-badge">🌟 Featured</div>' : '';
        const rating = Number(store.rating || 0).toFixed(1);
        const totalSales = store.total_sales || 0;
        const totalReviews = store.total_reviews || 0;
        const description = store.description
            ? `${store.description.substring(0, 180)}${store.description.length > 180 ? '…' : ''}`
            : 'Handcrafted goods from master artisans across Anatolia.';
        const location = store.city ? `${store.city}, ${store.country || 'Turkey'}` : store.country || 'Turkey';

        card.innerHTML = `
            <div class="artisan-image">
                <div class="store-logo-placeholder">${store.name?.charAt(0) || '🛍️'}</div>
                ${badge}
            </div>
            <div class="artisan-info">
                <h3 class="artisan-name">${store.name}</h3>
                <p class="artisan-specialty">${location}</p>
                <div class="artisan-stats">
                    <div class="stat">
                        <span class="stat-number">${rating}</span>
                        <span class="stat-label">Rating</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${totalSales}</span>
                        <span class="stat-label">Sales</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${totalReviews}</span>
                        <span class="stat-label">Reviews</span>
                    </div>
                </div>
                <p class="artisan-description">${description}</p>
                <div class="artisan-actions">
                    <a class="btn btn-primary" href="products.html?store=${encodeURIComponent(store.id)}">View Products</a>
                    <button class="btn btn-secondary" data-store-slug="${store.slug || ''}">Contact</button>
                </div>
            </div>
        `;

        return card;
    }

    setupEventListeners() {
        if (this.elements.filterButtons) {
            this.elements.filterButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    this.elements.filterButtons.forEach((btn) => btn.classList.remove('active'));
                    button.classList.add('active');
                    this.applyFilter(button.dataset.storeFilter);
                });
            });
        }

        if (this.elements.loadMore) {
            this.elements.loadMore.addEventListener('click', () => {
                if (this.hasNextPage) {
                    this.currentPage += 1;
                    this.loadStores();
                }
            });
        }

        if (this.elements.searchInput) {
            let searchTimeout;
            this.elements.searchInput.addEventListener('input', (event) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchTerm = event.target.value.trim();
                    this.loadStores(true);
                }, 400);
            });
        }
    }

    applyFilter(filter) {
        switch (filter) {
            case 'featured':
                this.filters.is_featured = true;
                this.sort = '-rating';
                break;
            case 'top-rated':
                this.filters.is_featured = null;
                this.sort = '-rating';
                break;
            case 'most-sales':
                this.filters.is_featured = null;
                this.sort = '-total_sales';
                break;
            case 'new':
                this.filters.is_featured = null;
                this.sort = '-created_at';
                break;
            default:
                this.filters.is_featured = null;
                this.sort = '-rating';
                break;
        }

        this.loadStores(true);
    }

    toggleLoadMore() {
        if (!this.elements.loadMore) return;

        if (this.hasNextPage) {
            this.elements.loadMore.disabled = false;
            this.elements.loadMore.textContent = 'Load more stores';
            this.elements.loadMore.classList.remove('is-hidden');
        } else {
            this.elements.loadMore.disabled = true;
            this.elements.loadMore.textContent = 'No more stores';
            this.elements.loadMore.classList.add('is-hidden');
        }
    }

    showError(message) {
        if (!this.elements.grid) return;
        this.elements.grid.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3>${message}</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

window.StoreDirectory = StoreDirectory;
