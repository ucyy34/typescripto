/**
 * Category Page Integration
 * Connects category landing pages to backend API data
 */

class CategoryPage {
  constructor() {
    const body = document.body || document.querySelector('body');
    this.categorySlug = body?.dataset?.categorySlug || null;
    this.productsContainerId = body?.dataset?.productsContainerId || null;
    this.loadMoreButtonId = body?.dataset?.loadMoreId || null;

    if (!this.categorySlug || !this.productsContainerId) {
      console.warn('[CategoryPage] Missing category configuration. Skipping initialization.');
      return;
    }

    this.apiClient = new ApiClient();
    this.categoryData = null;
    this.products = [];
    this.filteredProducts = [];
    this.productIndex = new Map();
    this.displayedProducts = 0;
    this.productsPerLoad = 9;
    this.filters = {
      activeButton: 'all',
      maxPrice: null,
      storeIds: new Set(),
      minRating: 0,
      searchQuery: '',
    };

    this.filterOptions = [
      { key: 'all', label: '🌟 All Treasures', predicate: () => true },
      {
        key: 'on-sale',
        label: '💸 On Sale',
        predicate: (product) =>
          product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price || product.compare_price),
      },
      {
        key: 'best-rated',
        label: '⭐ Rated 4.5+',
        predicate: (product) => (parseFloat(product.rating || 0) >= 4.5),
      },
      {
        key: 'low-stock',
        label: '⚠️ Limited Stock',
        predicate: (product) => {
          const stock = Number(product.stock || 0);
          const threshold = Number(product.low_stock_threshold || 0);
          return stock > 0 && threshold > 0 && stock <= threshold;
        },
      },
      {
        key: 'featured',
        label: '🌠 Featured',
        predicate: (product) => Boolean(product.is_featured),
      },
    ];

    this.init();
  }

  async init() {
    this.productsContainer = document.getElementById(this.productsContainerId);
    if (!this.productsContainer) {
      console.error('[CategoryPage] Products container not found:', this.productsContainerId);
      return;
    }

    this.loadMoreButton = this.loadMoreButtonId ? document.getElementById(this.loadMoreButtonId) : null;

    try {
      this.showLoading();
      await this.loadCategory();
      await this.loadProducts();
      this.renderHero();
      this.setupFilterButtons();
      this.setupSidebarFilters();
      this.setupMobileFilters();
      this.setupLoadMore();
      this.setupSearch();
      this.applyAndRender(true);
    } catch (error) {
      console.error('[CategoryPage] Initialization error:', error);
      this.showError('Failed to load category data.');
    } finally {
      this.hideLoading();
    }
  }

  async loadCategory() {
    try {
      const response = await this.apiClient.getCategoryBySlug(this.categorySlug);
      if (response.success) {
        this.categoryData = response.data;
        return;
      }

      throw new Error(response.message || 'Category not found');
    } catch (error) {
      console.error('[CategoryPage] Error loading category:', error);
      throw error;
    }
  }

  async loadProducts() {
    try {
      const response = await this.apiClient.getCategoryProducts(this.categoryData.id, {
        limit: 60,
        sort: '-created_at',
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to load products');
      }

      this.products = Array.isArray(response.data) ? response.data : [];

      if (this.products.length === 0) {
        console.warn('[CategoryPage] No products returned for category', this.categorySlug);
      }

      const prices = this.products
        .map((product) => parseFloat(product.price))
        .filter((price) => !Number.isNaN(price));

      const maxPrice = prices.length > 0 ? Math.ceil(Math.max(...prices)) : 0;
      const minPrice = prices.length > 0 ? Math.floor(Math.min(...prices)) : 0;

      this.filters.maxPrice = maxPrice || 0;
      this.priceBounds = { min: minPrice, max: maxPrice };
    } catch (error) {
      console.error('[CategoryPage] Error loading products:', error);
      throw error;
    }
  }

  renderHero() {
    if (!this.categoryData) return;

    if (this.categoryData.meta_title) {
      document.title = this.categoryData.meta_title;
    } else if (this.categoryData.name) {
      document.title = `${this.categoryData.name} - DostanWebCSS Marketplace`;
    }

    if (this.categoryData.meta_description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', this.categoryData.meta_description);
      }
    }

    if (window.seoMetaManager && typeof window.seoMetaManager.updateCategoryMeta === 'function') {
      try {
        window.seoMetaManager.updateCategoryMeta(this.categoryData);
      } catch (error) {
        console.warn('[CategoryPage] Failed to update SEO metadata:', error);
      }
    }

    const heroTitle = document.querySelector('.category-hero h1');
    if (heroTitle && this.categoryData.name) {
      const icon = this.categoryData.icon || (heroTitle.textContent.match(/[\p{Emoji}\p{Extended_Pictographic}]/u) || [''])[0];
      heroTitle.textContent = `${icon ? `${icon} ` : ''}${this.categoryData.name}`;
    }

    const heroDescription = document.querySelector('.category-hero p');
    if (heroDescription && this.categoryData.description) {
      heroDescription.textContent = this.categoryData.description;
    }

    const statNumbers = document.querySelectorAll('.category-stats .stat-number');
    if (statNumbers[0]) {
      statNumbers[0].textContent = this.products.length.toString();
    }

    if (statNumbers[1]) {
      statNumbers[1].textContent = this.getUniqueStoreCount().toString();
    }

    if (statNumbers[2]) {
      const avgRating = this.getAverageRating();
      statNumbers[2].textContent = avgRating > 0 ? avgRating.toFixed(1) : '—';
    }
  }

  getUniqueStoreCount() {
    const ids = new Set();
    this.products.forEach((product) => {
      if (product.store?.id) {
        ids.add(product.store.id);
      }
    });
    return ids.size;
  }

  getAverageRating() {
    if (this.products.length === 0) return 0;
    const total = this.products.reduce((sum, product) => sum + Number(product.rating || 0), 0);
    return total / this.products.length;
  }

  setupFilterButtons() {
    const container = document.querySelector('.filter-buttons');
    if (!container) return;

    const availableOptions = this.filterOptions.filter((option) => {
      if (option.key === 'all') return true;
      return this.products.some(option.predicate);
    });

    container.innerHTML = availableOptions
      .map(
        (option, index) => `
          <button class="filter-btn ${index === 0 ? 'active' : ''}" data-filter="${option.key}">
            ${option.label}
          </button>
        `
      )
      .join('');

    this.filters.activeButton = availableOptions.length > 0 ? availableOptions[0].key : 'all';

    container.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-filter]');
      if (!button) return;

      container.querySelectorAll('button[data-filter]').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');

      this.filters.activeButton = button.dataset.filter;
      this.applyAndRender(true);
    });
  }

  setupSidebarFilters() {
    const sidebar = document.getElementById('filtersSidebar');
    if (!sidebar) return;

    const uniqueStores = this.getStoreList();
    const maxPrice = this.priceBounds?.max || 0;
    const minPrice = this.priceBounds?.min || 0;

    sidebar.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg);">
        <h3 style="margin:0;">🔎 Refine Results</h3>
        <button id="closeMobileFilters" style="display:none;background:none;border:none;font-size:1.5rem;cursor:pointer;">×</button>
      </div>

      <div class="filter-group">
        <h4>🏪 Store</h4>
        <div class="store-filter-list" id="categoryStoreFilters">
          ${uniqueStores
            .map(
              (store) => `
                <label class="filter-option">
                  <input type="checkbox" value="${store.id}" data-store-filter>
                  <span>${this.escapeHtml(store.name)}</span>
                </label>
              `
            )
            .join('')}
          ${uniqueStores.length === 0 ? '<p style="font-size:0.9rem;color:var(--forest-medium);">Stores will appear as products are approved.</p>' : ''}
        </div>
      </div>

      <div class="filter-group">
        <h4>💰 Maximum Price</h4>
        <input type="range" id="priceRange" min="${minPrice}" max="${Math.max(maxPrice, 1)}" value="${Math.max(maxPrice, 1)}" step="1" class="price-range-slider">
        <div style="display:flex;justify-content:space-between;font-size:0.9rem;color:var(--forest-medium);">
          <span>${this.formatCurrency(minPrice)}</span>
          <span id="priceValue">${this.formatCurrency(Math.max(maxPrice, 1))}</span>
        </div>
      </div>

      <div class="filter-group">
        <h4>⭐ Minimum Rating</h4>
        <label class="filter-option">
          <input type="radio" name="ratingFilter" value="0" checked>
          <span>Any rating</span>
        </label>
        <label class="filter-option">
          <input type="radio" name="ratingFilter" value="4.5">
          <span>4.5 stars & above</span>
        </label>
        <label class="filter-option">
          <input type="radio" name="ratingFilter" value="4">
          <span>4.0 stars & above</span>
        </label>
      </div>

      <button class="btn btn-secondary" id="clearFilters" style="width:100%;">🧹 Clear Filters</button>
    `;

    sidebar.querySelectorAll('input[data-store-filter]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const { value } = checkbox;
        if (checkbox.checked) {
          this.filters.storeIds.add(value);
        } else {
          this.filters.storeIds.delete(value);
        }
        this.applyAndRender(true);
      });
    });

    const priceRange = sidebar.querySelector('#priceRange');
    const priceValue = sidebar.querySelector('#priceValue');

    if (priceRange) {
      priceRange.addEventListener('input', (event) => {
        const nextValue = Number(event.target.value || 0);
        this.filters.maxPrice = nextValue;
        if (priceValue) {
          priceValue.textContent = this.formatCurrency(nextValue);
        }
      });

      priceRange.addEventListener('change', () => this.applyAndRender(true));
    }

    sidebar.querySelectorAll('input[name="ratingFilter"]').forEach((radio) => {
      radio.addEventListener('change', (event) => {
        this.filters.minRating = Number(event.target.value || 0);
        this.applyAndRender(true);
      });
    });

    const clearFilters = sidebar.querySelector('#clearFilters');
    if (clearFilters) {
      clearFilters.addEventListener('click', () => {
        this.filters.storeIds.clear();
        this.filters.minRating = 0;
        this.filters.maxPrice = this.priceBounds?.max || 0;

        sidebar.querySelectorAll('input[data-store-filter]').forEach((checkbox) => {
          checkbox.checked = false;
        });

        const priceSlider = sidebar.querySelector('#priceRange');
        if (priceSlider) {
          priceSlider.value = Math.max(this.priceBounds?.max || 0, 1);
        }
        if (priceValue) {
          priceValue.textContent = this.formatCurrency(Math.max(this.priceBounds?.max || 0, 1));
        }

        const anyRating = sidebar.querySelector('input[name="ratingFilter"][value="0"]');
        if (anyRating) {
          anyRating.checked = true;
        }

        this.applyAndRender(true);
      });
    }
  }

    setupMobileFilters() {
        const sidebar = document.getElementById('filtersSidebar');
        const toggle = document.getElementById('mobileFilterToggle');
        const overlay = document.getElementById('filterOverlay');
    const closeButton = document.getElementById('closeMobileFilters');

    if (!sidebar || !overlay) return;

    const openSidebar = () => {
      sidebar.classList.add('open');
      overlay.classList.add('visible');
    };

    const closeSidebar = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    };

    toggle?.addEventListener('click', openSidebar);
    closeButton?.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    if (toggle) {
      toggle.style.display = 'block';
    }
  }

  setupLoadMore() {
    if (!this.loadMoreButton) return;

    this.loadMoreButton.addEventListener('click', () => {
      this.renderProducts();
    });
  }

  setupSearch() {
    const searchInput = document.getElementById('globalSearch') || document.querySelector('.search-input');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', (event) => {
      const value = event.target.value || '';
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.filters.searchQuery = value.trim().toLowerCase();
        this.applyAndRender(true);
      }, 300);
    });
  }

  applyAndRender(reset = false) {
    this.filteredProducts = this.products.filter((product) => this.applyFilters(product));
    this.renderProducts(reset);
  }

  applyFilters(product) {
    const activeFilter = this.filterOptions.find((option) => option.key === this.filters.activeButton);
    if (activeFilter && !activeFilter.predicate(product)) {
      return false;
    }

    const price = parseFloat(product.price || 0);
    if (this.filters.maxPrice && !Number.isNaN(price) && price > this.filters.maxPrice) {
      return false;
    }

    if (this.filters.storeIds.size > 0) {
      const storeId = product.store?.id;
      if (!storeId || !this.filters.storeIds.has(storeId)) {
        return false;
      }
    }

    if (this.filters.minRating > 0) {
      const rating = Number(product.rating || 0);
      if (rating < this.filters.minRating) {
        return false;
      }
    }

    if (this.filters.searchQuery) {
      const haystack = `${product.title || ''} ${product.short_description || ''} ${product.description || ''} ${
        product.store?.name || ''
      }`.toLowerCase();
      if (!haystack.includes(this.filters.searchQuery)) {
        return false;
      }
    }

    const stock = Number(product.stock || 0);
    if (stock <= 0 || product.is_active === false) {
      return false;
    }

    return true;
  }

  renderProducts(reset = false) {
    if (reset) {
      this.productsContainer.innerHTML = '';
      this.displayedProducts = 0;
    }

    this.productIndex.clear();

    if (this.filteredProducts.length === 0) {
      this.productsContainer.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--forest-medium);">
          <div style="font-size:3rem;margin-bottom:1rem;">🧭</div>
          <h3>No treasures match your filters</h3>
          <p>Try adjusting the filters or search terms to discover more Nordic creations.</p>
        </div>
      `;
      if (this.loadMoreButton) {
        this.loadMoreButton.style.display = 'none';
      }
      return;
    }

    const slice = this.filteredProducts.slice(
      this.displayedProducts,
      this.displayedProducts + this.productsPerLoad
    );

    slice.forEach((product) => {
      this.productIndex.set(product.id, product);
      this.productsContainer.appendChild(this.createProductCard(product));
    });

    this.displayedProducts += slice.length;

    if (this.loadMoreButton) {
      this.loadMoreButton.style.display = this.displayedProducts >= this.filteredProducts.length ? 'none' : 'block';
    }
  }

  createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card fade-in';
    card.dataset.productId = product.id;

    const mainImage = Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : 'https://via.placeholder.com/400x300?text=Nordic+Treasure';

    const price = parseFloat(product.price || 0);
    const comparePrice = product.compare_price ? parseFloat(product.compare_price) : null;
    const discount = comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

    const stock = Number(product.stock || 0);
    const threshold = Number(product.low_stock_threshold || 0);
    const stockClass = stock <= 0 ? 'out-of-stock' : stock <= threshold ? 'low-stock' : 'in-stock';
    const stockLabel = stock <= 0 ? 'Out of Stock' : stock <= threshold ? `Low Stock (${stock})` : 'In Stock';

    const badges = [];
    if (product.is_featured) {
      badges.push('<span class="badge featured">Featured</span>');
    }
    if (discount) {
      badges.push(`<span class="badge discount">-${discount}%</span>`);
    }
    if (Array.isArray(product.badges)) {
      product.badges.forEach((badge) => {
        const label = this.formatBadgeLabel(badge);
        if (label) {
          badges.push(`<span class="badge ${badge}">${label}</span>`);
        }
      });
    }

    card.innerHTML = `
      <div class="journey-indicator"></div>
      <div class="product-image">
        <img src="${mainImage}" alt="${this.escapeHtml(product.title || 'Nordic product')}" loading="lazy">
        <span class="stock-badge ${stockClass}">${stockLabel}</span>
      </div>
      <div class="product-info">
        <h3 class="product-title">${this.escapeHtml(product.title || 'Unnamed Product')}</h3>
        <p class="product-artisan">${product.store?.name ? `by ${this.escapeHtml(product.store.name)}` : 'Independent Artisan'}</p>
        <p class="product-description">${this.escapeHtml(product.short_description || this.truncateText(product.description, 120))}</p>
        <div class="social-proof">
          <span class="rating-stars">${this.buildRatingStars(product.rating)}</span>
          <span class="rating-value">${Number(product.rating || 0).toFixed(1)}</span>
          <span class="purchases-count">${Number(product.total_sales || 0)} sold</span>
        </div>
        <div class="product-badges">${badges.join('')}</div>
        <div class="product-price">
          <span class="price-current">${this.formatCurrency(price)}</span>
          ${comparePrice ? `<span class="price-original">${this.formatCurrency(comparePrice)}</span>` : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn-card btn-add-cart" data-product-id="${product.id}" ${stock <= 0 ? 'disabled' : ''}>
            ${stock <= 0 ? 'Sold Out' : 'Add to Cart'}
          </button>
          <button class="btn btn-card" data-action="view" data-product-id="${product.id}">View Details</button>
        </div>
      </div>
    `;

    card.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (button) return;
      window.location.href = `product-detail.html?id=${product.id}`;
    });

    card.querySelector('[data-action="view"]').addEventListener('click', (event) => {
      event.stopPropagation();
      window.location.href = `product-detail.html?id=${product.id}`;
    });

    const addToCartButton = card.querySelector('.btn-add-cart');
    if (addToCartButton) {
      addToCartButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.handleAddToCart(product.id);
      });
    }

    return card;
  }

  async handleAddToCart(productId) {
    const product = this.productIndex.get(productId);
    if (!product) {
      alert('Product details are not available yet. Please try again.');
      return;
    }

    if (Number(product.stock || 0) <= 0) {
      alert('This product is currently out of stock.');
      return;
    }

    try {
      if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
        const response = await this.apiClient.post('/cart/items', {
          product_id: productId,
          quantity: 1,
        });

        if (response.success) {
          this.showToast('Product added to your cart!');
          if (window.updateCartCount) {
            window.updateCartCount();
          }
          return;
        }
      }

      this.addToLocalCart(product);
      this.showToast('Product added to your cart!');
    } catch (error) {
      console.error('[CategoryPage] Failed to add to cart:', error);
      this.addToLocalCart(product);
      this.showToast('Product added to your cart!');
    }
  }

  addToLocalCart(product) {
    const cart = JSON.parse(localStorage.getItem('localCart') || '[]');
    const existing = cart.find((item) => item.product_id === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ product_id: product.id, quantity: 1, product });
    }

    localStorage.setItem('localCart', JSON.stringify(cart));
  }

  showLoading() {
    this.productsContainer.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;">
        <div style="font-size:3rem;">🌀</div>
        <p>Loading handcrafted treasures...</p>
      </div>
    `;
  }

  hideLoading() {
    // No-op for now; actual rendering handles content
  }

  showError(message) {
    this.productsContainer.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#dc2626;">
        <div style="font-size:3rem;margin-bottom:1rem;">❌</div>
        <h3>${this.escapeHtml(message)}</h3>
        <p>Please refresh the page or try again later.</p>
      </div>
    `;
    if (this.loadMoreButton) {
      this.loadMoreButton.style.display = 'none';
    }
  }

  showToast(message) {
    if (window.showToast) {
      window.showToast(message);
      return;
    }

    alert(message);
  }

  getStoreList() {
    const stores = new Map();
    this.products.forEach((product) => {
      if (product.store?.id && product.store?.name) {
        stores.set(product.store.id, {
          id: product.store.id,
          name: product.store.name,
        });
      }
    });
    return Array.from(stores.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  formatCurrency(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(number);
  }

  buildRatingStars(rating) {
    const value = Number(rating || 0);
    const filled = Math.round(Math.min(Math.max(value, 0), 5));
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }

  formatBadgeLabel(badge) {
    if (!badge) return '';
    const map = {
      handmade: 'Handmade',
      limited: 'Limited',
      'eco-friendly': 'Eco',
      spiritual: 'Spiritual',
      traditional: 'Traditional',
      artisan: 'Artisan',
    };

    if (map[badge]) return map[badge];
    return badge.toString().replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  truncateText(text, limit = 100) {
    if (!text) return '';
    if (text.length <= limit) return text;
    return `${text.substring(0, limit)}…`;
  }

  escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.categoryPage = new CategoryPage();
  });
} else {
  window.categoryPage = new CategoryPage();
}
