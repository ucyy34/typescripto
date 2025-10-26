/**
 * Performance Monitoring
 * Track Core Web Vitals and page performance
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.isProduction = window.location.hostname !== 'localhost';
        
        this.init();
    }

    init() {
        // Wait for page load
        if (document.readyState === 'complete') {
            this.measurePerformance();
        } else {
            window.addEventListener('load', () => this.measurePerformance());
        }

        // Measure Core Web Vitals
        this.measureCoreWebVitals();
    }

    measurePerformance() {
        if (!window.performance || !window.performance.timing) {
            console.warn('[Performance Monitor] Performance API not supported');
            return;
        }

        const timing = window.performance.timing;
        const navigation = window.performance.navigation;

        // Calculate metrics
        this.metrics = {
            // Page Load Time
            pageLoadTime: timing.loadEventEnd - timing.navigationStart,
            
            // DOM Ready Time
            domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
            
            // Time to First Byte (TTFB)
            ttfb: timing.responseStart - timing.navigationStart,
            
            // DNS Lookup Time
            dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
            
            // TCP Connection Time
            tcpTime: timing.connectEnd - timing.connectStart,
            
            // Request Time
            requestTime: timing.responseEnd - timing.requestStart,
            
            // Response Time
            responseTime: timing.responseEnd - timing.responseStart,
            
            // DOM Processing Time
            domProcessingTime: timing.domComplete - timing.domLoading,
            
            // Navigation Type
            navigationType: this.getNavigationType(navigation.type),
            
            // Redirect Count
            redirectCount: navigation.redirectCount,
            
            // Timestamp
            timestamp: new Date().toISOString()
        };

        // Log metrics
        this.logMetrics();

        // Send to analytics
        this.sendToAnalytics();
    }

    measureCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        this.measureLCP();

        // First Input Delay (FID)
        this.measureFID();

        // Cumulative Layout Shift (CLS)
        this.measureCLS();

        // First Contentful Paint (FCP)
        this.measureFCP();
    }

    measureLCP() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    
                    this.metrics.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime);
                    
                    console.log('[Performance] LCP:', this.metrics.lcp, 'ms');
                });

                observer.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
                console.warn('[Performance] LCP measurement failed:', e);
            }
        }
    }

    measureFID() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    
                    entries.forEach(entry => {
                        this.metrics.fid = Math.round(entry.processingStart - entry.startTime);
                        console.log('[Performance] FID:', this.metrics.fid, 'ms');
                    });
                });

                observer.observe({ entryTypes: ['first-input'] });
            } catch (e) {
                console.warn('[Performance] FID measurement failed:', e);
            }
        }
    }

    measureCLS() {
        if ('PerformanceObserver' in window) {
            try {
                let clsValue = 0;
                
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                    
                    this.metrics.cls = Math.round(clsValue * 1000) / 1000;
                    console.log('[Performance] CLS:', this.metrics.cls);
                });

                observer.observe({ entryTypes: ['layout-shift'] });
            } catch (e) {
                console.warn('[Performance] CLS measurement failed:', e);
            }
        }
    }

    measureFCP() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    
                    entries.forEach(entry => {
                        if (entry.name === 'first-contentful-paint') {
                            this.metrics.fcp = Math.round(entry.startTime);
                            console.log('[Performance] FCP:', this.metrics.fcp, 'ms');
                        }
                    });
                });

                observer.observe({ entryTypes: ['paint'] });
            } catch (e) {
                console.warn('[Performance] FCP measurement failed:', e);
            }
        }
    }

    getNavigationType(type) {
        const types = {
            0: 'navigate',
            1: 'reload',
            2: 'back_forward',
            255: 'reserved'
        };
        
        return types[type] || 'unknown';
    }

    logMetrics() {
        console.group('📊 Performance Metrics');
        console.table(this.metrics);
        console.groupEnd();

        // Performance rating
        this.ratePerformance();
    }

    ratePerformance() {
        const ratings = [];

        // Page Load Time
        if (this.metrics.pageLoadTime < 1000) {
            ratings.push('✅ Page Load: Excellent');
        } else if (this.metrics.pageLoadTime < 3000) {
            ratings.push('⚡ Page Load: Good');
        } else {
            ratings.push('⚠️ Page Load: Needs Improvement');
        }

        // TTFB
        if (this.metrics.ttfb < 200) {
            ratings.push('✅ TTFB: Excellent');
        } else if (this.metrics.ttfb < 600) {
            ratings.push('⚡ TTFB: Good');
        } else {
            ratings.push('⚠️ TTFB: Needs Improvement');
        }

        // LCP
        if (this.metrics.lcp && this.metrics.lcp < 2500) {
            ratings.push('✅ LCP: Good');
        } else if (this.metrics.lcp && this.metrics.lcp < 4000) {
            ratings.push('⚡ LCP: Needs Improvement');
        } else if (this.metrics.lcp) {
            ratings.push('⚠️ LCP: Poor');
        }

        // FID
        if (this.metrics.fid && this.metrics.fid < 100) {
            ratings.push('✅ FID: Good');
        } else if (this.metrics.fid && this.metrics.fid < 300) {
            ratings.push('⚡ FID: Needs Improvement');
        } else if (this.metrics.fid) {
            ratings.push('⚠️ FID: Poor');
        }

        // CLS
        if (this.metrics.cls && this.metrics.cls < 0.1) {
            ratings.push('✅ CLS: Good');
        } else if (this.metrics.cls && this.metrics.cls < 0.25) {
            ratings.push('⚡ CLS: Needs Improvement');
        } else if (this.metrics.cls) {
            ratings.push('⚠️ CLS: Poor');
        }

        console.group('🎯 Performance Rating');
        ratings.forEach(rating => console.log(rating));
        console.groupEnd();
    }

    sendToAnalytics() {
        // Send to Google Analytics, if available
        if (window.gtag) {
            window.gtag('event', 'page_performance', {
                page_load_time: this.metrics.pageLoadTime,
                ttfb: this.metrics.ttfb,
                lcp: this.metrics.lcp,
                fid: this.metrics.fid,
                cls: this.metrics.cls
            });
        }

        // Send to custom analytics endpoint
        if (this.isProduction) {
            // Uncomment when analytics endpoint is ready
            /*
            fetch('/api/v1/analytics/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.metrics)
            }).catch(e => console.error('Failed to send analytics:', e));
            */
        }
    }

    getMetrics() {
        return this.metrics;
    }

    // Get resource timing
    getResourceTiming() {
        if (!window.performance || !window.performance.getEntriesByType) {
            return [];
        }

        const resources = window.performance.getEntriesByType('resource');
        
        return resources.map(resource => ({
            name: resource.name,
            type: resource.initiatorType,
            duration: Math.round(resource.duration),
            size: resource.transferSize,
            cached: resource.transferSize === 0
        }));
    }

    // Get slowest resources
    getSlowestResources(limit = 10) {
        const resources = this.getResourceTiming();
        
        return resources
            .sort((a, b) => b.duration - a.duration)
            .slice(0, limit);
    }
}

// Initialize performance monitor
window.performanceMonitor = new PerformanceMonitor();

// Export
window.PerformanceMonitor = PerformanceMonitor;

// Add command to console
console.log('%c📊 Performance Monitor Active', 'color: #10b981; font-weight: bold; font-size: 14px;');
console.log('%cType performanceMonitor.getMetrics() to see metrics', 'color: #6b7280; font-size: 12px;');
console.log('%cType performanceMonitor.getSlowestResources() to see slow resources', 'color: #6b7280; font-size: 12px;');
