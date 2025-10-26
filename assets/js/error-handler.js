/**
 * Global Error Handler
 * Catches and handles all unhandled errors
 */

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
        this.isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
        
        this.init();
    }

    init() {
        // Global error event
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error?.stack
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || event.reason,
                error: event.reason,
                stack: event.reason?.stack
            });
        });

        // Network errors
        window.addEventListener('offline', () => {
            this.showToast('İnternet bağlantınız kesildi', 'warning');
        });

        window.addEventListener('online', () => {
            this.showToast('İnternet bağlantınız geri geldi', 'success');
        });
    }

    handleError(errorInfo) {
        // Log error
        this.logError(errorInfo);

        // Store error
        this.storeError(errorInfo);

        // Show user-friendly message
        if (!this.isProduction) {
            console.error('[Error Handler]', errorInfo);
        }

        this.showUserFriendlyError(errorInfo);

        // Send to error tracking service (if configured)
        this.sendToErrorTracking(errorInfo);
    }

    logError(errorInfo) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            ...errorInfo,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Store in memory
        this.errors.push(logEntry);
        
        // Keep only last N errors
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Store in localStorage for debugging
        try {
            const storedErrors = JSON.parse(localStorage.getItem('error_log') || '[]');
            storedErrors.push(logEntry);
            
            // Keep only last 20 errors
            if (storedErrors.length > 20) {
                storedErrors.shift();
            }
            
            localStorage.setItem('error_log', JSON.stringify(storedErrors));
        } catch (e) {
            console.error('Failed to store error log:', e);
        }
    }

    storeError(errorInfo) {
        // Could send to backend API
        // For now, just store locally
    }

    showUserFriendlyError(errorInfo) {
        let message = 'Bir hata oluştu';
        let action = null;

        // Customize message based on error type
        if (errorInfo.type === 'Network Error') {
            message = 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
            action = {
                text: 'Tekrar Dene',
                callback: () => window.location.reload()
            };
        } else if (errorInfo.message?.includes('fetch')) {
            message = 'Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.';
        } else if (errorInfo.message?.includes('localStorage')) {
            message = 'Tarayıcı depolama alanı dolu. Lütfen önbelleği temizleyin.';
        }

        this.showToast(message, 'error', action);
    }

    showToast(message, type = 'info', action = null) {
        // Remove existing toasts
        document.querySelectorAll('.error-toast').forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `error-toast error-toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 1rem;
        `;

        const icon = type === 'error' ? '⚠️' : type === 'warning' ? '⚡' : type === 'success' ? '✅' : 'ℹ️';
        
        toast.innerHTML = `
            <span style="font-size: 1.5rem;">${icon}</span>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 0.25rem;">${type === 'error' ? 'Hata' : type === 'warning' ? 'Uyarı' : type === 'success' ? 'Başarılı' : 'Bilgi'}</div>
                <div style="font-size: 0.875rem; opacity: 0.9;">${message}</div>
                ${action ? `<button onclick="this.closest('.error-toast').dispatchEvent(new CustomEvent('action'))" style="margin-top: 0.5rem; background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600;">${action.text}</button>` : ''}
            </div>
            <button onclick="this.closest('.error-toast').remove()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; opacity: 0.7; line-height: 1;">&times;</button>
        `;

        if (action) {
            toast.addEventListener('action', action.callback);
        }

        document.body.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    sendToErrorTracking(errorInfo) {
        // Integrate with Sentry, LogRocket, etc.
        // For now, just log
        if (window.Sentry) {
            window.Sentry.captureException(errorInfo.error || new Error(errorInfo.message));
        }
    }

    getErrorLog() {
        return this.errors;
    }

    clearErrorLog() {
        this.errors = [];
        localStorage.removeItem('error_log');
    }
}

// Add CSS animation
const errorHandlerStyle = document.createElement('style');
errorHandlerStyle.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(errorHandlerStyle);

// Initialize global error handler
window.errorHandler = new ErrorHandler();

// Export for use in other modules
window.ErrorHandler = ErrorHandler;
