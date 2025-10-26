/**
 * Category Landing Page Integration
 * Connects category-specific landing pages to the backend API
 */

class CategoryLandingPage {
    constructor() {
        this.categorySlug = document.body?.dataset?.categorySlug;
        this.categoryTitle = document.body?.dataset?.categoryTitle || '';

        this.apiClient = typeof ApiClient !== 'undefined' ? new ApiClient() : null;
        this.category = null;
        this.products = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.limit = 12;
        this.sort = '-created_at';

        this.selectedChildCategory = null;
        this.selectedStoreId = null;
        this.priceCeiling = null;
        this.maxPrice = null;
        this.searchTerm = '';

        this.isLoading = false;

        this.elements = {
            container: document.getElementById('categoryProductsContainer'),
            loadMore: document.getElementById('categoryLoadMore'),
            subcategoryFilters: document.getElementById('subcategoryFilters'),
            storeFilters: document.getElementById('storeFilters'),
            priceSlider: document.getElementById('categoryPriceRange'),
            priceValue: document.getElementById('categoryPriceValue'),
            priceMax: document.getElementById('categoryPriceMax'),
            searchInput: document.getElementById('categorySearchInput'),
            clearFilters: document.getElementById('clearCategoryFilters'),
            overlay: document.getElementById('filterOverlay'),
            sidebar: document.getElementById('filtersSidebar'),
            mobileToggle: document.getElementById('mobileFilterToggle'),
            closeMobile: document.getElementById('closeMobileFilters'),
            productCount: document.getElementById('categoryProductCount'),
            storeCount: document.getElementById('categoryStoreCount'),
            ratingAverage: document.getElementById('categoryAverageRating'),
        };

        if (!this.categorySlug || !this.apiClient || !this.elements.container) {
            console.warn('[Category Landing] Required elements missing, skipping initialization.');
            return;
        }

        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.loadCategory();
            await this.loadProducts();
            this.setupEventListeners();
        } catch (error) {
            console.error('[Category Landing] Initialization error:', error);
            this.showError('Kategori verileri yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    }

    async loadCategory() {
        const response = await this.apiClient.getCategoryBySlug(this.categorySlug);
        if (!response.success || !response.data) {
            throw new Error(response.message || 'Category not found');
        }

        this.category = response.data;
        this.renderCategoryMeta();
        this.renderSubcategoryFilters();
    }

    renderCategoryMeta() {
        if (!this.category) return;

        if (this.category.meta_title) {
            document.title = this.category.meta_title;
        } else if (this.categoryTitle) {
            document.title = `${this.categoryTitle} - DostanWebCSS`;
        }

        if (this.category.meta_description) {
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute('content', this.category.meta_description);
            }
        }

        const stats = this.category.stats || {};
        const totalProducts = Number(stats.totalProducts || 0);
        const uniqueStores = Number(stats.uniqueStoreCount || 0);
        const avgRating = Number(stats.averageRating || 0);
        const maxPrice = Number(stats.maxPrice || 0);

        if (this.elements.productCount) {
            this.elements.productCount.textContent = totalProducts.toLocaleString('tr-TR');
        }
        if (this.elements.storeCount) {
            this.elements.storeCount.textContent = uniqueStores.toLocaleString('tr-TR');
        }
        if (this.elements.ratingAverage) {
            this.elements.ratingAverage.textContent = avgRating.toFixed(1);
        }

        this.priceCeiling = Math.max(Math.ceil(maxPrice || 500), 50);
        this.maxPrice = this.priceCeiling;

        if (this.elements.priceSlider) {
            this.elements.priceSlider.max = String(this.priceCeiling);
            this.elements.priceSlider.value = String(this.priceCeiling);
        }
        if (this.elements.priceValue) {
            this.elements.priceValue.textContent = `₺${this.priceCeiling.toLocaleString('tr-TR')}`;
        }
        if (this.elements.priceMax) {
            this.elements.priceMax.textContent = `₺${this.priceCeiling.toLocaleString('tr-TR')}`;
        }
    }

    renderSubcategoryFilters() {
        if (!this.elements.subcategoryFilters) return;

        const children = Array.isArray(this.category?.children) ? this.category.children : [];
        if (children.length === 0) {
            this.elements.subcategoryFilters.innerHTML = '<p style="opacity:0.7;">Alt koleksiyon bulunamadı.</p>';
            return;
        }

        const items = [
            `<label class="filter-option">
                <input type="radio" name="subcategory" value="" ${this.selectedChildCategory ? '' : 'checked'}>
                <span>Tüm Koleksiyonlar</span>
            </label>`
        ];

        children.forEach((child) => {
            items.push(`
                <label class="filter-option">
                    <input type="radio" name="subcategory" value="${child.id}" ${this.selectedChildCategory === child.id ? 'checked' : ''}>
                    <span>${child.icon || '🪵'} ${child.name}</span>
                </label>
            `);
        });

        this.elements.subcategoryFilters.innerHTML = items.join('');
    }

    async loadProducts({ append = false } = {}) {
        if (this.isLoading) return;
        this.isLoading = true;

        if (!append) {
            this.showLoading();
        }

        try {
            const params = {
                page: this.currentPage,
                limit: this.limit,
                sort: this.sort,
                category_id: this.selectedChildCategory || this.category.id,
            };

            if (this.selectedStoreId) {
                params.store_id = this.selectedStoreId;
            }

            if (this.maxPrice !== null && this.priceCeiling !== null && this.maxPrice < this.priceCeiling) {
                params.max_price = this.maxPrice;
            }

            if (this.searchTerm) {
                params.search = this.searchTerm.trim();
            }

            const response = await this.apiClient.getProducts(params);

            if (!response.success || !Array.isArray(response.data)) {
                throw new Error(response.message || 'Products not available');
            }

            const incomingProducts = response.data;

            if (append) {
                this.products = this.products.concat(incomingProducts);
            } else {
                this.products = incomingProducts;
            }

            if (response.pagination) {
                this.totalPages = response.pagination.totalPages || 1;
                this.currentPage = response.pagination.page || 1;
            }

            this.renderProducts(append);
            this.renderStoreFilters();
            this.updateLoadMore();
        } catch (error) {
            console.error('[Category Landing] loadProducts error:', error);
            this.showError('Ürünler yüklenirken bir sorun oluştu.');
        } finally {
            this.isLoading = false;
        }
    }

    renderProducts(append = false) {
        const container = this.elements.container;
        if (!container) return;

        if (!append) {
            container.innerHTML = '';
        }

        if (this.products.length === 0) {
            container.innerHTML = `
                <div class="no-products" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🪵</div>
                    <h3>Ürün bulunamadı</h3>
                    <p>Filtreleri değiştirerek tekrar deneyin.</p>
                </div>
            `;
            return;
        }

        this.products.forEach((product) => {
            const card = this.createProductCard(product);
            container.appendChild(card);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product.id;

        const mainImage = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : 'https://via.placeholder.com/400x300?text=No+Image';

        const price = Number(product.price || 0);
        const comparePrice = product.compare_price ? Number(product.compare_price) : null;
        const discount = comparePrice && comparePrice > price
            ? Math.round(((comparePrice - price) / comparePrice) * 100)
            : null;

        const storeName = product.store?.name || 'Zanaatkâr';
        const storeLink = product.store?.id
            ? `products.html?storeId=${product.store.id}${product.store.slug ? `&storeSlug=${product.store.slug}` : ''}`
            : null;

        const detailUrl = product.slug
            ? `product-detail.html?slug=${product.slug}`
            : `product-detail.html?id=${product.id}`;

        const ratingValue = Number(product.rating || 0).toFixed(1);
        const badges = Array.isArray(product.badges) ? product.badges : [];

        card.innerHTML = `
            <div class="journey-indicator"></div>
            <div class="product-image">
                <img src="${mainImage}" alt="${product.title}" loading="lazy">
                ${product.stock <= 0 ? '<span class="stock-badge out-of-stock">Stokta Yok</span>' : ''}
                ${discount ? `<span class="stock-badge discount">-${discount}%</span>` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-artisan">
                    by ${storeLink ? `<a href="${storeLink}" data-store-link="true">${storeName}</a>` : storeName}
                </p>
                <p class="product-description">${product.short_description || (product.description ? product.description.substring(0, 100) + '…' : '')}</p>
                <div class="social-proof">
                    <span class="rating-stars">${'★'.repeat(Math.round(product.rating || 0))}${'☆'.repeat(5 - Math.round(product.rating || 0))}</span>
                    <span class="rating-value">${ratingValue}</span>
                    <span class="purchases-count">${product.total_sales || 0} satış</span>
                </div>
                <div class="product-badges">
                    ${badges.map((badge) => `<span class="badge">${badge}</span>`).join('')}
                </div>
                <div class="product-price">
                    <span class="price-current">₺${price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    ${comparePrice ? `<span class="price-original">₺${comparePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>` : ''}
                </div>
                <div class="product-actions">
                    <button class="btn btn-card btn-add-cart" data-product-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>
                        ${product.stock <= 0 ? 'Stokta Yok' : 'Sepete Ekle'}
                    </button>
                    <button class="btn btn-card btn-wishlist" data-product-id="${product.id}">
                        <span class="heart-icon">♡</span>
                    </button>
                </div>
            </div>
        `;

        card.addEventListener('click', (event) => {
            if (event.target.closest('button') || event.target.closest('a[data-store-link="true"]')) {
                return;
            }
            window.location.href = detailUrl;
        });

        return card;
    }

    renderStoreFilters() {
        if (!this.elements.storeFilters) return;

        const storeMap = new Map();
        this.products.forEach((product) => {
            if (product.store && product.store.id) {
                storeMap.set(product.store.id, product.store);
            }
        });

        if (storeMap.size === 0) {
            this.elements.storeFilters.innerHTML = '<p style="opacity:0.7;">Bu koleksiyonda yalnızca bu kategoriye ait ürünler mevcut.</p>';
            return;
        }

        const items = [
            `<label class="filter-option">
                <input type="radio" name="storeFilter" value="" ${this.selectedStoreId ? '' : 'checked'}>
                <span>Tüm Atölyeler</span>
            </label>`
        ];

        Array.from(storeMap.values()).forEach((store) => {
            items.push(`
                <label class="filter-option">
                    <input type="radio" name="storeFilter" value="${store.id}" ${this.selectedStoreId === store.id ? 'checked' : ''}>
                    <span>${store.name}</span>
                </label>
            `);
        });

        this.elements.storeFilters.innerHTML = items.join('');
    }

    updateLoadMore() {
        const button = this.elements.loadMore;
        if (!button) return;

        if (this.currentPage >= this.totalPages) {
            button.style.display = 'none';
        } else {
            button.style.display = 'inline-flex';
        }
    }

    setupEventListeners() {
        if (this.elements.loadMore) {
            this.elements.loadMore.addEventListener('click', () => {
                if (this.currentPage >= this.totalPages) return;
                this.currentPage += 1;
                this.loadProducts({ append: true });
            });
        }

        if (this.elements.subcategoryFilters) {
            this.elements.subcategoryFilters.addEventListener('change', (event) => {
                if (event.target.name === 'subcategory') {
                    this.selectedChildCategory = event.target.value || null;
                    this.currentPage = 1;
                    this.loadProducts();
                }
            });
        }

        if (this.elements.storeFilters) {
            this.elements.storeFilters.addEventListener('change', (event) => {
                if (event.target.name === 'storeFilter') {
                    this.selectedStoreId = event.target.value || null;
                    this.currentPage = 1;
                    this.loadProducts();
                }
            });
        }

        if (this.elements.priceSlider) {
            this.elements.priceSlider.addEventListener('input', (event) => {
                const value = Number(event.target.value);
                if (this.elements.priceValue) {
                    this.elements.priceValue.textContent = `₺${value.toLocaleString('tr-TR')}`;
                }
            });

            this.elements.priceSlider.addEventListener('change', (event) => {
                const value = Number(event.target.value);
                this.maxPrice = value;
                this.currentPage = 1;
                this.loadProducts();
            });
        }

        if (this.elements.searchInput) {
            let debounceTimer;
            this.elements.searchInput.addEventListener('input', (event) => {
                clearTimeout(debounceTimer);
                const term = event.target.value;
                debounceTimer = setTimeout(() => {
                    this.searchTerm = term;
                    this.currentPage = 1;
                    this.loadProducts();
                }, 400);
            });
        }

        if (this.elements.clearFilters) {
            this.elements.clearFilters.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        if (this.elements.mobileToggle && this.elements.sidebar && this.elements.overlay) {
            const openSidebar = () => {
                this.elements.sidebar.classList.add('open');
                this.elements.overlay.classList.add('active');
            };
            const closeSidebar = () => {
                this.elements.sidebar.classList.remove('open');
                this.elements.overlay.classList.remove('active');
            };

            this.elements.mobileToggle.addEventListener('click', openSidebar);
            this.elements.overlay.addEventListener('click', closeSidebar);
            this.elements.closeMobile?.addEventListener('click', closeSidebar);
        }

        document.addEventListener('click', (event) => {
            if (event.target.matches('.btn-add-cart')) {
                const productId = event.target.dataset.productId;
                if (productId) {
                    this.addToCart(productId);
                }
            }
        });
    }

    resetFilters() {
        this.selectedChildCategory = null;
        this.selectedStoreId = null;
        this.maxPrice = this.priceCeiling;
        this.searchTerm = '';
        this.currentPage = 1;

        if (this.elements.priceSlider && this.priceCeiling !== null) {
            this.elements.priceSlider.value = String(this.priceCeiling);
        }
        if (this.elements.priceValue && this.priceCeiling !== null) {
            this.elements.priceValue.textContent = `₺${this.priceCeiling.toLocaleString('tr-TR')}`;
        }
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }

        this.renderSubcategoryFilters();
        this.renderStoreFilters();
        this.loadProducts();
    }

    showLoading() {
        if (!this.elements.container) return;
        this.elements.container.innerHTML = `
            <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                <p>Ürünler yükleniyor...</p>
            </div>
        `;
    }

    showError(message) {
        if (!this.elements.container) return;
        this.elements.container.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #b91c1c;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h3>Bir sorun oluştu</h3>
                <p>${message}</p>
            </div>
        `;
    }

    async addToCart(productId) {
        try {
            const product = this.products.find((item) => item.id === productId);
            if (!product) {
                alert('Ürün bulunamadı');
                return;
            }

            if (product.stock <= 0) {
                alert('Bu ürün stokta yok.');
                return;
            }

            if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
                const response = await this.apiClient.post('/cart/items', {
                    product_id: productId,
                    quantity: 1,
                });

                if (response.success) {
                    this.showToast('Ürün sepetinize eklendi!');
                    if (window.updateCartCount) {
                        window.updateCartCount();
                    }
                    return;
                }
            }

            this.addToLocalCart(product);
            this.showToast('Ürün sepetinize eklendi!');
        } catch (error) {
            console.error('[Category Landing] addToCart error:', error);
            this.showToast('Ürün sepete eklenemedi.');
        }
    }

    addToLocalCart(product) {
        try {
            const cart = JSON.parse(localStorage.getItem('guestCart') || '[]');
            const existing = cart.find((item) => item.id === product.id);
            if (existing) {
                existing.quantity = Math.min((existing.quantity || 1) + 1, product.stock || 1);
            } else {
                cart.push({
                    id: product.id,
                    title: product.title,
                    price: product.price,
                    image: Array.isArray(product.images) && product.images.length ? product.images[0] : null,
                    quantity: 1,
                    stock: product.stock,
                });
            }
            localStorage.setItem('guestCart', JSON.stringify(cart));
        } catch (error) {
            console.warn('[Category Landing] addToLocalCart failed:', error);
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification success';
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: #16a34a;
            color: white;
            padding: 0.9rem 1.4rem;
            border-radius: 10px;
            box-shadow: 0 6px 18px rgba(22, 163, 74, 0.25);
            z-index: 9999;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CategoryLandingPage());
} else {
    new CategoryLandingPage();
}
