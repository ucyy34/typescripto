/**
 * Global Toast Notification System
 * Consistent, beautiful notifications across the application
 */

class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        // Create toast container if not exists
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.setAttribute('role', 'alert');
            this.container.setAttribute('aria-live', 'polite');
            document.body.appendChild(this.container);
            this.injectStyles();
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    injectStyles() {
        if (document.getElementById('toast-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            #toast-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-width: 380px;
                width: 100%;
                pointer-events: none;
            }

            .toast {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 16px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
                transform: translateX(120%);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                pointer-events: auto;
                border-left: 4px solid #4a8b6c;
            }

            .toast.show {
                transform: translateX(0);
                opacity: 1;
            }

            .toast.hiding {
                transform: translateX(120%);
                opacity: 0;
            }

            .toast-icon {
                font-size: 1.5rem;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .toast-content {
                flex: 1;
                min-width: 0;
            }

            .toast-title {
                font-weight: 600;
                font-size: 0.95rem;
                color: #1a4a3a;
                margin-bottom: 4px;
            }

            .toast-message {
                font-size: 0.875rem;
                color: #666;
                line-height: 1.4;
            }

            .toast-close {
                background: none;
                border: none;
                font-size: 1.2rem;
                color: #999;
                cursor: pointer;
                padding: 4px;
                margin: -4px -4px -4px 8px;
                border-radius: 6px;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }

            .toast-close:hover {
                background: #f3f4f6;
                color: #333;
            }

            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: currentColor;
                opacity: 0.3;
                border-radius: 0 0 12px 12px;
                animation: toast-progress linear forwards;
            }

            @keyframes toast-progress {
                from { width: 100%; }
                to { width: 0%; }
            }

            /* Toast Types */
            .toast.success {
                border-left-color: #10b981;
            }
            .toast.success .toast-icon { color: #10b981; }
            .toast.success .toast-progress { color: #10b981; }

            .toast.error {
                border-left-color: #ef4444;
            }
            .toast.error .toast-icon { color: #ef4444; }
            .toast.error .toast-progress { color: #ef4444; }

            .toast.warning {
                border-left-color: #f59e0b;
            }
            .toast.warning .toast-icon { color: #f59e0b; }
            .toast.warning .toast-progress { color: #f59e0b; }

            .toast.info {
                border-left-color: #3b82f6;
            }
            .toast.info .toast-icon { color: #3b82f6; }
            .toast.info .toast-progress { color: #3b82f6; }

            /* Dark mode */
            [data-theme="dark"] .toast {
                background: #1a1f2e;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            }

            [data-theme="dark"] .toast-title {
                color: #e8eaed;
            }

            [data-theme="dark"] .toast-message {
                color: #9aa0a6;
            }

            [data-theme="dark"] .toast-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                #toast-container {
                    left: 12px;
                    right: 12px;
                    bottom: 12px;
                    max-width: none;
                }

                .toast {
                    padding: 12px;
                }

                .toast-icon {
                    font-size: 1.25rem;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    show(options) {
        const {
            type = 'info',
            title = '',
            message = '',
            duration = 4000,
            closable = true
        } = typeof options === 'string' ? { message: options } : options;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${this.getIcon(type)}</span>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            ${closable ? '<button class="toast-close" aria-label="Kapat">×</button>' : ''}
            ${duration > 0 ? `<div class="toast-progress" style="animation-duration: ${duration}ms"></div>` : ''}
        `;

        this.container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide(toast));
        }

        // Auto hide
        if (duration > 0) {
            setTimeout(() => this.hide(toast), duration);
        }

        return toast;
    }

    hide(toast) {
        toast.classList.add('hiding');
        toast.classList.remove('show');

        setTimeout(() => {
            toast.remove();
        }, 400);
    }

    success(message, title = 'Başarılı') {
        return this.show({ type: 'success', title, message });
    }

    error(message, title = 'Hata') {
        return this.show({ type: 'error', title, message });
    }

    warning(message, title = 'Uyarı') {
        return this.show({ type: 'warning', title, message });
    }

    info(message, title = 'Bilgi') {
        return this.show({ type: 'info', title, message });
    }

    // Cart specific toast
    cartAdded(productName) {
        return this.success(
            `${productName} sepete eklendi!`,
            '🛒 Sepete Eklendi'
        );
    }

    // Wishlist specific toast
    wishlistAdded(productName) {
        return this.success(
            `${productName} favorilere eklendi!`,
            '❤️ Favorilere Eklendi'
        );
    }
}

// Global instance
window.Toast = new ToastManager();

// Convenience functions
window.showToast = (message, type = 'info') => window.Toast.show({ type, message });
window.showSuccessToast = (message) => window.Toast.success(message);
window.showErrorToast = (message) => window.Toast.error(message);
window.showWarningToast = (message) => window.Toast.warning(message);
window.showInfoToast = (message) => window.Toast.info(message);
