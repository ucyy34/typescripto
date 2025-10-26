/**
 * Security Utilities
 * XSS protection and input sanitization
 */

const SecurityUtils = {
    /**
     * Sanitize HTML to prevent XSS attacks
     * @param {string} str - Input string
     * @returns {string} Sanitized string
     */
    sanitizeHTML(str) {
        if (!str) return '';
        
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Escape HTML special characters
     * @param {string} str - Input string
     * @returns {string} Escaped string
     */
    escapeHTML(str) {
        if (!str) return '';
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        
        return str.replace(/[&<>"'/]/g, (char) => map[char]);
    },

    /**
     * Validate email format
     * @param {string} email - Email address
     * @returns {boolean} Is valid
     */
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Validate URL format
     * @param {string} url - URL string
     * @returns {boolean} Is valid
     */
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Strip HTML tags from string
     * @param {string} str - Input string
     * @returns {string} String without HTML tags
     */
    stripHTML(str) {
        if (!str) return '';
        
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent || div.innerText || '';
    },

    /**
     * Validate and sanitize user input
     * @param {string} input - User input
     * @param {Object} options - Validation options
     * @returns {Object} { isValid, sanitized, error }
     */
    validateInput(input, options = {}) {
        const {
            maxLength = 1000,
            minLength = 0,
            allowHTML = false,
            type = 'text' // text, email, url, number
        } = options;

        // Check length
        if (input.length < minLength) {
            return {
                isValid: false,
                sanitized: '',
                error: `Minimum ${minLength} characters required`
            };
        }

        if (input.length > maxLength) {
            return {
                isValid: false,
                sanitized: '',
                error: `Maximum ${maxLength} characters allowed`
            };
        }

        // Type-specific validation
        if (type === 'email' && !this.isValidEmail(input)) {
            return {
                isValid: false,
                sanitized: '',
                error: 'Invalid email format'
            };
        }

        if (type === 'url' && !this.isValidURL(input)) {
            return {
                isValid: false,
                sanitized: '',
                error: 'Invalid URL format'
            };
        }

        if (type === 'number' && isNaN(Number(input))) {
            return {
                isValid: false,
                sanitized: '',
                error: 'Must be a number'
            };
        }

        // Sanitize
        const sanitized = allowHTML ? this.sanitizeHTML(input) : this.escapeHTML(input);

        return {
            isValid: true,
            sanitized,
            error: null
        };
    },

    /**
     * Generate CSRF token
     * @returns {string} CSRF token
     */
    generateCSRFToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    /**
     * Store CSRF token
     * @param {string} token - CSRF token
     */
    storeCSRFToken(token) {
        sessionStorage.setItem('csrf_token', token);
    },

    /**
     * Get CSRF token
     * @returns {string|null} CSRF token
     */
    getCSRFToken() {
        return sessionStorage.getItem('csrf_token');
    },

    /**
     * Rate limiting check (client-side)
     * @param {string} action - Action name
     * @param {number} maxAttempts - Max attempts
     * @param {number} windowMs - Time window in milliseconds
     * @returns {boolean} Is allowed
     */
    checkRateLimit(action, maxAttempts = 5, windowMs = 60000) {
        const key = `rateLimit_${action}`;
        const now = Date.now();
        
        let attempts = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Remove old attempts
        attempts = attempts.filter(timestamp => now - timestamp < windowMs);
        
        if (attempts.length >= maxAttempts) {
            return false;
        }
        
        attempts.push(now);
        localStorage.setItem(key, JSON.stringify(attempts));
        
        return true;
    }
};

// Export for use in other modules
window.SecurityUtils = SecurityUtils;
