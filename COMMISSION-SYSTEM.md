# 💰 Komisyon Sistemi Dokümantasyonu

## 📋 Genel Bakış

DostanWebCSS multi-vendor marketplace için tam özellikli komisyon yönetim sistemi. Platform, her satıştan belirli bir yüzde veya sabit tutar komisyon alarak gelir elde eder.

**Tarih**: 2025-10-23  
**Durum**: ✅ Faz 1 Tamamlandı (Backend Altyapı)  
**Varsayılan Komisyon**: 15%

---

## 🏗️ Veritabanı Yapısı

### 1️⃣ `commission_settings` Tablosu

Platform ve mağaza bazlı komisyon ayarları.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID | Primary key |
| `store_id` | UUID | Mağaza ID (NULL = global ayarlar) |
| `commission_type` | ENUM | percentage, fixed, tiered, category_based |
| `default_rate` | DECIMAL(5,2) | Komisyon oranı (%15.00) |
| `min_commission` | DECIMAL(10,2) | Minimum komisyon tutarı |
| `max_commission` | DECIMAL(10,2) | Maksimum komisyon tutarı |
| `is_active` | BOOLEAN | Aktif/Pasif |
| `applied_from` | TIMESTAMP | Başlangıç tarihi |
| `applied_until` | TIMESTAMP | Bitiş tarihi |
| `notes` | TEXT | Admin notları |

**Indexes:**
- `store_id`
- `is_active`
- `applied_from`, `applied_until`

---

### 2️⃣ `commission_transactions` Tablosu

Her sipariş için hesaplanan komisyon kayıtları.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | UUID | Primary key |
| `order_id` | UUID | Sipariş ID (unique) |
| `store_id` | UUID | Mağaza ID |
| `setting_id` | UUID | Kullanılan komisyon ayarı |
| `order_total` | DECIMAL(10,2) | Sipariş toplamı |
| `commission_rate` | DECIMAL(5,2) | Uygulanan oran |
| `commission_amount` | DECIMAL(10,2) | Platform komisyonu |
| `seller_amount` | DECIMAL(10,2) | Satıcıya gidecek tutar |
| `platform_amount` | DECIMAL(10,2) | Platformda kalacak tutar |
| `status` | ENUM | pending, calculated, paid_to_seller, refunded, cancelled |
| `paid_at` | TIMESTAMP | Ödeme tarihi |
| `payment_method` | VARCHAR(50) | Ödeme yöntemi |
| `payment_reference` | VARCHAR(100) | Ödeme referansı |
| `payout_id` | UUID | Toplu ödeme ID |
| `calculated_at` | TIMESTAMP | Hesaplama zamanı |
| `refunded_at` | TIMESTAMP | İade zamanı |
| `refund_amount` | DECIMAL(10,2) | İade tutarı |

**Indexes:**
- `order_id` (unique)
- `store_id`
- `status`
- `payout_id`
- `calculated_at`
- `paid_at`

---

## 🔄 İş Akışı

### 1. Sipariş Oluşturulduğunda

```javascript
// Order Service → createOrder()
1. Sipariş oluştur ve kaydet
2. Commission Service'i çağır
3. Komisyon hesapla:
   - Settings'den aktif oranı al
   - commission_amount = order_total * (rate / 100)
   - seller_amount = order_total - commission_amount
4. CommissionTransaction kaydı oluştur
5. Status: 'calculated'
```

**Örnek Hesaplama:**
```
Sipariş Toplamı: ₺1,000
Komisyon Oranı: 15%
────────────────────
Komisyon: ₺150
Satıcıya: ₺850
Platforma: ₺150
```

### 2. İade Durumunda

```javascript
// Return Service → processRefund()
1. CommissionTransaction bul
2. markAsRefunded() çağır
3. Tutarları güncelle veya sıfırla
4. Status: 'refunded'
```

---

## 📡 API Endpoints

### Vendor/Seller Endpoints

#### GET `/api/v1/commissions/store/:storeId`
Mağazanın komisyon işlemlerini listele

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (optional)
- `startDate` (optional)
- `endDate` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "order_id": "uuid",
      "order_total": "1000.00",
      "commission_rate": "15.00",
      "commission_amount": "150.00",
      "seller_amount": "850.00",
      "status": "calculated",
      "calculated_at": "2024-10-23T10:00:00Z",
      "order": {
        "order_number": "ORD-2024-00123",
        "status": "delivered"
      }
    }
  ],
  "pagination": {
    "total": 47,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

#### GET `/api/v1/commissions/store/:storeId/summary`
Mağazanın komisyon özeti

**Query Params:**
- `startDate` (required)
- `endDate` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_sales": "50000.00",
    "total_commission": "7500.00",
    "total_seller_amount": "42500.00",
    "transaction_count": 47,
    "average_commission_rate": "15.00"
  }
}
```

#### GET `/api/v1/commissions/order/:id`
Belirli bir siparişin komisyon bilgisi

---

### Admin Endpoints

#### GET `/api/v1/commissions/admin/all`
Tüm komisyon işlemleri

**Query Params:**
- `page`, `limit`, `status`, `storeId`, `startDate`, `endDate`

#### GET `/api/v1/commissions/admin/summary`
Platform komisyon özeti

**Query Params:**
- `startDate` (required)
- `endDate` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_sales": "125450.00",
    "total_commission": "18817.50",
    "total_paid_to_sellers": "85590.00",
    "pending_payments": "21042.50",
    "transaction_count": 153,
    "unique_stores": 12
  }
}
```

#### POST `/api/v1/commissions/admin/settings`
Komisyon ayarlarını oluştur/güncelle

**Body:**
```json
{
  "store_id": null,
  "commission_type": "percentage",
  "default_rate": 15.00,
  "min_commission": 5.00,
  "max_commission": null,
  "is_active": true,
  "notes": "Global settings"
}
```

#### GET `/api/v1/commissions/admin/settings/:storeId?`
Komisyon ayarlarını görüntüle

#### PATCH `/api/v1/commissions/admin/:id/paid`
Komisyonu ödendi olarak işaretle

**Body:**
```json
{
  "payment_method": "bank_transfer",
  "payment_reference": "TXN-2024-00123",
  "payout_id": "uuid"
}
```

#### POST `/api/v1/commissions/admin/initialize`
Varsayılan ayarları oluştur

---

## 💻 Backend Kod Kullanımı

### Commission Service Metodları

```javascript
const commissionService = require('./services/commission.service');

// Komisyon hesapla
const calculation = await commissionService.calculateCommission(order);

// Transaction oluştur
const transaction = await commissionService.createCommissionTransaction(orderId);

// Mağaza özetini al
const summary = await commissionService.getStoreSummary(
  storeId,
  startDate,
  endDate
);

// Platform özetini al
const platformSummary = await commissionService.getPlatformSummary(
  startDate,
  endDate
);

// İade işle
await commissionService.handleOrderRefund(orderId, refundAmount);

// Ödendi işaretle
await commissionService.markAsPaid(transactionId, {
  payment_method: 'bank_transfer',
  payment_reference: 'REF-123',
  payout_id: 'uuid'
});
```

### Model Metodları

```javascript
// CommissionSettings
const settings = await CommissionSettings.getActiveSettings(storeId);
const commission = settings.calculateCommission(1000);
const isValid = settings.isValid();

// CommissionTransaction
const summary = await CommissionTransaction.getStoreSummary(
  storeId, startDate, endDate
);
const breakdown = transaction.getBreakdown();
await transaction.markAsPaid('bank_transfer', 'REF-123', 'payout-uuid');
await transaction.markAsRefunded(500);
```

---

## 🎯 Komisyon Tipleri

### 1. Percentage (Yüzde Bazlı) ✅ AKTIF
```
default_rate: 15.00
order_total: 1000
commission = 1000 * 0.15 = 150
```

### 2. Fixed (Sabit Tutar) 🔜 GELECEKİN
```
default_rate: 50.00
commission = 50 (sipariş tutarından bağımsız)
```

### 3. Tiered (Kademeli) 🔜 GELECEKİN
```
0-1000₺    → %20
1000-5000₺ → %15
5000+₺     → %10
```

### 4. Category Based (Kategori Bazlı) 🔜 GELECEKİN
```
El Yapımı → %10
Cam Sanatı → %15
Ahşap → %12
```

---

## 🔐 Güvenlik

1. **Yetkilendirme**: Sadece seller ve admin rolü erişebilir
2. **Store Verification**: Satıcı sadece kendi mağazasının verilerini görebilir
3. **Validation**: Joi ile tüm input'lar doğrulanır
4. **Transaction Safety**: Database transaction kullanılır
5. **Audit Trail**: Tüm değişiklikler timestamp'lenir

---

## 📊 Raporlama

### Vendor Dashboard İçin

```javascript
// Bu ayki kazançlar
const summary = await commissionService.getStoreSummary(
  storeId,
  new Date(2024, 9, 1),  // Ekim 1
  new Date(2024, 9, 31)  // Ekim 31
);

console.log(`Bu Ay Satışlar: ₺${summary.total_sales}`);
console.log(`Komisyon: -₺${summary.total_commission}`);
console.log(`Net Kazanç: ₺${summary.total_seller_amount}`);
```

### Admin Dashboard İçin

```javascript
// Platform özeti
const platformSummary = await commissionService.getPlatformSummary(
  startDate,
  endDate
);

console.log(`Toplam Satış: ₺${platformSummary.total_sales}`);
console.log(`Toplam Komisyon: ₺${platformSummary.total_commission}`);
console.log(`Bekleyen Ödemeler: ₺${platformSummary.pending_payments}`);
console.log(`Aktif Mağaza: ${platformSummary.unique_stores}`);
```

---

## 🧪 Test Senaryoları

### 1. Yeni Sipariş Oluşturma
```bash
POST /api/v1/orders
# Beklenen: Commission transaction otomatik oluşturulmalı
# Status: 'calculated'
```

### 2. Komisyon Sorgulama (Vendor)
```bash
GET /api/v1/commissions/store/{storeId}
# Beklenen: Mağazanın tüm komisyon kayıtları
```

### 3. Komisyon Ayarı Güncelleme (Admin)
```bash
POST /api/v1/commissions/admin/settings
{
  "default_rate": 20.00
}
# Beklenen: Yeni siparişlerde %20 uygulanmalı
```

### 4. İade İşlemi
```bash
POST /api/v1/returns
# İade onaylandıktan sonra
# Beklenen: Commission status 'refunded', tutarlar sıfırlanmalı
```

---

## 📝 Sonraki Adımlar (Faz 2)

### Backend:
- [ ] Seller Payouts modeli (aylık ödeme sistemi)
- [ ] Ödeme entegrasyonu (Stripe/PayPal)
- [ ] Email bildirimleri
- [ ] Kademeli komisyon (tiered) desteği
- [ ] Kategori bazlı komisyon desteği

### Frontend:
- [ ] Admin komisyon dashboard'u
- [ ] Vendor kazanç dashboard'u
- [ ] Komisyon raporları UI
- [ ] Ödeme talep sistemi
- [ ] Grafikler ve analizler

---

## 🚀 Kurulum

1. **Migration çalıştır:**
```bash
node backend/src/scripts/create-commission-tables.js
```

2. **Backend'i yeniden başlat:**
```bash
cd backend
npm run dev
```

3. **Varsayılan ayarları kontrol et:**
```bash
# Otomatik oluşturuldu: 15% global komisyon
# Admin panelden değiştirilebilir
```

---

## 📚 Dosya Yapısı

```
backend/src/
├── models/
│   ├── CommissionSettings.js
│   └── CommissionTransaction.js
├── services/
│   └── commission.service.js
├── controllers/
│   └── commission.controller.js
├── routes/
│   └── commission.routes.js
├── validators/
│   └── commission.validator.js
└── scripts/
    └── create-commission-tables.js
```

---

**Son Güncelleme**: 2025-10-23  
**Durum**: ✅ Faz 1 Tamamlandı (Backend %100)  
**Yapan**: AI Assistant (Claude Sonnet 4.5)











