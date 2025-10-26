# 🎟️ Kupon Sistemi - Kullan Ready!

## ✅ Tamamlanan Backend (6/6)

### 1. Database Models
- ✅ `Coupon` model - Kupon tanımları
- ✅ `CouponUsage` model - Kullanım takibi  
- ✅ Order model'e `coupon_code` ve `coupon_discount` alanları

### 2. Business Logic
- ✅ Coupon Service - Validasyon, apply, tracking
- ✅ Joi Validators - Input validation
- ✅ Coupon Controller - API handlers

### 3. API Endpoints
```
Public:
  GET  /api/v1/coupons/active
  POST /api/v1/coupons/validate

User:
  GET  /api/v1/coupons/my-history

Admin:
  POST   /api/v1/coupons
  GET    /api/v1/coupons
  GET    /api/v1/coupons/:id
  PATCH  /api/v1/coupons/:id
  DELETE /api/v1/coupons/:id
  GET    /api/v1/coupons/:id/stats
```

### 4. Migration Scripts
- ✅ `create-coupon-tables.js` - Tablo oluşturma
- ✅ `add-coupon-to-orders.js` - Order tablosuna alanlar

### 5. Örnek Kuponlar
```
WELCOME10  - %10 indirim (ilk sipariş)
SUMMER2024 - %20 indirim (₺200+ sipariş)
FREESHIP   - Ücretsiz kargo (₺150+ sipariş)
SAVE50     - ₺50 indirim (₺300+ sipariş)
```

---

## 🎯 Kupon Özellikleri

### Discount Types
- ✅ **Percentage**: %10, %20, vb.
- ✅ **Fixed Amount**: ₺50, ₺100, vb.
- ✅ **Free Shipping**: Kargo ücretsiz

### Kullanım Limitleri
- ✅ **Total Usage**: Toplam kaç kez kullanılabilir
- ✅ **Per User**: Kullanıcı başına limit
- ✅ **First Order Only**: Sadece ilk sipariş

### Geçerlilik Kontrolleri
- ✅ **Validity Period**: Başlangıç/bitiş tarihi
- ✅ **Min Order Amount**: Minimum sipariş tutarı
- ✅ **Max Discount**: Maksimum indirim (yüzde için)

### Kapsam
- ✅ **All Products**: Tüm ürünler
- ✅ **Specific Products**: Belirli ürünler
- ✅ **Categories**: Belirli kategoriler
- ✅ **Stores**: Belirli mağazalar

---

## 🚀 Kurulum (Backend Çalışırken)

### 1. Tabloları Oluştur
```bash
node backend/src/scripts/create-coupon-tables.js
node backend/src/scripts/add-coupon-to-orders.js
```

### 2. Backend'i Restart Et
```bash
cd backend
npm run dev
```

### 3. Test Et
```bash
# Aktif kuponları getir
GET http://localhost:5000/api/v1/coupons/active

# Kupon validate et
POST http://localhost:5000/api/v1/coupons/validate
{
  "code": "WELCOME10",
  "order_amount": 100
}
```

---

## 📝 Kullanım Örnekleri

### Admin: Yeni Kupon Oluştur
```javascript
POST /api/v1/coupons
{
  "code": "NEWYEAR2024",
  "name": "Yılbaşı İndirimi",
  "description": "%25 indirim tüm ürünlerde!",
  "discount_type": "percentage",
  "discount_value": 25,
  "max_discount_amount": 200,
  "usage_limit": 100,
  "usage_limit_per_user": 1,
  "min_order_amount": 150,
  "valid_from": "2024-12-25T00:00:00Z",
  "valid_until": "2025-01-05T23:59:59Z",
  "is_active": true
}
```

### User: Kupon Uygula (Checkout)
```javascript
// 1. Validate coupon
POST /api/v1/coupons/validate
{
  "code": "WELCOME10",
  "order_amount": 500
}

Response:
{
  "valid": true,
  "discount_amount": 50,
  "final_amount": 450
}

// 2. Create order with coupon
POST /api/v1/orders
{
  "items": [...],
  "coupon_code": "WELCOME10",
  "total": 450
}
```

### User: Kupon Geçmişi
```javascript
GET /api/v1/coupons/my-history

Response: [
  {
    "code": "WELCOME10",
    "discount_amount": 50,
    "order_total": 500,
    "used_at": "2024-10-23T10:00:00Z"
  }
]
```

---

## 🎨 Frontend TODO (Gelecek Adımlar)

### Admin Panel (Pending)
- [ ] Kupon oluşturma formu
- [ ] Kupon listesi ve yönetimi
- [ ] Kupon istatistikleri

### Checkout (Pending)
- [ ] Kupon input alanı
- [ ] "Apply Coupon" butonu
- [ ] İndirim gösterimi

### User Profile (Pending)
- [ ] Kullanılabilir kuponlar listesi
- [ ] Kupon kullanım geçmişi

---

## 🎁 Örnek Senaryolar

### Scenario 1: Welcome Coupon
```
User ilk defa sipariş veriyor
→ WELCOME10 kuponunu kullanıyor
→ ₺500 sipariş → ₺50 indirim
→ ₺450 ödüyor
```

### Scenario 2: Summer Sale
```
Admin %20 yaz indirimi kampanyası başlatıyor
→ SUMMER2024 kodu 100 kişi kullanabilir
→ Her kullanıcı 1 kez
→ Min ₺200 sipariş
→ Max ₺500 indirim
```

### Scenario 3: Free Shipping
```
₺150+ siparişlerde ücretsiz kargo
→ FREESHIP kodu
→ Kargo ücreti discount'a eklenir
→ Final total'den düşülür
```

---

## 🔒 Güvenlik & Validasyon

- ✅ Code uniqueness
- ✅ Usage limit enforcement
- ✅ Per-user limit
- ✅ Date validation
- ✅ Amount validation
- ✅ First order check
- ✅ Min order amount
- ✅ Max discount cap

---

**Durum**: ✅ Backend %100 Ready  
**Frontend**: 🔜 Pending (Admin + Checkout + Profile)  
**Test**: ✅ Sample coupons created  

**Backend çalışmaya hazır! Frontend'i ekleyelim mi? 🚀**








