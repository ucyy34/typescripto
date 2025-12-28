/**
 * Component Loader
 * Dynamically loads reusable HTML components (header, footer, etc.)
 * 
 * Usage: 
 * 1. Add containers: <div id="header-container"></div>, <div id="footer-container"></div>
 * 2. Include this script: <script src="/components/component-loader.js"></script>
 */

class ComponentLoader {
    constructor() {
        this.componentsPath = '/components';
        this.loadedComponents = new Set();
        this.callbacks = [];
    }

    /**
     * Get the base path based on current page location
     */
    getBasePath() {
        const path = window.location.pathname;
        // If we're in /pages/, go up one level
        if (path.includes('/pages/') || path.startsWith('/kategori/') || path.startsWith('/category/')) {
            return '';
        }
        return '';
    }

    /**
     * Load a component into a container
     * @param {string} componentName - Name of the component (e.g., 'header', 'footer')
     * @param {string} containerId - ID of the container element
     */
    async loadComponent(componentName, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`[ComponentLoader] Container #${containerId} not found`);
            return false;
        }

        try {
            const basePath = this.getBasePath();
            const response = await fetch(`${basePath}/components/${componentName}.html`);

            if (!response.ok) {
                throw new Error(`Failed to load ${componentName}: ${response.status}`);
            }

            const html = await response.text();
            container.innerHTML = html;
            this.loadedComponents.add(componentName);

            console.log(`[ComponentLoader] Loaded ${componentName} component`);
            return true;
        } catch (error) {
            console.error(`[ComponentLoader] Error loading ${componentName}:`, error);
            return false;
        }
    }

    /**
     * Initialize all standard components
     */
    async init() {
        console.log('[ComponentLoader] Initializing...');

        // Load header
        await this.loadComponent('header', 'header-container');

        // Load footer
        await this.loadComponent('footer', 'footer-container');

        // Initialize component functionality after loading
        this.initializeHeaderFunctionality();

        // Run any registered callbacks
        this.callbacks.forEach(cb => {
            try { cb(); } catch (e) { console.error(e); }
        });

        console.log('[ComponentLoader] Initialization complete');
    }

    /**
     * Register a callback to run after components are loaded
     */
    onReady(callback) {
        if (this.loadedComponents.size > 0) {
            callback();
        } else {
            this.callbacks.push(callback);
        }
    }

    /**
     * Initialize header functionality (mobile menu, theme toggle, auth checks)
     */
    initializeHeaderFunctionality() {
        // Mobile Hamburger Menu
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
        const mobileMenuClose = document.getElementById('mobileMenuClose');
        const themeToggle = document.getElementById('themeToggle');
        const themeToggleMobile = document.getElementById('themeToggleMobile');

        function openMobileMenu() {
            hamburgerBtn?.classList.add('active');
            mobileMenu?.classList.add('active');
            mobileMenuOverlay?.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeMobileMenu() {
            hamburgerBtn?.classList.remove('active');
            mobileMenu?.classList.remove('active');
            mobileMenuOverlay?.classList.remove('active');
            document.body.style.overflow = '';
        }

        hamburgerBtn?.addEventListener('click', openMobileMenu);
        mobileMenuClose?.addEventListener('click', closeMobileMenu);
        mobileMenuOverlay?.addEventListener('click', closeMobileMenu);

        // Close menu on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu?.classList.contains('active')) {
                closeMobileMenu();
            }
        });

        // Theme toggle functionality
        const toggleTheme = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeButtonText(newTheme);
        };

        const updateThemeButtonText = (theme) => {
            if (themeToggle) {
                themeToggle.innerHTML = theme === 'dark' ? '<span aria-hidden="true">☀️</span>' : '<span aria-hidden="true">🌙</span>';
            }
            if (themeToggleMobile) {
                themeToggleMobile.textContent = theme === 'dark' ? '☀️ Aydınlık Mod' : '🌙 Karanlık Mod';
            }
        };

        themeToggle?.addEventListener('click', toggleTheme);
        themeToggleMobile?.addEventListener('click', toggleTheme);

        // Sync theme button text with current theme
        const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme');
        if (currentTheme) {
            updateThemeButtonText(currentTheme);
        }

        // Profile link auth check - redirect to login if not logged in
        const profileLinks = document.querySelectorAll('#profileLinkDesktop, #profileLinkMobile');
        profileLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                if (typeof AuthManager !== 'undefined' && !AuthManager.isLoggedIn()) {
                    e.preventDefault();
                    window.location.href = '/pages/login.html';
                }
            });
        });

        // Update cart count
        this.updateCartCount();
    }

    /**
     * Update cart count in header
     */
    async updateCartCount() {
        const cartCountEl = document.getElementById('cartCount');
        if (!cartCountEl) return;

        try {
            if (window.cartManager) {
                const cart = await window.cartManager.getCart();
                const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
                cartCountEl.textContent = count;
            } else {
                // Fallback to localStorage
                const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
                const count = localCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
                cartCountEl.textContent = count;
            }
        } catch (error) {
            cartCountEl.textContent = '0';
        }
    }
}

// Create global instance
window.componentLoader = new ComponentLoader();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.componentLoader.init());
} else {
    window.componentLoader.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentLoader;
}
