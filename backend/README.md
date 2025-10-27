# Dostan Marketplace Backend

Production-ready RESTful API for a multi-vendor marketplace platform supporting 1000-2000 stores with 50,000 daily active users.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication with access & refresh tokens
  - Role-based access control (RBAC): Admin, Seller, Buyer
  - Password hashing with bcrypt
  - Session management with Redis

- **Multi-Vendor System**
  - Store management with approval workflow
  - Product CRUD with category support
  - Inventory tracking
  - Store ratings and reviews

- **Order Management**
  - Finite State Machine (FSM) pattern for order status
  - Payment integration (mock for now, İyzico-ready)
  - Order tracking
  - Return and refund support

- **Performance & Scalability**
  - Redis caching for frequently accessed data
  - Database connection pooling
  - Rate limiting on all endpoints
  - Optimized database queries with indexes
  - Compression middleware

- **Security**
  - Helmet.js for HTTP headers
  - CORS configuration
  - Input validation with Joi
  - SQL injection prevention (ORM)
  - XSS protection

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 13
- **Redis** >= 6.0
- **npm** >= 9.0.0

## 🚄 Railway Deploy

1. Fork or connect this repository to Railway using the "Deploy on Railway" flow.
2. Set the build command to `cd backend && npm install`.
3. Set the start command to `cd backend && npm run dev` (or `cd backend && npm start` for production mode).
4. Configure the environment variables under **Variables**:
   - `DATABASE_URL=${{ postgres-volume.DATABASE_URL }}`
   - `REDIS_URL=${{ redis-volume.REDIS_URL }}`
   - `PORT=8080`
   - `NODE_ENV=development`
   - (Optional) `BASE_URL` if you expose the service from a custom domain.
5. Hit **Deploy** and Railway will provision PostgreSQL, Redis, install dependencies, and boot the API.

## 🛠 Installation

### 1. Clone the repository

```bash
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup PostgreSQL

Create a new PostgreSQL database:

```sql
CREATE DATABASE dostan_marketplace_dev;
```

### 4. Setup Redis

Make sure Redis is running on localhost:6379

**Windows:**
```bash
# Download Redis for Windows from: https://github.com/tporadowski/redis/releases
# Or use WSL
```

**Mac (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### 5. Configure environment variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` and set your connection strings or explicit credentials. At minimum provide:

```env
PORT=8080
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/dostan_marketplace_dev
REDIS_URL=redis://localhost:6379/0
BASE_URL=http://localhost:8080
```

### 6. Run database migrations (optional)

The app will auto-sync models in development mode. For production, use migrations:

```bash
npm run migrate
```

### 7. Start the server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:8080`

### 8. Seed demo data

Run the lightweight seed script to create a default admin user and store:

```bash
npm run seed
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # Database config
│   │   ├── redis.js      # Redis client & cache helpers
│   │   └── sequelize.js  # Sequelize instance
│   ├── controllers/      # Route handlers
│   │   └── auth.controller.js
│   ├── services/         # Business logic
│   │   └── auth.service.js
│   ├── models/           # Database models
│   │   ├── User.js
│   │   ├── Store.js
│   │   ├── Product.js
│   │   ├── Category.js
│   │   ├── Order.js
│   │   ├── OrderItem.js
│   │   ├── Cart.js
│   │   ├── Review.js
│   │   └── index.js
│   ├── middlewares/      # Express middleware
│   │   ├── auth.js       # JWT authentication
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── validate.js
│   ├── routes/           # API routes
│   │   └── auth.routes.js
│   ├── validators/       # Joi schemas
│   │   └── auth.validator.js
│   ├── utils/            # Helper functions
│   │   ├── jwt.js
│   │   └── response.js
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
├── logs/                 # Log files (auto-generated)
├── uploads/              # File uploads (auto-generated)
├── .env                  # Environment variables
├── .env.example          # Example environment file
├── .gitignore
├── .sequelizerc          # Sequelize CLI config
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login user | Public |
| POST | `/auth/refresh` | Refresh access token | Public |
| POST | `/auth/logout` | Logout user | Private |
| GET | `/auth/me` | Get current user | Private |
| PUT | `/auth/profile` | Update profile | Private |
| PUT | `/auth/password` | Change password | Private |

### Example: Register User

**Request:**
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "buyer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "buyer",
      "is_verified": false,
      "is_active": true
    },
    "tokens": {
      "accessToken": "jwt-token-here",
      "refreshToken": "refresh-token-here"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Example: Login

**Request:**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token"
    }
  }
}
```

### Authenticated Requests

Include the access token in the Authorization header:

```bash
Authorization: Bearer <access-token>
```

## 🗄 Database Models

### User
- Roles: buyer, seller, admin
- Email verification
- Password hashing
- Last login tracking

### Store
- Belongs to a seller
- Approval status: pending, approved, rejected, suspended
- Rating and review system

### Product
- Belongs to a store
- Category-based organization
- Stock management
- Multiple images support
- Approval workflow

### Order
- FSM-based status management
- Payment status tracking
- Shipping information
- Order items with snapshots

### Cart
- JSONB-based cart items
- User-specific

### Review
- Product or store reviews
- Rating (1-5)
- Verified purchase badge

## 🔒 Security Features

- **JWT Authentication** - Stateless authentication with access & refresh tokens
- **Rate Limiting** - Prevents API abuse (100 req/15min general, 5 req/15min auth)
- **CORS** - Configured for frontend integration
- **Helmet.js** - Sets secure HTTP headers
- **Input Validation** - Joi schemas for all inputs
- **Password Hashing** - Bcrypt with 12 rounds
- **SQL Injection Protection** - Sequelize ORM
- **XSS Protection** - Input sanitization

## 📊 Performance Optimizations

- **Redis Caching** - Frequently accessed data cached
- **Connection Pooling** - PostgreSQL connection pool (10 max)
- **Database Indexing** - Optimized queries
- **Compression** - Gzip compression for responses
- **Async Error Handling** - express-async-errors
- **Graceful Shutdown** - Proper cleanup on termination

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed database with test data |

## 🌐 Frontend Integration

This API is designed to work with your vanilla HTML/CSS/JS frontend.

### CORS Configuration

The API allows requests from:
- `http://localhost:3000`
- `http://127.0.0.1:5500` (Live Server)
- `http://localhost:5500`

Update `ALLOWED_ORIGINS` in `.env` to add more origins.

### Response Format

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ... ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🚀 Deployment

### Environment Variables

Update `.env` for production:
- Set `NODE_ENV=production`
- Change all secrets (JWT_SECRET, etc.)
- Configure production database
- Set up SSL for database connection

### Using PM2

```bash
npm install -g pm2
pm2 start src/server.js --name "dostan-api"
pm2 startup
pm2 save
```

### Database Migrations

In production, always use migrations instead of auto-sync:

```bash
NODE_ENV=production npm run migrate
```

## 📈 Scaling for 50K Daily Users

### Recommendations

1. **Load Balancer** - Use Nginx to distribute traffic across multiple Node.js instances
2. **PM2 Cluster Mode** - Run multiple Node.js processes:
   ```bash
   pm2 start src/server.js -i max
   ```
3. **Database** - PostgreSQL with master-slave replication
4. **Redis Cluster** - For high availability
5. **CDN** - For static assets and images
6. **Caching Strategy** - Cache categories, featured products, etc.

## 🐛 Troubleshooting

### Database connection error
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists

### Redis connection error
- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Check Redis host and port in `.env`

### Port already in use
- Change PORT in `.env`
- Or kill the process using port 5000:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F

  # Mac/Linux
  lsof -ti:5000 | xargs kill -9
  ```

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check documentation
- Review error logs in `logs/` directory

## 📄 License

MIT

---

**Built with ❤️ for Dostan Marketplace**
