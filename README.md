# 🐉 DostanWebCSS Nordic Marketplace

A full-stack e-commerce marketplace featuring Nordic-themed artisan products with vendor management, admin controls, and AI assistant integration.

## 🌟 Features

- **Multi-Vendor System**: Vendors can create stores, manage products, orders, and analytics
- **Admin Dashboard**: Comprehensive admin panel for approving vendors, products, and managing platform
- **Product Management**: Full CRUD with variants, badges, SEO optimization
- **Order Processing**: Complete order lifecycle from cart to delivery
- **Dostik AI Assistant**: Wise Nordic dragon assistant providing contextual help
- **Authentication**: JWT-based auth with role-based access control (Admin, Seller, Buyer)
- **Address System**: Multiple saved addresses per user
- **Campaign System**: Flash sales, discounts, buy-X-get-Y deals
- **Responsive Design**: Mobile-first design with Nordic glassmorphism aesthetic

## 🛠️ Tech Stack

### Frontend
- Vanilla JavaScript (ES6+)
- HTML5 / CSS3 with CSS Grid & Flexbox
- Python HTTP Server for static files

### Backend
- Node.js + Express.js
- PostgreSQL (Sequelize ORM)
- Redis (caching & sessions)
- JWT authentication
- Bull (job queues)

## 📦 Installation

### Prerequisites
- Node.js 16+
- PostgreSQL 14+
- Redis 6+
- Python 3.x (for frontend server)

### Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd dosttanpalas-railway
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
```

3. **Database Setup**
```bash
# Create PostgreSQL database
createdb your_database_name

# Run migrations and seed data
npm run db:sync
npm run seed
```

4. **Start Backend**
```bash
npm run dev
# Runs on http://localhost:8080
```

5. **Start Frontend**
```bash
# In project root
python -m http.server 5500
# Runs on http://localhost:5500
```

## 🔑 Default Credentials

After running seed script:

**Admin Panel**: http://localhost:5500/admincss/login.html
- Email: `admin@dostanmarket.com`
- Password: `Admin@123456`

**Vendor Panel**: http://localhost:5500/vendorcss/login.html
- Email: `erik.nordstrom@nordic.com`
- Password: `Seller123!`

**Buyer Account**:
- Email: `anna.mueller@email.com`
- Password: `Buyer123!`

See `TEST-LOGIN-CREDENTIALS.txt` for more test accounts.

## 📁 Project Structure

```
dosttanpalas-railway/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Sequelize models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, validation, etc.
│   │   └── config/         # Configuration files
│   └── package.json
├── assets/
│   ├── css/                # Stylesheets
│   ├── js/                 # Frontend JavaScript
│   └── images/             # Static images
├── vendorcss/              # Vendor dashboard
├── admincss/               # Admin dashboard
├── pages/                  # Customer pages
└── index.html              # Homepage
```

## 🐛 Known Issues

See [BUGS.md](BUGS.md) for current issues and planned fixes:
- Image upload handler missing (CRITICAL)
- Product re-approval workflow needed
- Category validation disabled

## 🚀 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token

### Products
- `GET /api/v1/products` - List products
- `POST /api/v1/products` - Create product (Seller)
- `PUT /api/v1/products/:id` - Update product
- `PATCH /api/v1/products/:id/status` - Approve/Reject (Admin)

### Stores
- `GET /api/v1/stores` - List stores
- `GET /api/v1/stores/my` - Get authenticated seller's store
- `POST /api/v1/stores` - Create store (Seller)

### Orders
- `GET /api/v1/stores/:id/orders` - Store orders (Seller)
- `POST /api/v1/orders` - Create order
- `PATCH /api/v1/orders/:id/status` - Update order status

See full API documentation in `/backend/src/routes/`

## 🔧 Configuration

Edit `backend/.env`:
```env
DATABASE_URL=postgres://user:pass@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
```

## 📝 License

This project is proprietary and confidential.

## 🤝 Contributing

This is a private project. Contact the owner for contribution guidelines.

## 📧 Support

For issues or questions, please create an issue in this repository.

---

**Built with 🐉 Dostik's Wisdom**
