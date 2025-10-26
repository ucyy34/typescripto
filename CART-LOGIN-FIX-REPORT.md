# Sepet Login Sorunu - Düzeltme Raporu

## 🐛 Sorun Tanımı

Login olunca anasayfadan eklenen ürünler sepette görünmüyordu. Guest olarak sepete ürün eklendiğinde ise düzgün çalışıyordu.

## 🔍 Tespit Edilen Sorunlar

### 1. **product-modal.js Eski Format Kullanıyordu**
- `product-modal.js` dosyasındaki `addToCart()` metodu eski sepet formatını kullanıyordu
- Doğrudan localStorage'a yazıyordu, `CartManager` API'sini kullanmıyordu
- Eklenen format: `{id, title, price, image, artisan, size, color, quantity}`
- Beklenen format: `{product_id, product: {...}, quantity, price}`

### 2. **CartManager Login Durumunu Güncellemiyordu**
- `CartManager` constructor'da bir kez `isLoggedIn` kontrolü yapıyordu
- Login olduktan sonra sayfa yenilenmediği için `isLoggedIn` false kalıyordu
- Backend'den sepet çekilmiyordu, localStorage kullanılıyordu

### 3. **Sepet Birleştirme Sorunu**
- Backend `mergeGuestCartToUser` metodu session kullanıyor
- Frontend localStorage kullanıyor
- Session ile localStorage arasında senkronizasyon yoktu

## ✅ Yapılan Düzeltmeler

### 1. product-modal.js Güncellemesi

**Değişiklik:** `addToCart()` metodu `CartManager` API'sini kullanacak şekilde güncellendi.

```javascript
async addToCart() {
    // Product ID oluştur
    const productId = productCard?.dataset?.productId || 
                     this.currentProduct.id || 
                     this.generateProductId(this.currentProduct);

    // CartManager formatında product data oluştur
    const productData = {
        id: productId,
        title: this.currentProduct.title,
        price: priceValue,
        images: [this.currentProduct.image],
        stock: 99,
        store: { name: this.currentProduct.artisan }
    };

    // CartManager kullanarak ekle
    const success = await window.cartManager.addItem(productId, productData, quantity);
}
```

**Değişiklik:** `updateCartCounter()` metodu da `CartManager` kullanacak şekilde güncellendi.

```javascript
async updateCartCounter() {
    const count = await window.cartManager.getCartCount();
    cartCount.textContent = count;
}
```

### 2. CartManager Login Durumu Kontrolü

**Değişiklik:** `getCart()` ve `addItem()` metodları her çağrıldığında login durumunu kontrol ediyor.

```javascript
async getCart(forceRefresh = false) {
    // Her zaman güncel login durumunu kontrol et
    this.isLoggedIn = !!localStorage.getItem('accessToken');
    if (this.isLoggedIn && !this.apiClient) {
        this.initializeApiClient();
    }
    
    console.log('[CartManager] getCart - isLoggedIn:', this.isLoggedIn);
    
    if (this.isLoggedIn && this.apiClient) {
        // Backend'den çek
        const response = await this.apiClient.get('/cart');
        // ...
    }
    
    // Fallback to localStorage
    return this.getLocalCart();
}
```

### 3. Sepet Birleştirme Düzeltmesi

**Değişiklik:** `mergeGuestCart()` metodu backend merge endpoint'i yerine her ürünü tek tek ekliyor.

```javascript
async mergeGuestCart() {
    // Önce login durumunu güncelle
    this.isLoggedIn = true;
    this.initializeApiClient();
    
    const guestCart = this.getLocalCart();
    
    // Her ürünü tek tek backend'e ekle
    for (const item of guestCart) {
        await this.apiClient.post('/cart/items', {
            product_id: item.product_id,
            quantity: item.quantity
        });
    }
    
    // Guest cart'ı temizle
    localStorage.removeItem('cart');
    
    // Backend'den yeniden yükle
    const cart = await this.getCart();
}
```

## 📝 Değiştirilen Dosyalar

1. **assets/js/product-modal.js**
   - `addToCart()` metodu güncellendi (async, CartManager kullanımı)
   - `updateCartCounter()` metodu güncellendi (async, CartManager kullanımı)

2. **assets/js/cart-manager.js**
   - `getCart()` metoduna login durumu kontrolü eklendi
   - `addItem()` metoduna login durumu kontrolü eklendi
   - `mergeGuestCart()` metodu düzeltildi (item-by-item ekleme)

## 🧪 Test Senaryoları

### Senaryo 1: Guest Kullanıcı
1. ✅ Logout olun veya incognito modda açın
2. ✅ Anasayfadan ürün ekleyin
3. ✅ Sepet sayfasına gidin
4. ✅ Ürünlerin görüntülendiğini doğrulayın

### Senaryo 2: Login Sonrası Sepet
1. ✅ Guest olarak ürün ekleyin
2. ✅ Login olun
3. ✅ Sepet sayfasına gidin
4. ✅ Guest sepetindeki ürünlerin backend'e taşındığını doğrulayın

### Senaryo 3: Login Olmuş Kullanıcı
1. ✅ Login olun
2. ✅ Anasayfadan ürün ekleyin
3. ✅ Sepet sayfasına gidin
4. ✅ Ürünlerin hem localStorage'da hem backend'de olduğunu doğrulayın
5. ✅ Sayfayı yenileyin
6. ✅ Ürünlerin backend'den yüklendiğini doğrulayın

### Senaryo 4: Modal'dan Ürün Ekleme
1. ✅ Ürün kartına tıklayın (modal açılsın)
2. ✅ "Sepete Ekle" butonuna tıklayın
3. ✅ Sepet sayacının güncellendiğini doğrulayın
4. ✅ Sepet sayfasına gidin
5. ✅ Ürünün doğru formatta eklendiğini doğrulayın

## 🔧 Debug İpuçları

### Console'da Sepet Durumunu Kontrol Etme

```javascript
// CartManager durumunu kontrol et
window.debugCart()

// Manuel olarak sepeti kontrol et
console.log('Login:', !!localStorage.getItem('accessToken'))
console.log('Cart:', JSON.parse(localStorage.getItem('cart')))
console.log('CartManager:', window.cartManager)

// Backend'den sepeti çek
await window.cartManager.getCart(true) // force refresh
```

### Beklenen Console Logları

**Guest kullanıcı ürün eklerken:**
```
[CartManager] Adding item: <product-id> qty: 1
[CartManager] addToLocalStorage called
[CartManager] Saved to localStorage successfully
```

**Login olmuş kullanıcı ürün eklerken:**
```
[CartManager] Adding item: <product-id> qty: 1
[CartManager] getCart - isLoggedIn: true hasApiClient: true
[CartManager] addToLocalStorage called
[CartManager] Synced to backend
[CartManager] Cleared cart cache
```

**Sepet sayfası yüklenirken (login):**
```
[CartManager] getCart - isLoggedIn: true hasApiClient: true
[CartManager] Loaded from backend: X items
[CartManager] Synced to localStorage: X items
```

## 🎯 Sonuç

Tüm düzeltmeler tamamlandı. Artık:
- ✅ Guest kullanıcılar sepete ürün ekleyebilir
- ✅ Login olmuş kullanıcılar sepete ürün ekleyebilir
- ✅ Login sonrası guest sepeti backend'e taşınır
- ✅ Sepet hem localStorage hem backend'de senkronize çalışır
- ✅ Sayfa yenilense bile sepet backend'den yüklenir
- ✅ Modal'dan eklenen ürünler doğru formatta kaydedilir

## 📌 Notlar

- `home-api.js` dosyası zaten doğru şekilde `CartManager` kullanıyordu
- `cart-api.js` dosyası da doğru şekilde çalışıyor
- Sadece `product-modal.js` eski sistemi kullanıyordu
- `CartManager` artık her işlemde login durumunu kontrol ediyor
