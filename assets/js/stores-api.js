/**
 * Stores (Artisan) Page API Integration
 * Fetches approved stores and renders the artisan listing page.
 */

class StoresPageAPI {
    constructor() {
        this.apiClient = new ApiClient();
        this.stores = [];
        this.filteredStores = [];
        this.currentPage = 1;
        this.pageSize = 6;
        this.activeFilter = 'all';
        this.searchQuery = '';
        this.totalStores = 0;
        this.totalProducts = 0;
        this.isLoading = false;
        this.hasMore = false;

        this.dom = {
            container: document.getElementById('artisanGrid'),
            loadMore: document.getElementById('loadMoreStores'),
            searchInput: document.getElementById('storeSearchInput'),
            filterButtons: document.querySelectorAll('.filter-btn'),
            statStores: document.getElementById('heroTotalArtisans'),
            statPieces: document.getElementById('heroTotalPieces'),
            statRating: document.getElementById('heroAvgRating'),
            featured: {
                name: document.getElementById('featuredName'),
                specialty: document.getElementById('featuredSpecialty'),
                description: document.getElementById('featuredDescription'),
                stats: document.getElementById('featuredStats'),
                ctaProfile: document.getElementById('featuredProfileLink'),
                ctaProducts: document.getElementById('featuredProductsLink'),
                image: document.getElementById('featuredImage'),
            },
        };

        this.init();
    }

    async init() {
        try {
            await Promise.all([this.loadStores({ reset: true }), this.loadMarketplaceTotals()]);
            this.setupEventListeners();
            this.render();
            this.updateHeroStats();
            this.updateFeaturedStore();
        } catch (error) {
            console.error('[Stores Page API] Initialization error:', error);
            this.showError('Ustalarımız şu an görüntülenemiyor. Lütfen daha sonra tekrar deneyin.');
        }
    }

    setupEventListeners() {
        if (this.dom.loadMore) {
            this.dom.loadMore.addEventListener('click', () => {
                if (!this.isLoading && this.hasMore) {
                    this.loadStores({ reset: false }).then(() => {
                        this.applyFilters();
                        this.render();
                    });
                }
            });
        }

        if (this.dom.searchInput) {
            let debounceTimer;
            this.dom.searchInput.addEventListener('input', (event) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchQuery = event.target.value.trim().toLowerCase();
                    this.applyFilters();
                    this.render();
                }, 300);
            });
        }

        this.dom.filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                this.dom.filterButtons.forEach((btn) => btn.classList.remove('active'));
                button.classList.add('active');
                this.activeFilter = button.dataset.filter || 'all';
                this.applyFilters();
                this.render();
            });
        });
    }

    async loadMarketplaceTotals() {
        try {
            const response = await this.apiClient.getProducts({ limit: 1 });
            if (response.success) {
                this.totalProducts = response.pagination?.total || response.data?.length || 0;
            }
        } catch (error) {
            console.warn('[Stores Page API] Unable to load total product count:', error.message);
        }
    }

    async loadStores({ reset }) {
        if (this.isLoading) return;
        this.isLoading = true;

        if (reset) {
            this.currentPage = 1;
            this.stores = [];
            if (this.dom.container) {
                this.dom.container.innerHTML = this.renderSkeletons();
            }
        } else if (this.dom.loadMore) {
            this.dom.loadMore.disabled = true;
            this.dom.loadMore.textContent = 'Loading artisans...';
        }

        try {
            const params = {
                status: 'approved',
                page: this.currentPage,
                limit: this.pageSize,
                sort: this.getSortParam(),
            };

            if (this.activeFilter.startsWith('city-')) {
                params.city = this.activeFilter.replace('city-', '');
            }

            const response = await this.apiClient.getStores(params);

            if (!response.success || !Array.isArray(response.data)) {
                throw new Error(response.message || 'Stores not available');
            }

            this.totalStores = response.pagination?.total || response.data.length;
            this.hasMore = response.pagination?.hasNext || false;
            this.currentPage = (response.pagination?.page || this.currentPage) + 1;

            this.stores = reset ? response.data : [...this.stores, ...response.data];
            this.applyFilters();
        } catch (error) {
            console.error('[Stores Page API] Error loading stores:', error);
            throw error;
        } finally {
            if (this.dom.loadMore) {
                this.dom.loadMore.disabled = false;
                this.dom.loadMore.textContent = 'Load More Artisans';
                this.dom.loadMore.style.display = this.hasMore ? 'inline-flex' : 'none';
            }
            this.isLoading = false;
        }
    }

    getSortParam() {
        switch (this.activeFilter) {
            case 'new':
                return '-created_at';
            case 'top-rated':
                return '-rating';
            case 'featured':
                return '-total_sales';
            default:
                return '-rating';
        }
    }

    applyFilters() {
        let stores = [...this.stores];

        if (this.activeFilter === 'featured') {
            stores = stores.filter((store) => store.is_featured);
        } else if (this.activeFilter === 'top-rated') {
            stores = stores.filter((store) => Number(store.rating || 0) >= 4.5);
        } else if (this.activeFilter === 'new') {
            stores = stores.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        } else if (this.activeFilter.startsWith('city-')) {
            const city = this.activeFilter.replace('city-', '').toLowerCase();
            stores = stores.filter((store) => (store.city || '').toLowerCase() === city);
        }

        if (this.searchQuery) {
            stores = stores.filter((store) => {
                const name = store.name?.toLowerCase() || '';
                const description = store.description?.toLowerCase() || '';
                return name.includes(this.searchQuery) || description.includes(this.searchQuery);
            });
        }

        this.filteredStores = stores;
    }

    render() {
        if (!this.dom.container) return;

        if (this.filteredStores.length === 0) {
            this.dom.container.innerHTML = `
                <div class="artisan-empty">
                    <div class="icon">🧭</div>
                    <h3>No artisans match your search</h3>
                    <p>Try adjusting the filters or search keywords.</p>
                </div>
            `;
            return;
        }

        this.dom.container.innerHTML = '';
        this.filteredStores.forEach((store) => {
            this.dom.container.appendChild(this.createStoreCard(store));
        });
    }

    renderSkeletons(count = 6) {
        return Array.from({ length: count })
            .map(
                () => `
                <div class="artisan-card skeleton">
                    <div class="artisan-image"></div>
                    <div class="artisan-info">
                        <div class="line"></div>
                        <div class="line short"></div>
                    </div>
                </div>
            `
            )
            .join('');
    }

    createStoreCard(store) {
        const card = document.createElement('div');
        card.className = 'artisan-card';
        card.dataset.storeId = store.id;

        const logo = store.logo || 'https://via.placeholder.com/400x300?text=Nordic+Artisan';
        const rating = Number(store.rating || 0).toFixed(1);
        const totalSales = store.total_sales || 0;
        const since = store.created_at ? new Date(store.created_at).getFullYear() : '—';
        const city = store.city || 'Nordics';

        card.innerHTML = `
            <div class="artisan-image">
                <img src="${logo}" alt="${store.name}">
                ${store.is_featured ? '<div class="artisan-badge">🌟 Featured</div>' : ''}
            </div>
            <div class="artisan-info">
                <h3 class="artisan-name">${store.name}</h3>
                <p class="artisan-specialty">${city} • Since ${since}</p>
                <div class="artisan-stats">
                    <div class="stat">
                        <span class="stat-number">${rating}</span>
                        <span class="stat-label">Rating</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${totalSales}</span>
                        <span class="stat-label">Pieces sold</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${store.total_reviews || 0}</span>
                        <span class="stat-label">Reviews</span>
                    </div>
                </div>
                <p class="artisan-description">${store.description || 'Nordic master artisan with curated handcrafted pieces.'}</p>
                <div class="artisan-actions">
                    <button class="btn btn-secondary" data-store="${store.id}" data-action="visit-store">View Profile</button>
                    <button class="btn btn-primary" data-store="${store.id}" data-store-name="${encodeURIComponent(store.name)}" data-action="view-products">View Products</button>
                </div>
            </div>
        `;

        card.querySelectorAll('[data-action="view-products"]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const storeId = button.dataset.store;
                const storeName = decodeURIComponent(button.dataset.storeName || '');
                window.location.href = `products.html?store=${storeId}&storeName=${encodeURIComponent(storeName)}`;
            });
        });

        card.querySelectorAll('[data-action="visit-store"]').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                // Placeholder for dedicated store page
                alert('Store profile page coming soon!');
            });
        });

        return card;
    }

    updateHeroStats() {
        if (this.dom.statStores) {
            this.dom.statStores.textContent = this.totalStores.toString();
        }

        if (this.dom.statPieces) {
            const totalPieces = this.totalProducts || this.stores.reduce((sum, store) => sum + (store.total_sales || 0), 0);
            this.dom.statPieces.textContent = totalPieces.toLocaleString('tr-TR');
        }

        if (this.dom.statRating) {
            const average = this.stores.length
                ? this.stores.reduce((sum, store) => sum + Number(store.rating || 0), 0) / this.stores.length
                : 0;
            this.dom.statRating.textContent = average.toFixed(1);
        }
    }

    updateFeaturedStore() {
        if (!this.dom.featured.name) return;
        if (this.stores.length === 0) return;

        const featured = [...this.stores]
            .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0];

        if (!featured) return;

        this.dom.featured.name.textContent = featured.name;
        this.dom.featured.specialty.textContent = `${featured.city || 'Nordics'} • Master Artisan`;
        this.dom.featured.description.textContent = featured.description || 'Discover signature pieces handpicked by Dostik.';

        if (this.dom.featured.stats) {
            this.dom.featured.stats.innerHTML = `
                <div>
                    <div class="stat-number">${Number(featured.rating || 0).toFixed(1)}</div>
                    <div class="stat-label">Rating</div>
                </div>
                <div>
                    <div class="stat-number">${featured.total_sales || 0}</div>
                    <div class="stat-label">Pieces Sold</div>
                </div>
                <div>
                    <div class="stat-number">${featured.total_reviews || 0}</div>
                    <div class="stat-label">Reviews</div>
                </div>
            `;
        }

        if (this.dom.featured.image) {
            this.dom.featured.image.src = featured.banner || featured.logo || this.dom.featured.image.src;
            this.dom.featured.image.alt = featured.name;
        }

        if (this.dom.featured.ctaProducts) {
            this.dom.featured.ctaProducts.onclick = () => {
                window.location.href = `products.html?store=${featured.id}&storeName=${encodeURIComponent(featured.name)}`;
            };
        }

        if (this.dom.featured.ctaProfile) {
            this.dom.featured.ctaProfile.onclick = () => {
                alert('Store profile page coming soon!');
            };
        }
    }

    showError(message) {
        if (!this.dom.container) return;

        this.dom.container.innerHTML = `
            <div class="artisan-empty">
                <div class="icon">⚠️</div>
                <h3>${message}</h3>
            </div>
        `;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.storesPageAPI = new StoresPageAPI();
    });
} else {
    window.storesPageAPI = new StoresPageAPI();
}
