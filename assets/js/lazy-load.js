/**
 * Lazy Loading Utility
 * Optimized image and content loading
 */

class LazyLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '50px',
            threshold: 0.01,
            ...options
        };

        this.observer = null;
        this.init();
    }

    init() {
        // Check for Intersection Observer support
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                (entries) => this.handleIntersection(entries),
                this.options
            );

            // Observe all lazy elements
            this.observeElements();
        } else {
            // Fallback: Load all images immediately
            this.loadAllImages();
        }
    }

    observeElements() {
        // Lazy images
        document.querySelectorAll('img[data-src], img[loading="lazy"]').forEach(img => {
            this.observer.observe(img);
        });

        // Lazy backgrounds
        document.querySelectorAll('[data-bg]').forEach(el => {
            this.observer.observe(el);
        });

        // Lazy iframes
        document.querySelectorAll('iframe[data-src]').forEach(iframe => {
            this.observer.observe(iframe);
        });
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadElement(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }

    loadElement(element) {
        if (element.tagName === 'IMG') {
            this.loadImage(element);
        } else if (element.tagName === 'IFRAME') {
            this.loadIframe(element);
        } else if (element.dataset.bg) {
            this.loadBackground(element);
        }
    }

    loadImage(img) {
        const src = img.dataset.src || img.src;
        
        if (!src) return;

        // Create a new image to preload
        const tempImg = new Image();
        
        tempImg.onload = () => {
            img.src = src;
            img.classList.add('loaded');
            img.removeAttribute('data-src');
            
            // Trigger custom event
            img.dispatchEvent(new CustomEvent('lazyloaded'));
        };

        tempImg.onerror = () => {
            img.classList.add('error');
            console.error('[LazyLoader] Failed to load image:', src);
        };

        tempImg.src = src;
    }

    loadBackground(element) {
        const bg = element.dataset.bg;
        
        if (!bg) return;

        element.style.backgroundImage = `url(${bg})`;
        element.classList.add('loaded');
        element.removeAttribute('data-bg');
    }

    loadIframe(iframe) {
        const src = iframe.dataset.src;
        
        if (!src) return;

        iframe.src = src;
        iframe.removeAttribute('data-src');
    }

    loadAllImages() {
        // Fallback for browsers without Intersection Observer
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.loadImage(img);
        });

        document.querySelectorAll('[data-bg]').forEach(el => {
            this.loadBackground(el);
        });

        document.querySelectorAll('iframe[data-src]').forEach(iframe => {
            this.loadIframe(iframe);
        });
    }

    // Add new elements to observe
    observe(element) {
        if (this.observer) {
            this.observer.observe(element);
        } else {
            this.loadElement(element);
        }
    }

    // Stop observing an element
    unobserve(element) {
        if (this.observer) {
            this.observer.unobserve(element);
        }
    }

    // Disconnect observer
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Add CSS for lazy loading
const lazyLoadStyle = document.createElement('style');
lazyLoadStyle.textContent = `
    img[data-src], img[loading="lazy"] {
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    img.loaded {
        opacity: 1;
    }

    img.error {
        opacity: 0.5;
        background: #f3f4f6;
    }

    /* Placeholder for lazy images */
    img[data-src]::before {
        content: '';
        display: block;
        padding-top: 66.67%; /* 3:2 aspect ratio */
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
    }

    @keyframes loading {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }
`;
document.head.appendChild(lazyLoadStyle);

// Initialize lazy loader
window.lazyLoader = new LazyLoader();

// Re-observe when new content is added
const originalAppendChild = Element.prototype.appendChild;
Element.prototype.appendChild = function(child) {
    const result = originalAppendChild.call(this, child);
    
    if (child.nodeType === 1) { // Element node
        if (child.hasAttribute('data-src') || child.hasAttribute('data-bg')) {
            window.lazyLoader.observe(child);
        }
        
        // Check children
        child.querySelectorAll('[data-src], [data-bg]').forEach(el => {
            window.lazyLoader.observe(el);
        });
    }
    
    return result;
};

// Export
window.LazyLoader = LazyLoader;
