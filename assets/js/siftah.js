/**
 * Siftah Recommendation System - Frontend Module
 * Handles Quick View modal recommendations and toast notifications
 */

(function () {
    'use strict';

    const API_BASE = window.API_BASE_URL || 'http://localhost:3100/api/v1';

    // ============================================
    // FREQUENCY LIMITING CONFIGURATION
    // ============================================
    const SIFTAH_CONFIG = {
        MAX_TOASTS_PER_SESSION: 3,      // Maksimum oturumda gösterilecek toast sayısı
        SHOW_EVERY_N_ADDS: 5,            // Her N sepete eklemede bir göster
        COOLDOWN_MINUTES: 2,             // Toast'lar arası minimum bekleme (dakika)
        SESSION_KEY: 'siftah_session'    // sessionStorage anahtarı
    };

    /**
     * Gets or initializes siftah session data
     */
    function getSessionData() {
        try {
            const data = sessionStorage.getItem(SIFTAH_CONFIG.SESSION_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) { }

        return {
            toastCount: 0,         // Bu oturumda gösterilen toast sayısı
            addToCartCount: 0,     // Bu oturumda sepete ekleme sayısı
            lastToastTime: 0       // Son toast gösterilme zamanı (timestamp)
        };
    }

    /**
     * Saves siftah session data
     */
    function saveSessionData(data) {
        try {
            sessionStorage.setItem(SIFTAH_CONFIG.SESSION_KEY, JSON.stringify(data));
        } catch (e) { }
    }

    /**
     * Checks if we should show a siftah toast based on frequency limits
     * Shows on 1st add, then every 5th after (1st, 6th, 11th...)
     */
    function shouldShowToast() {
        const session = getSessionData();

        // 1. Oturumdaki maksimum toast sayısını aştık mı?
        if (session.toastCount >= SIFTAH_CONFIG.MAX_TOASTS_PER_SESSION) {
            console.log('[Siftah] Max toasts per session reached');
            return false;
        }

        // 2. Son toast'tan bu yana yeterli süre geçti mi?
        const now = Date.now();
        const cooldownMs = SIFTAH_CONFIG.COOLDOWN_MINUTES * 60 * 1000;
        if (session.lastToastTime && (now - session.lastToastTime) < cooldownMs) {
            console.log('[Siftah] Cooldown not expired');
            return false;
        }

        // 3. İlk eklemede her zaman göster, sonra her N eklemede bir
        const addCount = session.addToCartCount + 1;

        // İlk ekleme - her zaman göster
        if (addCount === 1) {
            return true;
        }

        // Sonraki eklemelerde: 6., 11., 16. vs. (her 5'te bir)
        if ((addCount - 1) % SIFTAH_CONFIG.SHOW_EVERY_N_ADDS === 0) {
            return true;
        }

        console.log(`[Siftah] Not showing (add #${addCount})`);
        return false;
    }

    /**
     * Records add-to-cart action and optionally marks toast as shown
     */
    function recordAddToCart(toastShown = false) {
        const session = getSessionData();
        session.addToCartCount++;

        if (toastShown) {
            session.toastCount++;
            session.lastToastTime = Date.now();
        }

        saveSessionData(session);
    }

    /**
     * Fetches siftah recommendation for a product
     * @param {string} productId - Product UUID
     * @returns {Promise<Object|null>} Recommendation data or null
     */
    async function fetchSiftahRecommendation(productId) {
        try {
            const response = await fetch(`${API_BASE}/siftah/recommendations?product_id=${productId}`);

            if (!response.ok) {
                console.warn('[Siftah] API error:', response.status);
                return null;
            }

            const data = await response.json();

            if (data.success && data.data.has_recommendation) {
                return data.data.product;
            }

            return null;
        } catch (error) {
            console.warn('[Siftah] Fetch error:', error.message);
            return null;
        }
    }

    /**
     * Renders siftah recommendation card in Quick View modal
     * @param {Object} product - Recommended product data
     * @param {HTMLElement} container - Container element
     */
    function renderSiftahCard(product, container) {
        // Remove existing card if any
        const existingCard = container.querySelector('.siftah-card');
        if (existingCard) existingCard.remove();

        const imageUrl = product.images && product.images[0]
            ? product.images[0]
            : '/assets/images/placeholder.png';

        const html = `
      <div class="siftah-card" id="siftah-quick-view-card">
        <div class="siftah-header">
          <span class="siftah-icon">🌟</span>
          <span>Alternatif Öneri</span>
        </div>
        <div class="siftah-body">
          <img src="${imageUrl}" alt="${product.title}" onerror="this.src='/assets/images/placeholder.png'">
          <div class="siftah-info">
            <h4>${product.title}</h4>
            <p class="store">${product.store.name}</p>
            <p class="price">₺${product.price.toFixed(2)}</p>
            <span class="siftah-badge">${product.siftah_message}</span>
            ${product.price_comparison.difference < 0
                ? `<span class="savings">${product.price_comparison.label}</span>`
                : ''}
          </div>
        </div>
        <a href="/pages/product.html?slug=${product.slug}" class="siftah-btn">Ürünü İncele</a>
      </div>
    `;

        container.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Removes siftah card from Quick View modal
     */
    function removeSiftahCard() {
        const card = document.getElementById('siftah-quick-view-card');
        if (card) card.remove();
    }

    /**
     * Shows siftah toast notification
     * @param {Object} product - Recommended product data
     */
    function showSiftahToast(product) {
        // Remove existing toast if any
        closeSiftahToast();

        const imageUrl = product.images && product.images[0]
            ? product.images[0]
            : '/assets/images/placeholder.png';

        const html = `
      <div class="siftah-toast" id="siftah-toast">
        <button class="close-btn" onclick="window.SiftahModule.closeToast()" aria-label="Kapat">×</button>
        <div class="toast-header">🌟 Alternatif önerimiz var!</div>
        <div class="toast-body">
          <img src="${imageUrl}" alt="${product.title}" onerror="this.src='/assets/images/placeholder.png'">
          <div>
            <p class="title">${product.title}</p>
            <p class="store">${product.store.name}</p>
            <p class="price">₺${product.price.toFixed(2)}</p>
            <span class="badge">${product.siftah_message}</span>
          </div>
        </div>
        <a href="/pages/product.html?slug=${product.slug}" class="view-btn">Ürünü İncele</a>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', html);

        // Auto-close after 8 seconds
        window.siftahToastTimeout = setTimeout(closeSiftahToast, 8000);
    }

    /**
     * Closes siftah toast notification
     */
    function closeSiftahToast() {
        if (window.siftahToastTimeout) {
            clearTimeout(window.siftahToastTimeout);
            window.siftahToastTimeout = null;
        }

        const toast = document.getElementById('siftah-toast');
        if (toast) {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }
    }

    /**
     * Loads siftah recommendation for Quick View modal
     * @param {string} productId - Product UUID
     */
    async function loadForQuickView(productId) {
        const container = document.querySelector('.quick-view-modal .modal-body, .quick-view-content, #quick-view-content');

        if (!container) {
            console.warn('[Siftah] Quick View container not found');
            return;
        }

        removeSiftahCard();

        const recommendation = await fetchSiftahRecommendation(productId);

        if (recommendation) {
            renderSiftahCard(recommendation, container);
        }
    }

    /**
     * Loads siftah recommendation for add-to-cart toast
     * Uses frequency limiting to avoid overwhelming users
     * @param {string} productId - Product UUID
     */
    async function loadForAddToCart(productId) {
        // Her zaman sepete eklemeyi kaydet
        const willShowToast = shouldShowToast();

        // Toast gösterilmeyecekse bile, sayacı güncelle
        if (!willShowToast) {
            recordAddToCart(false);
            return;
        }

        // API'den öneri al
        const recommendation = await fetchSiftahRecommendation(productId);

        if (recommendation) {
            // Toast göster ve kaydet
            recordAddToCart(true);
            // Small delay to not interfere with the cart success message
            setTimeout(() => showSiftahToast(recommendation), 1500);
        } else {
            // Öneri yoksa sadece sayacı güncelle
            recordAddToCart(false);
        }
    }

    // Expose module to global scope
    window.SiftahModule = {
        loadForQuickView,
        loadForAddToCart,
        closeToast: closeSiftahToast,
        fetchRecommendation: fetchSiftahRecommendation
    };

    console.log('[Siftah] Module initialized');
})();
