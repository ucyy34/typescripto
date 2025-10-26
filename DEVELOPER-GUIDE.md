# 👨‍💻 Dostan Marketplace - Developer Guide

**Last Updated:** October 23, 2025
**Version:** 1.0.0
**Stack:** Node.js, PostgreSQL, Redis, Vanilla JavaScript

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Architecture](#project-architecture)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [Backend Development](#backend-development)
6. [Frontend Development](#frontend-development)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [Authentication Flow](#authentication-flow)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
Node.js >= 18.x
PostgreSQL >= 14.x
Redis >= 6.x

# Recommended
npm >= 9.x
Git
VS Code or similar IDE
```

### Installation

```bash
# 1. Clone repository (if applicable)
git clone [repository-url]
cd dostanwebcss41.2

# 2. Install backend dependencies
cd backend
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Run migrations
npm run migrate

# 5. Seed initial data
npm run seed

# 6. Start development server
npm run dev
```

### Access Points

```
Backend API: http://localhost:3001
Admin Panel: /admincss/index.html
Vendor Panel: /vendorcss/index.html
Customer Site: /index.html
```

---

## 🏗️ Project Architecture

### System Overview

```
┌─────────────────────────────────────────────────┐
│               DOSTAN MARKETPLACE                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Frontend (Vanilla JS)                          │
│  ├── Customer Site (index.html, pages/)       │
│  ├── Vendor Panel (vendorcss/)                 │
│  └── Admin Panel (admincss/)                   │
│                                                 │
│  Backend (Node.js + Express)                    │
│  ├── REST API (/api/v1/*)                      │
│  ├── Authentication (JWT)                       │
│  ├── Business Logic (Services)                 │
│  └── Data Layer (Models)                       │
│                                                 │
│  Database Layer                                 │
│  ├── PostgreSQL (Primary Data)                 │
│  └── Redis (Caching & Sessions)                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Design Patterns

1. **MVC Pattern** (Backend)
   - Models: Data structure (Sequelize ORM)
   - Controllers: Request handlers
   - Services: Business logic
   - Routes: API endpoints

2. **Repository Pattern**
   - Models handle database operations
   - Services contain business logic
   - Controllers handle HTTP layer

3. **Middleware Pattern**
   - Authentication middleware
   - Validation middleware
   - Error handling middleware
   - Rate limiting middleware

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x | Runtime environment |
| Express.js | 4.18.x | Web framework |
| Sequelize | 6.35.x | ORM for PostgreSQL |
| PostgreSQL | 14.x | Primary database |
| Redis | 6.x | Caching & sessions |
| JWT | 9.0.x | Authentication |
| Bcrypt | 5.1.x | Password hashing |
| Joi | 17.11.x | Input validation |
| Winston | 3.11.x | Logging |
| Helmet | 7.1.x | Security headers |
| CORS | 2.8.x | Cross-origin requests |

### Frontend

| Technology | Purpose |
|------------|---------|
| Vanilla JavaScript | No framework - pure JS |
| HTML5 | Markup |
| CSS3 | Styling (CSS Variables, Flexbox, Grid) |
| Fetch API | HTTP requests |
| LocalStorage | Client-side storage |
| CSS Animations | UI effects |

### Development Tools

```bash
nodemon        # Auto-reload server
eslint         # Code linting
prettier       # Code formatting
dotenv         # Environment variables
```

---

## 📁 Directory Structure

```
dostanwebcss41.2/
│
├── backend/                    # Backend application
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   │   ├── database.js    # Database config
│   │   │   └── redis.js       # Redis config
│   │   │
│   │   ├── controllers/       # Request handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── product.controller.js
│   │   │   ├── order.controller.js
│   │   │   └── ...
│   │   │
│   │   ├── middlewares/       # Custom middleware
│   │   │   ├── auth.js        # Authentication
│   │   │   ├── validate.js    # Validation
│   │   │   ├── errorHandler.js
│   │   │   └── rateLimiter.js
│   │   │
│   │   ├── models/            # Database models
│   │   │   ├── User.js
│   │   │   ├── Product.js
│   │   │   ├── Order.js
│   │   │   ├── Store.js
│   │   │   └── ...
│   │   │
│   │   ├── routes/            # API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── product.routes.js
│   │   │   ├── order.routes.js
│   │   │   └── ...
│   │   │
│   │   ├── services/          # Business logic
│   │   │   ├── auth.service.js
│   │   │   ├── product.service.js
│   │   │   ├── order.service.js
│   │   │   └── ...
│   │   │
│   │   ├── validators/        # Input validation schemas
│   │   │   ├── auth.validator.js
│   │   │   ├── product.validator.js
│   │   │   └── ...
│   │   │
│   │   ├── utils/             # Utility functions
│   │   │   ├── jwt.js         # JWT helpers
│   │   │   ├── response.js    # Response formatters
│   │   │   └── ...
│   │   │
│   │   └── server.js          # Entry point
│   │
│   ├── migrations/            # Database migrations
│   ├── seeders/               # Seed data
│   ├── tests/                 # Test files
│   ├── .env.example           # Environment template
│   ├── package.json
│   └── README.md
│
├── assets/                    # Frontend assets
│   ├── css/
│   │   ├── main.css          # Main stylesheet
│   │   ├── product-cards.css # Product components
│   │   └── ...
│   │
│   └── js/
│       ├── api-config.js     # API configuration
│       ├── api-client.js     # HTTP client
│       ├── auth-manager.js   # Auth handling
│       ├── cart-api.js       # Cart management
│       ├── profile-api.js    # Profile management
│       └── ...
│
├── pages/                    # Customer pages
│   ├── products.html
│   ├── product-detail.html
│   ├── cart.html
│   ├── checkout.html
│   ├── profile.html
│   └── ...
│
├── vendorcss/               # Vendor panel
│   ├── index.html          # Vendor dashboard
│   ├── vendor-dashboard.css
│   ├── vendor-dashboard.js
│   └── ...
│
├── admincss/                # Admin panel
│   ├── index.html          # Admin dashboard
│   ├── admin-dashboard.css
│   ├── admin-dashboard.js
│   └── ...
│
├── index.html               # Homepage
├── TEST-REPORT.md           # Test results
├── DEVELOPER-GUIDE.md       # This file
└── CHANGELOG-PERFORMANCE-OPTIMIZATIONS.md
```

---

## 🔧 Backend Development

### Environment Setup

Create `.env` file in `backend/` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dostan_marketplace
DB_USER=postgres
DB_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5500,http://127.0.0.1:5500

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Running Backend

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Run migrations
npm run migrate

# Undo last migration
npm run migrate:undo

# Seed database
npm run seed

# Run tests
npm test
```

### Creating New Endpoints

**1. Create Model** (`src/models/YourModel.js`)

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const YourModel = sequelize.define('YourModel', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // ... more fields
}, {
  tableName: 'your_models',
  underscored: true,
  paranoid: true, // Soft delete
  timestamps: true,
});

module.exports = YourModel;
```

**2. Create Service** (`src/services/yourModel.service.js`)

```javascript
const YourModel = require('../models/YourModel');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');

class YourModelService {
  async create(data) {
    const item = await YourModel.create(data);
    return item;
  }

  async findAll(filters = {}) {
    const items = await YourModel.findAll({
      where: filters,
      order: [['created_at', 'DESC']],
    });
    return items;
  }

  async findById(id) {
    const item = await YourModel.findByPk(id);
    if (!item) {
      throw new ApiError('Item not found', StatusCodes.NOT_FOUND);
    }
    return item;
  }

  async update(id, data) {
    const item = await this.findById(id);
    await item.update(data);
    return item;
  }

  async delete(id) {
    const item = await this.findById(id);
    await item.destroy(); // Soft delete
    return true;
  }
}

module.exports = new YourModelService();
```

**3. Create Controller** (`src/controllers/yourModel.controller.js`)

```javascript
const yourModelService = require('../services/yourModel.service');
const { success, created } = require('../utils/response');
const { asyncHandler } = require('../middlewares/errorHandler');

class YourModelController {
  create = asyncHandler(async (req, res) => {
    const item = await yourModelService.create(req.body);
    return created(res, item, 'Item created successfully');
  });

  getAll = asyncHandler(async (req, res) => {
    const items = await yourModelService.findAll(req.query);
    return success(res, items, 'Items retrieved successfully');
  });

  getById = asyncHandler(async (req, res) => {
    const item = await yourModelService.findById(req.params.id);
    return success(res, item, 'Item retrieved successfully');
  });

  update = asyncHandler(async (req, res) => {
    const item = await yourModelService.update(req.params.id, req.body);
    return success(res, item, 'Item updated successfully');
  });

  delete = asyncHandler(async (req, res) => {
    await yourModelService.delete(req.params.id);
    return success(res, null, 'Item deleted successfully');
  });
}

module.exports = new YourModelController();
```

**4. Create Validator** (`src/validators/yourModel.validator.js`)

```javascript
const Joi = require('joi');

const createSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().optional(),
  // ... more fields
});

const updateSchema = Joi.object({
  name: Joi.string().optional().min(3).max(100),
  description: Joi.string().optional(),
});

module.exports = {
  createSchema,
  updateSchema,
};
```

**5. Create Routes** (`src/routes/yourModel.routes.js`)

```javascript
const express = require('express');
const router = express.Router();
const yourModelController = require('../controllers/yourModel.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { createSchema, updateSchema } = require('../validators/yourModel.validator');

router.post('/',
  authenticate,
  authorize(['admin']),
  validate(createSchema),
  yourModelController.create
);

router.get('/', yourModelController.getAll);
router.get('/:id', yourModelController.getById);

router.put('/:id',
  authenticate,
  authorize(['admin']),
  validate(updateSchema),
  yourModelController.update
);

router.delete('/:id',
  authenticate,
  authorize(['admin']),
  yourModelController.delete
);

module.exports = router;
```

**6. Register Routes** (`src/server.js`)

```javascript
const yourModelRoutes = require('./routes/yourModel.routes');
app.use('/api/v1/your-models', yourModelRoutes);
```

---

## 🎨 Frontend Development

### API Integration Pattern

**1. Define API Config** (`assets/js/api-config.js`)

```javascript
const API_CONFIG = {
  BASE_URL: 'http://localhost:3001/api/v1',
  ENDPOINTS: {
    YOUR_MODEL: {
      BASE: '/your-models',
      BY_ID: (id) => `/your-models/${id}`,
    },
  },
};
```

**2. Create API Client Methods** (`assets/js/api-client.js`)

```javascript
class ApiClient {
  async getYourModels(filters = {}) {
    return this.get(API_CONFIG.ENDPOINTS.YOUR_MODEL.BASE, filters);
  }

  async getYourModel(id) {
    return this.get(API_CONFIG.ENDPOINTS.YOUR_MODEL.BY_ID(id));
  }

  async createYourModel(data) {
    return this.post(API_CONFIG.ENDPOINTS.YOUR_MODEL.BASE, data);
  }
}
```

**3. Use in HTML Pages**

```html
<script src="../assets/js/api-config.js"></script>
<script src="../assets/js/auth-manager.js"></script>
<script src="../assets/js/api-client.js"></script>
<script>
  const apiClient = new ApiClient();

  async function loadItems() {
    try {
      const response = await apiClient.getYourModels();
      if (response.success) {
        displayItems(response.data);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', loadItems);
</script>
```

### Authentication Pattern

```javascript
// Check if user is logged in
if (!AuthManager.isLoggedIn()) {
  window.location.href = 'login.html';
}

// Get current user
const user = AuthManager.getUser();
console.log('Current user:', user.email);

// Get token for API calls
const token = AuthManager.getToken();

// Logout
AuthManager.logout();
```

---

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "buyer"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... }
  }
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "buyer",
    ...
  }
}
```

### Product Endpoints

#### List Products
```http
GET /api/v1/products?status=approved&limit=20&page=1
Response: Paginated product list
```

#### Get Product
```http
GET /api/v1/products/:id
Response: Single product with details
```

#### Create Product (Seller only)
```http
POST /api/v1/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "store_id": "uuid",
  "category_id": "uuid",
  "title": "Product Name",
  "description": "Description",
  "price": "99.99",
  "stock": 10
}
```

### Order Endpoints

#### Create Order
```http
POST /api/v1/orders
Authorization: Bearer <token> (optional for guest)
Content-Type: application/json

{
  "store_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2
    }
  ],
  "shipping_address": {
    "full_name": "John Doe",
    "phone": "+1234567890",
    "address_line1": "123 Main St",
    "city": "City",
    "postal_code": "12345",
    "country": "Country"
  },
  "payment_method": "credit_card"
}
```

### Cart Endpoints

#### Get Cart
```http
GET /api/v1/cart
Authorization: Bearer <token>
```

#### Add to Cart
```http
POST /api/v1/cart/items
Authorization: Bearer <token>

{
  "product_id": "uuid",
  "quantity": 1
}
```

---

## 🗄️ Database Schema

### Key Tables

**users**
- id (UUID, PK)
- email (unique)
- password_hash
- first_name, last_name
- role (admin, seller, buyer)
- is_active, is_verified

**stores**
- id (UUID, PK)
- user_id (FK → users)
- name, slug
- status (pending, approved, rejected, suspended)
- address, city, postal_code

**products**
- id (UUID, PK)
- store_id (FK → stores)
- category_id (FK → categories)
- title, slug, description
- price, stock
- status (pending, approved, rejected)
- images (JSONB)

**orders**
- id (UUID, PK)
- order_number (unique)
- user_id (FK → users, nullable for guest)
- store_id (FK → stores)
- status (pending_payment, paid, processing, shipped, delivered, cancelled)
- shipping_address (JSONB)
- total

**order_items**
- id (UUID, PK)
- order_id (FK → orders)
- product_id (FK → products)
- product_snapshot (JSONB)
- quantity, price, total

### Relationships

```
users (1) ──→ (N) stores
stores (1) ──→ (N) products
categories (1) ──→ (N) products
users (1) ──→ (N) orders
stores (1) ──→ (N) orders
orders (1) ──→ (N) order_items
products (1) ──→ (N) order_items
```

---

## 🔐 Authentication Flow

### JWT Token System

1. **Login**: User provides email + password
2. **Verification**: Backend validates credentials
3. **Token Generation**: Creates JWT access token (1h) + refresh token (7d)
4. **Storage**: Frontend stores tokens in localStorage
5. **API Requests**: Include `Authorization: Bearer <token>` header
6. **Token Refresh**: Use refresh token to get new access token when expired

### Role-Based Access Control

```javascript
// Middleware checks
authenticate     // Requires valid token
authorize([roles]) // Requires specific role

// Example
router.post('/products',
  authenticate,           // Must be logged in
  authorize(['seller']),  // Must be seller
  controller.create
);
```

### Protected Routes

- **Public**: Products list, categories, product details
- **Authenticated**: Cart, orders, profile
- **Seller**: Store management, product CRUD, order management
- **Admin**: User management, approve stores/products, all orders

---

## 🧪 Testing

### Backend Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.js

# Run with coverage
npm run test:coverage
```

### Manual API Testing

Use tools like:
- Postman
- Insomnia
- cURL
- Thunder Client (VS Code extension)

### Frontend Testing

1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for API calls
4. Test user flows manually

---

## 🚀 Deployment

### Backend Deployment

**Environment Variables**
```env
NODE_ENV=production
JWT_SECRET=<strong-production-secret>
DB_HOST=<production-db-host>
REDIS_HOST=<production-redis-host>
```

**Build Steps**
```bash
# 1. Install production dependencies
npm install --production

# 2. Run migrations
npm run migrate

# 3. Start server
npm start
```

**Recommended Platforms**
- Heroku
- Railway
- Render
- AWS EC2
- DigitalOcean

### Frontend Deployment

**Build Steps**
- No build step required (vanilla JS)
- Upload files to web server
- Configure web server (Nginx, Apache)

**Recommended Platforms**
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

### Database

**Recommended**
- Heroku Postgres
- Railway PostgreSQL
- AWS RDS
- Supabase

### Redis

**Recommended**
- Redis Cloud
- Upstash Redis
- AWS ElastiCache

---

## 🐛 Troubleshooting

### Backend Issues

**Server won't start**
```bash
# Check if port is in use
netstat -ano | findstr :3001

# Kill process if needed
taskkill /PID <pid> /F

# Check environment variables
cat .env

# Check database connection
psql -h localhost -U postgres -d dostan_marketplace
```

**Database errors**
```bash
# Reset migrations
npm run migrate:undo:all
npm run migrate

# Check database exists
psql -U postgres -c "\l"

# Create database if missing
psql -U postgres -c "CREATE DATABASE dostan_marketplace;"
```

**Redis errors**
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis
redis-server
```

### Frontend Issues

**API calls failing**
- Check CORS settings in backend
- Verify API base URL in `api-config.js`
- Check browser console for errors
- Verify token is being sent

**Authentication issues**
- Clear localStorage: `localStorage.clear()`
- Check token expiration
- Verify token format

**Cart not working**
- Clear cart: `localStorage.removeItem('cart')`
- Check user is logged in
- Verify product IDs are valid

---

## 📞 Support

### Getting Help

1. Check this developer guide
2. Check `TEST-REPORT.md` for known issues
3. Check `CHANGELOG-PERFORMANCE-OPTIMIZATIONS.md` for recent changes
4. Review error logs in `backend/logs/`
5. Check console errors in browser DevTools

### Useful Commands

```bash
# Backend logs
npm run dev > logs/server.log

# Database query
psql -U postgres -d dostan_marketplace

# Redis CLI
redis-cli

# Check running processes
ps aux | grep node

# Git status
git status
git log --oneline -10
```

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Sequelize Documentation](https://sequelize.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [JWT.io](https://jwt.io/)
- [MDN Web Docs](https://developer.mozilla.org/)

---

**END OF DEVELOPER GUIDE**

*For AI assistants (Claude Code): See `CLAUDE-QUICKSTART.md` for rapid codebase understanding.*
