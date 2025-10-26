# 🚀 Backend Quick Start Guide

## ✅ Tamamlanmış Özellikler

### 1. Temel Altyapı
- ✅ Node.js + Express.js server
- ✅ PostgreSQL database (Sequelize ORM)
- ✅ Redis caching & sessions
- ✅ Production-ready architecture

### 2. Database Models
- ✅ User (buyer/seller/admin roles)
- ✅ Store (multi-vendor support)
- ✅ Product (with categories)
- ✅ Category (hierarchical)
- ✅ Order (FSM-based status)
- ✅ OrderItem
- ✅ Cart
- ✅ Review

### 3. Authentication & Security
- ✅ JWT authentication (access + refresh tokens)
- ✅ Role-based access control (RBAC)
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ Input validation (Joi)

### 4. Completed APIs
- ✅ POST `/api/v1/auth/register` - User registration
- ✅ POST `/api/v1/auth/login` - User login
- ✅ POST `/api/v1/auth/refresh` - Refresh token
- ✅ POST `/api/v1/auth/logout` - Logout
- ✅ GET `/api/v1/auth/me` - Get profile
- ✅ PUT `/api/v1/auth/profile` - Update profile
- ✅ PUT `/api/v1/auth/password` - Change password

---

## 🎯 Şu Anda Çalışan Durum

**Server Çalışıyor:** `http://localhost:3001`

**Database:** PostgreSQL (dostan_marketplace_dev)

**Redis:** localhost:6379

---

## 🧪 Test Etme

### 1. Browser'da Test (Kolay Yol)

`test-api.html` dosyasını açın:
```
C:\Users\LENOVO\Desktop\dostanwebcss41.2\test-api.html
```

- Health check
- Register user
- Login
- Get profile

### 2. Postman ile Test

**Health Check:**
```
GET http://localhost:3001/health
```

**Register:**
```
POST http://localhost:3001/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "Test12345!",
  "first_name": "Test",
  "last_name": "User",
  "role": "buyer"
}
```

**Login:**
```
POST http://localhost:3001/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "Test12345!"
}
```

**Get Profile (authenticated):**
```
GET http://localhost:3001/api/v1/auth/me
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 📂 Proje Yapısı

```
backend/
├── src/
│   ├── config/           # Database, Redis configs
│   ├── controllers/      # Route handlers
│   ├── services/         # Business logic
│   ├── models/           # Database models
│   ├── middlewares/      # Auth, validation, errors
│   ├── routes/           # API routes
│   ├── validators/       # Joi schemas
│   ├── utils/            # Helper functions
│   ├── app.js            # Express app
│   └── server.js         # Server entry point
├── .env                  # Environment variables
├── package.json
└── README.md
```

---

## 🔧 Komutlar

```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start

# Database migrations
npm run migrate

# Run tests
npm test

# Lint code
npm run lint
```

---

## 🌐 Frontend Entegrasyonu

Vanilla JS ile kullanım:

```javascript
// Login
async function login(email, password) {
  const response = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (data.success) {
    // Token'ı kaydet
    localStorage.setItem('accessToken', data.data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    return data.data.user;
  } else {
    throw new Error(data.message);
  }
}

// Authenticated request
async function getProfile() {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3001/api/v1/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
}

// Register
async function register(userData) {
  const response = await fetch('http://localhost:3001/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  return await response.json();
}
```

---

## 📝 Sıradaki Adımlar (Bekleyen)

### Faz 2: Store & Product APIs
- [ ] Store CRUD endpoints
- [ ] Store approval workflow (admin)
- [ ] Product CRUD endpoints
- [ ] Category management
- [ ] File upload (images)

### Faz 3: Cart & Order APIs
- [ ] Cart management
- [ ] Order creation
- [ ] Order status updates
- [ ] Mock payment service

### Faz 4: Additional Features
- [ ] Review system
- [ ] Email notifications
- [ ] Bull queue setup
- [ ] Admin panel APIs
- [ ] Search functionality

---

## 🎓 Response Format

Tüm API yanıtları bu formatta:

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

---

## 🔒 Authentication

JWT tokens kullanılıyor:

- **Access Token**: 1 saat geçerli
- **Refresh Token**: 7 gün geçerli

Her authenticated request için:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Token expired olduğunda `/api/v1/auth/refresh` endpoint'ini kullan.

---

## 🐛 Troubleshooting

### Port zaten kullanımda
`.env` dosyasında PORT değiştirin (şu anda 3001)

### Database connection error
- PostgreSQL çalışıyor mu kontrol et
- pgAdmin'de `dostan_marketplace_dev` database'i oluştur
- `.env` dosyasındaki credentials kontrol et

### Redis connection error
- Redis server çalışıyor mu kontrol et
- `redis-cli ping` komutu `PONG` dönmeli

---

## 📞 API Endpoints Listesi

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/api/v1/auth/register` | Register user | No |
| POST | `/api/v1/auth/login` | Login | No |
| POST | `/api/v1/auth/refresh` | Refresh token | No |
| POST | `/api/v1/auth/logout` | Logout | Yes |
| GET | `/api/v1/auth/me` | Get profile | Yes |
| PUT | `/api/v1/auth/profile` | Update profile | Yes |
| PUT | `/api/v1/auth/password` | Change password | Yes |

---

**Devam etmek için ne yapmak istersiniz?**
1. Store & Product API'larını yazalım
2. Frontend entegrasyonuna başlayalım
3. Admin panel API'larını ekleyelim
