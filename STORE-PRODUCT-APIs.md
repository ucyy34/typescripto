# 🏪 Store & Product APIs - Complete Documentation

## ✅ APIs Başarıyla Oluşturuldu!

**Backend Server:** `http://localhost:3001`

---

## 📦 STORE APIs

### 1. Create Store (Seller Only)
**Endpoint:** `POST /api/v1/stores`
**Auth:** Required (Seller)
**Description:** Satıcı yeni mağaza oluşturur (admin onayı bekler)

**Request:**
```json
{
  "name": "Nordic Handicrafts Store",
  "description": "Handmade Nordic crafts and decorations",
  "phone": "+90 555 123 4567",
  "email": "contact@nordicstore.com",
  "address": "Atatürk Cad. No: 123",
  "city": "Istanbul",
  "country": "Turkey",
  "postal_code": "34000",
  "tax_number": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Store created successfully. Waiting for admin approval.",
  "data": {
    "id": "uuid",
    "name": "Nordic Handicrafts Store",
    "slug": "nordic-handicrafts-store",
    "status": "pending",
    ...
  }
}
```

### 2. Get All Stores (Public)
**Endpoint:** `GET /api/v1/stores`
**Auth:** Not required
**Description:** Tüm mağazaları listele (pagination + filters)

**Query Params:**
- `page` - Sayfa numarası (default: 1)
- `limit` - Sayfa başına kayıt (default: 20, max: 100)
- `status` - pending, approved, rejected, suspended
- `search` - Mağaza adında ara
- `city` - Şehre göre filtrele
- `is_featured` - true/false
- `sort` - name, rating, total_sales, created_at (- ile descending)

**Example:**
```
GET /api/v1/stores?page=1&limit=10&status=approved&sort=-rating
```

### 3. Get Store by ID (Public)
**Endpoint:** `GET /api/v1/stores/:id`
**Auth:** Not required

### 4. Get My Store (Seller)
**Endpoint:** `GET /api/v1/stores/my-store`
**Auth:** Required (Seller)
**Description:** Giriş yapmış satıcının mağazasını getirir

### 5. Get Store Statistics
**Endpoint:** `GET /api/v1/stores/:id/stats`
**Auth:** Not required

**Response:**
```json
{
  "success": true,
  "data": {
    "total_products": 45,
    "low_stock_products": 3,
    "out_of_stock_products": 2,
    "total_sales": 1250,
    "rating": 4.5,
    "total_reviews": 89
  }
}
```

### 6. Get Store Products
**Endpoint:** `GET /api/v1/stores/:storeId/products`
**Auth:** Not required
**Description:** Belirli bir mağazanın tüm ürünlerini listele

### 7. Update Store (Owner Only)
**Endpoint:** `PUT /api/v1/stores/:id`
**Auth:** Required (Store Owner)

### 8. Update Store Status (Admin Only)
**Endpoint:** `PATCH /api/v1/stores/:id/status`
**Auth:** Required (Admin)

**Request:**
```json
{
  "status": "approved",  // or "rejected", "suspended"
  "rejection_reason": "Incomplete information"  // Required if rejected
}
```

### 9. Delete Store (Owner Only)
**Endpoint:** `DELETE /api/v1/stores/:id`
**Auth:** Required (Store Owner)
**Description:** Soft delete

---

## 🛍️ PRODUCT APIs

### 1. Create Product (Seller Only)
**Endpoint:** `POST /api/v1/products`
**Auth:** Required (Seller)
**Description:** Mağaza sahibi yeni ürün ekler (admin onayı bekler)

**Request:**
```json
{
  "store_id": "uuid",
  "category_id": "uuid",
  "title": "Handmade Viking Axe Decoration",
  "description": "Authentic handmade Viking axe decoration made from oak wood",
  "short_description": "Handmade Viking decoration",
  "price": 299.99,
  "compare_price": 399.99,
  "stock": 10,
  "low_stock_threshold": 5,
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "weight": 0.5,
  "dimensions": {
    "length": 30,
    "width": 10,
    "height": 5
  },
  "attributes": {
    "material": "Oak Wood",
    "color": "Natural Brown",
    "handmade": true
  },
  "tags": ["viking", "decoration", "handmade", "wood"],
  "seo_title": "Handmade Viking Axe Decoration | Nordic Crafts",
  "seo_description": "Buy authentic handmade Viking axe decoration"
}
```

### 2. Get All Products (Public)
**Endpoint:** `GET /api/v1/products`
**Auth:** Not required

**Query Params:**
- `page`, `limit`
- `store_id` - Mağazaya göre filtrele
- `category_id` - Kategoriye göre filtrele
- `search` - Ürün adı, açıklama, tag'lerde ara
- `min_price`, `max_price` - Fiyat aralığı
- `in_stock` - true (sadece stokta olanlar)
- `is_featured` - true/false
- `sort` - title, price, rating, total_sales, created_at

**Example:**
```
GET /api/v1/products?category_id=uuid&min_price=100&max_price=500&in_stock=true&sort=-total_sales
```

### 3. Get Product by ID (Public)
**Endpoint:** `GET /api/v1/products/:id`
**Auth:** Not required
**Features:**
- Redis caching (1 hour)
- Auto-increment view count
- Returns store and category info

### 4. Get Featured Products (Public)
**Endpoint:** `GET /api/v1/products/featured?limit=10`
**Auth:** Not required
**Description:** Öne çıkan ürünler (cached 1 hour)

### 5. Get Best Sellers (Public)
**Endpoint:** `GET /api/v1/products/bestsellers?limit=10`
**Auth:** Not required
**Description:** En çok satan ürünler (cached 30 min)

### 6. Update Product (Owner Only)
**Endpoint:** `PUT /api/v1/products/:id`
**Auth:** Required (Product Owner)

### 7. Update Product Status (Admin Only)
**Endpoint:** `PATCH /api/v1/products/:id/status`
**Auth:** Required (Admin)

**Request:**
```json
{
  "status": "approved",  // or "draft", "pending", "rejected"
  "rejection_reason": "Images are not clear"  // Required if rejected
}
```

### 8. Delete Product (Owner Only)
**Endpoint:** `DELETE /api/v1/products/:id`
**Auth:** Required (Product Owner)
**Description:** Soft delete

---

## 🗂️ CATEGORY APIs

### 1. Get All Categories (Tree Structure)
**Endpoint:** `GET /api/v1/categories`
**Auth:** Not required
**Description:** Tüm kategorileri hiyerarşik yapıda getirir (cached 24h)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Wood Carvings",
      "slug": "wood-carvings",
      "icon": "🪵",
      "children": [
        {
          "id": "uuid2",
          "name": "Viking Decorations",
          "slug": "viking-decorations",
          ...
        }
      ]
    }
  ]
}
```

### 2. Get Top-Level Categories
**Endpoint:** `GET /api/v1/categories/top-level`
**Auth:** Not required

### 3. Get Featured Categories
**Endpoint:** `GET /api/v1/categories/featured`
**Auth:** Not required

### 4. Get Category by ID
**Endpoint:** `GET /api/v1/categories/:id`
**Auth:** Not required

### 5. Create Category (Admin Only)
**Endpoint:** `POST /api/v1/categories`
**Auth:** Required (Admin)

**Request:**
```json
{
  "name": "Glass Art",
  "description": "Handmade glass art and decorations",
  "icon": "🍶",
  "parent_id": null,  // or parent category UUID
  "is_featured": true,
  "sort_order": 1
}
```

### 6. Update Category (Admin Only)
**Endpoint:** `PUT /api/v1/categories/:id`
**Auth:** Required (Admin)

### 7. Delete Category (Admin Only)
**Endpoint:** `DELETE /api/v1/categories/:id`
**Auth:** Required (Admin)

---

## 🧪 Test Senaryoları

### 1. Kategori Oluştur (Admin)
```bash
# Önce admin olarak login ol
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dostanmarket.com","password":"Admin@123456"}'

# Kategori oluştur
curl -X POST http://localhost:3001/api/v1/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"name":"Wood Carvings","description":"Handmade wood carvings","icon":"🪵"}'
```

### 2. Mağaza Oluştur (Seller)
```bash
# Seller olarak register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@test.com","password":"Seller123!","first_name":"John","last_name":"Doe","role":"seller"}'

# Mağaza oluştur
curl -X POST http://localhost:3001/api/v1/stores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SELLER_TOKEN" \
  -d '{"name":"Nordic Crafts","description":"Handmade Nordic items"}'
```

### 3. Mağazayı Onayla (Admin)
```bash
curl -X PATCH http://localhost:3001/api/v1/stores/STORE_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"status":"approved"}'
```

### 4. Ürün Ekle (Seller)
```bash
curl -X POST http://localhost:3001/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SELLER_TOKEN" \
  -d '{"store_id":"STORE_ID","category_id":"CATEGORY_ID","title":"Viking Axe","price":299.99,"stock":10}'
```

### 5. Ürünü Onayla (Admin)
```bash
curl -X PATCH http://localhost:3001/api/v1/products/PRODUCT_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"status":"approved"}'
```

### 6. Ürünleri Listele (Public)
```bash
curl "http://localhost:3001/api/v1/products?page=1&limit=10&sort=-created_at"
```

---

## ⚡ Özellikler

### Performance
- ✅ Redis caching (categories: 24h, products: 1h)
- ✅ Database indexing (slug, status, price, rating, etc.)
- ✅ Pagination (default 20, max 100)
- ✅ Query optimization with eager loading

### Security
- ✅ Role-based access control (admin, seller, buyer)
- ✅ Ownership validation
- ✅ Input sanitization (Joi)
- ✅ Rate limiting

### Features
- ✅ Soft delete pattern
- ✅ Slug auto-generation (SEO friendly)
- ✅ Approval workflow (store & product)
- ✅ Advanced filtering & search
- ✅ Product view counter
- ✅ Multi-image support
- ✅ Hierarchical categories

---

## 📝 Response Format

Tüm endpoint'ler standart format kullanır:

**Success:**
```json
{
  "success": true,
  "message": "Success message",
  "data": {...},
  "timestamp": "2025-10-21T19:00:00.000Z"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": [...],  // Optional validation errors
  "timestamp": "2025-10-21T19:00:00.000Z"
}
```

**Paginated:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 🎯 Sıradaki Adımlar

✅ Tamamlandı:
- Store CRUD APIs
- Product CRUD APIs
- Category APIs
- Approval workflow
- Caching & Performance

⏭️ Devam:
- Cart APIs
- Order APIs
- Payment Mock Service
- File Upload (Images)
- Admin Dashboard APIs

**Backend tamamen çalışıyor ve test edilmeye hazır!** 🚀
