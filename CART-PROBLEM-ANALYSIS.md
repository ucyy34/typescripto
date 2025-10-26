# Sepet Sorunu - Detaylı Analiz ve Olası Çözümler

## 🔍 Mevcut Durum

**Guest olunca:** ✅ Çalışıyor
```
[CartManager] Saved to localStorage successfully, total items: 2
[CartManager] Using localStorage (not logged in)
```

**Login olunca:** ❌ Çalışmıyor
```
[CartManager] Synced to backend ✅
[CartManager] Loaded from backend: 0 items ❌
```

## 🎯 Olası Sorunlar ve Çözümler

### Sorun 1: Backend'de Ürün Bulunamıyor

**Neden:** `populateCartItems` metodunda ürünler filtreleniyor olabilir.

**Kontrol:**
- Backend terminalinde şu logları ara:
  ```
  [CartService] Cart: xxx, raw items: 1  ← Kaç item var?
  [CartService] After populate: 0 items  ← Neden 0?
  ```

**Çözüm:** ✅ Zaten yaptık - `status: 'approved'` kontrolünü kaldırdık

**Ama hala çalışmıyorsa:**
```javascript
// backend/src/services/cart.service.js - populateCartItems
// Şu satırı ekle:
console.log('[CartService] Product IDs to fetch:', productIds);
console.log('[CartService] Products found:', products.length);
console.log('[CartService] Product details:', products.map(p => ({ id: p.id, title: p.title, is_active: p.is_active })));
```

---

### Sorun 2: Product ID Formatı Uyumsuz

**Neden:** Frontend UUID gönderiyor, backend farklı format bekliyor olabilir.

**Kontrol:**
```javascript
// Console'da:
const cart = JSON.parse(localStorage.getItem('cart'));
console.log('Product IDs:', cart.map(item => item.product_id));
```

**Beklenen:** UUID formatı (`550e8400-e29b-41d4-a716-446655440000`)

**Çözüm:** Eğer farklı formatsa, `home-api.js`'de product ID'yi kontrol et:
```javascript
// home-api.js - addToCart fonksiyonu
console.log('[addToCart] Product ID type:', typeof productId, productId);
```

---

### Sorun 3: Token Geçersiz veya Eksik

**Neden:** API isteği authentication hatası veriyor olabilir.

**Kontrol:**
```javascript
// Console'da:
console.log('Token:', localStorage.getItem('accessToken'));
console.log('Token valid:', !!localStorage.getItem('accessToken'));
```

**Çözüm:** Eğer token yoksa veya geçersizse:
1. Logout yap
2. Tekrar login ol
3. Token'ı kontrol et

---

### Sorun 4: API Cache Sorunu

**Neden:** Cache temizlenmemiş olabilir.

**Kontrol:**
```javascript
// Console'da:
if (window.apiCache) {
    window.apiCache.clearAll();
    console.log('Cache cleared');
}
```

**Çözüm:**
```javascript
// cart-manager.js - getCart metodunda
if (window.apiCache) {
    window.apiCache.clearPattern('/cart');
}
```

---

### Sorun 5: User ID Sorunu

**Neden:** Backend yanlış user ID ile sepet arıyor olabilir.

**Kontrol Backend'de:**
```javascript
// backend/src/services/cart.service.js - getUserCart
console.log('[CartService] User ID:', userId);
console.log('[CartService] User ID type:', typeof userId);
```

**Çözüm:** Backend loglarında user ID'yi kontrol et.

---

### Sorun 6: Database'de Cart Kaydı Yok

**Neden:** Cart tablosunda kayıt oluşturulmamış olabilir.

**Kontrol:**
```sql
-- PostgreSQL'de çalıştır:
SELECT * FROM carts ORDER BY updated_at DESC LIMIT 5;
SELECT id, user_id, items, updated_at FROM carts WHERE deleted_at IS NULL;
```

**Çözüm:** Eğer cart yoksa, `findOrCreateForUser` çalışmıyor demektir.

---

### Sorun 7: JSONB Items Formatı

**Neden:** PostgreSQL JSONB'de items array'i bozuk olabilir.

**Kontrol:**
```sql
-- PostgreSQL'de:
SELECT user_id, items::text FROM carts WHERE deleted_at IS NULL;
```

**Beklenen Format:**
```json
[
  {"product_id": "uuid-here", "quantity": 1}
]
```

---

### Sorun 8: Soft Delete Sorunu

**Neden:** Cart model'inde `paranoid: true` var - silinmiş kayıtlar gizleniyor.

**Kontrol:**
```sql
-- PostgreSQL'de:
SELECT id, user_id, deleted_at FROM carts;
```

**Çözüm:** Eğer `deleted_at` doluysa:
```sql
UPDATE carts SET deleted_at = NULL WHERE user_id = 'your-user-id';
```

---

## 🔧 Hızlı Debug Adımları

### 1. Frontend Console'da Çalıştır:

```javascript
// 1. Login durumunu kontrol et
console.log('=== AUTH CHECK ===');
console.log('Token:', localStorage.getItem('accessToken'));
console.log('User:', JSON.parse(localStorage.getItem('user')));

// 2. CartManager durumunu kontrol et
console.log('=== CART MANAGER ===');
console.log('isLoggedIn:', window.cartManager.isLoggedIn);
console.log('hasApiClient:', !!window.cartManager.apiClient);

// 3. LocalStorage cart'ı kontrol et
console.log('=== LOCAL STORAGE ===');
const cart = JSON.parse(localStorage.getItem('cart') || '[]');
console.log('Cart items:', cart.length);
cart.forEach((item, i) => {
    console.log(`Item ${i}:`, {
        product_id: item.product_id,
        title: item.product?.title,
        quantity: item.quantity
    });
});

// 4. Backend'den sepeti çek
console.log('=== BACKEND FETCH ===');
await window.cartManager.getCart(true); // force refresh
```

### 2. Backend Terminal'de Ara:

```bash
# Şu logları ara:
[CartService] getUserCart - userId: 
[CartService] Cart: xxx, raw items: 
[CartService] After populate: 
```

### 3. Database'de Kontrol Et:

```sql
-- En son eklenen cart kayıtlarını göster
SELECT 
    c.id,
    c.user_id,
    u.email,
    c.items::text,
    c.updated_at,
    c.deleted_at
FROM carts c
LEFT JOIN users u ON u.id = c.user_id
ORDER BY c.updated_at DESC
LIMIT 5;
```

---

## 📋 Test Senaryosu

1. **Logout yap**
2. **Console'u temizle** (F12 → Console → Clear)
3. **Login ol**
4. **Console'da çalıştır:**
   ```javascript
   console.log('User:', JSON.parse(localStorage.getItem('user')));
   console.log('Token:', localStorage.getItem('accessToken'));
   ```
5. **Ürün ekle**
6. **Console loglarını kopyala ve paylaş**
7. **Backend terminal loglarını kopyala ve paylaş**

---

## 🎯 En Olası Sorun

Tahminim: **Backend'de ürün bulunamıyor** çünkü:
- ✅ Frontend ürünü ekliyor (Success log var)
- ❌ Backend 0 item döndürüyor
- ❌ `populateCartItems` ürünleri filtreliyor

**Kontrol edilmesi gereken:**
1. Backend'de `[CartService] After populate: X items` logu
2. Eklenen ürünün `is_active` ve `status` değerleri
3. Product ID'nin doğru formatta olması (UUID)

---

## 💡 Hızlı Test

Console'da şunu çalıştır:

```javascript
// Manuel olarak backend'e istek at
const token = localStorage.getItem('accessToken');
const response = await fetch('http://localhost:3001/api/v1/cart', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
const data = await response.json();
console.log('Backend cart response:', data);
```

Sonucu bana gönder! 🔍
