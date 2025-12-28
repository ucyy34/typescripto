/**
 * Express App Configuration
 * Main application setup with middleware and routes
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import 'express-async-errors'; // Handle async errors automatically

import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { notFound, errorHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import { sequelize } from './config/sequelize';
import { redisClient } from './config/redis';
import { attachGuestId } from './middlewares/guest.middleware';

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const storeRoutes = require('./routes/store.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
// const orderRoutes = require('./routes/order.routes');
const returnRoutes = require('./routes/return.routes');
const commissionRoutes = require('./routes/commission.routes');
const couponRoutes = require('./routes/coupon.routes');
const shippingRoutes = require('./routes/shipping.routes');
const reviewRoutes = require('./routes/review.routes');
const campaignRoutes = require('./routes/campaign.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const addressRoutes = require('./routes/address.routes');
const siftahRoutes = require('./routes/siftah.routes');
const variantRoutes = require('./routes/variant.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const payoutRoutes = require('./routes/payout.routes');
const shippingSupportRoutes = require('./routes/shipping-support.routes');
const uploadRoutes = require('./routes/upload.routes');
require('./workers'); // Initialize workers on startup

// Create Express app
const app: Application = express();

// Security middleware
// Configure CSP for local development
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
                imgSrc: ["'self'", 'data:', 'https:', 'images.unsplash.com', 'picsum.photos'],
                fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
            },
        },
    })
); // Set security headers with CSP

// CORS configuration (allow frontend to access API)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'];

app.use(
    cors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // In development, allow all origins (including file://)
            if (process.env.NODE_ENV === 'development') {
                return callback(null, true);
            }

            // Allow requests with no origin (mobile apps, curl, etc.)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true, // Allow cookies
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Id'],
        exposedHeaders: ['X-Guest-Id'],
    })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Guest identification middleware (replaces express-session cart storage)
app.use(attachGuestId);

// Compression middleware (gzip)
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); // Detailed logging in development
} else {
    app.use(morgan('combined')); // Standard Apache log format in production
}

// Rate limiting (global)
app.use('/api/', generalLimiter);

// Serve static files from parent directory (frontend files)
const frontendPath = path.join(__dirname, '..', '..');
app.use(express.static(frontendPath));

// Serve uploaded assets (product images)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
    const status: any = {
        ok: true,
        services: {
            database: 'unknown',
            redis: 'unknown',
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    };

    try {
        await sequelize.authenticate({ logging: false });
        status.services.database = 'up';
    } catch (error: any) {
        status.ok = false;
        status.services.database = 'down';
        status.databaseError = error.message;
    }

    try {
        await redisClient.ping();
        status.services.redis = 'up';
    } catch (error: any) {
        status.ok = false;
        status.services.redis = 'down';
        status.redisError = error.message;
    }

    res.status(status.ok ? 200 : 503).json(status);
});

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/stores`, storeRoutes);
app.use(`/api/${API_VERSION}/products`, productRoutes);
app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${API_VERSION}/cart`, cartRoutes);
// V1 Order Routes (DEPRECATED - uses adapter → V2 handlers)
// These routes transform V1 snake_case requests to V2 camelCase
// and add deprecation headers. Remove after 2026-01-31.
const orderRoutesV1Adapter = require('./application/routes/v1.order.routes').default;
app.use(`/api/${API_VERSION}/orders`, orderRoutesV1Adapter);

// ============================================
// V2 Order Routes (CANONICAL - New Architecture)
// Zod schemas + Repository + DTO + Mapper
// ============================================
const orderRoutesV2 = require('./application/routes/order.routes').default;

// CANONICAL PATH: /api/v2/orders (use this)
app.use('/api/v2/orders', orderRoutesV2);

// DEPRECATED ALIAS: /api/v1/orders/v2 (remove after 2026-01-31)
app.use(`/api/${API_VERSION}/orders/v2`, orderRoutesV2);

// ============================================
// V2 Product Routes (New Architecture: Zod + Repository + Mapper)
// ============================================
const productRoutesV2 = require('./application/routes/product.routes').default;

// CANONICAL PATH: /api/v2/products (use this)
app.use('/api/v2/products', productRoutesV2);

// ============================================
// V2 Cart Routes (New Architecture: Zod + Repository + Service)
// ============================================
const cartRoutesV2 = require('./application/routes/cart.routes').default;

// CANONICAL PATH: /api/v2/cart (use this)
app.use('/api/v2/cart', cartRoutesV2);

// ============================================
// V2 Checkout Routes (New Architecture: Zod + Repository + Service)
// ============================================
const checkoutRoutesV2 = require('./application/routes/checkout.routes').default;

// CANONICAL PATH: /api/v2/checkout
app.use('/api/v2/checkout', checkoutRoutesV2);

app.use(`/api/${API_VERSION}/returns`, returnRoutes);
app.use(`/api/${API_VERSION}/commissions`, commissionRoutes);
app.use(`/api/${API_VERSION}/coupons`, couponRoutes);
app.use(`/api/${API_VERSION}/shipping`, shippingRoutes);
app.use(`/api/${API_VERSION}/campaigns`, campaignRoutes);
app.use(`/api/${API_VERSION}/wishlist`, wishlistRoutes);
app.use(`/api/${API_VERSION}/addresses`, addressRoutes);
app.use(`/api/${API_VERSION}/siftah`, siftahRoutes);
app.use(`/api/${API_VERSION}/variants`, variantRoutes);
app.use(`/api/${API_VERSION}/analytics`, analyticsRoutes);
app.use(`/api/${API_VERSION}/payouts`, payoutRoutes);
app.use(`/api/${API_VERSION}/shipping-support`, shippingSupportRoutes);
app.use(`/api/${API_VERSION}/upload`, uploadRoutes);
app.use(`/api/${API_VERSION}`, reviewRoutes);

// Welcome route
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Clean URL routes for categories - Trendyol/Hepsiburada style
// /kategori/seramik -> serves products.html (JS reads category from URL)
app.get('/kategori/:slug', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'pages', 'products.html'));
});

// Also support /category/:slug for English URLs
app.get('/category/:slug', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'pages', 'products.html'));
});

// Clean URL for all products
app.get('/urunler', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'pages', 'products.html'));
});

// SPA-style fallback for pages that don't exist as static files
// This allows client-side routing for HTML5 history API
app.get('/pages/:page', (req: Request, res: Response, next: NextFunction) => {
    const pagePath = path.join(frontendPath, 'pages', `${req.params.page}.html`);
    res.sendFile(pagePath, (err: Error) => {
        if (err) {
            next(); // Let 404 handler deal with it
        }
    });
});

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// Address management feature added
export = app;
