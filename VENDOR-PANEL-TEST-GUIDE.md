# 🧪 Vendor Panel Test Rehberi

## 🚀 Hızlı Başlangıç

### 1️⃣ Backend Sunucusu Çalıştır
```bash
cd backend
npm run dev
```
✅ Server: http://localhost:3001 adresinde çalışacak

### 2️⃣ Vendor Panel'i Aç

**Test Sayfası (Basit):**
```
file:///C:/Users/LENOVO/Desktop/dostanwebcss41.2/vendorcss/test-sections.html
```
Bu sayfa section navigation'ın çalışıp çalışmadığını test eder.

**Login Sayfası:**
```
file:///C:/Users/LENOVO/Desktop/dostanwebcss41.2/vendorcss/login.html
```

**Ana Vendor Dashboard:**
```
file:///C:/Users/LENOVO/Desktop/dostanwebcss41.2/vendorcss/index.html
```

---

## 🔐 Test Kullanıcıları

### Seller (Satıcı)
```
Email: seller@test.com
Password: Seller123!
```

### Admin
```
Email: admin@dostanmarket.com
Password: Admin@123456
```

---

## 🧪 Test Adımları

### ✅ 1. Login Testi
1. `login.html` sayfasını aç
2. Seller credentials ile giriş yap
3. `index.html` sayfasına yönlendirileceksin

### ✅ 2. Navigation Testi (Basit)
1. `test-sections.html` sayfasını aç
2. Üstteki butonlara tıkla
3. Consolda logları gör
4. Section'ların görünüp görünmediğini kontrol et

### ✅ 3. Vendor Dashboard Testi
1. `index.html` sayfasını aç
2. **F12** ile Developer Tools'u aç
3. **Console** sekmesine geç
4. Aşağıdaki logları göreceksin:

```
[Vendor Dashboard] DOM loaded, initializing dashboard
[Vendor Dashboard] Found sections: [...]
[Vendor Dashboard] Found menu items: [...]
[Auth] Checking authentication...
[Vendor Dashboard] Initializing for user: xxx
[Vendor Dashboard] Loading store info...
```

### ✅ 4. Menu Navigation Testi
Sol menüdeki her bir iteme tıkla:
- ✅ Dashboard
- ✅ My Products
- ✅ Orders
- ✅ Analytics
- ✅ Inventory
- ✅ Returns & Refunds
- ✅ Store Management
- ✅ Shipping & Logistics
- ✅ SEO & Marketing
- ✅ Messages
- ✅ Settings

**Console'da şu logları göreceksin:**
```
[Vendor Dashboard] Switching to section: products
[Vendor Dashboard] Loading section data: products
[Vendor Dashboard] Loading products for store: xxx
```

### ✅ 5. Products Section Testi
1. "My Products" menüsüne tıkla
2. Şunlardan birini göreceksin:
   - **Ürün varsa:** Grid layout'ta ürün kartları
   - **Ürün yoksa:** 📦 "Henüz ürün yok" mesajı

**Console'da:**
```
[Vendor Dashboard] Loading products for store: xxx
[API] GET /products?storeId=xxx
[Vendor Dashboard] Products response: {...}
[Vendor Dashboard] Products rendered successfully: 0
```

### ✅ 6. Product Ekleme Testi
1. "➕ Add New Product" butonuna tıkla
2. Modal açılacak
3. Formu doldur:
   ```
   Title: Test Viking Axe
   Short Desc: Beautiful handmade axe
   Description: Authentic Nordic decoration...
   Category: Wood Carvings (dropdown)
   Price: 299.99
   Stock: 10
   Image URL: https://picsum.photos/400
   ```
4. "✓ Create Product" butonuna tıkla

**Console'da:**
```
[Vendor Dashboard] Creating product: {...}
[API] POST /products
[Vendor Dashboard] Product created successfully
```

**Başarı mesajı:**
```
✅ Ürün başarıyla oluşturuldu! Admin onayı bekleniyor.
```

### ✅ 7. Orders Section Testi
1. "Orders" menüsüne tıkla
2. Şunlardan birini göreceksin:
   - **Sipariş varsa:** Table layout
   - **Sipariş yoksa:** 📦 "Henüz sipariş yok" mesajı

---

## 🐛 Sorun Giderme

### ❌ "My Products boş görünüyor"

**Kontroller:**
1. Console'u aç (F12)
2. Şu logları ara:
   ```
   [Vendor Dashboard] Switching to section: products
   [Vendor Dashboard] Loading products...
   ```

3. Error var mı kontrol et:
   ```
   [Vendor Dashboard] Error loading products: ...
   ```

4. Network tab'ında API çağrısını kontrol et:
   ```
   GET /api/v1/products?storeId=xxx
   ```

**Çözümler:**
- Backend çalışıyor mu? → `curl http://localhost:3001/health`
- Store ID var mı? → Console'da `window.vendorDashboard.storeId` yaz
- Container var mı? → Console'da `document.getElementById('products-list')` yaz

### ❌ "Login sonrası sayfaya yönlenmiyor"

**Kontroller:**
1. LocalStorage'da token var mı?
   ```javascript
   localStorage.getItem('accessToken')
   ```

2. User bilgisi var mı?
   ```javascript
   AuthManager.getUser()
   ```

**Çözüm:**
Manuel olarak token ekle (test için):
```javascript
localStorage.setItem('accessToken', 'YOUR_TOKEN');
localStorage.setItem('user', JSON.stringify({
  id: 'xxx',
  email: 'seller@test.com',
  role: 'seller',
  first_name: 'John',
  last_name: 'Doe'
}));
```

### ❌ "Section tıklayınca içerik değişmiyor"

**Kontroller:**
1. Console'da şu logu ara:
   ```
   [Vendor Dashboard] Switching to section: xxx
   ```

2. Section bulundu mu?
   ```
   [Vendor Dashboard] Section not found: xxx-section
   ```

**Çözüm:**
HTML'de section ID'leri kontrol et:
```javascript
// Console'da çalıştır:
document.querySelectorAll('.content-section').forEach(s => console.log(s.id));
```

### ❌ "API çağrıları 401 Unauthorized dönüyor"

**Sebep:** Token expired veya yok

**Çözüm:**
1. Yeniden login yap
2. Token'ı kontrol et:
   ```javascript
   console.log(localStorage.getItem('accessToken'));
   ```

---

## 📊 Beklenen Console Logları

### ✅ Başarılı İlk Yükleme
```
[Auth] Checking authentication...
[Auth] Current user: {email: "seller@test.com", role: "seller", ...}
[Vendor Dashboard] DOM loaded, initializing dashboard
[Vendor Dashboard] Found sections: ["dashboard-section", "products-section", ...]
[Vendor Dashboard] Found menu items: ["dashboard", "products", "orders", ...]
[Vendor Dashboard] Initializing for user: xxx
[Vendor Dashboard] Starting initialization...
[Vendor Dashboard] Loading store info for user: xxx
[API] GET /stores?userId=xxx
[Vendor Dashboard] Store loaded: Nordic Handicrafts Store
[Vendor Dashboard] Loading categories...
[API] GET /categories/top-level
[Vendor Dashboard] Categories loaded: 6
[Vendor Dashboard] Loading dashboard data...
[Vendor Dashboard] Dashboard initialized successfully
```

### ✅ Products Section Açılışı
```
[Vendor Dashboard] Switching to section: products
Hiding section: dashboard-section
Showing section: products-section
[Vendor Dashboard] Loading section data: products
[Vendor Dashboard] Loading products for store: xxx
[API] GET /products?storeId=xxx&limit=50
[Vendor Dashboard] Products response: {success: true, data: [...]}
[Vendor Dashboard] Products rendered successfully: 1
```

### ✅ Ürün Ekleme
```
[Vendor Dashboard] Creating product: {title: "Test Product", ...}
[API] POST /products
[Vendor Dashboard] Product created successfully
✅ Ürün başarıyla oluşturuldu!
[Vendor Dashboard] Loading products for store: xxx
```

---

## 🎯 Backend API Test

### Manuel API Test
```bash
# Health check
curl http://localhost:3001/health

# Categories
curl http://localhost:3001/api/v1/categories/top-level

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@test.com","password":"Seller123!"}'

# Get products (with token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/products?storeId=YOUR_STORE_ID
```

---

## 🔧 Yararlı Console Komutları

```javascript
// Mevcut kullanıcı
AuthManager.getUser()

// Dashboard instance
window.vendorDashboard

// Store ID
window.vendorDashboard.storeId

// Tüm sections
document.querySelectorAll('.content-section')

// Aktif section
document.querySelector('.content-section.active')

// Manuel section değiştir
window.vendorDashboard.switchSection('products')

// Manuel ürün yükle
window.vendorDashboard.loadProductsData()
```

---

## 📝 Durum Özeti

✅ **Çalışan:**
- Login/Logout sistemi
- Section navigation (güncellendi)
- Product listing (backend'den)
- Product creation (modal + API)
- Category loading
- Store info loading
- Order listing
- Error handling
- Loading states
- Empty states

⚠️ **Test Edilmesi Gereken:**
- Login flow (baştan sona)
- Tüm menu items
- Product form validation
- API error responses
- Token expiration

---

**Test başarıyla tamamlanırsa:**
🎉 Vendor dashboard tam çalışır durumda!

**Sorun yaşarsan:**
1. Console log'ları kontrol et
2. Network tab'ı kontrol et
3. Backend çalışıyor mu kontrol et
4. LocalStorage'da token var mı kontrol et
