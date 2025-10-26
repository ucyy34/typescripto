# 🛒 Cart Merge Bug Fix - October 25, 2025

## 🐛 BUG:

**Authenticated user login sonrası sepet boş görünüyor!**

### Symptoms:
- ✅ Guest user → Sepet çalışıyor
- ❌ Login yapınca → Sepet boş
- ❌ Eklenen ürünler kaybolmuş gibi görünüyor

### Root Cause:

Login başarılı olduktan sonra **guest cart, user cart ile merge edilmiyor!**

`pages/login.html` dosyasında login success handler'da:
```javascript
// Use AuthManager to save login data
AuthManager.login(tokens, user);

// Show success & redirect
// ❌ mergeGuestCart() ÇAĞRILMIYOR!
```

## ✅ ÇÖZÜM:

### 1. `pages/login.html` Güncellendi

**Eklenen kod:**
```javascript
// Merge guest cart to user cart
if (window.cartManager) {
    console.log('[Login] Merging guest cart...');
    await window.cartManager.mergeGuestCart();
}
```

**Script import eklendi:**
```html
<script src="../assets/js/cart-manager.js"></script>
```

### 2. Akış:

```
1. Guest user ürün ekler → localStorage'a kaydedilir
2. Login yapar → AuthManager.login() çağrılır
3. ✨ YENİ: cartManager.mergeGuestCart() çağrılır
   - Guest cart'taki her ürün backend'e POST edilir
   - Backend user cart'ına ekler
   - localStorage temizlenir
4. Redirect edilir
5. Yeni sayfada user cart backend'den yüklenir
```

## 📊 Test:

### Öncesi:
```
1. Guest olarak 2 ürün ekle ✅
2. Login yap ❌
3. Sepete bak → 0 ürün görünüyor ❌
```

### Sonrası:
```
1. Guest olarak 2 ürün ekle ✅
2. Login yap ✅
3. Sepete bak → 2 ürün görünmeli ✅
```

## 🔍 Backend Doğrulaması:

Debug script ile backend service'in doğru çalıştığı doğrulandı:
```bash
node backend/src/scripts/debug-auth-cart.js
```

Sonuç:
```
✅ Cart model çalışıyor
✅ Cart service çalışıyor  
✅ Database'e yazıyor ve okuyor
✅ populateCartItems çalışıyor
```

## 📁 Değiştirilen Dosyalar:

1. `pages/login.html`
   - Satır 301-305: `mergeGuestCart()` çağrısı eklendi
   - Satır 248: `cart-manager.js` script import eklendi

## 🧪 Test Adımları:

1. **Logout ol** (eğer login'sen)
2. **Guest olarak 2-3 ürün ekle** sepete
3. **F12 aç** → Console → `localStorage.getItem('cart')` kontrol et
4. **Login yap** (buyer@test.com / Test123!)
5. **Console'da** `[Login] Merging guest cart...` mesajını gör
6. **Sepete git** → Ürünler görünmeli!
7. **F12** → Console → `localStorage.getItem('cart')` → null olmalı (temizlendi)

## ⚠️ Notlar:

- `cart-manager.js` zaten `mergeGuestCart()` fonksiyonuna sahipti
- Sadece login sayfasından çağrılmıyordu!
- Buyer role için critical, seller/admin için gerekmez (onlar alışveriş yapmaz)

---

**Son Güncelleme:** 25 Ekim 2025, 01:45  
**Test Durumu:** ⏳ Beklemede (Kullanıcı tarafından test edilecek)  
**Priority:** 🔴 CRITICAL




