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

    performSearch(query) {
        if (!query) {
            this.showAllProducts();
            return;
        }

        const products = document.querySelectorAll('.product-card');
        let visibleCount = 0;

        products.forEach(card => {
            const title = card.querySelector('.product-title')?.textContent.toLowerCase() || '';
            const artisan = card.querySelector('.product-artisan')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.product-description')?.textContent.toLowerCase() || '';

            const matches = title.includes(query.toLowerCase()) ||
                          artisan.includes(query.toLowerCase()) ||
                          description.includes(query.toLowerCase());

            if (matches) {
                card.style.display = 'block';
                card.classList.add('fade-in');
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show search results count
        this.updateSearchResults(visibleCount, query);
    }

    showAllProducts() {
        document.querySelectorAll('.product-card').forEach(card => {
            card.style.display = 'block';
        });
    }

    updateSearchResults(count, query) {
        let resultsElement = document.querySelector('.search-results');
        if (!resultsElement) {
            resultsElement = document.createElement('div');
            resultsElement.className = 'search-results';
            const container = document.querySelector('.products-container');
            if (container) {
                container.parentNode.insertBefore(resultsElement, container);
            }
        }

        resultsElement.textContent = count > 0
            ? `Found ${count} treasures for "${query}"`
            : `No treasures found for "${query}". Try a different search.`;
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