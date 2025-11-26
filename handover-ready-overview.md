# 📘 Proje Devir Teslim Özeti

**Proje:** Dostan Marketplace
**Tarih:** 21.11.2025
**Versiyon:** 1.0.0

---

## 1. 🏗️ Sistem Mimarisi ve Genel Bakış

Proje, Node.js/Express backend ve Vanilla JavaScript frontend'den oluşan, monorepo yapısında kurgulanmış bir **Monolitik Web Uygulamasıdır**.

### **Üst Düzey Mimari**
```mermaid
graph TD
    Client[Tarayıcı (Vanilla JS)] -->|REST API| LB[Yük Dengeleyici / Nginx]
    LB --> Server[Node.js Express Sunucusu]
    Server -->|ORM| DB[(PostgreSQL)]
    Server -->|Önbellek/Oturum| Redis[(Redis)]
    Server -->|Kuyruklar| Workers[Arka Plan İşçileri (BullMQ)]
    Server -->|Dosya Sistemi| Storage[Yerel Yüklemeler]
```

### **Temel Modüller**
1.  **Backend (`/backend`)**:
    *   **Çatı (Framework)**: Express.js
    *   **Veritabanı**: PostgreSQL (Sequelize ORM aracılığıyla)
    *   **Önbellek**: Redis (`ioredis` aracılığıyla)
    *   **İş Kuyruğu**: BullMQ (arka plan işleri için)
    *   **Kimlik Doğrulama**: JWT (Erişim + Yenileme Tokenları)
    *   **Doğrulama**: Joi
    *   **Loglama**: Winston

2.  **Frontend (`/assets`, `/pages`)**:
    *   **Çatı**: Vanilla JavaScript (ES6+)
    *   **Stil**: CSS Değişkenleri, Flexbox/Grid (Ön işlemci yok)
    *   **Durum Yönetimi**: `localStorage` + Özel Olay Yöneticisi (Event Bus)
    *   **API İstemcisi**: `fetch` etrafında sarılmış özel `ApiClient`

### **Modül Etkileşimi**
*   **Frontend-Backend**: Frontend, backend ile RESTful bir API (`/api/v1`) üzerinden haberleşir.
*   **Kimlik Doğrulama**: Frontend, JWT tokenlarını `localStorage` içinde saklar ve isteklerin `Authorization` başlığına ekler.
*   **Veri Akışı**: Controller istekleri alır -> Servisler iş mantığını yürütür -> Modeller veritabanı ile etkileşime girer.

---

## 2. 🔌 3. Parti Entegrasyonlar ve Servisler

**⚠️ Kritik Not:** Çoğu dış entegrasyon şu anda **MOCK (Taklit)** veya jenerik durumdadır. Burası canlıya geçiş için öncelikli alandır.

| Servis Kategorisi | Mevcut Uygulama | Durum | Göç/Tedarikçi Riski |
| :--- | :--- | :--- | :--- |
| **Ödeme** | `PaymentService` (Jenerik) | **MOCK** | Yüksek. Tüm isteklere `succeeded` döner. Stripe/Iyzico entegrasyonu şart. |
| **Kargo** | `ShippingService` (MockExpress) | **MOCK** | Yüksek. Sahte takip numaraları üretir. Yurtiçi/Aras/UPS vb. entegrasyonu şart. |
| **E-posta/Bildirim** | `NotificationService` | **TASLAK** | Orta. Konsola log basar. SendGrid/AWS SES entegrasyonu gerekir. |
| **Depolama** | Yerel Dosya Sistemi (`/uploads`) | **YEREL** | Orta. Çoklu sunucu kurulumunda ölçeklenmez. AWS S3 veya benzerine geçilmeli. |
| **Veritabanı** | PostgreSQL | **AKTİF** | Düşük. Standart SQL. |
| **Önbellek** | Redis | **AKTİF** | Düşük. Standart Anahtar-Değer deposu. |

### **Gerekli Ortam Değişkenleri**
*   **Veritabanı**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
*   **Redis**: `REDIS_HOST`, `REDIS_PORT`
*   **JWT**: `JWT_SECRET`, `JWT_REFRESH_SECRET`
*   **Uygulama**: `PORT`, `NODE_ENV`, `ALLOWED_ORIGINS`

---

## 3. 🛡️ Güvenlik ve Açık Denetimi

### **Bulgular**

1.  **⚠️ İçerik Güvenlik Politikası (CSP)**:
    *   **Sorun**: `helmet`, script ve stiller için `'unsafe-inline'` (güvensiz satır içi) izniyle yapılandırılmış.
    *   **Risk**: Yüksek. Siteler Arası Komut Dosyası Çalıştırma (XSS) saldırılarına karşı savunmasızlık yaratır.
    *   **Konum**: `backend/src/app.js`

2.  **⚠️ CORS Yapılandırması**:
    *   **Sorun**: `development` modunda CORS **tüm** kaynaklara (origin) izin veriyor.
    *   **Risk**: Orta. Eğer `NODE_ENV=development` ile canlıya alınırsa API herkese açık hale gelir.
    *   **Konum**: `backend/src/app.js`

3.  **⚠️ Kod İçinde Unutulan/Zayıf Şifreler**:
    *   **Sorun**: `.env.example` dosyasında yer tutucu şifreler var.
    *   **Risk**: Düşük (kullanılmadığı sürece), ancak geliştiriciler bunları canlı ortamda kopyala-yapıştır yapabilir.
    *   **Öneri**: Canlı ortam şifrelerinin kriptografik olarak güvenli (min 64 karakter) oluşturulduğundan emin olun.

4.  **⚠️ Yerel Dosya Depolama**:
    *   **Sorun**: Yüklemeler yerel diskte tutuluyor ve `express.static` ile sunuluyor.
    *   **Risk**: Orta. Sıkı doğrulama yapılmazsa "Dosya Yükleme" saldırılarına (örn. çalıştırılabilir dosya yükleme) açık olabilir.
    *   **İyileştirme**: `upload.service.js` dosyası görselleri yeniden işlemek için `sharp` kullanıyor (bu iyi!), bu işlem zararlı yükleri temizler.

5.  **⚠️ Hız Sınırlama (Rate Limiting)**:
    *   **Durum**: **Uygulandı**. `express-rate-limit` küresel olarak aktif.
    *   **Not**: Canlı ortamda hız sınırlama için Redis deposunun kullanıldığından emin olun (yapılandırılmazsa bellek deposu kullanılır).

### **Somut Çözümler**
*   **Çözüm 1 (CSP)**: Satır içi script/stilleri harici dosyalara taşıyın veya bir `nonce` sistemi kullanın. `'unsafe-inline'`ı kaldırın.
*   **Çözüm 2 (CORS)**: Canlı ortam değişkenlerinde `ALLOWED_ORIGINS` değerini kesin olarak tanımlayın.
*   **Çözüm 3 (Şifreler)**: Canlıya geçmeden önce tüm JWT anahtarlarını (secret) yenileyin.
*   **Çözüm 4 (Yüklemeler)**: S3 uyumlu bir depolama alanına geçin ve dosyaları uygulama sunucusu yerine CDN üzerinden sunun.

---

## 4. 🚀 İşe Başlama (Onboarding) ve Kurulum

### **Gereksinimler**
*   **Node.js**: v18+
*   **PostgreSQL**: v14+
*   **Redis**: v6+
*   **Git**

### **Kurulum Adımları**

1.  **Klonla ve Yükle**:
    ```bash
    git clone <repo_url>
    cd backend
    npm install
    ```

2.  **Ortam Kurulumu**:
    ```bash
    cp .env.example .env
    # .env dosyasını yerel DB/Redis bilgilerinizle düzenleyin
    ```

3.  **Veritabanı Başlatma**:
    ```bash
    # Önce Postgres'te veritabanını manuel oluşturun (örn: 'dostan_marketplace_dev')
    npm run migrate  # Sequelize migrasyonlarını çalıştır
    npm run seed     # Başlangıç verilerini yükle
    ```

4.  **Geliştirmeyi Başlat**:
    ```bash
    npm run dev      # Backend'i 3001 portunda (varsayılan) başlatır
    ```

5.  **Frontend Erişimi**:
    *   `index.html` dosyasını tarayıcınızda açın (veya VS Code Live Server eklentisini kullanın).
    *   `assets/js/api-config.js` dosyasının yerel backend'inizi işaret ettiğinden emin olun.

### **Dağıtım (Deployment) Hattı**
*   **Mevcut Durum**: Manuel. Herhangi bir CI/CD yapılandırması (GitHub Actions/GitLab CI) mevcut değil.
*   **Altyapı**: `npm start` komutunu çalıştırabileceğiniz bir VPS veya PaaS (Railway/Heroku gibi) varsayılır.
*   **Süreç**:
    1.  Sunucuyu Hazırla (Node, Postgres, Redis).
    2.  Kodu Çek (Pull).
    3.  `npm install --production`.
    4.  `npm run migrate`.
    5.  Süreci PM2 veya benzeri bir süreç yöneticisi ile başlat.

---

## 5. 🗺️ Sonraki Adımlar ve Yol Haritası

### **🔥 Acil Öncelikler (Ölçeklenmeden Önce Düzeltilmeli)**
1.  **Gerçek Ödeme Sistemi**: `PaymentService` mock yapısını gerçek bir sağlayıcı (Stripe/Iyzico) ile değiştirin. **Gelir elde etmek için kritiktir.**
2.  **Depolamayı Dışarı Taşıma**: Dosya yüklemelerini AWS S3 veya Cloudinary'ye taşıyın. İkinci bir sunucu eklerseniz yerel depolama sistemi bozulur.
3.  **Güvenli Başlıklar**: CSP kurallarını sıkılaştırın ve `'unsafe-inline'` kullanımını kaldırın.
4.  **CI/CD Kurulumu**: Otomatik test ve dağıtım için bir GitHub Actions iş akışı oluşturun.

### **📅 Kısa Vadeli İyileştirmeler (1-2 Ay)**
*   **E-posta Entegrasyonu**: Sipariş onayları ve şifre sıfırlama için `NotificationService`i gerçek bir sağlayıcı (SendGrid/Postmark) ile entegre edin.
*   **İzleme (Monitoring)**: Hata takibi için New Relic veya Sentry gibi bir APM (Uygulama Performans İzleme) aracı ekleyin.
*   **Dockerizasyon**: Tutarlı geliştirme/canlı ortamları için `Dockerfile` ve `docker-compose.yml` oluşturun.

### **🔭 Orta/Uzun Vadeli Vizyon (3-6 Ay)**
*   **Frontend Çatısı**: Uygulama büyüdükçe daha iyi durum yönetimi ve bileşen tekrarı için Vanilla JS frontend'i React/Next.js'e geçirmeyi düşünün.
*   **Arama Motoru**: Daha iyi ürün arama yetenekleri için Elasticsearch veya Meilisearch uygulayın (Postgres `ILIKE` ölçeklendiğinde yavaş kalacaktır).
*   **Mikroservisler**: Ekip büyürse, `Bildirim` ve `Görüntü İşleme` modüllerini ayrı işçi (worker) servislerine bölmeyi düşünün.
