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
            // Render dynamic sections
            this.renderDynamicTimeline();
            this.renderWorkshopGallery();
            this.renderTestimonials();
            this.renderTechniqueCards();
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

    // ==========================================
    // DYNAMIC SECTIONS
    // ==========================================

    /**
     * Render dynamic artisan journey timeline based on featured store
     */
    renderDynamicTimeline() {
        const container = document.getElementById('artisanJourney');
        if (!container || this.stores.length === 0) return;

        const featured = [...this.stores]
            .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0];

        if (!featured) return;

        const createdYear = featured.created_at ? new Date(featured.created_at).getFullYear() : new Date().getFullYear();
        const approvedYear = featured.approved_at ? new Date(featured.approved_at).getFullYear() : createdYear;

        container.innerHTML = `
            <div class="journey-timeline">
                <h2 style="margin-bottom: var(--space-xl);">🌟 ${featured.name}'s Journey</h2>
                
                <div class="timeline-item">
                    <div class="timeline-year">${createdYear}</div>
                    <h4 class="timeline-title">The Beginning</h4>
                    <p>${featured.name} started their journey as a master artisan, bringing traditional craftsmanship to life.</p>
                </div>

                <div class="timeline-item">
                    <div class="timeline-year">${createdYear + 1}</div>
                    <h4 class="timeline-title">First Masterpiece</h4>
                    <p>Created their signature style that would later become recognized across the Nordic region.</p>
                </div>

                <div class="timeline-item">
                    <div class="timeline-year">${approvedYear}</div>
                    <h4 class="timeline-title">Joined DostanWebCSS</h4>
                    <p>Became a verified artisan on our platform, bringing authentic Nordic treasures to collectors worldwide.</p>
                </div>

                <div class="timeline-item">
                    <div class="timeline-year">Today</div>
                    <h4 class="timeline-title">Master Artisan Status</h4>
                    <p>With ${featured.total_sales || 0} pieces sold and a ${Number(featured.rating || 0).toFixed(1)} star rating, continues to inspire collectors.</p>
                </div>
            </div>

            <div class="journey-image">
                <img src="${featured.banner || featured.logo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=600'}" alt="${featured.name}'s workshop">
            </div>
        `;
    }

    /**
     * Render workshop gallery from store images
     */
    renderWorkshopGallery() {
        const container = document.getElementById('workshopGallery');
        if (!container || this.stores.length === 0) return;

        // Get top 4 stores with banners/logos
        const storesWithImages = this.stores
            .filter(s => s.banner || s.logo)
            .slice(0, 4);

        if (storesWithImages.length === 0) return;

        container.innerHTML = storesWithImages.map(store => `
            <div class="workshop-image">
                <img src="${store.banner || store.logo}" alt="${store.name}'s workshop">
                <div class="workshop-overlay">
                    <h4>${store.name}'s Studio</h4>
                    <p>${store.city || 'Nordic'} • ${store.total_sales || 0} pieces crafted</p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render testimonials from real customer reviews
     */
    async renderTestimonials() {
        const container = document.getElementById('testimonialsSlider');
        if (!container) return;

        try {
            const response = await this.apiClient.getFeaturedReviews(6);

            if (!response.success || !response.data?.length) {
                // Keep existing static testimonials as fallback
                return;
            }

            container.innerHTML = response.data.map(review => `
                <div class="testimonial">
                    <p class="testimonial-text">
                        "${this.escapeHtml(review.comment || review.title || 'Amazing craftsmanship!')}"
                    </p>
                    <div class="testimonial-author">
                        <div class="author-avatar">${this.getAvatarEmoji(review.user?.name)}</div>
                        <div>
                            <strong>${this.escapeHtml(review.user?.name || 'Happy Customer')}</strong><br>
                            <small style="color: var(--warm-brown);">${review.store?.city || 'Nordic'} Collector • ${'⭐'.repeat(Math.min(5, review.rating || 5))}</small>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.warn('[Stores Page] Could not load testimonials:', error);
        }
    }

    /**
     * Render technique cards from categories
     */
    async renderTechniqueCards() {
        const container = document.getElementById('techniqueGrid');
        if (!container) return;

        try {
            const response = await this.apiClient.getCategories({ is_active: true, limit: 6 });

            if (!response.success || !response.data?.length) {
                // Keep existing static techniques as fallback
                return;
            }

            const iconMap = {
                'wood': '🪵', 'woodworking': '🪵', 'ahsap': '🪵',
                'metal': '🔥', 'forge': '🔥', 'demir': '🔥',
                'glass': '💎', 'cam': '💎',
                'textile': '🧶', 'tekstil': '🧶', 'fabric': '🧶',
                'ceramic': '🏺', 'pottery': '🏺', 'seramik': '🏺',
                'leather': '🛡️', 'deri': '🛡️',
                'jewelry': '💍', 'taki': '💍',
                'default': '🎨'
            };

            container.innerHTML = response.data.map(category => {
                const iconKey = Object.keys(iconMap).find(k =>
                    category.name?.toLowerCase().includes(k) ||
                    category.slug?.toLowerCase().includes(k)
                ) || 'default';

                return `
                    <div class="technique-card">
                        <div class="technique-icon">${category.icon || iconMap[iconKey]}</div>
                        <h4 style="margin-bottom: var(--space-md);">${category.name}</h4>
                        <p style="line-height: 1.6; color: var(--forest-medium);">
                            ${category.description || 'Traditional Nordic craftsmanship passed down through generations.'}
                        </p>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.warn('[Stores Page] Could not load techniques:', error);
        }
    }

    /**
     * Helper: Get avatar emoji based on name
     */
    getAvatarEmoji(name) {
        if (!name) return '🪵';
        const emojis = ['🪵', '🪵', '🪵', '🪵', '🪵', '🪵'];
        const index = name.charCodeAt(0) % emojis.length;
        return emojis[index];
    }

    /**
     * Helper: Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
