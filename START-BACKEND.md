# 🚀 BACKEND NASIL BAŞLATILIR

## ⚠️ ÖNEMLİ: Backend klasörüne gir!

### Adım 1: Backend klasörüne git
```powershell
cd backend
```

### Adım 2: Backend'i başlat
```powershell
npm run dev
```

VEYA

```powershell
node src/server.js
```

---

## 🔧 SORUN GİDERME

### Hata: "Cannot find module 'C:\Users\LENOVO\Desktop\dostanwebcss41.2\src\server.js'"

**Sebep:** ROOT dizindesin, backend klasörüne girmedin!

**Çözüm:**
```powershell
cd backend
npm run dev
```

### Hata: "ENOENT: no such file or directory .env"

**Sebep:** `.env` dosyası eksik

**Çözüm:** Backend klasöründe `.env` dosyası oluştur:
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dostan_marketplace
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=test-secret-minimum-32-characters-long-key
SESSION_SECRET=session-secret-key
SHIPPING_PERSIST=true
```

---

## ✅ DOĞRU BAŞLATMA

### Terminal konum kontrolü:
```powershell
# Şu anda neredesin?
pwd

# Çıktı şöyle olmalı:
# C:\Users\LENOVO\Desktop\dostanwebcss41.2\backend
```

### Backend başlat:
```powershell
npm run dev
```

### Başarılı çıktı:
```
🚀 Starting Dostan Marketplace Backend...
📊 Testing database connection...
✅ Database: Connection successful
🔴 Testing Redis connection...
✅ Redis: Connection successful
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Server running on port 3001
🌍 Environment: development
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🧪 TEST ÇALIŞTIRMA

Backend başladıktan sonra (başka bir terminal'de):

```powershell
cd backend
node src/scripts/test-full-flow-with-campaigns.js
```

---

## 📍 ÖNEMLİ NOTLAR

1. **Her zaman `backend/` klasöründe ol!**
2. PostgreSQL çalışıyor olmalı
3. Redis çalışıyor olmalı (opsiyonel, yoksa devam eder)
4. `.env` dosyası olmalı

---

## 🎯 HIZLI BAŞLATMA

```powershell
# 1. Backend klasörüne git
cd C:\Users\LENOVO\Desktop\dostanwebcss41.2\backend

# 2. Backend'i başlat
npm run dev
```

✅ Backend hazır!




