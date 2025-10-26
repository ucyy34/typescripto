/**
 * SEO Meta Tags Manager
 * Dynamically updates meta tags and structured data
 */

class SEOMetaManager {
    constructor() {
        this.defaultMeta = {
            siteName: 'DostanWebCSS',
            siteUrl: 'https://dostanwebcss.com',
            defaultImage: 'https://dostanwebcss.com/assets/images/og-default.jpg',
            twitterHandle: '@dostanwebcss',
            locale: 'tr_TR',
            type: 'website'
        };
    }

    /**
     * Update page meta tags
     * @param {Object} meta - Meta information
     */
    updateMeta(meta) {
        const {
            title,
            description,
            keywords,
            image,
            url,
            type = 'website',
            author,
            publishedTime,
            modifiedTime
        } = meta;

        // Update title
        if (title) {
            document.title = `${title} | ${this.defaultMeta.siteName}`;
            this.setMetaTag('og:title', title);
            this.setMetaTag('twitter:title', title);
        }

        // Update description
        if (description) {
            this.setMetaTag('description', description);
            this.setMetaTag('og:description', description);
            this.setMetaTag('twitter:description', description);
        }

        // Update keywords
        if (keywords) {
            this.setMetaTag('keywords', Array.isArray(keywords) ? keywords.join(', ') : keywords);
        }

        // Update image
        const metaImage = image || this.defaultMeta.defaultImage;
        this.setMetaTag('og:image', metaImage);
        this.setMetaTag('twitter:image', metaImage);
        this.setMetaTag('og:image:width', '1200');
        this.setMetaTag('og:image:height', '630');

        // Update URL
        const metaUrl = url || window.location.href;
        this.setMetaTag('og:url', metaUrl);
        this.setLinkTag('canonical', metaUrl);

        // Update type
        this.setMetaTag('og:type', type);

        // Update author
        if (author) {
            this.setMetaTag('author', author);
        }

        // Update timestamps
        if (publishedTime) {
            this.setMetaTag('article:published_time', publishedTime);
        }
        if (modifiedTime) {
            this.setMetaTag('article:modified_time', modifiedTime);
        }

        // Site-wide meta
        this.setMetaTag('og:site_name', this.defaultMeta.siteName);
        this.setMetaTag('og:locale', this.defaultMeta.locale);
        this.setMetaTag('twitter:card', 'summary_large_image');
        this.setMetaTag('twitter:site', this.defaultMeta.twitterHandle);
    }

    /**
     * Set meta tag
     */
    setMetaTag(name, content) {
        if (!content) return;

        const isProperty = name.startsWith('og:') || name.startsWith('article:');
        const attribute = isProperty ? 'property' : 'name';
        
        let meta = document.querySelector(`meta[${attribute}="${name}"]`);
        
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attribute, name);
            document.head.appendChild(meta);
        }
        
        meta.setAttribute('content', content);
    }

    /**
     * Set link tag
     */
    setLinkTag(rel, href) {
        if (!href) return;

        let link = document.querySelector(`link[rel="${rel}"]`);
        
        if (!link) {
            link = document.createElement('link');
            link.setAttribute('rel', rel);
            document.head.appendChild(link);
        }
        
        link.setAttribute('href', href);
    }

    /**
     * Add structured data (JSON-LD)
     */
    addStructuredData(data) {
        // Remove existing structured data
        const existing = document.querySelector('script[type="application/ld+json"]');
        if (existing) {
            existing.remove();
        }

        // Add new structured data
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
    }

    /**
     * Generate Product structured data
     */
    generateProductSchema(product) {
        return {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.title,
            "description": product.description || product.short_description,
            "image": product.images || [product.image],
            "sku": product.sku || product.id,
            "brand": {
                "@type": "Brand",
                "name": product.store?.name || "DostanWebCSS"
            },
            "offers": {
                "@type": "Offer",
                "url": `${this.defaultMeta.siteUrl}/pages/product-detail.html?id=${product.id}`,
                "priceCurrency": "TRY",
                "price": product.price,
                "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "seller": {
                    "@type": "Organization",
                    "name": product.store?.name || "DostanWebCSS"
                }
            },
            "aggregateRating": product.rating ? {
                "@type": "AggregateRating",
                "ratingValue": product.rating,
                "reviewCount": product.review_count || 0,
                "bestRating": "5",
                "worstRating": "1"
            } : undefined
        };
    }

    /**
     * Generate Organization structured data
     */
    generateOrganizationSchema() {
        return {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "DostanWebCSS",
            "alternateName": "Dostan Web Nordic Marketplace",
            "url": this.defaultMeta.siteUrl,
            "logo": `${this.defaultMeta.siteUrl}/assets/images/logo.png`,
            "description": "Revolutionary Nordic marketplace featuring handcrafted treasures, AI-powered shopping assistant Dostik, and magical user experiences",
            "sameAs": [
                "https://twitter.com/dostanwebcss",
                "https://facebook.com/dostanwebcss",
                "https://instagram.com/dostanwebcss"
            ],
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+90-555-123-4567",
                "contactType": "Customer Service",
                "areaServed": "TR",
                "availableLanguage": ["Turkish", "English"]
            }
        };
    }

    /**
     * Generate Breadcrumb structured data
     */
    generateBreadcrumbSchema(items) {
        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": items.map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": item.name,
                "item": item.url
            }))
        };
    }

    /**
     * Generate WebSite structured data
     */
    generateWebSiteSchema() {
        return {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "DostanWebCSS",
            "url": this.defaultMeta.siteUrl,
            "description": "Revolutionary Nordic marketplace with AI-powered shopping",
            "potentialAction": {
                "@type": "SearchAction",
                "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": `${this.defaultMeta.siteUrl}/pages/products.html?search={search_term_string}`
                },
                "query-input": "required name=search_term_string"
            }
        };
    }

    /**
     * Generate Review structured data
     */
    generateReviewSchema(review, product) {
        return {
            "@context": "https://schema.org",
            "@type": "Review",
            "itemReviewed": {
                "@type": "Product",
                "name": product.title,
                "image": product.image
            },
            "author": {
                "@type": "Person",
                "name": `${review.user.first_name} ${review.user.last_name}`
            },
            "reviewRating": {
                "@type": "Rating",
                "ratingValue": review.rating,
                "bestRating": "5",
                "worstRating": "1"
            },
            "reviewBody": review.comment,
            "datePublished": review.created_at
        };
    }

    /**
     * Auto-detect page type and set appropriate meta
     */
    autoDetectAndSetMeta() {
        const path = window.location.pathname;
        
        if (path === '/' || path.includes('index.html')) {
            this.setHomePageMeta();
        } else if (path.includes('product-detail.html')) {
            this.setProductPageMeta();
        } else if (path.includes('products.html')) {
            this.setProductsPageMeta();
        } else if (path.includes('cart.html')) {
            this.setCartPageMeta();
        } else if (path.includes('checkout.html')) {
            this.setCheckoutPageMeta();
        }
    }

    setHomePageMeta() {
        this.updateMeta({
            title: 'Nordic Marketplace - Handcrafted Treasures',
            description: 'Discover unique handcrafted Nordic treasures with AI guide Dostik. Premium artisan products, secure marketplace, and magical shopping experience.',
            keywords: ['nordic marketplace', 'handcrafted goods', 'artisan products', 'AI shopping assistant', 'dostik', 'nordic crafts'],
            type: 'website'
        });

        this.addStructuredData(this.generateWebSiteSchema());
    }

    setProductPageMeta() {
        // Will be called with product data
        console.log('[SEO] Product page detected - call updateProductMeta() with product data');
    }

    setProductsPageMeta() {
        this.updateMeta({
            title: 'All Nordic Treasures - Handcrafted Products',
            description: 'Browse our complete collection of handcrafted Nordic treasures. Wood carvings, glass art, ceramics, textiles, and more from master artisans.',
            keywords: ['nordic products', 'handcrafted items', 'artisan marketplace', 'nordic crafts', 'handmade goods'],
            type: 'website'
        });
    }

    setCartPageMeta() {
        this.updateMeta({
            title: 'Shopping Cart - Your Nordic Treasury',
            description: 'Review your selected Nordic treasures before checkout. Secure payment and fast shipping available.',
            type: 'website'
        });
    }

    setCheckoutPageMeta() {
        this.updateMeta({
            title: 'Secure Checkout - Complete Your Purchase',
            description: 'Complete your purchase securely. Multiple payment options and fast delivery available.',
            type: 'website'
        });
    }

    /**
     * Update product page meta with product data
     */
    updateProductMeta(product) {
        this.updateMeta({
            title: product.title,
            description: product.description || product.short_description,
            image: product.images?.[0] || product.image,
            type: 'product',
            keywords: [product.title, 'nordic', 'handcrafted', product.category?.name].filter(Boolean)
        });

        this.addStructuredData(this.generateProductSchema(product));
    }
}

// Initialize
window.seoMetaManager = new SEOMetaManager();

// Auto-detect and set meta on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.seoMetaManager.autoDetectAndSetMeta();
    });
} else {
    window.seoMetaManager.autoDetectAndSetMeta();
}

// Export
window.SEOMetaManager = SEOMetaManager;

console.log('🔍 SEO Meta Manager initialized');
