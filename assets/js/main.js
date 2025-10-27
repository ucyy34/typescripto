/*
 * DOSTANWEBCSS - Main Application Module
 * Nordic marketplace core functionality
 * Optimized for performance and accessibility
 */

class DostanWebApp {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        this.isLoading = false;
        this.apiClient = typeof ApiClient === 'function' ? new ApiClient() : null;
        this.searchRequestId = 0;

        this.init();
    }

    init() {
        // Performance-first loading
        this.setupTheme();
        this.setupCartSystem();
        this.setupWishlistSystem();

        // Defer non-critical features
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => this.initSecondaryFeatures());
        } else {
            setTimeout(() => this.initSecondaryFeatures(), 100);
        }
    }

    initSecondaryFeatures() {
        this.setupScrollHideHeader();
        this.setupParallaxEffects();
        this.setupInfiniteScroll();
        this.setupMicroInteractions();
        this.setupSearchSystem();
        this.setupSmoothScrolling();
        this.setupLazyLoading();
        this.setupKeyboardNavigation();
        this.setupPerformanceOptimizations();
    }

    // Theme Management
    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);

        // Find existing theme toggle in header
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
            this.updateThemeToggleIcon(themeToggle);
        }

        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (!localStorage.getItem('theme')) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    updateThemeToggleIcon(themeToggle) {
        // Update icon based on current theme
        if (this.currentTheme === 'dark') {
            themeToggle.innerHTML = '☀️'; // Sun for light mode
            themeToggle.setAttribute('aria-label', 'Switch to light mode');
        } else {
            themeToggle.innerHTML = '🌙'; // Moon for dark mode
            themeToggle.setAttribute('aria-label', 'Switch to dark mode');
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);

        // Update theme toggle icon
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            this.updateThemeToggleIcon(themeToggle);
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Update theme toggle icon
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            this.updateThemeToggleIcon(themeToggle);
        }

        // Add transition for smooth theme change
        document.body.style.transition = 'all 0.4s ease-out';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 400);
    }

    // Scroll Hide Header System
    setupScrollHideHeader() {
        let lastScrollTop = 0;
        let ticking = false;

        const header = document.querySelector('.header');
        if (!header) return;

        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            // If we're at the very top, always show header
            if (scrollTop <= 50) {
                header.classList.remove('hidden');
            }
            // If scrolling down and past 200px, hide header
            else if (scrollTop > 200 && scrollTop > lastScrollTop) {
                header.classList.add('hidden');
            }
            // If scrolling up and scrolled up significantly (more than 150px), show header
            else if (scrollTop < lastScrollTop && (lastScrollTop - scrollTop) > 150) {
                header.classList.remove('hidden');
            }

            lastScrollTop = scrollTop;
            ticking = false;
        };

        // Throttle scroll events for performance
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(handleScroll);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
    }


    // Parallax Effects
    setupParallaxEffects() {
        const parallaxElements = document.querySelectorAll('.parallax-layer');

        if (parallaxElements.length === 0) return;

        const handleParallax = () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            const rate2 = scrolled * -0.3;
            const rate3 = scrolled * -0.1;

            parallaxElements.forEach((element, index) => {
                const speed = element.dataset.speed || (index * 0.2 + 0.1);
                element.style.transform = `translateY(${scrolled * speed}px)`;
            });
        };

        // Throttled scroll handler for performance
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    handleParallax();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // Infinite Scroll with Lazy Loading
    setupInfiniteScroll() {
        const productsContainer = document.querySelector('.products-container');
        if (!productsContainer) return;

        // Limit initial products to 6 products initially
        this.maxInitialProducts = 6;
        this.productsLoaded = 0;
        this.loadedRows = 0;

        // Hide extra products initially
        this.limitInitialProducts();

        // Setup first category button
        this.setupFirstCategoryButton();

        // REMOVED: Second category (Artisan Favorites) - now single category with Load More
        // this.setupSecondCategory();

        // Setup horizontal swipe functionality for product rows
        this.setupHorizontalSwipe();

        // Setup category navigation
        this.setupCategoryNavigation();
    }

    limitInitialProducts() {
        const productsContainer = document.querySelector('.products-container');
        const products = productsContainer.querySelectorAll('.product-card');

        // Show only first 6 products initially
        products.forEach((product, index) => {
            if (index >= this.maxInitialProducts) {
                product.style.display = 'none';
            } else {
                this.productsLoaded++;
            }
        });

        this.loadedRows = Math.ceil(this.productsLoaded / 5);
    }

    setupFirstCategoryButton() {
        const button = document.getElementById('loadMoreTreasures');
        if (!button) return;

        button.addEventListener('click', () => {
            this.loadMoreProducts();
        });
    }

    async loadMoreProducts() {
        if (this.isLoading) return;

        this.isLoading = true;
        const button = document.getElementById('loadMoreTreasures');
        if (!button) return;

        const originalButtonText = button.innerHTML;
        button.innerHTML = '✨ Loading treasures...';
        button.disabled = true;

        try {
            // Use HomeAPI to load more products from backend
            if (typeof HomeAPI !== 'undefined') {
                const productsContainer = document.getElementById('products-grid');

                // Fetch next page of products (HomeAPI handles pagination automatically)
                const moreProducts = await HomeAPI.fetchProducts(8);

                if (moreProducts && moreProducts.length > 0) {
                    // Append new products
                    const newProductsHTML = moreProducts.map(product => HomeAPI.createProductCard(product)).join('');
                    productsContainer.insertAdjacentHTML('beforeend', newProductsHTML);

                    console.log(`[Load More] Loaded ${moreProducts.length} more products (page ${HomeAPI.currentPage})`);
                } else {
                    // No more products available
                    button.innerHTML = '🎉 All treasures loaded!';
                    button.disabled = true;
                    setTimeout(() => {
                        button.style.display = 'none';
                    }, 2000);
                    return;
                }
            }
        } catch (error) {
            console.error('[Load More] Error loading products:', error);
            button.innerHTML = '❌ Failed to load';
            setTimeout(() => {
                button.innerHTML = originalButtonText;
                button.disabled = false;
            }, 2000);
            return;
        }

        // Reset button
        setTimeout(() => {
            if (!button.disabled) {
                button.innerHTML = originalButtonText;
            }
            this.isLoading = false;
        }, 1200);
    }

    generateMockProducts(count) {
        const products = [];
        const categories = ['handmade', 'limited', 'new', 'premium'];
        const titles = [
            'Nordic Forest Sculpture', 'Aurora Glass Bowl', 'Viking Leather Bag',
            'Mountain Pine Candle', 'Fjord Ceramic Vase', 'Sage Wood Carving',
            'Midnight Oil Painting', 'Storm Cloud Tapestry', 'Glacier Crystal Set'
        ];
        const artisans = ['Erik Nordström', 'Astrid Björk', 'Magnus Eriksson', 'Ingrid Svensson'];

        for (let i = 0; i < count; i++) {
            products.push({
                id: Date.now() + i,
                title: titles[Math.floor(Math.random() * titles.length)],
                artisan: artisans[Math.floor(Math.random() * artisans.length)],
                price: (Math.random() * 200 + 50).toFixed(2),
                originalPrice: Math.random() > 0.7 ? (Math.random() * 300 + 100).toFixed(2) : null,
                category: categories[Math.floor(Math.random() * categories.length)],
                rating: (Math.random() * 2 + 3).toFixed(1),
                purchases: Math.floor(Math.random() * 500 + 50),
                description: 'A masterpiece born from Nordic tradition and modern artistry.',
                image: `https://picsum.photos/400/300?random=${Date.now() + i}`
            });
        }

        return products;
    }

    appendProducts(products) {
        const container = document.querySelector('.products-container');
        if (!container) return;

        products.forEach(product => {
            const productElement = this.createProductCard(product);
            container.appendChild(productElement);
        });

        // Re-initialize Dostik bubbles for new products
        if (window.dostikAI) {
            window.dostikAI.initializeProductBubbles();
        }
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = `product-card ${product.category} fade-in`;
        card.dataset.productId = product.id;

        const badges = product.category ? `<span class="badge ${product.category}">${product.category}</span>` : '';
        const originalPrice = product.originalPrice ? `<span class="price-original">$${product.originalPrice}</span>` : '';

        card.innerHTML = `
            <div class="journey-indicator"></div>
            <div class="product-image">
                <img src="${product.image}" alt="${product.title}" loading="lazy">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-artisan">by ${product.artisan}</p>
                <p class="product-description">${product.description}</p>
                <div class="social-proof">
                    <span class="rating-stars">${'★'.repeat(Math.floor(product.rating))}</span>
                    <span class="rating-value">${product.rating}</span>
                    <span class="purchases-count">${product.purchases} sold</span>
                </div>
                <div class="product-badges">
                    ${badges}
                </div>
                <div class="product-price">
                    <span class="price-current">$${product.price}</span>
                    ${originalPrice}
                </div>
                <div class="product-actions">
                    <button class="btn btn-card btn-add-cart" data-product-id="${product.id}">
                        Add to Cart
                    </button>
                    <button class="btn btn-card btn-wishlist" data-product-id="${product.id}">
                        <span class="heart-icon">♡</span>
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    showLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'loading-indicator';
        indicator.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Discovering more treasures...</p>
        `;
        indicator.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem;
            gap: 1rem;
            color: var(--warm-brown);
        `;

        document.querySelector('.products-container').parentNode.appendChild(indicator);
        return indicator;
    }

    // Micro-interactions
    setupMicroInteractions() {
        // Breathing effect for cards
        this.setupBreathingCards();

        // Button hover effects
        document.addEventListener('mouseenter', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('btn')) {
                e.target.style.transform = 'translateY(-2px) scale(1.02)';
            }
        }, true);

        document.addEventListener('mouseleave', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('btn')) {
                e.target.style.transform = '';
            }
        }, true);

        // Heart animation for wishlist
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-wishlist')) {
                this.animateHeart(e.target);
            }
        });
    }

    setupBreathingCards() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('breathe');
                }
            });
        });

        document.querySelectorAll('.product-card').forEach(card => {
            observer.observe(card);
        });
    }

    animateHeart(button) {
        const heart = button.querySelector('.heart-icon');
        if (!heart) return;

        heart.style.animation = 'heartbeat 0.6s ease-out';
        setTimeout(() => {
            heart.style.animation = '';
        }, 600);

        // Add CSS for heartbeat animation
        if (!document.querySelector('#heartbeat-style')) {
            const style = document.createElement('style');
            style.id = 'heartbeat-style';
            style.textContent = `
                @keyframes heartbeat {
                    0% { transform: scale(1); }
                    25% { transform: scale(1.3); color: #e74c3c; }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Advanced Search System
    setupSearchSystem() {
        if (!this.apiClient) return;

        const inputs = this.getGlobalSearchInputs();
        if (inputs.length === 0) return;

        const isProductsPage = this.isProductsPage();
        const detachOnClickOutside = (event) => {
            inputs.forEach((input) => {
                const container = input.closest('.search-container')?.querySelector('.search-suggestions');
                if (!container) return;
                if (container.contains(event.target) || input.contains(event.target)) return;
                this.hideSuggestions(container);
            });
        };

        document.addEventListener('click', detachOnClickOutside);

        inputs.forEach((input) => {
            if (input.dataset.searchEnhanced === 'true') return;
            input.dataset.searchEnhanced = 'true';
            input.setAttribute('autocomplete', 'off');

            const container = this.ensureSuggestionContainer(input);
            if (!container) return;

            let debounceTimer;

            input.addEventListener('input', (event) => {
                const value = event.target.value;
                clearTimeout(debounceTimer);

                if (value.trim().length < 2) {
                    if (value.trim().length === 0) {
                        this.hideSuggestions(container);
                    } else {
                        this.renderSuggestionMessage(container, 'En az 2 karakter yazın');
                    }
                    return;
                }

                debounceTimer = setTimeout(() => {
                    this.fetchSearchSuggestions(value, input);
                }, 250);
            });

            input.addEventListener('focus', () => {
                if (input.value.trim().length >= 2) {
                    this.fetchSearchSuggestions(input.value, input);
                } else {
                    this.renderSuggestionMessage(container, 'Nordik hazineleri keşfetmek için yazmaya başlayın');
                }
            });

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const query = input.value.trim();
                    if (!query) return;

                    if (isProductsPage) {
                        this.updateUrlSearchParam(query);
                        this.emitGlobalSearch(query);
                    } else {
                        this.navigateToSearchResults(query);
                    }

                    this.hideSuggestions(container);
                }

                if (event.key === 'Escape') {
                    this.hideSuggestions(container);
                    input.blur();
                }
            });
        });
    }

    getGlobalSearchInputs() {
        const inputs = Array.from(document.querySelectorAll('#globalSearch'));
        if (inputs.length > 0) {
            return inputs;
        }
        return Array.from(document.querySelectorAll('.nav-search .search-input'));
    }

    isProductsPage() {
        const path = window.location.pathname || '';
        return /products\.html$/i.test(path);
    }

    resolvePagePath(relativePath) {
        if (/^https?:/i.test(relativePath) || relativePath.startsWith('/')) {
            return relativePath;
        }

        const inPagesDir = window.location.pathname.includes('/pages/');
        return `${inPagesDir ? '' : 'pages/'}${relativePath}`.replace('//', '/');
    }

    updateUrlSearchParam(query) {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('search', query);
            window.history.replaceState({}, '', url.toString());
        } catch (error) {
            console.warn('[DostanWebApp] Unable to update search param', error);
        }
    }

    emitGlobalSearch(query) {
        document.dispatchEvent(new CustomEvent('dostan:search', { detail: { query } }));
    }

    navigateToSearchResults(query) {
        const target = `${this.resolvePagePath('products.html')}?search=${encodeURIComponent(query)}`;
        window.location.href = target;
    }

    ensureSuggestionContainer(input) {
        const wrapper = input.closest('.search-container');
        if (!wrapper) return null;

        let container = wrapper.querySelector('.search-suggestions');
        if (!container) {
            container = document.createElement('div');
            container.className = 'search-suggestions';
            wrapper.appendChild(container);
        }

        return container;
    }

    hideSuggestions(container) {
        if (!container) return;
        container.classList.remove('active');
        container.innerHTML = '';
    }

    renderSuggestionMessage(container, message) {
        if (!container) return;
        container.innerHTML = `<div class="search-suggestion-empty">${message}</div>`;
        container.classList.add('active');
    }

    renderSuggestionError(container, message) {
        if (!container) return;
        container.innerHTML = `<div class="search-suggestion-error">${message}</div>`;
        container.classList.add('active');
    }

    renderSuggestionLoading(container) {
        if (!container) return;
        container.innerHTML = '<div class="search-suggestion-loading">Aranıyor...</div>';
        container.classList.add('active');
    }

    formatPrice(value) {
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) return '';
        try {
            return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(numericValue);
        } catch (error) {
            return `₺${numericValue.toFixed(2)}`;
        }
    }

    buildProductMeta(product) {
        const parts = [];
        if (product.store?.name) parts.push(product.store.name);
        if (product.category?.name) parts.push(product.category.name);
        if (product.rating && Number(product.rating) > 0) {
            const ratingValue = Number(product.rating).toFixed(1);
            parts.push(`⭐ ${ratingValue}`);
        }
        return parts.join(' • ');
    }

    renderSearchSuggestions(input, data) {
        const container = this.ensureSuggestionContainer(input);
        if (!container) return;

        const { results = [], suggestions = [] } = data || {};

        if ((!results || results.length === 0) && (!suggestions || suggestions.length === 0)) {
            this.renderSuggestionMessage(container, `"${input.value.trim()}" için sonuç bulunamadı`);
            return;
        }

        container.innerHTML = '';
        container.classList.add('active');

        if (results && results.length > 0) {
            const list = document.createElement('div');
            list.className = 'search-suggestion-list';

            results.slice(0, 6).forEach((product) => {
                const item = document.createElement('a');
                item.className = 'search-suggestion-item';
                item.href = `${this.resolvePagePath('product-detail.html')}?slug=${encodeURIComponent(product.slug)}`;
                item.innerHTML = `
                    <div class="search-suggestion-main">
                        <div class="search-suggestion-title">${product.title}</div>
                        <div class="search-suggestion-meta">${this.buildProductMeta(product)}</div>
                    </div>
                    <div class="search-suggestion-price">${this.formatPrice(product.price)}</div>
                `;

                item.addEventListener('click', () => {
                    this.hideSuggestions(container);
                });

                list.appendChild(item);
            });

            container.appendChild(list);
        }

        if (suggestions && suggestions.length > 0) {
            const chips = document.createElement('div');
            chips.className = 'search-suggestion-chips';

            suggestions.slice(0, 8).forEach((suggestion) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'search-suggestion-chip';
                chip.textContent = suggestion.value;

                chip.addEventListener('click', () => {
                    input.value = suggestion.value;
                    input.focus();
                    if (this.isProductsPage()) {
                        this.updateUrlSearchParam(suggestion.value);
                        this.emitGlobalSearch(suggestion.value);
                    } else {
                        this.navigateToSearchResults(suggestion.value);
                    }
                    this.hideSuggestions(container);
                });

                chips.appendChild(chip);
            });

            container.appendChild(chips);
        }
    }

    async fetchSearchSuggestions(query, input) {
        if (!this.apiClient) return;
        const container = this.ensureSuggestionContainer(input);
        if (!container) return;

        this.renderSuggestionLoading(container);
        const requestId = ++this.searchRequestId;

        try {
            const response = await this.apiClient.searchProducts(query, { limit: 8 });
            if (requestId !== this.searchRequestId) return;

            if (response.success && response.data) {
                this.renderSearchSuggestions(input, response.data);
            } else {
                this.renderSuggestionError(container, response.message || 'Arama yapılamadı');
            }
        } catch (error) {
            if (requestId !== this.searchRequestId) return;
            this.renderSuggestionError(container, 'Arama servisine ulaşılamıyor');
        }
    }

    // Cart System - DEPRECATED: Now using CartManager from cart-manager.js
    setupCartSystem() {
        // Disabled: CartManager and home-api.js handle cart operations now
        // This old system only saved {id, quantity} without product details
        console.log('[DostanWebApp] Cart system deprecated - using CartManager');
    }

    addToCart(productId) {
        // Deprecated: Use window.cartManager or home-api.js addToCart() instead
        console.warn('[DostanWebApp] addToCart deprecated - use window.cartManager');
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }

    updateCartUI() {
        const cartCount = this.cart.reduce((total, item) => total + item.quantity, 0);
        const cartBadge = document.querySelector('.cart-count');
        if (cartBadge) {
            cartBadge.textContent = cartCount;
            cartBadge.style.display = cartCount > 0 ? 'block' : 'none';
        }
    }

    showCartAnimation(button) {
        const rect = button.getBoundingClientRect();
        const flyingIcon = document.createElement('div');
        flyingIcon.innerHTML = '🛒';
        flyingIcon.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            font-size: 2rem;
            pointer-events: none;
            z-index: 1000;
            transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;

        document.body.appendChild(flyingIcon);

        // Animate to cart
        requestAnimationFrame(() => {
            flyingIcon.style.transform = 'translateY(-100px) scale(0.5)';
            flyingIcon.style.opacity = '0';
        });

        setTimeout(() => flyingIcon.remove(), 800);
    }

    // Wishlist System
    setupWishlistSystem() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-wishlist')) {
                const productId = e.target.closest('.btn-wishlist').dataset.productId;
                this.toggleWishlist(productId);
                this.updateWishlistButton(e.target.closest('.btn-wishlist'));
            }
        });
    }

    toggleWishlist(productId) {
        const index = this.wishlist.indexOf(productId);

        if (index > -1) {
            this.wishlist.splice(index, 1);
        } else {
            this.wishlist.push(productId);
        }

        localStorage.setItem('wishlist', JSON.stringify(this.wishlist));
    }

    updateWishlistButton(button) {
        const productId = button.dataset.productId;
        const heart = button.querySelector('.heart-icon');

        if (this.wishlist.includes(productId)) {
            heart.textContent = '♥';
            heart.classList.add('liked');
        } else {
            heart.textContent = '♡';
            heart.classList.remove('liked');
        }
    }

    // Smooth Scrolling
    setupSmoothScrolling() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                e.preventDefault();
                const target = document.querySelector(e.target.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    }

    // Lazy Loading
    setupLazyLoading() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Keyboard Navigation
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Press '/' to focus search
            if (e.key === '/' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                const searchInput = document.querySelector('.search-input');
                if (searchInput) searchInput.focus();
            }

            // Press 'Escape' to close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal, .chat-widget').forEach(modal => {
                    modal.classList.remove('open');
                });
            }
        });
    }

    // Performance Optimizations
    setupPerformanceOptimizations() {
        // Debounce resize events
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });

        // Preload critical resources
        this.preloadCriticalResources();
    }

    handleResize() {
        // Recalculate parallax elements if needed
        // Update any responsive calculations
    }

    preloadCriticalResources() {
        // Preload critical images only if they exist
        const criticalImages = [
            // 'hero-background.jpg', // TODO: Add when image is available
            // 'dostik-avatar.png'    // TODO: Add when image is available
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }

    // DEPRECATED: Second category removed from homepage
    setupSecondCategory() {
        console.log('[DEPRECATED] setupSecondCategory - Artisan Favorites section removed');
        return;
    }

    setupMiniSlider() {
        const slides = document.querySelectorAll('.mini-slide');
        if (slides.length === 0) return;

        let currentSlide = 0;

        const showSlide = (index) => {
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === index);
            });
        };

        // Auto-advance slides every 4 seconds
        setInterval(() => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }, 4000);
    }

    generateSecondCategoryProducts() {
        const container = document.getElementById('second-category-products');
        if (!container) return;

        // Second category products data
        const secondCategoryProducts = [
            {
                id: 101,
                title: "Handwoven Nordic Tapestry",
                artisan: "Ingrid Svensson",
                image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=400&h=300",
                price: 299.99,
                originalPrice: 399.99,
                rating: 4.9,
                sold: 45,
                badges: ["handmade", "limited"],
                category: "Textiles"
            },
            {
                id: 102,
                title: "Crystal Runestone Set",
                artisan: "Magnus Eriksson",
                image: "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?ixlib=rb-4.0.3&w=400&h=300",
                price: 89.99,
                originalPrice: 119.99,
                rating: 4.8,
                sold: 127,
                badges: ["spiritual", "authentic"],
                category: "Spiritual Art"
            },
            {
                id: 103,
                title: "Birch Wood Jewelry Box",
                artisan: "Astrid Nordahl",
                image: "https://images.unsplash.com/photo-1542779283-429940ce8336?ixlib=rb-4.0.3&w=400&h=300",
                price: 149.99,
                originalPrice: 199.99,
                rating: 4.7,
                sold: 89,
                badges: ["eco-friendly"],
                category: "Wood Carvings"
            },
            {
                id: 104,
                title: "Aurora Candle Collection",
                artisan: "Elena Pettersson",
                image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=400&h=300",
                price: 65.99,
                originalPrice: 85.99,
                rating: 4.9,
                sold: 203,
                badges: ["new", "popular"],
                category: "Candles & Scents"
            },
            {
                id: 105,
                title: "Ceramic Viking Mug",
                artisan: "Olaf Gustafsson",
                image: "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?ixlib=rb-4.0.3&w=400&h=300",
                price: 34.99,
                originalPrice: 44.99,
                rating: 4.6,
                sold: 156,
                badges: ["traditional"],
                category: "Ceramics"
            }
        ];

        // Generate 2 rows of products (10 products total)
        const totalProducts = 10;
        let generatedProducts = '';

        for (let i = 0; i < totalProducts; i++) {
            const product = secondCategoryProducts[i % secondCategoryProducts.length];
            const productId = product.id + i;

            generatedProducts += `
                <div class="product-card" data-product-id="${productId}" style="${i >= 5 ? 'display: none;' : ''}">
                    <div class="journey-indicator"></div>
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.title}" loading="lazy">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.title}</h3>
                        <p class="product-artisan">by ${product.artisan}</p>
                        <p class="product-description">Authentic Nordic craft made with traditional techniques and finest materials.</p>
                        <div class="social-proof">
                            <span class="rating-stars">★★★★★</span>
                            <span class="rating-value">${product.rating}</span>
                            <span class="purchases-count">${product.sold} sold</span>
                        </div>
                        <div class="product-badges">
                            ${product.badges.map(badge => `<span class="badge ${badge}">${badge}</span>`).join('')}
                        </div>
                        <div class="product-price">
                            <span class="price-current">$${product.price}</span>
                            ${product.originalPrice ? `<span class="price-original">$${product.originalPrice}</span>` : ''}
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-card btn-add-cart" data-product-id="${productId}">
                                Add to Cart
                            </button>
                            <button class="btn btn-card btn-wishlist" data-product-id="${productId}">
                                <span class="heart-icon">♡</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = generatedProducts;
        this.secondCategoryLoaded = 5; // 1 row initially visible
        this.secondCategoryTotal = totalProducts;
    }

    setupSecondCategoryButton() {
        const button = document.getElementById('loadMoreCrafts');
        if (!button) return;

        button.addEventListener('click', () => {
            this.loadMoreSecondCategoryProducts();
        });
    }

    loadMoreSecondCategoryProducts() {
        const container = document.getElementById('second-category-products');
        const button = document.getElementById('loadMoreCrafts');
        if (!container || !button) return;

        // Check if there are hidden products first
        const hiddenProducts = container.querySelectorAll('.product-card[style*="display: none"]');

        if (hiddenProducts.length > 0) {
            // Show existing hidden products
            const productsToShow = Math.min(5, hiddenProducts.length);
            for (let i = 0; i < productsToShow; i++) {
                const product = hiddenProducts[i];
                product.style.display = 'block';
                product.style.opacity = '0';
                product.style.transform = 'translateY(20px)';

                setTimeout(() => {
                    product.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    product.style.opacity = '1';
                    product.style.transform = 'translateY(0)';
                }, i * 100);
            }
        } else {
            // Generate 5 new products
            this.generateNewSecondCategoryProducts(container);
        }

        // Update button text with loading animation (but keep button visible)
        const originalText = button.innerHTML;
        button.innerHTML = '⏳ Loading More Crafts...';
        button.disabled = true;

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 1000);
    }

    generateNewSecondCategoryProducts(container) {
        // Extended product templates for continuous generation
        const newProductTemplates = [
            {
                title: "Nordic Storm Vessel",
                artisan: "Thor Andersson",
                image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=400&h=300",
                price: 179.99,
                originalPrice: 229.99,
                rating: 4.7,
                sold: 67
            },
            {
                title: "Mystic Rune Pendant",
                artisan: "Freya Nordberg",
                image: "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?ixlib=rb-4.0.3&w=400&h=300",
                price: 89.99,
                originalPrice: 119.99,
                rating: 4.9,
                sold: 134
            },
            {
                title: "Fjord Memory Box",
                artisan: "Leif Eriksson",
                image: "https://images.unsplash.com/photo-1542779283-429940ce8336?ixlib=rb-4.0.3&w=400&h=300",
                price: 129.99,
                originalPrice: 169.99,
                rating: 4.8,
                sold: 89
            },
            {
                title: "Aurora Essence Candle",
                artisan: "Sigrid Blomberg",
                image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=400&h=300",
                price: 45.99,
                originalPrice: 59.99,
                rating: 4.6,
                sold: 198
            },
            {
                title: "Viking Soul Sculpture",
                artisan: "Bjorn Ironside",
                image: "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?ixlib=rb-4.0.3&w=400&h=300",
                price: 299.99,
                originalPrice: 399.99,
                rating: 4.9,
                sold: 45
            },
            {
                title: "Moonlight Dreamcatcher",
                artisan: "Luna Eriksdottir",
                image: "https://images.unsplash.com/photo-1542779283-429940ce8336?ixlib=rb-4.0.3&w=400&h=300",
                price: 67.99,
                originalPrice: 89.99,
                rating: 4.8,
                sold: 112
            },
            {
                title: "Forest Spirit Mask",
                artisan: "Odin Thorsson",
                image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=400&h=300",
                price: 215.99,
                originalPrice: 279.99,
                rating: 4.7,
                sold: 78
            }
        ];

        // Generate 5 random new products
        const randomProducts = this.getRandomProducts(newProductTemplates, 5);

        randomProducts.forEach((product, index) => {
            const newProductId = Date.now() + index;
            const newProductCard = document.createElement('div');
            newProductCard.className = 'product-card';
            newProductCard.setAttribute('data-product-id', newProductId);
            newProductCard.style.opacity = '0';
            newProductCard.style.transform = 'translateY(20px)';

            newProductCard.innerHTML = `
                <div class="journey-indicator"></div>
                <div class="product-image">
                    <img src="${product.image}" alt="${product.title}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-artisan">by ${product.artisan}</p>
                    <p class="product-description">Authentic Nordic craft made with traditional techniques and finest materials.</p>
                    <div class="social-proof">
                        <span class="rating-stars">★★★★★</span>
                        <span class="rating-value">${product.rating}</span>
                        <span class="purchases-count">${product.sold} sold</span>
                    </div>
                    <div class="product-badges">
                        <span class="badge new">new</span>
                    </div>
                    <div class="product-price">
                        <span class="price-current">$${product.price}</span>
                        ${product.originalPrice ? `<span class="price-original">$${product.originalPrice}</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-card btn-add-cart" data-product-id="${newProductId}">
                            Add to Cart
                        </button>
                        <button class="btn btn-card btn-wishlist" data-product-id="${newProductId}">
                            <span class="heart-icon">♡</span>
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(newProductCard);

            // Animate in the new product
            setTimeout(() => {
                newProductCard.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                newProductCard.style.opacity = '1';
                newProductCard.style.transform = 'translateY(0)';
            }, index * 100 + 200);
        });
    }

    // DEPRECATED: This function is no longer used - Load More now uses HomeAPI
    generateNewFirstCategoryProducts(container) {
        console.warn('[DEPRECATED] generateNewFirstCategoryProducts - Load More now uses API');
        return;

        // OLD CODE (deprecated):
        // First category product templates
        const firstCategoryTemplates = [
            {
                title: "Ancient Rune Stone",
                artisan: "Erik the Wise",
                image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=400&h=300",
                price: 189.99,
                originalPrice: 249.99,
                rating: 4.8,
                sold: 89
            },
            {
                title: "Frost Giant's Chalice",
                artisan: "Helga Frostborn",
                image: "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?ixlib=rb-4.0.3&w=400&h=300",
                price: 156.99,
                originalPrice: 199.99,
                rating: 4.7,
                sold: 67
            },
            {
                title: "Valkyrie's Battle Shield",
                artisan: "Brunhilde Ironforge",
                image: "https://images.unsplash.com/photo-1542779283-429940ce8336?ixlib=rb-4.0.3&w=400&h=300",
                price: 345.99,
                originalPrice: 459.99,
                rating: 4.9,
                sold: 34
            },
            {
                title: "Northern Light Lantern",
                artisan: "Solveig Lightbringer",
                image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=400&h=300",
                price: 78.99,
                originalPrice: 99.99,
                rating: 4.6,
                sold: 145
            },
            {
                title: "Dragon's Breath Incense",
                artisan: "Ragnar Smokeweaver",
                image: "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?ixlib=rb-4.0.3&w=400&h=300",
                price: 42.99,
                originalPrice: 56.99,
                rating: 4.8,
                sold: 278
            }
        ];

        // Generate 5 random new products
        const randomProducts = this.getRandomProducts(firstCategoryTemplates, 5);

        randomProducts.forEach((product, index) => {
            const newProductId = Date.now() + index + 1000; // Different ID range for first category
            const newProductCard = document.createElement('div');
            newProductCard.className = 'product-card';
            newProductCard.setAttribute('data-product-id', newProductId);
            newProductCard.style.opacity = '0';
            newProductCard.style.transform = 'translateY(30px)';

            newProductCard.innerHTML = `
                <div class="journey-indicator"></div>
                <div class="product-image">
                    <img src="${product.image}" alt="${product.title}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-artisan">by ${product.artisan}</p>
                    <p class="product-description">A masterpiece crafted with ancient Nordic wisdom and blessed by the spirits of the fjords.</p>
                    <div class="social-proof">
                        <span class="rating-stars">★★★★★</span>
                        <span class="rating-value">${product.rating}</span>
                        <span class="purchases-count">${product.sold} sold</span>
                    </div>
                    <div class="product-badges">
                        <span class="badge new">new</span>
                    </div>
                    <div class="product-price">
                        <span class="price-current">$${product.price}</span>
                        ${product.originalPrice ? `<span class="price-original">$${product.originalPrice}</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-card btn-add-cart" data-product-id="${newProductId}">
                            Add to Cart
                        </button>
                        <button class="btn btn-card btn-wishlist" data-product-id="${newProductId}">
                            <span class="heart-icon">♡</span>
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(newProductCard);

            // Animate in the new product
            setTimeout(() => {
                newProductCard.style.transition = 'all 0.6s ease-out';
                newProductCard.style.opacity = '1';
                newProductCard.style.transform = 'translateY(0)';
            }, index * 100 + 200);
        });
    }

    getRandomProducts(templates, count) {
        const shuffled = [...templates].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // Setup category navigation system
    setupCategoryNavigation() {
        const categorySlides = document.querySelectorAll('.category-slide');

        // Category to page mapping
        const categoryPages = {
            'all': 'pages/products.html',
            'wood-carvings': 'pages/wood-carvings.html',
            'glass-art': 'pages/glass-art.html',
            'leather-goods': 'pages/leather-goods.html',
            'ceramics': 'pages/ceramics.html',
            'candles-scents': 'pages/candles-scents.html',
            'spiritual-art': 'pages/spiritual-art.html',
            'textiles': 'pages/textiles.html',
            'jewelry': 'pages/jewelry.html',
            'home-decor': 'pages/home-decor.html'
        };

        categorySlides.forEach(slide => {
            slide.addEventListener('click', () => {
                const category = slide.getAttribute('data-category');

                if (categoryPages[category]) {
                    // Add click animation
                    slide.style.transform = 'scale(0.95)';
                    slide.style.transition = 'transform 0.1s ease-out';

                    setTimeout(() => {
                        slide.style.transform = 'scale(1)';
                        // Navigate to category page
                        window.location.href = categoryPages[category];
                    }, 100);
                }
            });

            // Add hover effect
            slide.addEventListener('mouseenter', () => {
                slide.style.transform = 'scale(1.05)';
                slide.style.transition = 'transform 0.2s ease-out';
            });

            slide.addEventListener('mouseleave', () => {
                slide.style.transform = 'scale(1)';
            });

            // Add cursor pointer
            slide.style.cursor = 'pointer';
        });
    }

}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dostanApp = new DostanWebApp();
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                // Service Worker registered successfully
            })
            .catch(registrationError => {
                // Service Worker registration failed - app will still work without PWA features
            });
    });
}

// Add missing setupHorizontalSwipe method to DostanWebApp class
DostanWebApp.prototype.setupHorizontalSwipe = function() {
    // Mobile swipe support for product carousels
    const productRows = document.querySelectorAll('.products-container, .category-slider');
    productRows.forEach(row => {
        let startX = 0;
        let scrollLeft = 0;
        let isDown = false;

        row.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            scrollLeft = row.scrollLeft;
            isDown = true;
        });

        row.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.touches[0].clientX;
            const walk = (startX - x) * 2;
            row.scrollLeft = scrollLeft + walk;
        });

        row.addEventListener('touchend', () => {
            isDown = false;
        });
    });
};