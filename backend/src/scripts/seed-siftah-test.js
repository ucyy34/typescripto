/**
 * Siftah Test Seed Script
 * Creates test data specifically for testing the siftah recommendation system
 * 
 * Test Senaryoları:
 * - Store A: Bugün satış yapmış (siftah tamamlanmış)
 * - Store B: Bugün satış yapmamış (siftah önerisi için aday)
 * - Store C: Bugün satış yapmamış (siftah önerisi için aday)
 * - Farklı rating, fiyat ve kategorilerde ürünler
 * - Ürün varyantları
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { sequelize } = require('../config/sequelize');
const {
    User,
    Store,
    Product,
    Category,
    Order,
    OrderItem,
    ProductVariant,
    CategoryVariant,
    StoreDailySales
} = require('../models');
const bcrypt = require('bcrypt');
const { getTurkeyBusinessDateString } = require('../utils/dateUtils');

async function seedSiftahTestData() {
    console.log('\n🌟 Siftah Test Verisi Yükleniyor...\n');
    console.log('📅 Bugün (TR): ' + getTurkeyBusinessDateString());
    console.log('─'.repeat(50));

    try {
        // 1. Admin kullanıcısı bul veya oluştur
        let admin = await User.findOne({ where: { role: 'admin' } });
        if (!admin) {
            const hashedPassword = await bcrypt.hash('Admin@123456', 12);
            admin = await User.create({
                email: 'admin@siftah.test',
                password_hash: hashedPassword,
                first_name: 'Admin',
                last_name: 'Test',
                role: 'admin',
                is_verified: true,
                is_active: true
            });
            console.log('✅ Admin oluşturuldu: admin@siftah.test');
        }

        // 2. Test Kategorisi oluştur
        let category = await Category.findOne({ where: { slug: 'siftah-test-category' } });
        if (!category) {
            category = await Category.create({
                name: 'Siftah Test Kategorisi',
                slug: 'siftah-test-category',
                description: 'Siftah testi için oluşturulmuş kategori',
                is_active: true
            });
            console.log('✅ Kategori oluşturuldu: ' + category.name);
        }

        // 3. Test Mağazaları ve Satıcıları Oluştur
        const storesData = [
            {
                name: 'Siftah Yapmış Mağaza (Store A)',
                slug: 'siftah-store-a',
                email: 'storea@test.com',
                hasSiftah: true, // Bu mağaza bugün satış yaptı
                seller: { email: 'sellera@siftah.test', first_name: 'Ali', last_name: 'Yılmaz' }
            },
            {
                name: 'Siftah Yapmamış Mağaza (Store B)',
                slug: 'siftah-store-b',
                email: 'storeb@test.com',
                hasSiftah: false, // Bu mağaza bugün satış yapmadı - ÖNERİ ADAYI
                seller: { email: 'sellerb@siftah.test', first_name: 'Ayşe', last_name: 'Demir' }
            },
            {
                name: 'Siftah Yapmamış Mağaza (Store C)',
                slug: 'siftah-store-c',
                email: 'storec@test.com',
                hasSiftah: false, // Bu mağaza bugün satış yapmadı - ÖNERİ ADAYI
                seller: { email: 'sellerc@siftah.test', first_name: 'Mehmet', last_name: 'Kaya' }
            }
        ];

        const createdStores = [];

        for (const storeData of storesData) {
            // Seller oluştur
            let seller = await User.findOne({ where: { email: storeData.seller.email } });
            if (!seller) {
                const hashedPassword = await bcrypt.hash('Seller123!', 12);
                seller = await User.create({
                    email: storeData.seller.email,
                    password_hash: hashedPassword,
                    first_name: storeData.seller.first_name,
                    last_name: storeData.seller.last_name,
                    role: 'seller',
                    is_verified: true,
                    is_active: true
                });
            }

            // Store oluştur
            let store = await Store.findOne({ where: { slug: storeData.slug } });
            if (!store) {
                store = await Store.create({
                    name: storeData.name,
                    slug: storeData.slug,
                    description: storeData.hasSiftah ? 'Bugün satış yapmış test mağazası' : 'Bugün henüz satış yapmamış test mağazası',
                    email: storeData.email,
                    phone: '+90 555 123 4567',
                    user_id: seller.id,
                    status: 'approved',
                    rating: 4.5,
                    approved_at: new Date(),
                    approved_by: admin.id
                });
                console.log(`✅ Mağaza oluşturuldu: ${store.name}`);
            }

            createdStores.push({ store, hasSiftah: storeData.hasSiftah });

            // Siftah durumunu ayarla
            if (storeData.hasSiftah) {
                const today = getTurkeyBusinessDateString();
                await StoreDailySales.findOrCreate({
                    where: { store_id: store.id, sale_date: today },
                    defaults: {
                        successful_order_count: 3,
                        first_order_at: new Date(),
                        last_order_at: new Date()
                    }
                });
                console.log(`   📊 ${store.name} -> Siftah YAPMIŞ (3 satış)`);
            } else {
                // Siftah yapmamışı simüle et - kayıt yok veya count=0
                const today = getTurkeyBusinessDateString();
                await StoreDailySales.destroy({ where: { store_id: store.id, sale_date: today } });
                console.log(`   📊 ${store.name} -> Siftah YAPMAMIS`);
            }
        }

        // 4. Ürünler Oluştur (Her mağaza için rating ve fiyat varyasyonlarıyla)
        console.log('\n📦 Ürünler oluşturuluyor...');

        const productsData = [
            // Store A ürünleri (siftah yapmış - bu mağazanın ürünlerinden birine bakarken öneri alınır)
            {
                storeIndex: 0,
                products: [
                    { title: 'Siftah A - Test Ürün 1', price: 100, rating: 4.5, stock: 10 },
                    { title: 'Siftah A - Test Ürün 2', price: 150, rating: 4.0, stock: 5 }
                ]
            },
            // Store B ürünleri (siftah yapmamış - bu mağazadan öneri gelebilir)
            {
                storeIndex: 1,
                products: [
                    { title: 'Siftah B - Yüksek Rating Ürün', price: 90, rating: 4.8, stock: 15 },  // En iyi aday
                    { title: 'Siftah B - Düşük Rating Ürün', price: 80, rating: 3.0, stock: 20 },  // Rating < 3.5, önerilmez
                    { title: 'Siftah B - Pahalı Ürün', price: 200, rating: 4.5, stock: 8 }         // %50'den fazla pahalı
                ]
            },
            // Store C ürünleri (siftah yapmamış - bu mağazadan da öneri gelebilir)
            {
                storeIndex: 2,
                products: [
                    { title: 'Siftah C - Orta Rating Ürün', price: 95, rating: 4.2, stock: 12 },
                    { title: 'Siftah C - Stoksuz Ürün', price: 85, rating: 4.6, stock: 0 },        // Stok yok, önerilmez
                    { title: 'Siftah C - Ucuz Ürün', price: 70, rating: 3.8, stock: 25 }
                ]
            }
        ];

        const createdProducts = [];

        for (const storeProducts of productsData) {
            const { store } = createdStores[storeProducts.storeIndex];

            for (const productData of storeProducts.products) {
                const slug = productData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                let product = await Product.findOne({ where: { slug } });
                if (!product) {
                    product = await Product.create({
                        store_id: store.id,
                        category_id: category.id,
                        title: productData.title,
                        slug,
                        description: `Test ürünü: ${productData.title}`,
                        short_description: 'Siftah test ürünü',
                        price: productData.price,
                        stock: productData.stock,
                        rating: productData.rating,
                        total_reviews: Math.floor(Math.random() * 50) + 10,
                        images: ['https://picsum.photos/400/300?random=' + Math.floor(Math.random() * 1000)],
                        status: 'approved',
                        is_active: true,
                        approved_at: new Date(),
                        approved_by: admin.id
                    });

                    console.log(`   ✅ ${product.title} (₺${product.price}, ⭐${product.rating}, stok:${product.stock})`);
                    createdProducts.push(product);
                }
            }
        }

        // 5. Varyantlar atlandı (siftah testi için gerekli değil)
        console.log('\\n🎨 Varyant oluşturma atlandı (siftah testi için gerekli değil)');

        // 6. Test Alıcısı Oluştur
        let buyer = await User.findOne({ where: { email: 'buyer@siftah.test' } });
        if (!buyer) {
            const hashedPassword = await bcrypt.hash('Buyer123!', 12);
            buyer = await User.create({
                email: 'buyer@siftah.test',
                password_hash: hashedPassword,
                first_name: 'Test',
                last_name: 'Alıcı',
                role: 'buyer',
                is_verified: true,
                is_active: true
            });
            console.log('\n✅ Alıcı oluşturuldu: buyer@siftah.test');
        }

        // 7. Özet
        console.log('\n' + '═'.repeat(50));
        console.log('📊 SIFTAH TEST VERİSİ ÖZETİ');
        console.log('═'.repeat(50));

        console.log('\n🏪 Mağazalar:');
        for (const { store, hasSiftah } of createdStores) {
            console.log(`   ${hasSiftah ? '✅' : '⏳'} ${store.name} - ${hasSiftah ? 'Siftah YAPMIŞ' : 'Siftah YAPMAMIS'}`);
        }

        console.log('\n📦 Ürünler:');
        const products = await Product.findAll({
            where: { category_id: category.id },
            include: [{ model: Store, as: 'store' }],
            order: [['store_id', 'ASC']]
        });

        for (const p of products) {
            const storeSiftah = createdStores.find(s => s.store.id === p.store_id);
            console.log(`   ₺${p.price} | ⭐${p.rating} | stok:${p.stock} | ${p.title} (${storeSiftah?.hasSiftah ? 'Siftah+' : 'Siftah-'})`);
        }

        console.log('\n🧪 TEST SENARYOLARI:');
        console.log('─'.repeat(50));
        console.log('1. Store A ürününe bak → Store B veya C\'den öneri gelir');
        console.log('   Beklenen: "Siftah B - Yüksek Rating Ürün" (en yüksek rating)');
        console.log('');
        console.log('2. Store B ürününe bak → Siftah yapmamış, öneri GELMEZ');
        console.log('   Beklenen: has_recommendation: false, reason: source_store_no_siftah');
        console.log('');
        console.log('3. Düşük ratingli ürün → Önerilmez (rating < 3.5)');
        console.log('4. Stoksuz ürün → Önerilmez (stock = 0)');
        console.log('5. Çok pahalı ürün → Önerilmez (fiyat > kaynak * 1.5)');

        console.log('\n📝 Test Hesapları:');
        console.log('   Admin  : admin@siftah.test / Admin@123456');
        console.log('   Seller A: sellera@siftah.test / Seller123!');
        console.log('   Seller B: sellerb@siftah.test / Seller123!');
        console.log('   Seller C: sellerc@siftah.test / Seller123!');
        console.log('   Buyer  : buyer@siftah.test / Buyer123!');

        console.log('\n✅ Siftah test verisi başarıyla yüklendi!\n');

    } catch (error) {
        console.error('❌ Hata:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('\n🚀 Siftah Test Seed Başlatılıyor...');
        console.log('Veritabanı:', sequelize.config.database);

        await sequelize.authenticate();
        console.log('✅ Veritabanı bağlantısı başarılı\n');

        await seedSiftahTestData();

        process.exit(0);
    } catch (error) {
        console.error('❌ Kritik hata:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { seedSiftahTestData };
