/**
 * Store Directory Page Integration
 * Connects artisan.html to backend store listings
 */

class StoreDirectoryPage {
  constructor() {
    this.grid = document.getElementById('artisanGrid');
    if (!this.grid) {
      return;
    }

    this.apiClient = new ApiClient();
    this.filterBar = document.querySelector('.filter-bar');
    this.featuredSection = document.querySelector('.featured-artisan');
    this.heroCounts = {
      stores: document.getElementById('heroStoreCount'),
      products: document.getElementById('heroProductCount'),
      rating: document.getElementById('heroAverageRating'),
    };

    this.stores = [];
    this.filteredStores = [];
    this.filters = {
      status: 'all',
      country: 'all',
      search: '',
    };

    this.init();
  }

  async init() {
    try {
      this.showLoading();
      await this.loadStores();
      this.renderHero();
      this.renderFilterBar();
      this.renderFeaturedStore();
      this.applyFiltersAndRender();
      this.setupSearch();
    } catch (error) {
      console.error('[StoreDirectory] Failed to initialize:', error);
      this.showError('Mağazalar yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  }

  async loadStores() {
    const response = await this.apiClient.getStores({ status: 'approved', limit: 50, sort: '-rating' });
    if (!response.success) {
      throw new Error(response.message || 'Failed to load stores');
    }

    this.stores = (response.data || []).map((store) => ({
      ...store,
      rating: store.rating ? parseFloat(store.rating) : 0,
      total_sales: Number(store.total_sales || 0),
      product_count: Number(store.product_count || 0),
      city: store.city || '',
      country: store.country || '',
      banner: store.banner || '',
      logo: store.logo || '',
      description: store.description || 'Nordic artisan store sharing handmade treasures.',
    }));

    this.stores.sort((a, b) => b.rating - a.rating || b.total_sales - a.total_sales);
    this.filteredStores = [...this.stores];
  }

  renderHero() {
    if (!this.heroCounts) return;

    if (this.heroCounts.stores) {
      this.heroCounts.stores.textContent = this.stores.length.toString();
    }

    if (this.heroCounts.products) {
      const totalProducts = this.stores.reduce((sum, store) => sum + (store.product_count || 0), 0);
      this.heroCounts.products.textContent = totalProducts > 0 ? totalProducts.toLocaleString('en-US') : '—';
    }

    if (this.heroCounts.rating) {
      const avgRating = this.stores.length
        ? this.stores.reduce((sum, store) => sum + (store.rating || 0), 0) / this.stores.length
        : 0;
      this.heroCounts.rating.textContent = avgRating > 0 ? `${avgRating.toFixed(1)}/5` : '—';
    }
  }

  renderFilterBar() {
    if (!this.filterBar) return;

    const countryCounts = new Map();
    this.stores.forEach((store) => {
      if (store.country) {
        const key = store.country.trim();
        countryCounts.set(key, (countryCounts.get(key) || 0) + 1);
      }
    });

    const topCountries = Array.from(countryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([country]) => country);

    const buttons = [
      { type: 'status', key: 'all', label: '🌟 Tüm Mağazalar' },
      { type: 'status', key: 'featured', label: '🔥 Öne Çıkanlar' },
      { type: 'status', key: 'top', label: '⭐ 4.5+ Puan' },
      { type: 'status', key: 'bestsellers', label: '🏆 Çok Satanlar' },
      ...topCountries.map((country) => ({ type: 'country', key: country, label: `📍 ${country}` })),
    ];

    this.filterBar.innerHTML = buttons
      .map((button, index) => `
        <button class="filter-btn ${index === 0 ? 'active' : ''}" data-type="${button.type}" data-key="${button.key}">
          ${button.label}
        </button>
      `)
      .join('');

    this.filters.status = 'all';
    this.filters.country = 'all';

    this.filterBar.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-type]');
      if (!button) return;

      this.filterBar.querySelectorAll('button[data-type]').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');

      const { type, key } = button.dataset;
      if (type === 'status') {
        this.filters.status = key;
        this.filters.country = 'all';
      } else if (type === 'country') {
        this.filters.country = key;
        this.filters.status = 'all';
      }

      this.applyFiltersAndRender();
    });
  }

  renderFeaturedStore() {
    if (!this.featuredSection) return;

    const featured = this.stores.find((store) => store.is_featured) || this.stores[0];
    if (!featured) {
      this.featuredSection.style.display = 'none';
      return;
    }

    const banner = featured.banner || 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=80';
    const logoLetter = featured.name ? featured.name.charAt(0).toUpperCase() : 'A';
    const rating = featured.rating ? featured.rating.toFixed(1) : '—';

    this.featuredSection.innerHTML = `
      <div class="featured-content">
        <div class="artisan-badge" style="position: static; display: inline-block; margin-bottom: var(--space-md);">
          ${featured.is_featured ? '🌟 Öne Çıkan Mağaza' : '🏅 Vitrin Mağaza'}
        </div>
        <h2 style="font-size: 2.5rem; margin-bottom: var(--space-md); color: white;">${this.escapeHtml(featured.name)}</h2>
        <p class="accent-text" style="font-size: 1.5rem; color: rgba(255, 255, 255, 0.9); margin-bottom: var(--space-lg);">
          ${this.escapeHtml(featured.city || 'Nordic Region')}
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-lg); margin: var(--space-xl) 0; text-align: center;">
          <div style="padding: var(--space-lg); background: rgba(255, 255, 255, 0.1); border-radius: var(--radius-md);">
            <div style="font-size: 2rem; margin-bottom: var(--space-sm);">⭐</div>
            <div style="font-size: 1.5rem; font-weight: 700;">${rating}</div>
            <div style="font-size: 0.9rem; opacity: 0.8;">Mağaza Puanı</div>
          </div>
          <div style="padding: var(--space-lg); background: rgba(255, 255, 255, 0.1); border-radius: var(--radius-md);">
            <div style="font-size: 2rem; margin-bottom: var(--space-sm);">🛍️</div>
            <div style="font-size: 1.5rem; font-weight: 700;">${featured.product_count || 0}</div>
            <div style="font-size: 0.9rem; opacity: 0.8;">Ürün</div>
          </div>
          <div style="padding: var(--space-lg); background: rgba(255, 255, 255, 0.1); border-radius: var(--radius-md);">
            <div style="font-size: 2rem; margin-bottom: var(--space-sm);">🎯</div>
            <div style="font-size: 1.5rem; font-weight: 700;">${featured.total_sales || 0}</div>
            <div style="font-size: 0.9rem; opacity: 0.8;">Satış</div>
          </div>
        </div>

        <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: var(--space-xl); color: rgba(255, 255, 255, 0.9);">
          ${this.escapeHtml(featured.description)}
        </p>

        <div style="display: flex; gap: var(--space-md); justify-content: center;">
          <button class="btn btn-secondary" data-action="view" data-store-id="${featured.id}" style="background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); color: white;">👁️ Mağazayı Gör</button>
          <button class="btn btn-accent" data-action="message" data-store-id="${featured.id}" style="background: rgba(255, 255, 255, 0.9); color: var(--forest-deep);">💬 Mesaj Gönder</button>
        </div>
      </div>

      <div class="featured-image">
        <div style="position: absolute; top: var(--space-md); left: var(--space-md); width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.85); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color: var(--forest-deep); font-weight:700;">
          ${this.escapeHtml(logoLetter)}
        </div>
        <img src="${banner}" alt="${this.escapeHtml(featured.name)} mağazası">
      </div>
    `;

    this.featuredSection.querySelectorAll('button[data-store-id]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this.handleStoreAction(button.dataset.action, featured.id);
      });
    });
  }

  applyFiltersAndRender() {
    this.filteredStores = this.stores.filter((store) => this.applyFilters(store));
    this.renderStores();
  }

  applyFilters(store) {
    if (this.filters.status === 'featured' && !store.is_featured) {
      return false;
    }

    if (this.filters.status === 'top' && store.rating < 4.5) {
      return false;
    }

    if (this.filters.status === 'bestsellers' && store.total_sales < 10) {
      return false;
    }

    if (this.filters.country !== 'all' && store.country.trim() !== this.filters.country) {
      return false;
    }

    if (this.filters.search) {
      const haystack = `${store.name || ''} ${store.description || ''} ${store.city || ''} ${store.country || ''}`.toLowerCase();
      if (!haystack.includes(this.filters.search)) {
        return false;
      }
    }

    return true;
  }

  renderStores() {
    this.grid.innerHTML = '';

    if (this.filteredStores.length === 0) {
      this.grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--forest-medium);">
          <div style="font-size:3rem;margin-bottom:1rem;">🧭</div>
          <h3>Aradığınız kriterlere uygun mağaza bulunamadı</h3>
          <p>Filtreleri temizleyerek tüm ustaları görüntüleyebilirsiniz.</p>
        </div>
      `;
      return;
    }

    this.filteredStores.forEach((store) => {
      const card = document.createElement('div');
      card.className = 'artisan-card';
      card.dataset.storeId = store.id;

      const banner = store.banner || 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=80';
      const logoLetter = store.name ? store.name.charAt(0).toUpperCase() : 'A';
      const rating = store.rating ? store.rating.toFixed(1) : '—';

      card.innerHTML = `
        <div class="artisan-image">
          <img src="${banner}" alt="${this.escapeHtml(store.name)} mağazası">
          ${store.is_featured ? '<div class="artisan-badge">🔥 Öne Çıkan</div>' : ''}
        </div>
        <div class="artisan-info">
          <h3 class="artisan-name">${this.escapeHtml(store.name)}</h3>
          <p class="artisan-specialty">${this.escapeHtml(store.city || 'Nordic Region')} · ${this.escapeHtml(store.country || 'Scandinavia')}</p>

          <div class="artisan-stats">
            <div class="stat">
              <span class="stat-number">${rating}</span>
              <span class="stat-label">Puan</span>
            </div>
            <div class="stat">
              <span class="stat-number">${store.product_count || 0}</span>
              <span class="stat-label">Ürün</span>
            </div>
            <div class="stat">
              <span class="stat-number">${store.total_sales || 0}</span>
              <span class="stat-label">Satış</span>
            </div>
          </div>

          <p class="artisan-description">${this.escapeHtml(store.description)}</p>

          <div class="artisan-actions">
            <button class="btn btn-primary" data-action="view" data-store-id="${store.id}">👁️ Mağazayı Gör</button>
            <button class="btn btn-secondary" data-action="message" data-store-id="${store.id}">✉️ İletişim</button>
          </div>
        </div>
      `;

      const badgeLogo = document.createElement('div');
      badgeLogo.style.cssText = 'position:absolute;top:var(--space-md);left:var(--space-md);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--forest-deep);';
      badgeLogo.textContent = logoLetter;
      card.querySelector('.artisan-image').appendChild(badgeLogo);

      card.querySelectorAll('button[data-store-id]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          this.handleStoreAction(button.dataset.action, button.dataset.storeId);
        });
      });

      this.grid.appendChild(card);
    });
  }

  handleStoreAction(action, storeId) {
    const store = this.stores.find((s) => s.id === storeId);
    if (!store) {
      alert('Mağaza bilgisi bulunamadı.');
      return;
    }

    if (action === 'view') {
      this.showToast(`${store.name} mağazasının vitrin sayfası yakında hazır olacak!`);
      return;
    }

    if (action === 'message') {
      const contact = store.email || store.phone || 'support@dostanwebcss.com';
      this.showToast(`${store.name} ile iletişime geçmek için: ${contact}`);
    }
  }

  setupSearch() {
    const searchInput = document.getElementById('globalSearch') || document.querySelector('.search-input');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', (event) => {
      clearTimeout(debounceTimer);
      const value = event.target.value || '';
      debounceTimer = setTimeout(() => {
        this.filters.search = value.trim().toLowerCase();
        this.applyFiltersAndRender();
      }, 300);
    });
  }

  showLoading() {
    this.grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;">
        <div style="font-size:3rem;">🌀</div>
        <p>Nordik ustalar yükleniyor...</p>
      </div>
    `;
  }

  showError(message) {
    this.grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#dc2626;">
        <div style="font-size:3rem;margin-bottom:1rem;">❌</div>
        <h3>${this.escapeHtml(message)}</h3>
        <p>Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.</p>
      </div>
    `;
  }

  showToast(message) {
    if (window.showToast) {
      window.showToast(message);
    } else {
      alert(message);
    }
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
    window.storeDirectoryPage = new StoreDirectoryPage();
  });
} else {
  window.storeDirectoryPage = new StoreDirectoryPage();
}
