/**
 * Express App Configuration
 * Main application setup with middleware and routes
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('express-async-errors'); // Handle async errors automatically

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
// path already required above

const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const storeRoutes = require('./routes/store.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const returnRoutes = require('./routes/return.routes');
const commissionRoutes = require('./routes/commission.routes');
const couponRoutes = require('./routes/coupon.routes');
const shippingRoutes = require('./routes/shipping.routes');
const reviewRoutes = require('./routes/review.routes');
const campaignRoutes = require('./routes/campaign.routes');
const uploadRoutes = require('./routes/upload.routes');

// Create Express app
const app = express();

// Security middleware
// Configure CSP for local development
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:', 'images.unsplash.com', 'picsum.photos'],
        fontSrc: ["'self'", 'data:'],
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
  : ['http://localhost:3000', 'http://127.0.0.1:5500'];

app.use(
  cors({
    origin: (origin, callback) => {
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
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Session middleware (for guest cart)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dostan-marketplace-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

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

// Dedicated static handler for uploaded assets
const uploadsPath = path.join(__dirname, '..', '..', 'uploads');
app.use('/uploads', express.static(uploadsPath, { maxAge: '7d' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/stores`, storeRoutes);
app.use(`/api/${API_VERSION}/products`, productRoutes);
app.use(`/api/${API_VERSION}/categories`, categoryRoutes);
app.use(`/api/${API_VERSION}/cart`, cartRoutes);
app.use(`/api/${API_VERSION}/orders`, orderRoutes);
app.use(`/api/${API_VERSION}/returns`, returnRoutes);
app.use(`/api/${API_VERSION}/commissions`, commissionRoutes);
app.use(`/api/${API_VERSION}/coupons`, couponRoutes);
app.use(`/api/${API_VERSION}/shipping`, shippingRoutes);
app.use(`/api/${API_VERSION}/campaigns`, campaignRoutes);
app.use(`/api/${API_VERSION}`, reviewRoutes);
app.use(`/api/${API_VERSION}/uploads`, uploadRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Dostan Marketplace API',
    version: API_VERSION,
    documentation: `/api/${API_VERSION}/docs`,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
