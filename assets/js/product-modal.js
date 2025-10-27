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

    openModal(productCard) {
        this.currentProduct = this.extractProductData(productCard);
        this.createModalHTML();
        this.populateModal();
        this.showModal();
        this.pushModalState();
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
                                <button class="modal-tab-header" data-tab="dostik">Dostik Önerileri</button>
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
        // Color selection
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
            });
        });


        // Size change handler
        document.getElementById('productSize').addEventListener('change', (e) => {
            const selectedSize = e.target.value;
            if (selectedSize) {
                // Update price based on size if needed
                this.updatePriceBySize(selectedSize);
            }
        });
    }

    updatePriceBySize(size) {
        // Optional: Update price based on size
        const priceElement = document.getElementById('modalPrice');
        const basePrice = parseFloat(this.currentProduct.price.replace(/[^\d.]/g, ''));

        let multiplier = 1;
        switch(size) {
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
        const images = [
            this.currentProduct.image,
            this.currentProduct.image.replace('photo-', 'photo-1571781926291-c477ebfd024b?w=100&h=100&fit=crop" alt="View 2'),
            this.currentProduct.image.replace('photo-', 'photo-1565193566173-7a0ee3dbe261?w=100&h=100&fit=crop" alt="View 3')
        ];

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

        quickInfoGrid.innerHTML = `
            <div class="quick-info-item">
                <span class="info-label">Boyut:</span>
                <span class="info-value">${product.dimensions}</span>
            </div>
            <div class="quick-info-item">
                <span class="info-label">Malzeme:</span>
                <span class="info-value">${product.material}</span>
            </div>
            <div class="quick-info-item">
                <span class="info-label">Teknik:</span>
                <span class="info-value">${product.technique}</span>
            </div>
            <div class="quick-info-item">
                <span class="info-label">Kargo:</span>
                <span class="info-value">2-3 iş günü</span>
            </div>
        `;
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
        return `
            <div class="tab-dostik">
                <div class="dostik-suggestions">
                    <div class="suggestion-card">
                        <div class="suggestion-icon">📊</div>
                        <h3>Ürün Karşılaştırması</h3>
                        <p>Benzer ürünlerle boyut, fiyat ve özellik karşılaştırması</p>
                        <button class="suggestion-btn">Karşılaştır</button>
                    </div>
                    <div class="suggestion-card">
                        <div class="suggestion-icon">🎁</div>
                        <h3>Hediye Paketi</h3>
                        <p>Özel kraft kutu, kart ve sürdürülebilir ambalaj</p>
                        <button class="suggestion-btn">+50₺ Ekle</button>
                    </div>
                    <div class="suggestion-card">
                        <div class="suggestion-icon">✨</div>
                        <h3>Kişiselleştirme</h3>
                        <p>İsim gravürü veya özel renk seçenekleri</p>
                        <button class="suggestion-btn">Özelleştir</button>
                    </div>
                </div>
            </div>
        `;
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
        return responses.default;
    }

    updateDostikMessages() {
        const messagesDiv = document.getElementById('dostikMessages');
        messagesDiv.innerHTML = this.chatMessages.map(msg => `
            <div class="dostik-message ${msg.type}">
                <div class="message-bubble">
                    ${msg.message}
                </div>
            </div>
        `).join('');

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    async addToCart() {
        if (!this.currentProduct) return;

        // Get selected options
        const selectedSize = document.getElementById('productSize')?.value || 'M';
        const selectedColorElement = document.querySelector('.color-option.active');
        const selectedColor = selectedColorElement?.dataset.color || 'natural';
        const quantity = 1; // Fixed quantity of 1

        // Validate required selections
        if (!selectedSize) {
            this.addDostikMessage('Lütfen bir boyut seçin! 📏');
            return;
        }

        // Extract product ID from current product
        // Try to get from data attribute or generate from title
        const productCard = document.querySelector(`[data-product-title="${this.currentProduct.title}"]`);
        const productId = productCard?.dataset?.productId || 
                         this.currentProduct.id || 
                         this.generateProductId(this.currentProduct);

        // Get current price (may be updated by size)
        const currentPrice = document.getElementById('modalPrice')?.textContent || this.currentProduct.price;
        const priceValue = parseFloat(currentPrice.replace(/[^\d.]/g, ''));

        // Create product data in CartManager format
        const productData = {
            id: productId,
            title: this.currentProduct.title,
            price: priceValue,
            images: [this.currentProduct.image],
            stock: 99, // Default stock
            store: {
                name: this.currentProduct.artisan
            },
            // Additional metadata
            size: selectedSize,
            color: selectedColor
        };

        console.log('[ProductModal] Adding to cart:', productId, productData);

        // Use CartManager to add item (handles both logged in and guest users)
        if (window.cartManager) {
            try {
                const success = await window.cartManager.addItem(productId, productData, quantity);
                
                if (success) {
                    // Update cart counter
                    this.updateCartCounter();

                    // Show success animation
                    this.showAddToCartSuccess();

                    // Add Dostik message with selection details
                    const colorNames = {
                        'natural': 'Doğal',
                        'forest': 'Orman Yeşili',
                        'bark': 'Kabuk Kahvesi',
                        'warm': 'Sıcak Kahve'
                    };

                    setTimeout(() => {
                        this.addDostikMessage(`Harika! ${this.currentProduct.title} (${selectedSize.toUpperCase()}, ${colorNames[selectedColor]}) sepetine eklendi! 🛒✨`);
                    }, 500);
                } else {
                    console.error('[ProductModal] Failed to add to cart');
                    this.addDostikMessage('Sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
                }
            } catch (error) {
                console.error('[ProductModal] Error adding to cart:', error);
                this.addDostikMessage('Sepete eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
            }
        } else {
            console.error('[ProductModal] CartManager not found');
            this.addDostikMessage('Sepet sistemi yüklenemedi. Lütfen sayfayı yenileyin.');
        }
    }

    async toggleWishlist() {
        if (!this.currentProduct) return;

        const heartBtn = document.querySelector('.modal-heart-btn');
        if (!heartBtn) return;

        const productId = this.currentProduct.id || this.generateProductId(this.currentProduct);
        const metadata = {
            product: {
                id: productId,
                title: this.currentProduct.title,
                price: this.parsePrice(this.currentProduct.price),
                images: this.currentProduct.image ? [this.currentProduct.image] : [],
                store: this.currentProduct.artisan ? { name: this.currentProduct.artisan } : null,
            }
        };

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
                // Fallback to localStorage
                const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
                cartCount.textContent = totalCount;
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
        flyingCart.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
        flyingCart.style.top = `${buttonRect.top + buttonRect.height / 2}px`;

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
        // Navigate to Stage 2 - Full Product Detail Page
        this.closeModal();

        // Get the current path
        const currentPath = window.location.pathname;
        const isInPagesFolder = currentPath.includes('/pages/');

        // Build the correct path to product-detail.html
        const detailPagePath = isInPagesFolder ? 'product-detail.html' : 'pages/product-detail.html';

        // Store product data in sessionStorage for Stage 2
        if (this.currentProduct) {
            sessionStorage.setItem('selectedProduct', JSON.stringify(this.currentProduct));
        }

        // Navigate to detailed product page
        window.location.href = detailPagePath;
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