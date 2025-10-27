/**
 * Store Directory Page
 * Connects artisan.html to the backend store listings.
 */

class StoreDirectoryPage {
    constructor() {
        if (typeof ApiClient === 'undefined') {
            console.warn('[Store Directory] ApiClient missing. Did you include api-client.js?');
            return;
        }

        this.apiClient = new ApiClient();
        this.storeCache = [];
        this.filteredStores = [];
        this.featuredStore = null;
        this.totalStores = 0;

        this.currentPage = 1;
        this.limit = 12;
        this.hasNext = false;
        this.isLoading = false;

        this.searchTerm = '';
        this.selectedCategory = 'all';

        this.elements = {
            grid: document.getElementById('artisanGrid'),
            filters: document.getElementById('artisanFilters'),
            search: document.getElementById('artisanSearchInput'),
            loadMore: document.getElementById('artisanLoadMore'),
            noResults: document.getElementById('artisanNoResults'),
            heroStoreCount: document.getElementById('artisanStoreCount'),
            heroTotalPieces: document.getElementById('artisanTotalPieces'),
            heroAvgRating: document.getElementById('artisanAvgRating'),
            featured: document.getElementById('featuredArtisan'),
            featuredName: document.getElementById('featuredStoreName'),
            featuredTagline: document.getElementById('featuredStoreTagline'),
            featuredYears: document.getElementById('featuredStoreYears'),
            featuredRating: document.getElementById('featuredStoreRating'),
            featuredSales: document.getElementById('featuredStoreSales'),
            featuredDescription: document.getElementById('featuredStoreDescription'),
            featuredImage: document.getElementById('featuredStoreImage'),
            featuredBadge: document.getElementById('featuredStoreBadge'),
            featuredProfile: document.getElementById('featuredStoreProfile'),
            featuredProducts: document.getElementById('featuredStoreProducts'),
        };

        if (!this.elements.grid) {
            console.warn('[Store Directory] artisan grid container not found.');
            return;
        }

        this.debouncedSearch = this.debounce(async () => {
            this.currentPage = 1;
            this.storeCache = [];
            await this.loadStores();
        }, 350);

        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.loadFeaturedStore();
            await this.loadStores();
            this.setupEventListeners();
        } catch (error) {
            console.error('[Store Directory] init error:', error);
            this.showError('Mağazalar yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    }

    debounce(fn, wait = 200) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    async loadFeaturedStore() {
        try {
            const response = await this.apiClient.getStores({
                status: 'approved',
                is_featured: true,
                limit: 1,
                sort: '-total_sales',
            });

            if (response.success && Array.isArray(response.data) && response.data.length > 0) {
                this.featuredStore = response.data[0];
                this.renderFeaturedStore();
            }
        } catch (error) {
            console.warn('[Store Directory] loadFeaturedStore warning:', error);
        }
    }

    async loadStores({ append = false } = {}) {
        if (this.isLoading) return;

        this.isLoading = true;
        if (!append) {
            this.showLoading();
        } else if (this.elements.loadMore) {
            this.elements.loadMore.disabled = true;
            this.elements.loadMore.textContent = 'Yükleniyor...';
        }

        try {
            const params = {
                status: 'approved',
                page: this.currentPage,
                limit: this.limit,
                sort: '-total_sales',
            };

            if (this.searchTerm) {
                params.search = this.searchTerm.trim();
            }

            const response = await this.apiClient.getStores(params);
            if (!response.success || !Array.isArray(response.data)) {
                throw new Error(response.message || 'Mağazalar alınamadı');
            }

            const incoming = response.data;
            if (append) {
                this.storeCache = this.storeCache.concat(incoming);
            } else {
                this.storeCache = incoming;
            }

            this.totalStores = response.pagination?.total ?? this.storeCache.length;
            this.hasNext = Boolean(response.pagination?.hasNext);

            this.filteredStores = this.applyCategoryFilter(this.storeCache);

            if (!this.featuredStore && this.filteredStores.length > 0) {
                this.featuredStore = this.filteredStores[0];
            }

            this.renderAll();
        } catch (error) {
            console.error('[Store Directory] loadStores error:', error);
            this.showError('Mağazalar yüklenirken bir sorun oluştu.');
        } finally {
            this.isLoading = false;
            if (this.elements.loadMore) {
                this.elements.loadMore.disabled = false;
                this.elements.loadMore.textContent = 'Daha fazla mağaza';
            }
        }
    }

    applyCategoryFilter(stores) {
        if (!Array.isArray(stores) || this.selectedCategory === 'all') {
            return Array.isArray(stores) ? [...stores] : [];
        }

        return stores.filter((store) => {
            const categories = Array.isArray(store?.productSummary?.topCategories)
                ? store.productSummary.topCategories
                : [];
            return categories.some((cat) => cat.slug === this.selectedCategory);
        });
    }

    renderAll() {
        this.renderFilters();
        this.renderStores();
        this.renderStats();
        this.renderFeaturedStore();
        this.updateLoadMoreVisibility();
    }

    renderStores() {
        if (!this.elements.grid) return;

        if (this.filteredStores.length === 0) {
            this.elements.grid.innerHTML = '';
            if (this.elements.noResults) {
                this.elements.noResults.style.display = 'block';
            }
            return;
        }

        if (this.elements.noResults) {
            this.elements.noResults.style.display = 'none';
        }

        const cards = this.filteredStores.map((store) => this.renderStoreCard(store));
        this.elements.grid.innerHTML = cards.join('');
    }

    renderStoreCard(store) {
        const summary = store.productSummary || {};
        const rating = (parseFloat(store.rating) || 0).toFixed(1);
        const totalProducts = summary.totalProducts || 0;
        const totalSales = summary.totalSales || store.total_sales || 0;
        const badge = store.is_featured ? '⭐ Öne Çıkan' : (totalSales > 100 ? '🔥 Popüler' : '🎨 Özgün');
        const categories = Array.isArray(summary.topCategories) ? summary.topCategories : [];
        const topCategory = categories[0]?.name || 'Çok kategorili mağaza';
        const categoryChips = categories.slice(0, 3).map((cat) => `<span class="store-chip">#${cat.name}</span>`).join(' ');
        const description = (store.description || 'Bu mağaza eşsiz el işçiliği ürünler sunuyor.').substring(0, 220);
        const image = store.banner || store.logo || 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80';
        const contactHref = store.email
            ? `mailto:${store.email}`
            : (store.phone ? `tel:${store.phone}` : null);
        const contactLabel = store.email ? '💌 İletişim' : (store.phone ? '📞 Ara' : '📍 Konum');

        return `
            <article class="artisan-card" data-store-id="${store.id}">
                <div class="artisan-image">
                    <img src="${image}" alt="${store.name} mağaza görseli" loading="lazy">
                    <div class="artisan-badge">${badge}</div>
                </div>
                <div class="artisan-info">
                    <h3 class="artisan-name">${store.name}</h3>
                    <p class="artisan-specialty">${topCategory}</p>
                    <div class="artisan-stats">
                        <div class="stat">
                            <span class="stat-number">${rating}</span>
                            <span class="stat-label">Puan</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${totalProducts}</span>
                            <span class="stat-label">Ürün</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${totalSales}</span>
                            <span class="stat-label">Satış</span>
                        </div>
                    </div>
                    <p class="artisan-description">${description}${description.length === 220 ? '...' : ''}</p>
                    <div class="artisan-actions">
                        <a class="btn btn-primary" style="flex: 2;" href="products.html?storeSlug=${store.slug}">🎨 Ürünleri Gör</a>
                        ${contactHref ? `<a class="btn btn-secondary" style="flex: 1;" href="${contactHref}">${contactLabel}</a>` : `<button class="btn btn-secondary" style="flex: 1;" data-store="${store.slug}" data-action="locate">📍 Detay</button>`}
                    </div>
                    ${categoryChips ? `<div class="artisan-tags">${categoryChips}</div>` : ''}
                </div>
            </article>
        `;
    }

    renderFilters() {
        if (!this.elements.filters) return;

        const facets = this.buildCategoryFacets();
        const buttons = [`<button type="button" class="filter-btn ${this.selectedCategory === 'all' ? 'active' : ''}" data-category="all">Tüm Mağazalar (${this.totalStores})</button>`];

        facets.forEach((facet) => {
            buttons.push(`
                <button type="button" class="filter-btn ${this.selectedCategory === facet.slug ? 'active' : ''}" data-category="${facet.slug}">
                    ${facet.icon || '🏷️'} ${facet.name} (${facet.count})
                </button>
            `);
        });

        this.elements.filters.innerHTML = buttons.join('');
    }

    buildCategoryFacets() {
        const map = new Map();
        this.storeCache.forEach((store) => {
            const categories = Array.isArray(store?.productSummary?.topCategories)
                ? store.productSummary.topCategories
                : [];

            categories.forEach((cat, index) => {
                if (!cat?.slug) return;
                if (!map.has(cat.slug)) {
                    map.set(cat.slug, { slug: cat.slug, name: cat.name || cat.slug, count: 0, priority: index });
                }
                const entry = map.get(cat.slug);
                entry.count += Number(cat.productCount || 1);
                entry.priority = Math.min(entry.priority, index);
            });
        });

        return Array.from(map.values())
            .sort((a, b) => {
                if (b.count === a.count) {
                    return a.priority - b.priority;
                }
                return b.count - a.count;
            })
            .slice(0, 8);
    }

    renderStats() {
        const storeCount = this.totalStores || this.storeCache.length;
        if (this.elements.heroStoreCount) {
            this.elements.heroStoreCount.textContent = storeCount.toLocaleString('tr-TR');
        }

        const totalPieces = this.storeCache.reduce((sum, store) => {
            return sum + (store?.productSummary?.totalProducts || 0);
        }, 0);
        if (this.elements.heroTotalPieces) {
            this.elements.heroTotalPieces.textContent = totalPieces.toLocaleString('tr-TR');
        }

        const avgRating = this.storeCache.length
            ? (this.storeCache.reduce((sum, store) => sum + (parseFloat(store.rating) || 0), 0) / this.storeCache.length)
            : 0;
        if (this.elements.heroAvgRating) {
            this.elements.heroAvgRating.textContent = avgRating.toFixed(1);
        }
    }

    renderFeaturedStore() {
        const store = this.featuredStore || this.filteredStores[0];
        if (!store) {
            if (this.elements.featured) {
                this.elements.featured.style.display = 'none';
            }
            return;
        }

        if (this.elements.featured) {
            this.elements.featured.style.display = 'grid';
        }

        const summary = store.productSummary || {};
        const categories = Array.isArray(summary.topCategories) ? summary.topCategories : [];
        const tagline = categories.map((cat) => cat.name).join(' • ') || 'Nordik zanaatkar tasarımları';
        const rating = (parseFloat(store.rating) || 0).toFixed(1);
        const totalSales = summary.totalSales || store.total_sales || 0;
        const totalProducts = summary.totalProducts || 0;
        const createdAt = store.createdAt ? new Date(store.createdAt) : null;
        const yearsActive = createdAt ? Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365))) : 1;
        const description = store.description || 'Bu usta mağaza, geleneksel tekniklerle modern tasarımları buluşturuyor.';
        const image = store.banner || store.logo || (this.elements.featuredImage?.src ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80');

        if (this.elements.featuredName) {
            this.elements.featuredName.textContent = store.name;
        }
        if (this.elements.featuredTagline) {
            this.elements.featuredTagline.textContent = tagline;
        }
        if (this.elements.featuredYears) {
            this.elements.featuredYears.textContent = yearsActive.toString();
        }
        if (this.elements.featuredRating) {
            this.elements.featuredRating.textContent = rating;
        }
        if (this.elements.featuredSales) {
            this.elements.featuredSales.textContent = totalSales.toLocaleString('tr-TR');
        }
        if (this.elements.featuredDescription) {
            this.elements.featuredDescription.textContent = description;
        }
        if (this.elements.featuredImage) {
            this.elements.featuredImage.src = image;
            this.elements.featuredImage.alt = `${store.name} mağaza afişi`;
        }
        if (this.elements.featuredBadge) {
            this.elements.featuredBadge.textContent = store.is_featured ? '⭐ Öne Çıkan Mağaza' : '✨ Topluluk Seçimi';
        }
        if (this.elements.featuredProfile) {
            if (store.email) {
                this.elements.featuredProfile.textContent = '💌 Mağaza ile İletişim';
                this.elements.featuredProfile.onclick = () => {
                    window.location.href = `mailto:${store.email}`;
                };
            } else {
                this.elements.featuredProfile.textContent = '📍 Mağaza Detayları';
                this.elements.featuredProfile.onclick = () => {
                    window.location.href = `products.html?storeSlug=${store.slug}`;
                };
            }
        }
        if (this.elements.featuredProducts) {
            this.elements.featuredProducts.onclick = () => {
                window.location.href = `products.html?storeSlug=${store.slug}`;
            };
        }
    }

    updateLoadMoreVisibility() {
        if (!this.elements.loadMore) return;

        if (this.hasNext) {
            this.elements.loadMore.style.display = 'inline-flex';
        } else {
            this.elements.loadMore.style.display = 'none';
        }
    }

    setupEventListeners() {
        if (this.elements.filters) {
            this.elements.filters.addEventListener('click', async (event) => {
                const button = event.target.closest('[data-category]');
                if (!button) return;

                const category = button.getAttribute('data-category');
                if (category === this.selectedCategory) {
                    return;
                }

                this.selectedCategory = category;
                this.filteredStores = this.applyCategoryFilter(this.storeCache);
                if (!this.filteredStores.length && this.hasNext) {
                    await this.handleLoadMore();
                }
                this.renderAll();

                if (window.dostikAI) {
                    window.dostikAI.addChatMessage(`🐉 ${category === 'all' ? 'Tüm ustalar karşınızda!' : `${button.textContent.trim()} koleksiyonuna göz atmaya ne dersiniz?`}`);
                }
            });
        }

        if (this.elements.search) {
            this.elements.search.addEventListener('input', (event) => {
                this.searchTerm = event.target.value;
                this.debouncedSearch();
            });
        }

        if (this.elements.loadMore) {
            this.elements.loadMore.addEventListener('click', () => {
                this.handleLoadMore();
            });
        }

        if (this.elements.grid) {
            this.elements.grid.addEventListener('click', (event) => {
                const target = event.target.closest('button[data-action="locate"]');
                if (!target) return;

                const slug = target.getAttribute('data-store');
                if (!slug) return;

                alert('Mağaza detay sayfası yakında aktif olacak! Şimdilik ürünlerine göz atabilirsiniz.');
                window.location.href = `products.html?storeSlug=${slug}`;
            });
        }
    }

    async handleLoadMore() {
        if (this.isLoading || !this.hasNext) return;
        this.currentPage += 1;
        await this.loadStores({ append: true });
    }

    showLoading() {
        if (!this.elements.grid) return;
        this.elements.grid.innerHTML = `
            <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: var(--space-xxl);">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                <p>Mağazalar yükleniyor...</p>
            </div>
        `;
        if (this.elements.noResults) {
            this.elements.noResults.style.display = 'none';
        }
    }

    showError(message) {
        if (!this.elements.grid) return;
        this.elements.grid.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: var(--space-xxl); color: #dc2626;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3>Hata</h3>
                <p>${message}</p>
            </div>
        `;
        if (this.elements.loadMore) {
            this.elements.loadMore.style.display = 'none';
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new StoreDirectoryPage());
} else {
    new StoreDirectoryPage();
}
