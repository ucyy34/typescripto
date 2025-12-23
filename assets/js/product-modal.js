/* ===============================================
   PRODUCT MODAL SYSTEM - Turkish Dragon Style
   Inspired by reference design for better UX
   =============================================== */

class ProductModal {
    constructor() {
        this.isOpen = false;
        this.currentProduct = null;
        this.activeTab = 'details';
        this.chatMessages = [];
        this.timeOnPage = 0;
        this.originalUrl = window.location.href;
        this.apiClient = window.apiClient || new ApiClient();
        this.isLoadingProduct = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startPageTimer();
        this.setupURLRouting();
    }

    setupURLRouting() {
        // Listen for browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.productModal) {
                // User pressed back while modal was open
                this.openModalFromState(e.state.productData);
            } else if (this.isOpen) {
                // User pressed back, close modal
                this.closeModalWithoutHistory();
            }
        });

        // Check if we should open modal from URL parameters
        this.checkInitialURL();
    }

    checkInitialURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('product');

        if (productId) {
            // Find and open the product modal based on ID
            const productCard = document.querySelector(`[data-product-id="${productId}"]`);
            if (productCard) {
                setTimeout(() => this.openModal(productCard), 100);
            }
        }
    }

    setupEventListeners() {
        // Listen for product card clicks
        document.addEventListener('click', (e) => {
            const productCard = e.target.closest('.product-card');
            if (productCard && !e.target.closest('.btn-add-cart, .btn-wishlist')) {
                console.log('[ProductModal] Product card clicked:', productCard);
                e.preventDefault();
                this.openModal(productCard);
            }
        });

        // Close modal listeners - Updated to work with dynamically created elements
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') ||
                e.target.closest('.modal-close') ||
                e.target.classList.contains('modal-overlay')) {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isOpen && e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Touch gesture support for mobile
        this.setupTouchGestures();
    }

    setupTouchGestures() {
        let startY = 0;
        let startX = 0;
        let currentY = 0;
        let currentX = 0;
        let startTime = 0;

        document.addEventListener('touchstart', (e) => {
            if (!this.isOpen) return;

            const touch = e.touches[0];
            startY = touch.clientY;
            startX = touch.clientX;
            startTime = Date.now();
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this.isOpen) return;

            const touch = e.touches[0];
            currentY = touch.clientY;
            currentX = touch.clientX;

            const deltaY = currentY - startY;
            const deltaX = Math.abs(currentX - startX);

            // Swipe down to close modal (only if swipe is more vertical than horizontal)
            if (deltaY > 50 && deltaX < 100) {
                const modal = document.querySelector('.modal-content');
                if (modal) {
                    const progress = Math.min(deltaY / 300, 1);
                    modal.style.transform = `translateY(${deltaY}px)`;
                    modal.style.opacity = 1 - progress * 0.5;
                }
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!this.isOpen) return;

            const deltaY = currentY - startY;
            const deltaX = Math.abs(currentX - startX);
            const deltaTime = Date.now() - startTime;

            const modal = document.querySelector('.modal-content');
            if (modal) {
                // Reset transform
                modal.style.transform = '';
                modal.style.opacity = '';

                // Close modal if swipe down is significant or fast
                if ((deltaY > 150 && deltaX < 100) || (deltaY > 50 && deltaTime < 300)) {
                    this.closeModal();
                }
            }

            // Reset values
            startY = 0;
            startX = 0;
            currentY = 0;
            currentX = 0;
        }, { passive: true });
    }

    startPageTimer() {
        setInterval(() => {
            if (this.isOpen) {
                this.timeOnPage++;

                // Proactive Dostik messages
                if (this.timeOnPage === 5) {
                    this.addDostikMessage("Bu ürün hakkında bir şey merak ediyor musun? 🤔");
                }
                if (this.timeOnPage === 15) {
                    this.addDostikMessage("Hediye paketi seçeneklerini görmek ister misin? 🎁");
                }
            }
        }, 1000);
    }

    async openModal(productCard) {
        try {
            // Show loading modal first
            this.showLoadingModal();

            // Get product ID from card
            const productId = productCard?.dataset?.productId;

            if (productId) {
                // Try to fetch from API first
                const apiProduct = await this.fetchProductData(productId);
                if (apiProduct) {
                    this.currentProduct = this.transformAPIProductToModalFormat(apiProduct);
                } else {
                    // Fallback to extracting from DOM
                    console.warn('[ProductModal] API fetch failed, falling back to DOM extraction');
                    this.currentProduct = this.extractProductData(productCard);
                }
            } else {
                // No product ID, extract from DOM
                console.log('[ProductModal] No product ID found, using DOM extraction');
                this.currentProduct = this.extractProductData(productCard);
            }

            // Validate product data
            if (!this.currentProduct || !this.currentProduct.title) {
                throw new Error('Invalid product data');
            }

            // Hide loading and show actual modal
            this.createModalHTML();
            this.populateModal();
            this.showModal();
            this.pushModalState();
        } catch (error) {
            console.error('[ProductModal] Error opening modal:', error);
            this.showErrorModal('Ürün yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
    }

    /**
     * Show error modal
     */
    showErrorModal(message) {
        const existingModal = document.getElementById('productModal');
        if (existingModal) {
            existingModal.remove();
        }

        const errorHTML = `
            <div class="modal-overlay" id="productModal">
                <div class="modal-content modal-error">
                    <button class="modal-close" aria-label="Close modal">&times;</button>
                    <div class="modal-error-content">
                        <div class="error-icon">⚠️</div>
                        <h3>Bir Hata Oluştu</h3>
                        <p>${message}</p>
                        <button class="modal-btn modal-btn-primary" onclick="document.getElementById('productModal').remove(); document.body.style.overflow = '';">
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', errorHTML);
        document.body.style.overflow = 'hidden';

        // Auto-close after 3 seconds
        setTimeout(() => {
            const modal = document.getElementById('productModal');
            if (modal && modal.querySelector('.modal-error')) {
                modal.remove();
                document.body.style.overflow = '';
                this.isOpen = false;
            }
        }, 5000);
    }

    /**
     * Show loading state while fetching product data
     */
    showLoadingModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('productModal');
        if (existingModal) {
            existingModal.remove();
        }

        const loadingHTML = `
            <div class="modal-overlay" id="productModal">
                <div class="modal-content modal-loading">
                    <div class="modal-loader">
                        <div class="loader-spinner"></div>
                        <p>Ürün yükleniyor...</p>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        document.body.style.overflow = 'hidden';
        this.isOpen = true;
    }

    /**
     * Fetch product data from API
     * @param {string} productId - UUID of the product
     * @returns {Object|null} - Product data or null if failed
     */
    async fetchProductData(productId) {
        if (!productId) return null;

        try {
            this.isLoadingProduct = true;
            console.log('[ProductModal] Fetching product from API:', productId);

            const response = await this.apiClient.getProduct(productId);

            if (response.success && response.data) {
                console.log('[ProductModal] Product fetched successfully:', response.data);
                return response.data;
            } else {
                console.warn('[ProductModal] Failed to fetch product:', response.message);
                return null;
            }
        } catch (error) {
            console.error('[ProductModal] Error fetching product:', error);
            return null;
        } finally {
            this.isLoadingProduct = false;
        }
    }

    /**
     * Transform API product response to modal format
     * @param {Object} apiProduct - Product from backend API
     * @returns {Object} - Product in modal format
     */
    transformAPIProductToModalFormat(apiProduct) {
        // Extract first image or use placeholder
        const mainImage = Array.isArray(apiProduct.images) && apiProduct.images.length > 0
            ? apiProduct.images[0]
            : 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&fit=crop';

        // Format price with Turkish Lira symbol
        const price = apiProduct.price ? `₺ ${parseFloat(apiProduct.price).toFixed(0)}` : '₺ 0';
        const originalPrice = apiProduct.compare_price
            ? `₺ ${parseFloat(apiProduct.compare_price).toFixed(0)}`
            : null;

        // Extract store/artisan name
        const artisan = apiProduct.store?.name || 'Unknown Artisan';

        // Map badges
        const badges = Array.isArray(apiProduct.badges)
            ? apiProduct.badges
            : [];

        // Extract category
        const category = apiProduct.category?.name || 'Handmade';

        // Build modal format
        return {
            id: apiProduct.id,
            slug: apiProduct.slug,
            title: apiProduct.title || 'Product',
            artisan: artisan,
            description: apiProduct.description || apiProduct.short_description || '',
            price: price,
            originalPrice: originalPrice,
            image: mainImage,
            images: apiProduct.images || [mainImage],
            rating: (apiProduct.rating && typeof apiProduct.rating === 'number') ? apiProduct.rating.toFixed(1) : '5.0',
            reviews: `${apiProduct.total_sales || 0} sold`,
            badges: badges,
            category: category,
            material: apiProduct.material || null,
            dimensions: this.extractDimensions(apiProduct),
            weight: this.extractWeight(apiProduct),
            technique: apiProduct.technique || null,
            artisanBio: apiProduct.store?.description || 'Master artisan with years of experience.',
            artisanLocation: apiProduct.store?.location || 'Nordic Region',
            stock: apiProduct.stock || 0,
            variants: apiProduct.productVariants || [],
            // Keep API product for reference
            _apiProduct: apiProduct
        };
    }

    /**
     * Extract dimensions from product - returns null if not set
     */
    extractDimensions(product) {
        if (product.dimensions && typeof product.dimensions === 'object') {
            const { length, width, height } = product.dimensions;
            if (length && width && height) {
                return `${length}cm × ${width}cm × ${height}cm`;
            }
        }
        return null;
    }

    /**
     * Extract weight from product - returns null if not set
     */
    extractWeight(product) {
        if (product.weight) {
            return `${product.weight}kg`;
        }
        return null;
    }

    openModalFromState(productData) {
        this.currentProduct = productData;
        this.createModalHTML();
        this.populateModal();
        this.showModal();
    }

    pushModalState() {
        const productId = this.generateProductId(this.currentProduct);
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('product', productId);

        // Push new state to browser history
        history.pushState({
            productModal: true,
            productData: this.currentProduct
        }, `${this.currentProduct.title} - Ürün Detayı`, newUrl.toString());
    }

    generateProductId(product) {
        // Generate a simple ID from product title
        return product.title
            .toLowerCase()
            .replace(/[^a-z0-9ğıöşüç]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    extractProductData(productCard) {
        const title = productCard.querySelector('.product-title')?.textContent || 'Product';
        const artisan = productCard.querySelector('.product-artisan')?.textContent || 'Unknown Artisan';
        const description = productCard.querySelector('.product-description')?.textContent || '';
        const price = productCard.querySelector('.price-current')?.textContent || '$0';
        const originalPrice = productCard.querySelector('.price-original')?.textContent || null;
        const image = productCard.querySelector('.product-image img')?.src || '';
        const rating = productCard.querySelector('.rating-value')?.textContent || '5.0';
        const reviews = productCard.querySelector('.purchases-count')?.textContent || '0 sold';
        const badges = Array.from(productCard.querySelectorAll('.badge')).map(badge => badge.textContent);

        return {
            title,
            artisan: artisan.replace('by ', ''),
            description,
            price,
            originalPrice,
            image,
            rating,
            reviews,
            badges,
            category: productCard.dataset.category || 'Handmade',
            material: productCard.dataset.material || 'Premium Materials',
            dimensions: productCard.dataset.dimensions || '15cm × 10cm × 8cm',
            weight: productCard.dataset.weight || '1.0kg',
            technique: productCard.dataset.technique || 'Traditional handcraft',
            artisanBio: productCard.dataset.artisanBio || 'Master artisan with years of experience.',
            artisanLocation: productCard.dataset.artisanLocation || 'Nordic Region'
        };
    }

    createModalHTML() {
        // Remove existing modal if any
        const existingModal = document.getElementById('productModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div class="modal-overlay" id="productModal">
                <div class="modal-content">
                    <!-- Close Button -->
                    <button class="modal-close" aria-label="Close modal">&times;</button>

                    <!-- Navigation Breadcrumb -->
                    <div class="modal-breadcrumb">
                        <span>Kategoriler</span>
                        <span>/</span>
                        <span id="modalCategory">Kategori</span>
                        <span>/</span>
                        <span id="modalProductName">Ürün</span>
                    </div>

                    <div class="modal-body">
                        <!-- Left Side - Images (60%) -->
                        <div class="modal-images">
                            <div class="modal-main-image">
                                <div class="modal-badge" id="modalBadge">Premium</div>
                                <img id="modalMainImg" src="" alt="">
                            </div>
                            <div class="modal-thumbnails" id="modalThumbnails">
                                <!-- Thumbnails will be generated -->
                            </div>

                            <!-- Quick Info - Left Side -->
                            <div class="modal-quick-info" id="modalQuickInfo">
                                <h3>Hızlı Bilgiler</h3>
                                <div class="quick-info-grid">
                                    <!-- Will be populated -->
                                </div>
                            </div>
                        </div>

                        <!-- Right Side - Product Info (40%) -->
                        <div class="modal-info">
                            <div class="modal-header">
                                <div class="modal-title-row">
                                    <h1 id="modalTitle">Product Title</h1>
                                    <div class="modal-actions">
                                        <button class="modal-heart-btn">♡</button>
                                        <button class="modal-cart-btn">🛒</button>
                                    </div>
                                </div>
                                <p class="modal-artisan" id="modalArtisan">by Artisan</p>
                                <div class="modal-price" id="modalPrice">₺ 0</div>
                            </div>

                            <!-- Product Options -->
                            <div class="modal-product-options" id="modalProductOptions">
                                <div class="option-group">
                                    <label class="option-label">Boyut/Beden:</label>
                                    <select class="option-select" id="productSize">
                                        <option value="">Boyut Seçin</option>
                                        <option value="xs">XS - Çok Küçük</option>
                                        <option value="s">S - Küçük</option>
                                        <option value="m" selected>M - Orta</option>
                                        <option value="l">L - Büyük</option>
                                        <option value="xl">XL - Çok Büyük</option>
                                    </select>
                                </div>
                                <div class="option-group">
                                    <label class="option-label">Renk:</label>
                                    <div class="color-options" id="colorOptions">
                                        <div class="color-option active" data-color="natural" style="background: #f5f2eb;" title="Doğal"></div>
                                        <div class="color-option" data-color="forest" style="background: #2d6853;" title="Orman Yeşili"></div>
                                        <div class="color-option" data-color="bark" style="background: #8b6d47;" title="Kabuk Kahvesi"></div>
                                        <div class="color-option" data-color="warm" style="background: #a0845c;" title="Sıcak Kahve"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div class="modal-action-buttons">
                                <button class="modal-btn modal-btn-primary" id="modalAddToCart">
                                    Sepete Ekle
                                </button>
                                <button class="modal-btn modal-btn-secondary" id="modalAskDostik">
                                    <span>🐉</span> Dostik'e Sor
                                </button>
                            </div>

                            <!-- Artisan Info - Right Side -->
                            <div class="modal-artisan-info" id="modalArtisanInfo">
                                <!-- Will be populated -->
                            </div>

                            <!-- View Full Product Button -->
                            <button class="modal-btn modal-btn-outline" id="modalViewFull">
                                📋 Detaylı Ürün Sayfasına Git
                            </button>
                        </div>
                    </div>

                    <!-- Scrollable Section - Tabs -->
                    <div class="modal-scrollable-section">
                        <div class="modal-tabs">
                            <div class="modal-tab-headers">
                                <button class="modal-tab-header active" data-tab="details">Ürün Detayları</button>
                                <button class="modal-tab-header" data-tab="dostik">🌟 Siftah Önerileri</button>
                                <button class="modal-tab-header" data-tab="similar">Benzer Ürünler</button>
                            </div>
                            <div class="modal-tab-content" id="modalTabContent">
                                <!-- Tab content will be populated -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Floating Dostik Chat -->
                <div class="modal-dostik-chat" id="modalDostikChat" style="display: none;">
                    <div class="dostik-chat-header">
                        <div class="dostik-avatar">🐉</div>
                        <div class="dostik-info">
                            <div class="dostik-name">Dostik AI Asistan</div>
                            <div class="dostik-status">Online - Yardıma hazır</div>
                        </div>
                        <button class="dostik-close" id="closeDostikChat">&times;</button>
                    </div>
                    <div class="dostik-messages" id="dostikMessages">
                        <!-- Messages will appear here -->
                    </div>
                    <div class="dostik-input">
                        <input type="text" id="dostikInput" placeholder="Dostik'e sor... (boyut, hediye, benzer)">
                        <button id="dostikSend">📤</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // Tab switching
        document.querySelectorAll('.modal-tab-header').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Add to cart button
        document.getElementById('modalAddToCart').addEventListener('click', () => {
            this.addToCart();
        });

        // Heart/Wishlist button
        document.querySelector('.modal-heart-btn').addEventListener('click', () => {
            this.toggleWishlist();
        });

        // Cart button in actions
        document.querySelector('.modal-cart-btn').addEventListener('click', () => {
            this.addToCart();
        });

        // Dostik chat
        document.getElementById('modalAskDostik').addEventListener('click', () => {
            this.toggleDostikChat();
        });

        document.getElementById('closeDostikChat').addEventListener('click', () => {
            this.toggleDostikChat(false);
        });

        document.getElementById('dostikSend').addEventListener('click', () => {
            this.sendDostikMessage();
        });

        document.getElementById('dostikInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendDostikMessage();
            }
        });

        // View full product page
        document.getElementById('modalViewFull').addEventListener('click', () => {
            this.goToFullProductPage();
        });

        // Product options event listeners
        this.setupProductOptions();
    }

    setupProductOptions() {
        // Render variants from API data
        this.renderProductVariants();

        // Color selection (if exists)
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
            });
        });

        // Size change handler (if exists)
        const sizeSelect = document.getElementById('productSize');
        if (sizeSelect) {
            sizeSelect.addEventListener('change', (e) => {
                const selectedSize = e.target.value;
                if (selectedSize) {
                    // Update price based on size if needed
                    this.updatePriceBySize(selectedSize);
                }
            });
        }
    }

    /**
     * Render product variants from API data
     * Updated for new cascade variant format: color_hex, color_name, variant_type, variant_value, price, stock
     */
    renderProductVariants() {
        const container = document.getElementById('modalProductOptions');
        if (!container) return;

        const variants = this.currentProduct?.productVariants || this.currentProduct?.variants || [];
        if (!Array.isArray(variants) || variants.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Store variants for price updates
        this.productVariants = variants;
        this.selectedVariantId = variants[0]?.id || null;

        container.innerHTML = '';

        // Group colors
        const colorVariants = variants.filter(v => v.color_name || v.color_hex);
        const uniqueColors = new Map();
        colorVariants.forEach(v => {
            const key = v.color_hex || v.color_name;
            if (key && !uniqueColors.has(key)) {
                uniqueColors.set(key, { hex: v.color_hex, name: v.color_name, id: v.id });
            }
        });

        // Group by variant_type
        const typeGroups = new Map();
        variants.forEach(v => {
            if (v.variant_type && v.variant_value) {
                if (!typeGroups.has(v.variant_type)) {
                    typeGroups.set(v.variant_type, new Map());
                }
                const typeMap = typeGroups.get(v.variant_type);
                if (!typeMap.has(v.variant_value)) {
                    typeMap.set(v.variant_value, v);
                }
            }
        });

        // Render color options
        if (uniqueColors.size > 0) {
            const colorGroup = document.createElement('div');
            colorGroup.className = 'option-group';
            colorGroup.innerHTML = `
                <label class="option-label">Renk:</label>
                <div class="color-options" id="variantColors">
                    ${Array.from(uniqueColors.entries()).map(([key, color], idx) => `
                        <div class="color-option ${idx === 0 ? 'active' : ''}"
                             data-color-hex="${color.hex || ''}"
                             data-color-name="${color.name || ''}"
                             style="background: ${color.hex || '#ccc'};"
                             title="${color.name || 'Renk'}">
                        </div>
                    `).join('')}
                </div>
            `;

            colorGroup.querySelectorAll('.color-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    colorGroup.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    this.updateSelectedVariant();
                });
            });

            container.appendChild(colorGroup);
        }

        // Render type/value options
        typeGroups.forEach((valuesMap, typeName) => {
            const typeLabel = this.getVariantTypeLabel(typeName);
            const typeGroup = document.createElement('div');
            typeGroup.className = 'option-group';
            typeGroup.innerHTML = `
                <label class="option-label">${typeLabel}:</label>
                <div class="size-options" data-variant-type="${typeName}">
                    ${Array.from(valuesMap.entries()).map(([value, variant], idx) => `
                        <div class="size-option ${idx === 0 ? 'active' : ''}"
                             data-variant-id="${variant.id}"
                             data-variant-value="${value}"
                             data-variant-price="${variant.price}"
                             data-variant-stock="${variant.stock}">
                            ${value}
                        </div>
                    `).join('')}
                </div>
            `;

            typeGroup.querySelectorAll('.size-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    typeGroup.querySelectorAll('.size-option').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    this.updateSelectedVariant();
                });
            });

            container.appendChild(typeGroup);
        });

        // Set initial selected variant
        this.updateSelectedVariant();
    }

    /**
     * Get friendly label for variant type
     */
    getVariantTypeLabel(type) {
        const labels = {
            'beden': 'Beden',
            'numara': 'Numara',
            'boyut': 'Boyut',
            'agirlik': 'Ağırlık',
            'hacim': 'Hacim',
            'malzeme': 'Malzeme',
            'diger': 'Seçenek'
        };
        return labels[type] || type;
    }

    /**
     * Update selected variant and price display
     */
    updateSelectedVariant() {
        if (!this.productVariants || this.productVariants.length === 0) return;

        // Get selected color
        const activeColor = document.querySelector('#variantColors .color-option.active');
        const selectedColorHex = activeColor?.dataset.colorHex || null;

        // Get selected type/value
        const activeSize = document.querySelector('.size-options .size-option.active');
        const selectedVariantId = activeSize?.dataset.variantId || null;

        // Find matching variant
        let selectedVariant = null;
        if (selectedVariantId) {
            selectedVariant = this.productVariants.find(v => v.id === selectedVariantId);
        } else if (selectedColorHex) {
            selectedVariant = this.productVariants.find(v => v.color_hex === selectedColorHex);
        }

        if (!selectedVariant) {
            selectedVariant = this.productVariants[0];
        }

        this.selectedVariantId = selectedVariant?.id || null;

        // Update price display
        if (selectedVariant?.price) {
            const priceEl = document.querySelector('.product-modal .product-price');
            if (priceEl) {
                priceEl.textContent = `₺${Number(selectedVariant.price).toLocaleString('tr-TR')}`;
            }
        }

        // Update stock info
        const stock = selectedVariant?.stock || 0;
        const stockEl = document.querySelector('.product-modal .stock-status');
        if (stockEl) {
            if (stock > 0) {
                stockEl.textContent = `Stok: ${stock} adet`;
                stockEl.style.color = '#059669';
            } else {
                stockEl.textContent = 'Stokta yok';
                stockEl.style.color = '#dc2626';
            }
        }
    }

    /**
     * Get color code for color variant values
     */
    getColorCode(value) {
        const colorMap = {
            'natural': '#f5f2eb',
            'doğal': '#f5f2eb',
            'forest': '#2d6853',
            'orman': '#2d6853',
            'bark': '#8b6d47',
            'kabuk': '#8b6d47',
            'warm': '#a0845c',
            'sıcak': '#a0845c',
            'white': '#ffffff',
            'beyaz': '#ffffff',
            'black': '#000000',
            'siyah': '#000000',
            'red': '#d32f2f',
            'kırmızı': '#d32f2f',
            'blue': '#1976d2',
            'mavi': '#1976d2',
            'green': '#388e3c',
            'yeşil': '#388e3c',
        };

        const lowerValue = value.toLowerCase();
        return colorMap[lowerValue] || '#cccccc';
    }

    updatePriceBySize(size) {
        // Optional: Update price based on size
        const priceElement = document.getElementById('modalPrice');
        const basePrice = parseFloat(this.currentProduct.price.replace(/[^\d.]/g, ''));

        let multiplier = 1;
        switch (size) {
            case 'xs': multiplier = 0.8; break;
            case 's': multiplier = 0.9; break;
            case 'm': multiplier = 1.0; break;
            case 'l': multiplier = 1.1; break;
            case 'xl': multiplier = 1.2; break;
        }

        const newPrice = (basePrice * multiplier).toFixed(0);
        priceElement.textContent = `₺ ${newPrice}`;
    }

    populateModal() {
        const product = this.currentProduct;

        // Breadcrumb
        document.getElementById('modalCategory').textContent = product.category;
        document.getElementById('modalProductName').textContent = product.title;

        // Main content
        document.getElementById('modalTitle').textContent = product.title;
        document.getElementById('modalArtisan').textContent = product.artisan;
        document.getElementById('modalPrice').textContent = product.price;
        document.getElementById('modalMainImg').src = product.image;
        document.getElementById('modalMainImg').alt = product.title;

        // Badge
        if (product.badges.length > 0) {
            document.getElementById('modalBadge').textContent = product.badges[0].toUpperCase();
        }

        // Generate thumbnails
        this.generateThumbnails();

        // Quick info
        this.populateQuickInfo();

        // Artisan info
        this.populateArtisanInfo();

        // Initialize with details tab
        this.switchTab('details');
    }

    generateThumbnails() {
        const thumbnailContainer = document.getElementById('modalThumbnails');

        // Use images from API or fallback to single image
        const images = Array.isArray(this.currentProduct.images) && this.currentProduct.images.length > 0
            ? this.currentProduct.images
            : [this.currentProduct.image];

        thumbnailContainer.innerHTML = images.map((img, index) => `
            <div class="modal-thumbnail ${index === 0 ? 'active' : ''}" data-image="${img}">
                <img src="${img}" alt="View ${index + 1}" loading="lazy">
            </div>
        `).join('');

        // Preload images for better performance
        this.preloadImages(images);

        // Thumbnail click handlers with loading states
        thumbnailContainer.querySelectorAll('.modal-thumbnail').forEach(thumb => {
            thumb.addEventListener('click', () => {
                this.switchMainImage(thumb);
            });
        });
    }

    switchMainImage(thumbnail) {
        const mainImg = document.getElementById('modalMainImg');
        const newImageSrc = thumbnail.dataset.image;

        // Add loading state
        mainImg.style.opacity = '0.5';
        mainImg.style.transition = 'opacity 0.3s ease';

        // Update active thumbnail
        document.querySelectorAll('.modal-thumbnail').forEach(t => t.classList.remove('active'));
        thumbnail.classList.add('active');

        // Load new image
        const img = new Image();
        img.onload = () => {
            mainImg.src = newImageSrc;
            mainImg.style.opacity = '1';
        };
        img.src = newImageSrc;
    }

    preloadImages(images) {
        // Preload images in background for smooth transitions
        images.forEach(imageSrc => {
            const img = new Image();
            img.src = imageSrc;
        });
    }

    populateQuickInfo() {
        const product = this.currentProduct;
        const quickInfoGrid = document.querySelector('.quick-info-grid');

        // Build info items conditionally - only show fields that have values
        let infoItems = '';

        if (product.dimensions) {
            infoItems += `
                <div class="quick-info-item">
                    <span class="info-label">Boyut:</span>
                    <span class="info-value">${product.dimensions}</span>
                </div>
            `;
        }

        if (product.material) {
            infoItems += `
                <div class="quick-info-item">
                    <span class="info-label">Malzeme:</span>
                    <span class="info-value">${product.material}</span>
                </div>
            `;
        }

        if (product.technique) {
            infoItems += `
                <div class="quick-info-item">
                    <span class="info-label">Teknik:</span>
                    <span class="info-value">${product.technique}</span>
                </div>
            `;
        }

        if (product.weight) {
            infoItems += `
                <div class="quick-info-item">
                    <span class="info-label">Ağırlık:</span>
                    <span class="info-value">${product.weight}</span>
                </div>
            `;
        }

        // Always show shipping info
        infoItems += `
            <div class="quick-info-item">
                <span class="info-label">Kargo:</span>
                <span class="info-value">2-3 iş günü</span>
            </div>
        `;

        quickInfoGrid.innerHTML = infoItems;
    }

    populateArtisanInfo() {
        const product = this.currentProduct;
        const artisanInfo = document.getElementById('modalArtisanInfo');

        artisanInfo.innerHTML = `
            <div class="artisan-card">
                <div class="artisan-avatar">
                    ${product.artisan.charAt(0).toUpperCase()}
                </div>
                <div class="artisan-details">
                    <div class="artisan-name">${product.artisan}</div>
                    <div class="artisan-location">${product.artisanLocation}</div>
                    <div class="artisan-verified">✓ Doğrulanmış zanaatkâr</div>
                </div>
            </div>
        `;
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        // Update tab headers
        document.querySelectorAll('.modal-tab-header').forEach(header => {
            header.classList.toggle('active', header.dataset.tab === tabName);
        });

        // Update tab content
        const content = document.getElementById('modalTabContent');

        switch (tabName) {
            case 'details':
                content.innerHTML = this.getDetailsTabContent();
                break;
            case 'dostik':
                content.innerHTML = this.getDostikTabContent();
                break;
            case 'similar':
                content.innerHTML = this.getSimilarTabContent();
                break;
        }
    }

    getDetailsTabContent() {
        return `
            <div class="tab-details">
                <div class="details-grid">
                    <div class="details-column">
                        <h3>Ürün Özellikleri</h3>
                        <ul class="details-list">
                            <li>🌿 Doğal ${this.currentProduct.material} malzeme</li>
                            <li>✋ Elle üretilmiş geleneksel teknik</li>
                            <li>📏 ${this.currentProduct.dimensions} boyutları</li>
                            <li>⚖️ ${this.currentProduct.weight} ağırlık</li>
                            <li>🎨 Özgün Nordic tasarım</li>
                        </ul>
                    </div>
                    <div class="details-column">
                        <h3>Bakım Önerileri</h3>
                        <ul class="details-list">
                            <li>🧼 Ilık sabunlu su ile temizlenebilir</li>
                            <li>🚿 Bulaşık makinesinde yıkanabilir</li>
                            <li>☀️ Direkt güneş ışığından uzak tutun</li>
                            <li>🧽 Yumuşak bez ile kurulayın</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    getDostikTabContent() {
        // Trigger async loading of siftah recommendations
        setTimeout(() => this.loadSiftahRecommendations(), 100);

        return `
            <div class="tab-dostik">
                <div class="siftah-loading" id="siftahTabLoading">
                    <div class="loader-spinner"></div>
                    <p>Siftah önerileri yükleniyor...</p>
                </div>
                <div class="dostik-suggestions" id="siftahTabContent" style="display: none;">
                    <!-- Siftah recommendations will be loaded here -->
                </div>
            </div>
        `;
    }

    async loadSiftahRecommendations() {
        const loadingEl = document.getElementById('siftahTabLoading');
        const contentEl = document.getElementById('siftahTabContent');

        if (!contentEl) return;

        try {
            const productId = this.currentProduct.id;
            if (!productId) {
                this.showNoSiftahMessage(loadingEl, contentEl, 'Ürün bilgisi bulunamadı');
                return;
            }

            const API_BASE = window.API_BASE_URL || 'http://localhost:3002/api/v1';
            const response = await fetch(`${API_BASE}/siftah/recommendations?product_id=${productId}`);
            const data = await response.json();

            if (data.success && data.data.has_recommendation) {
                const product = data.data.product;
                const imageUrl = product.images?.[0] || 'https://via.placeholder.com/200';

                contentEl.innerHTML = `
                    <div class="suggestion-card siftah-highlight" style="grid-column: 1 / -1;">
                        <div class="siftah-banner">🌟 Bu mağazanın bugün ilk müşterisi olun!</div>
                        <div class="siftah-product-content">
                            <img src="${imageUrl}" alt="${product.title}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;">
                            <div class="siftah-product-info">
                                <h3>${product.title}</h3>
                                <p class="siftah-store">${product.store?.name || 'Mağaza'}</p>
                                <div class="siftah-price">₺${parseFloat(product.price).toFixed(0)}</div>
                                ${product.price_comparison?.difference < 0 ?
                        `<div class="siftah-savings">${product.price_comparison.label}</div>` : ''}
                            </div>
                        </div>
                        <button class="suggestion-btn siftah-action-btn" onclick="window.location.href='/pages/product.html?slug=${product.slug}'">
                            🌟 Ürünü İncele
                        </button>
                        <p class="siftah-note">Bu satıcı bugün henüz satış yapmadı. İlk müşteri olarak destekleyin! 💛</p>
                    </div>
                `;

                if (loadingEl) loadingEl.style.display = 'none';
                contentEl.style.display = 'grid';
            } else {
                const reason = data.data?.reason || 'no_recommendation';
                let message = 'Şu an için siftah önerisi bulunmuyor.';

                if (reason === 'source_store_no_siftah') {
                    message = 'Bu mağaza henüz bugün satış yapmadı. İlk müşteri olarak siz destekleyin! 💛';
                } else if (reason === 'no_eligible_products') {
                    message = 'Bu kategoride uygun siftah önerisi bulunamadı.';
                }

                this.showNoSiftahMessage(loadingEl, contentEl, message);
            }

        } catch (error) {
            console.error('[ProductModal] Siftah API error:', error);
            this.showNoSiftahMessage(loadingEl, contentEl, 'Öneriler yüklenirken hata oluştu');
        }
    }

    showNoSiftahMessage(loadingEl, contentEl, message) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="suggestion-card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <div class="suggestion-icon">🌟</div>
                    <h3>Siftah Önerileri</h3>
                    <p>${message}</p>
                </div>
            `;
            contentEl.style.display = 'grid';
        }
    }

    getSimilarTabContent() {
        return `
            <div class="tab-similar">
                <div class="similar-products">
                    <div class="similar-card">
                        <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop" alt="Küçük Vazo">
                        <h3>Küçük Nordic Vazo</h3>
                        <p>12 cm - Masa üstü için ideal</p>
                        <div class="similar-price">₺ 450</div>
                        <button class="similar-btn">İncele</button>
                    </div>
                    <div class="similar-card">
                        <img src="https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=200&h=200&fit=crop" alt="Büyük Vazo">
                        <h3>Büyük Nordic Vazo</h3>
                        <p>24 cm - Salon için mükemmel</p>
                        <div class="similar-price">₺ 850</div>
                        <button class="similar-btn">İncele</button>
                    </div>
                    <div class="similar-card">
                        <img src="https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=200&h=200&fit=crop" alt="Nordic Set">
                        <h3>Nordic Kase Seti</h3>
                        <p>Aynı atölyeden 3'lü set</p>
                        <div class="similar-price">₺ 580</div>
                        <button class="similar-btn">İncele</button>
                    </div>
                </div>
            </div>
        `;
    }

    toggleDostikChat(show = null) {
        const chatDiv = document.getElementById('modalDostikChat');
        const isVisible = chatDiv.style.display !== 'none';

        if (show === null) {
            show = !isVisible;
        }

        chatDiv.style.display = show ? 'flex' : 'none';

        if (show && this.chatMessages.length === 0) {
            setTimeout(() => {
                this.addDostikMessage("Merhaba! Ben bu ürün için AI asistanın 🐲 Sana nasıl yardımcı olabilirim?");
            }, 500);
        }
    }

    addDostikMessage(message) {
        this.chatMessages.push({ type: 'dostik', message, timestamp: Date.now() });
        this.updateDostikMessages();
    }

    sendDostikMessage() {
        const input = document.getElementById('dostikInput');
        const message = input.value.trim();

        if (!message) return;

        this.chatMessages.push({ type: 'user', message, timestamp: Date.now() });
        input.value = '';
        this.updateDostikMessages();

        // AI response
        setTimeout(() => {
            const response = this.getAIResponse(message);
            this.addDostikMessage(response);
        }, 1000);
    }

    getAIResponse(input) {
        const lowerInput = input.toLowerCase();
        const responses = {
            'boyut': `Bu ${this.currentProduct.title} ${this.currentProduct.dimensions} boyutlarında! Orta boy mekanlar için ideal. Daha farklı boyutlar göstereyim mi? 📏`,
            'malzeme': `${this.currentProduct.material} malzemesinden üretilmiş! ${this.currentProduct.technique} ile işlenmiş. Tamamen doğal ve çevre dostu 🌱`,
            'hediye': "Harika hediye paketi seçeneklerimiz var! Kraft kutu + özel kart + sürdürülebilir ambalaj. +50₺ ekstra. İster misin? 🎁",
            'benzer': "Bu stilde birkaç farklı seçenek var! Yukarıdaki 'Benzer Ürünler' sekmesine göz atabilirsin. Karşılaştırma yapalım mı? 📊",
            'kargo': "Özel paketleme ile 2-3 iş günü kargo! Türkiye'nin her yerine güvenli teslimat. Kırılma garantili gönderim 📦",
            'fiyat': `Bu güzellik ${this.currentProduct.price}! El yapımı ürünler için çok uygun. Taksit seçenekleri de var 💳`,
            'default': "Bu konuda sana nasıl yardımcı olabilirim? Ürün detayları, hediye seçenekleri, benzer ürünler hakkında sorabilirsin! 🐲"
        };

        for (const [keyword, response] of Object.entries(responses)) {
            if (lowerInput.includes(keyword)) {
                return response;
            }
        }

        return responses['default'];
    }

    updateDostikMessages() {
        const messagesDiv = document.getElementById('dostikMessages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = this.chatMessages.map(msg => `
            <div class="dostik-message ${msg.type}">
                ${msg.type === 'dostik' ? '<span class="dostik-avatar-small">🐉</span>' : ''}
                <div class="dostik-message-text">${msg.message}</div>
            </div>
        `).join('');

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    /**
     * Get selected variant details for cart
     * Updated for new cascade variant format
     */
    getSelectedVariantDetails() {
        const selections = [];

        // Use new variant system if available
        if (this.selectedVariantId && this.productVariants) {
            const variant = this.productVariants.find(v => v.id === this.selectedVariantId);
            if (variant) {
                const selection = {
                    variant_id: variant.id,
                    name: variant.variant_type || 'Varyant',
                    value: variant.variant_value || '',
                    label: variant.variant_value || '',
                    price: parseFloat(variant.price) || 0,
                    stock: parseInt(variant.stock) || 0,
                };
                if (variant.sku) selection.sku = variant.sku;
                if (variant.color_hex) {
                    selection.color_hex = variant.color_hex;
                    selection.color_name = variant.color_name || '';
                }
                selections.push(selection);
                return selections;
            }
        }

        // Fallback to DOM-based selection for size-options (new format)
        document.querySelectorAll('.size-options').forEach((group) => {
            const active = group.querySelector('.size-option.active');
            if (!active) return;
            const selection = {
                variant_id: active.dataset.variantId || '',
                name: group.dataset.variantType || 'Beden',
                value: active.dataset.variantValue || active.textContent.trim(),
                label: active.textContent.trim(),
            };
            const price = parseFloat(active.dataset.variantPrice);
            if (!Number.isNaN(price)) selection.price = price;
            const stock = parseInt(active.dataset.variantStock, 10);
            if (!Number.isNaN(stock)) selection.stock = stock;
            selections.push(selection);
        });

        // Legacy color-options support (new format)
        document.querySelectorAll('#variantColors').forEach((group) => {
            const active = group.querySelector('.color-option.active');
            if (!active) return;
            const selection = {
                name: 'Renk',
                value: active.dataset.colorName || active.dataset.colorHex || '',
                label: active.title || active.dataset.colorName || '',
                color_hex: active.dataset.colorHex || '',
                color_name: active.dataset.colorName || '',
            };
            selections.push(selection);
        });

        // Legacy support for old format selects
        document.querySelectorAll('.option-select').forEach((select) => {
            const value = select.value;
            if (!value) return;
            const optionEl = select.options[select.selectedIndex];
            const selection = {
                name: select.dataset.variantName || 'Variant',
                value,
                label: optionEl?.textContent?.trim() || value,
            };
            const sku = optionEl?.dataset?.variantSku;
            if (sku) selection.sku = sku;
            const price = parseFloat(optionEl?.dataset?.variantPrice);
            if (!Number.isNaN(price)) selection.price = price;
            const stock = parseInt(optionEl?.dataset?.variantStock || '', 10);
            if (!Number.isNaN(stock)) selection.stock = stock;
            selections.push(selection);
        });

        return selections;
    }

    async addToCart() {
        if (!this.currentProduct) return;

        const selectedVariants = this.getSelectedVariantDetails();
        const quantity = 1;

        const productId = this.currentProduct.id ||
            this.currentProduct.slug ||
            this.generateProductId(this.currentProduct);

        const currentPrice = document.getElementById('modalPrice')?.textContent || this.currentProduct.price;
        const basePrice = parseFloat((currentPrice || '').toString().replace(/[^\d.]/g, ''));
        const variantPriceEntry = selectedVariants.find((v) => typeof v.price === 'number');
        const priceValue = variantPriceEntry ? variantPriceEntry.price : basePrice;

        const variantStockEntry = selectedVariants.find((v) => typeof v.stock === 'number');
        if (variantStockEntry && variantStockEntry.stock <= 0) {
            this.addDostikMessage('Secilen varyant stokta yok.');
            return;
        }
        if (variantStockEntry && variantStockEntry.stock < quantity) {
            this.addDostikMessage(`Bu varyant icin mevcut stok: ${variantStockEntry.stock}`);
            return;
        }
        const variantSkuEntry = selectedVariants.find((v) => v.sku);

        const productData = {
            id: productId,
            title: this.currentProduct.title,
            price: priceValue,
            images: this.currentProduct.images || [this.currentProduct.image],
            stock: variantStockEntry?.stock ?? this.currentProduct.stock ?? 99,
            store: this.currentProduct._apiProduct?.store || {
                id: this.currentProduct._apiProduct?.store_id,
                name: this.currentProduct.artisan
            },
            category: this.currentProduct._apiProduct?.category,
            selectedVariants: selectedVariants,
        };
        if (variantSkuEntry?.sku) {
            productData.sku = variantSkuEntry.sku;
        }

        console.log('[ProductModal] Adding to cart:', productId, productData);

        if (window.cartManager) {
            try {
                const success = await window.cartManager.addItem(productId, productData, quantity);

                if (success) {
                    this.updateCartCounter();
                    this.showAddToCartSuccess();

                    // Trigger siftah toast recommendation
                    if (window.SiftahModule && typeof window.SiftahModule.loadForAddToCart === 'function') {
                        window.SiftahModule.loadForAddToCart(productId);
                    }

                    setTimeout(() => {
                        const variantText = selectedVariants.length
                            ? ` (${selectedVariants.map(v => `${v.name}: ${v.label || v.value}`).join(', ')})`
                            : '';
                        this.addDostikMessage(`Harika! ${this.currentProduct.title}${variantText} sepete eklendi!`);
                    }, 500);
                } else {
                    console.error('[ProductModal] Failed to add to cart');
                    this.addDostikMessage('Sepete eklenirken bir hata olustu. Lutfen tekrar deneyin.');
                }
            } catch (error) {
                console.error('[ProductModal] Error adding to cart:', error);
                this.addDostikMessage('Sepete eklenirken bir hata olustu. Lutfen tekrar deneyin.');
            }
        } else {
            console.error('[ProductModal] CartManager not found');
            this.addDostikMessage('Sepet sistemi yuklenemedi. Lutfen sayfayi yenileyin.');
        }
    }

    async toggleWishlist() {
        if (!this.currentProduct) return;

        const heartBtn = document.querySelector('.modal-heart-btn');
        if (!heartBtn) return;

        // Use product ID from API (preferred) or fallback to generated ID
        const productId = this.currentProduct.id ||
            this.currentProduct.slug ||
            this.generateProductId(this.currentProduct);

        // Build metadata using API data
        const metadata = {
            product: {
                id: productId,
                title: this.currentProduct.title,
                slug: this.currentProduct.slug,
                price: this.parsePrice(this.currentProduct.price),
                images: this.currentProduct.images || (this.currentProduct.image ? [this.currentProduct.image] : []),
                rating: parseFloat(this.currentProduct.rating),
                total_sales: this.currentProduct._apiProduct?.total_sales || 0,
                badges: this.currentProduct.badges || [],
                store: this.currentProduct._apiProduct?.store || {
                    id: this.currentProduct._apiProduct?.store_id,
                    name: this.currentProduct.artisan
                },
                category: this.currentProduct._apiProduct?.category
            }
        };

        console.log('[ProductModal] Toggling wishlist:', productId, metadata);

        try {
            let added;
            if (window.wishlistManager && typeof window.wishlistManager.toggle === 'function') {
                added = await window.wishlistManager.toggle(productId, metadata);
            } else {
                added = this.toggleLegacyWishlist(productId, metadata.product);
            }

            heartBtn.classList.toggle('liked', added);
            heartBtn.innerHTML = added ? '♥' : '♡';

            if (added) {
                setTimeout(() => {
                    this.addDostikMessage(`${this.currentProduct.title} favorilerine eklendi! 💖`);
                }, 300);
            } else {
                this.addDostikMessage(`${this.currentProduct.title} favorilerden çıkarıldı.`);
            }
        } catch (error) {
            console.error('[ProductModal] Failed to toggle wishlist:', error);
            this.addDostikMessage('Favorilere eklenirken bir hata oluştu.');
        }
    }

    toggleLegacyWishlist(productId, productData) {
        let wishlist = [];
        try {
            wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        } catch (_) {
            wishlist = [];
        }

        const existingIndex = wishlist.findIndex(item =>
            item.product_id === productId || item.title === productData?.title
        );

        if (existingIndex > -1) {
            wishlist.splice(existingIndex, 1);
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            return false;
        }

        wishlist.push({
            product_id: productId,
            title: productData?.title || this.currentProduct.title,
            price: productData?.price || this.parsePrice(this.currentProduct.price),
            image: productData?.images?.[0] || this.currentProduct.image,
            artisan: productData?.store?.name || this.currentProduct.artisan
        });
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        return true;
    }

    parsePrice(value) {
        if (typeof value === 'number') return value;
        if (!value) return null;
        const numeric = parseFloat(String(value).replace(/[^0-9.,-]/g, '').replace(',', '.'));
        return Number.isNaN(numeric) ? null : numeric;
    }

    async updateCartCounter() {
        const cartCount = document.querySelector('.cart-count');

        if (cartCount && window.cartManager) {
            try {
                const count = await window.cartManager.getCartCount();
                cartCount.textContent = count;
                cartCount.classList.add('show');
            } catch (error) {
                console.error('[ProductModal] Error updating cart counter:', error);
                cartCount.textContent = '0';
            }
        }
    }

    showAddToCartSuccess() {
        const button = document.getElementById('modalAddToCart');
        const originalText = button.innerHTML;

        // Step 1: Adding to cart state
        button.classList.add('adding-to-cart');
        button.innerHTML = '🔄 Ekleniyor...';
        button.disabled = true;

        setTimeout(() => {
            // Step 2: Success state with animation
            button.classList.remove('adding-to-cart');
            button.classList.add('added-to-cart');
            button.innerHTML = '✓ Sepete Eklendi!';

            // Step 3: Flying cart animation
            this.createFlyingCartIcon();

            // Step 4: Header cart bounce
            setTimeout(() => {
                this.bounceCartIcon();
            }, 400);

            // Step 5: Reset button after animation
            setTimeout(() => {
                button.classList.remove('added-to-cart');
                button.innerHTML = originalText;
                button.disabled = false;
            }, 2000);
        }, 500);
    }

    createFlyingCartIcon() {
        const button = document.getElementById('modalAddToCart');
        const cartIcon = document.querySelector('.cart-icon') ||
            document.querySelector('.cart-count') ||
            document.querySelector('[href*="cart"]');

        if (!button || !cartIcon) {
            // Cart icon not found - skipping animation
            return;
        }

        // Create flying cart icon
        const flyingCart = document.createElement('div');
        flyingCart.className = 'cart-fly-animation';
        flyingCart.innerHTML = '🛒';

        // Position it at button location
        const buttonRect = button.getBoundingClientRect();
        flyingCart.style.left = `${buttonRect.left + buttonRect.width / 2} px`;
        flyingCart.style.top = `${buttonRect.top + buttonRect.height / 2} px`;

        document.body.appendChild(flyingCart);

        // Get cart icon position
        const cartRect = cartIcon.getBoundingClientRect();
        const targetX = cartRect.left + cartRect.width / 2;
        const targetY = cartRect.top + cartRect.height / 2;

        // Calculate animation path
        const deltaX = targetX - (buttonRect.left + buttonRect.width / 2);
        const deltaY = targetY - (buttonRect.top + buttonRect.height / 2);

        // Start animation
        setTimeout(() => {
            flyingCart.classList.add('flying');
            flyingCart.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.5)`;
            flyingCart.style.opacity = '0';
        }, 50);

        // Remove element after animation
        setTimeout(() => {
            document.body.removeChild(flyingCart);
        }, 900);
    }

    bounceCartIcon() {
        const cartIcon = document.querySelector('.cart-icon') ||
            document.querySelector('.cart-count');

        if (cartIcon) {
            cartIcon.classList.add('cart-bounce');
            setTimeout(() => {
                cartIcon.classList.remove('cart-bounce');
            }, 600);
        } else {
            // Cart icon not found - skipping bounce animation
        }
    }

    goToFullProductPage() {
        // Navigate to Full Product Detail Page
        this.closeModal();

        if (!this.currentProduct) {
            console.error('[ProductModal] No product data to navigate');
            return;
        }

        // Get the current path
        const currentPath = window.location.pathname;
        const isInPagesFolder = currentPath.includes('/pages/');

        // Build the correct path to product-detail.html
        const detailPagePath = isInPagesFolder ? 'product-detail.html' : 'pages/product-detail.html';

        // Use product ID from API (preferred) or fallback to slug/generated ID
        const productId = this.currentProduct.id ||
            this.currentProduct.slug ||
            this.generateProductId(this.currentProduct);

        // Navigate to detailed product page with product ID parameter
        // Product detail page will fetch fresh data from API using this ID
        window.location.href = `${detailPagePath}?id=${encodeURIComponent(productId)}`;
    }

    showModal() {
        const modal = document.getElementById('productModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this.isOpen = true;
        this.timeOnPage = 0;

        // Add scroll optimization
        this.optimizeScrollPerformance();

        // Focus management for accessibility
        setTimeout(() => {
            const closeBtn = document.querySelector('.modal-close');
            if (closeBtn) closeBtn.focus();
        }, 100);

        // Add will-change for performance during animations
        modal.style.willChange = 'transform, opacity';
        setTimeout(() => {
            modal.style.willChange = 'auto';
        }, 500);
    }

    optimizeScrollPerformance() {
        const modalContent = document.querySelector('.modal-content');
        if (!modalContent) return;

        let ticking = false;

        const updateScrollPosition = () => {
            // Any scroll-related optimizations can go here
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollPosition);
                ticking = true;
            }
        };

        modalContent.addEventListener('scroll', onScroll, { passive: true });
    }

    closeModal() {
        this.closeModalWithoutHistory();
        this.popModalState();
    }

    closeModalWithoutHistory() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.remove();
        }
        document.body.style.overflow = '';
        this.isOpen = false;
        this.currentProduct = null;
        this.chatMessages = [];
        this.timeOnPage = 0;
    }

    popModalState() {
        // Remove product parameter from URL
        const url = new URL(window.location);
        url.searchParams.delete('product');

        // Go back to previous state or replace current state
        if (history.state && history.state.productModal) {
            history.back();
        } else {
            history.replaceState(null, document.title, url.toString());
        }
    }
}

// Initialize the modal system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productModal = new ProductModal();
});
