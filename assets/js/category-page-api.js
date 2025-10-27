/**
 * Category Page API Integration
 * Powers category-specific landing pages with live backend data
 */

class CategoryPageAPI {
    constructor() {
        this.apiClient = new ApiClient();
        this.category = null;
        this.categorySlug = document.body.dataset.categorySlug || null;
        this.categoryName = document.body.dataset.categoryName || null;
        this.products = [];
        this.currentPage = 1;
        this.pageSize = Number(document.body.dataset.categoryPageSize || 8);
        this.isLoading = false;
        this.totalAvailable = 0;
        this.activeFilter = 'all';
        this.filters = {
            search: '',
            maxPrice: null,
        };

        this.dom = {
            container: document.getElementById(document.body.dataset.productsContainer || 'categoryProducts'),
            loadMore: document.getElementById(document.body.dataset.loadMoreButton || 'loadMoreCategory'),
            priceRange: document.getElementById('priceRange'),
            priceValue: document.getElementById('priceValue'),
            clearFilters: document.getElementById('clearFilters'),
            filterButtons: document.querySelectorAll('.filter-btn'),
            resultsInfo: document.getElementById('resultsCount'),
            heroTitle: document.querySelector('.category-hero h1'),
            heroDescription: document.querySelector('.category-hero p'),
            statTotal: document.getElementById('categoryStatTotal'),
            statArtisans: document.getElementById('categoryStatArtisans'),
            statRating: document.getElementById('categoryStatRating'),
            breadcrumbCurrent: document.querySelector('.breadcrumb-nav span:last-child'),
        };

        this.init();
    }

    async init() {
        if (!this.categorySlug) {
            console.error('[Category Page API] Missing category slug on body data attribute');
            this.showError('Kategori bulunamadı.');
            return;
        }

        try {
            await this.loadCategory();
            this.setupEventListeners();
            await this.loadProducts({ reset: true });
        } catch (error) {
            console.error('[Category Page API] Initialization error:', error);
            this.showError('Kategori ürünleri yüklenemedi.');
        }
    }

    async loadCategory() {
        console.log('[Category Page API] Loading category details for', this.categorySlug);
        const response = await this.apiClient.getCategoryBySlug(this.categorySlug);

        if (!response.success || !response.data) {
            throw new Error(response.message || 'Kategori bulunamadı');
        }

        this.category = response.data;
        this.categoryName = this.categoryName || this.category.name;

        // Update document title & hero copy
        document.title = `${this.category.name} - DostanWebCSS Nordic Marketplace`;

        if (this.dom.heroTitle) {
            this.dom.heroTitle.textContent = `${this.category.icon || ''} ${this.category.name}`.trim();
        }

        if (this.dom.heroDescription && this.category.description) {
            this.dom.heroDescription.textContent = this.category.description;
        }

        if (this.dom.breadcrumbCurrent) {
            this.dom.breadcrumbCurrent.textContent = `${this.category.icon || ''} ${this.category.name}`.trim();
        }

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && this.category.meta_description) {
            metaDesc.setAttribute('content', this.category.meta_description);
        }
    }

    setupEventListeners() {
        // Load more button
        if (this.dom.loadMore) {
            this.dom.loadMore.addEventListener('click', () => {
                if (!this.isLoading) {
                    this.loadProducts({ reset: false });
                }
            });
        }

        // Search input (reuse globalSearch if present)
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (event) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.filters.search = event.target.value.trim();
                    this.loadProducts({ reset: true });
                }, 400);
            });
        }

        // Price slider
        if (this.dom.priceRange) {
            this.dom.priceRange.addEventListener('input', (event) => {
                if (this.dom.priceValue) {
                    this.dom.priceValue.textContent = `₺${Number(event.target.value).toLocaleString('tr-TR')}`;
                }
            });

            this.dom.priceRange.addEventListener('change', (event) => {
                this.filters.maxPrice = Number(event.target.value);
                this.loadProducts({ reset: true });
            });
        }

        // Clear filters
        if (this.dom.clearFilters) {
            this.dom.clearFilters.addEventListener('click', () => {
                this.filters.search = '';
                this.filters.maxPrice = null;
                this.activeFilter = 'all';

                if (this.dom.priceRange && this.dom.priceRange.dataset.defaultValue) {
                    this.dom.priceRange.value = this.dom.priceRange.dataset.defaultValue;
                    if (this.dom.priceValue) {
                        this.dom.priceValue.textContent = `₺${Number(this.dom.priceRange.value).toLocaleString('tr-TR')}`;
                    }
                }

                document.getElementById('globalSearch')?.value = '';
                this.dom.filterButtons.forEach((btn) => btn.classList.remove('active'));
                const allBtn = Array.from(this.dom.filterButtons).find((btn) => btn.dataset.filter === 'all');
                if (allBtn) allBtn.classList.add('active');

                this.loadProducts({ reset: true });
            });
        }

        // Filter buttons
        this.dom.filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                this.dom.filterButtons.forEach((btn) => btn.classList.remove('active'));
                button.classList.add('active');
                this.activeFilter = button.dataset.filter || 'all';
                this.renderProducts();
            });
        });

        // Delegate add-to-cart clicks
        document.addEventListener('click', (event) => {
            const addToCartBtn = event.target.closest('.btn-add-cart');
            if (addToCartBtn) {
                event.preventDefault();
                const productId = addToCartBtn.dataset.productId;
                if (productId) {
                    this.handleAddToCart(productId);
                }
            }
        });
    }

    async loadProducts({ reset }) {
        if (!this.category) return;

        if (this.isLoading) return;
        this.isLoading = true;

        if (reset) {
            this.currentPage = 1;
            this.products = [];
            if (this.dom.container) {
                this.dom.container.innerHTML = this.renderLoadingSkeletons();
            }
        } else if (this.dom.loadMore) {
            this.dom.loadMore.disabled = true;
            this.dom.loadMore.textContent = 'Loading...';
        }

        try {
            const params = {
                category_id: this.category.id,
                page: this.currentPage,
                limit: this.pageSize,
                sort: '-created_at',
            };

            if (this.filters.search) {
                params.search = this.filters.search;
            }

            if (this.filters.maxPrice) {
                params.max_price = this.filters.maxPrice;
            }

            const response = await this.apiClient.getProducts(params);

            if (!response.success || !Array.isArray(response.data)) {
                throw new Error(response.message || 'Ürünler yüklenemedi');
            }

            const fetchedProducts = response.data;
            this.totalAvailable = response.pagination?.total || fetchedProducts.length;

            if (reset && this.dom.container) {
                this.dom.container.innerHTML = '';
            }

            this.products = reset ? fetchedProducts : [...this.products, ...fetchedProducts];
            this.currentPage = (response.pagination?.page || this.currentPage) + 1;

            this.renderProducts();
            this.updateStats();
            this.toggleLoadMore(response.pagination?.hasNext || false);
        } catch (error) {
            console.error('[Category Page API] Error loading products:', error);
            this.showError('Ürünler yüklenirken bir sorun oluştu.');
        } finally {
            if (this.dom.loadMore) {
                this.dom.loadMore.disabled = false;
                this.dom.loadMore.textContent = 'Load More Treasures';
            }
            this.isLoading = false;
        }
    }

    getFilteredProducts() {
        let filtered = [...this.products];

        if (this.activeFilter && this.activeFilter !== 'all') {
            const normalized = this.activeFilter.toLowerCase();
            filtered = filtered.filter((product) => {
                const tags = Array.isArray(product.tags) ? product.tags : [];
                const badges = Array.isArray(product.badges) ? product.badges : [];
                const categorySlug = product.category?.slug || '';

                return (
                    categorySlug === normalized ||
                    tags.some((tag) => tag?.toLowerCase().includes(normalized)) ||
                    badges.some((badge) => badge?.toLowerCase().includes(normalized)) ||
                    product.title?.toLowerCase().includes(normalized)
                );
            });
        }

        return filtered;
    }

    renderProducts() {
        if (!this.dom.container) {
            console.warn('[Category Page API] Products container not found');
            return;
        }

        const filteredProducts = this.getFilteredProducts();

        if (filteredProducts.length === 0) {
            this.dom.container.innerHTML = `
                <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🧊</div>
                    <h3>No treasures match your filters</h3>
                    <p>Try adjusting the filters or search terms.</p>
                </div>
            `;
            return;
        }

        this.dom.container.innerHTML = '';
        filteredProducts.forEach((product) => {
            this.dom.container.appendChild(this.createProductCard(product));
        });
    }

    renderLoadingSkeletons(count = 6) {
        return Array.from({ length: count })
            .map(
                () => `
                <div class="product-card skeleton">
                    <div class="product-image"></div>
                    <div class="product-info">
                        <div class="line"></div>
                        <div class="line"></div>
                        <div class="line short"></div>
                    </div>
                </div>
            `
            )
            .join('');
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card breathe';
        card.dataset.productId = product.id;

        const mainImage = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : 'https://via.placeholder.com/400x300?text=Nordic+Art';

        const badges = [];
        if (Array.isArray(product.badges)) {
            product.badges.forEach((badge) => {
                badges.push(`<span class="badge">${badge}</span>`);
            });
        }

        const discount = product.compare_price && Number(product.compare_price) > Number(product.price)
            ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
            : null;

        const price = Number(product.price || 0);

        card.innerHTML = `
            <div class="journey-indicator"></div>
            <div class="product-image">
                <img src="${mainImage}"
                     alt="${product.title}"
                     loading="lazy"
                     decoding="async">
                ${discount ? `<span class="badge discount">-${discount}%</span>` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-artisan">by ${product.store?.name || 'Nordic Artisan'}</p>
                <p class="product-description">${product.short_description || product.description || ''}</p>
                <div class="social-proof">
                    <span class="rating-stars">${this.renderStars(product.rating)}</span>
                    <span class="rating-value">${Number(product.rating || 0).toFixed(1)}</span>
                    <span class="purchases-count">${product.total_sales || 0} sold</span>
                </div>
                <div class="product-badges">${badges.join('')}</div>
                <div class="product-price">
                    <span class="price-current">₺${price.toLocaleString('tr-TR')}</span>
                    ${product.compare_price ? `<span class="price-original">₺${Number(product.compare_price).toLocaleString('tr-TR')}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="btn btn-card btn-add-cart" data-product-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>
                        ${product.stock <= 0 ? 'Stokta Yok' : 'Sepete Ekle'}
                    </button>
                    <button class="btn btn-card btn-secondary" data-product-link="${product.slug || product.id}">
                        İncele
                    </button>
                </div>
            </div>
        `;

        card.addEventListener('click', (event) => {
            if (event.target.closest('button')) {
                return;
            }
            this.navigateToProduct(product);
        });

        const viewButton = card.querySelector('[data-product-link]');
        if (viewButton) {
            viewButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.navigateToProduct(product);
            });
        }

        return card;
    }

    renderStars(rating = 0) {
        const filled = Math.round(Number(rating));
        return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}`;
    }

    navigateToProduct(product) {
        const url = product.slug
            ? `product-detail.html?slug=${encodeURIComponent(product.slug)}`
            : `product-detail.html?id=${product.id}`;
        window.location.href = url;
    }

    updateStats() {
        if (!this.dom.statTotal && !this.dom.statArtisans && !this.dom.statRating) {
            return;
        }

        const uniqueStores = new Set(this.products.map((product) => product.store?.name).filter(Boolean));
        const totalProducts = this.totalAvailable || this.products.length;
        const avgRating = this.products.length
            ? this.products.reduce((sum, product) => sum + Number(product.rating || 0), 0) / this.products.length
            : 0;

        if (this.dom.statTotal) {
            this.dom.statTotal.textContent = totalProducts.toLocaleString('tr-TR');
        }

        if (this.dom.statArtisans) {
            this.dom.statArtisans.textContent = uniqueStores.size.toString();
        }

        if (this.dom.statRating) {
            this.dom.statRating.textContent = avgRating.toFixed(1);
        }

        if (this.dom.resultsInfo) {
            this.dom.resultsInfo.textContent = `${totalProducts} treasures found in ${this.categoryName}`;
        }
    }

    toggleLoadMore(hasNext) {
        if (!this.dom.loadMore) return;

        if (hasNext) {
            this.dom.loadMore.style.display = 'inline-flex';
        } else {
            this.dom.loadMore.style.display = 'none';
        }
    }

    showError(message) {
        if (!this.dom.container) return;

        this.dom.container.innerHTML = `
            <div class="error-state" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #dc2626;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <p>${message}</p>
            </div>
        `;
    }

    async handleAddToCart(productId) {
        const product = this.products.find((item) => String(item.id) === String(productId));
        if (!product) {
            alert('Ürün bulunamadı');
            return;
        }

        if (product.stock <= 0) {
            alert('Bu ürün stokta yok');
            return;
        }

        try {
            if (AuthManager?.isLoggedIn()) {
                const response = await this.apiClient.post('/cart/items', {
                    product_id: productId,
                    quantity: 1,
                });

                if (response.success) {
                    this.showToast('Ürün sepetinize eklendi!');
                    window.updateCartCount?.();
                    return;
                }
            }

            this.addToLocalCart(product);
            this.showToast('Ürün sepetinize eklendi!');
        } catch (error) {
            console.error('[Category Page API] Failed to add to cart:', error);
            this.addToLocalCart(product);
            this.showToast('Ürün sepetinize eklendi!');
        }
    }

    addToLocalCart(product) {
        const cartKey = 'localCartItems';
        const existing = JSON.parse(localStorage.getItem(cartKey) || '[]');
        const current = existing.find((item) => item.id === product.id);

        if (current) {
            current.quantity += 1;
        } else {
            existing.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
                quantity: 1,
                stock: product.stock,
            });
        }

        localStorage.setItem(cartKey, JSON.stringify(existing));
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification success';
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: #047857;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.12);
            z-index: 9999;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.categoryPageAPI = new CategoryPageAPI();
    });
} else {
    window.categoryPageAPI = new CategoryPageAPI();
}
