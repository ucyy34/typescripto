/*
 * DOSTANWEBCSS - Main Application Module
 * Nordic marketplace core functionality
 * Optimized for performance and accessibility
 */

class DostanWebApp {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.wishlist = [];
        this.wishlistUnsubscribe = null;
        this.wishlistClickHandlerAttached = false;
        this.boundWishlistButtonHandler = this.handleWishlistButtonClick.bind(this);
        this.isLoading = false;

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

    // Cart System
    setupCartSystem() {
        // Cart logic is handled by cart-manager.js and cart-ui.js
        // This method is kept for potential future coordination
        console.log('[DostanWebApp] Cart system initialized via CartManager');
    }

    // Scroll Hide Header System
    setupScrollHideHeader() {
        let lastScrollTop = 0;
        let ticking = false;

        const header = document.querySelector('.header');
        if (!header) return;

        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // Scroll Down
                header.classList.add('header-hidden');
            } else {
                // Scroll Up
                header.classList.remove('header-hidden');
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

        // Setup horizontal swipe functionality for product rows
        this.setupHorizontalSwipe();

        // Setup category navigation
        this.setupCategoryNavigation();
    }

    setupLazyLoading() {
        // Ensure global lazy loader exists or create one
        if (window.lazyLoader && typeof window.lazyLoader.observeElements === 'function') {
            window.lazyLoader.observeElements();
            return;
        }

        if (window.LazyLoader) {
            window.lazyLoader = new window.LazyLoader();
            return;
        }

        // Fallback: eagerly load lazy assets if helper script failed to load
        document.querySelectorAll('img[data-src]').forEach((img) => {
            img.src = img.dataset.src;
            img.classList.add('loaded');
            img.removeAttribute('data-src');
        });
        document.querySelectorAll('[data-bg]').forEach((el) => {
            el.style.backgroundImage = `url(${el.dataset.bg})`;
            el.classList.add('loaded');
            el.removeAttribute('data-bg');
        });
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
            const button = e.target.closest('.btn-wishlist');
            if (button) {
                this.animateHeart(button);
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
        const searchInput = document.querySelector('.search-input');
        if (!searchInput) return;

        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
    }

    setupSmoothScrolling() {
        // Gracefully handle smooth scrolling for in-page anchor links
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        if (!anchorLinks.length) return;

        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const supportsNativeSmoothScroll = 'scrollBehavior' in document.documentElement.style;

        const scrollToTarget = (target) => {
            if (!target) return;
            const top = target.getBoundingClientRect().top + window.pageYOffset;

            if (prefersReducedMotion) {
                window.scrollTo(0, top);
                return;
            }

            if (supportsNativeSmoothScroll) {
                window.scrollTo({ top, behavior: 'smooth' });
            } else {
                // Basic JS fallback for older browsers
                const startY = window.pageYOffset;
                const distance = top - startY;
                const duration = 400;
                let start = null;

                const step = (timestamp) => {
                    if (!start) start = timestamp;
                    const progress = timestamp - start;
                    const percent = Math.min(progress / duration, 1);
                    window.scrollTo(0, startY + distance * percent);
                    if (progress < duration) {
                        window.requestAnimationFrame(step);
                    }
                };
                window.requestAnimationFrame(step);
            }
        };

        anchorLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                const hash = link.getAttribute('href');
                if (!hash || hash === '#') return;

                const target = document.querySelector(hash);
                if (!target) return;

                event.preventDefault();
                scrollToTarget(target);
            });
        });
    }

    performSearch(query) {
        if (!query) {
            this.showAllProducts();
            return;
        }

        const products = document.querySelectorAll('.product-card');

        products.forEach(card => {
            const title = card.querySelector('.product-title')?.textContent.toLowerCase() || '';
            const artisan = card.querySelector('.product-artisan')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.product-description')?.textContent.toLowerCase() || '';
            const q = query.toLowerCase();

            if (title.includes(q) || artisan.includes(q) || description.includes(q)) {
                card.style.display = 'flex';
                card.style.animation = 'fadeIn 0.5s ease-out';
            } else {
                card.style.display = 'none';
            }
        });
    }

    showAllProducts() {
        const products = document.querySelectorAll('.product-card');
        products.forEach(card => {
            card.style.display = 'flex';
        });
    }

    // Wishlist System
    async setupWishlistSystem() {
        try {
            if (window.wishlistManager && typeof window.wishlistManager.ensureInitialized === 'function') {
                await window.wishlistManager.ensureInitialized();
                this.wishlist = window.wishlistManager.getWishlistIds();

                if (this.wishlistUnsubscribe) {
                    this.wishlistUnsubscribe();
                    this.wishlistUnsubscribe = null;
                }

                if (typeof window.wishlistManager.onChange === 'function') {
                    this.wishlistUnsubscribe = window.wishlistManager.onChange((items) => {
                        this.wishlist = Array.isArray(items)
                            ? items.map((item) => item.product_id).filter(Boolean)
                            : [];
                        this.updateAllWishlistButtons();
                    });
                }
            } else {
                this.wishlist = this.loadLegacyWishlist();
            }
        } catch (error) {
            console.warn('[DostanWebApp] Wishlist system init failed, falling back to localStorage:', error);
            this.wishlist = this.loadLegacyWishlist();
        }

        if (!this.wishlistClickHandlerAttached) {
            document.addEventListener('click', this.boundWishlistButtonHandler);
            this.wishlistClickHandlerAttached = true;
        }

        this.updateAllWishlistButtons();
    }

    async handleWishlistButtonClick(event) {
        const button = event.target.closest('.btn-wishlist');
        if (!button) return;

        event.preventDefault();

        const productId = button.dataset.productId;
        if (!productId) {
            return;
        }

        const metadata = this.buildWishlistMetadata(button);

        try {
            const added = await this.toggleWishlist(productId, metadata);
            this.updateWishlistButton(button, added);
            this.updateAllWishlistButtons();
        } catch (error) {
            console.error('[DostanWebApp] Failed to toggle wishlist:', error);
        }
    }

    async toggleWishlist(productId, metadata = null) {
        if (!productId) {
            return false;
        }

        try {
            if (window.wishlistManager && typeof window.wishlistManager.toggle === 'function') {
                const added = await window.wishlistManager.toggle(productId, metadata || {});
                this.wishlist = window.wishlistManager.getWishlistIds();
                return added;
            }
        } catch (error) {
            console.error('[DostanWebApp] Failed to toggle wishlist via manager:', error);
        }

        const index = this.wishlist.indexOf(productId);
        if (index > -1) {
            this.wishlist.splice(index, 1);
            localStorage.setItem('wishlist', JSON.stringify(this.wishlist));
            return false;
        }

        this.wishlist.push(productId);
        localStorage.setItem('wishlist', JSON.stringify(this.wishlist));
        return true;
    }

    buildWishlistMetadata(button) {
        const card = button.closest('[data-product-id]') || button.closest('.product-card');
        if (!card) {
            return null;
        }

        const productId = button.dataset.productId || card.dataset.productId;
        const title = card.querySelector('.product-title, .product-name')?.textContent?.trim() || 'Favori Ürün';
        const priceText = card.querySelector('[data-product-price], .price-current, .product-price, .product-price span')?.textContent;
        const price = this.parsePrice(priceText);
        const image = card.querySelector('img')?.src || null;

        let storeName = card.querySelector('.product-artisan')?.textContent || '';
        if (storeName.toLowerCase().startsWith('by ')) {
            storeName = storeName.slice(3).trim();
        }
        storeName = storeName || null;

        return {
            product: {
                id: productId,
                title,
                price,
                images: image ? [image] : [],
                store: storeName ? { name: storeName } : null,
            },
        };
    }

    parsePrice(value) {
        if (typeof value === 'number') {
            return value;
        }

        if (!value) {
            return null;
        }

        const normalized = String(value).replace(/[^0-9,.-]/g, '').replace(',', '.');
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    updateWishlistButton(button, forceState = null) {
        if (!button) return;

        const productId = button.dataset.productId;
        const heart = button.querySelector('.heart-icon');
        const inWishlist = typeof forceState === 'boolean'
            ? forceState
            : this.wishlist.includes(productId);

        if (heart) {
            heart.textContent = inWishlist ? '♥' : '♡';
            heart.classList.toggle('liked', inWishlist);
        }

        button.classList.toggle('in-wishlist', inWishlist);
        button.setAttribute('aria-pressed', inWishlist ? 'true' : 'false');
    }

    updateAllWishlistButtons() {
        document.querySelectorAll('.btn-wishlist').forEach((button) => this.updateWishlistButton(button));
    }

    loadLegacyWishlist() {
        try {
            const detailedRaw = JSON.parse(localStorage.getItem('wishlist:detailed') || 'null');
            if (Array.isArray(detailedRaw) && detailedRaw.length > 0) {
                const ids = detailedRaw
                    .map((item) => item?.product_id || item?.id || item?.title)
                    .filter(Boolean);
                return [...new Set(ids)];
            }

            const raw = JSON.parse(localStorage.getItem('wishlist') || '[]');
            if (Array.isArray(raw)) {
                const ids = raw
                    .map((item) => (typeof item === 'string' ? item : item?.product_id || item?.id || item?.title))
                    .filter(Boolean);
                return [...new Set(ids)];
            }
        } catch (error) {
            console.warn('[DostanWebApp] Failed to load legacy wishlist:', error);
        }

        return [];
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

    // Setup Horizontal Swipe
    setupHorizontalSwipe() {
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
                // Only prevent default if scrolling horizontally
                const x = e.touches[0].clientX;
                const walk = (startX - x);
                if (Math.abs(walk) > 5) {
                    // e.preventDefault(); // Optional: might block vertical scroll
                }
                row.scrollLeft = scrollLeft + walk;
            });

            row.addEventListener('touchend', () => {
                isDown = false;
            });
        });
    }

    // Setup Category Navigation
    setupCategoryNavigation() {
        const categoryLinks = document.querySelectorAll('.category-link');
        categoryLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = link.dataset.category;
                if (category) {
                    // Navigate or filter
                    console.log('Category selected:', category);
                }
            });
        });
    }
}

// Initialize Application
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
