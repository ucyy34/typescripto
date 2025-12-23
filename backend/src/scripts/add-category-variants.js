/**
 * Add Category Variants Script
 * Inserts variant definitions for each category into the database
 * 
 * Usage: node backend/src/scripts/add-category-variants.js
 */

const { sequelize } = require('../config/sequelize');
const CategoryVariant = require('../models/CategoryVariant');
const Category = require('../models/Category');

const CATEGORY_VARIANTS = {
    // Ceramics (Seramik)
    'Ceramics': [
        {
            name: 'Boyut',
            type: 'text',
            is_required: true,
            sort_order: 1,
            options: [
                { label: 'Küçük', value: 'kucuk' },
                { label: 'Orta', value: 'orta' },
                { label: 'Büyük', value: 'buyuk' },
                { label: 'XL', value: 'xl' }
            ]
        },
        {
            name: 'Renk',
            type: 'color',
            is_required: false,
            sort_order: 2,
            options: [
                { label: 'Beyaz', value: '#FFFFFF' },
                { label: 'Krem', value: '#F5F5DC' },
                { label: 'Mavi', value: '#4169E1' },
                { label: 'Yeşil', value: '#228B22' },
                { label: 'Toprak', value: '#8B4513' }
            ]
        },
        {
            name: 'Kullanım Alanı',
            type: 'text',
            is_required: false,
            sort_order: 3,
            options: [
                { label: 'Dekoratif', value: 'dekoratif' },
                { label: 'Mutfak', value: 'mutfak' },
                { label: 'Bahçe', value: 'bahce' },
                { label: 'Masa Üstü', value: 'masa-ustu' }
            ]
        }
    ],

    // Glass Art (Cam Sanatı)
    'Glass Art': [
        {
            name: 'Boyut',
            type: 'text',
            is_required: true,
            sort_order: 1,
            options: [
                { label: 'Mini (5-10cm)', value: 'mini' },
                { label: 'Küçük (10-20cm)', value: 'kucuk' },
                { label: 'Orta (20-35cm)', value: 'orta' },
                { label: 'Büyük (35cm+)', value: 'buyuk' }
            ]
        },
        {
            name: 'Renk',
            type: 'color',
            is_required: false,
            sort_order: 2,
            options: [
                { label: 'Şeffaf', value: '#E0FFFF' },
                { label: 'Mavi', value: '#00BFFF' },
                { label: 'Yeşil', value: '#00FA9A' },
                { label: 'Amber', value: '#FFBF00' },
                { label: 'Mor', value: '#9400D3' }
            ]
        },
        {
            name: 'Teknik',
            type: 'text',
            is_required: false,
            sort_order: 3,
            options: [
                { label: 'Üfleme', value: 'ufleme' },
                { label: 'Füzyon', value: 'fuzyon' },
                { label: 'Vitray', value: 'vitray' },
                { label: 'Kesme', value: 'kesme' }
            ]
        }
    ],

    // Leather Goods (Deri Ürünler)
    'Leather Goods': [
        {
            name: 'Renk',
            type: 'color',
            is_required: true,
            sort_order: 1,
            options: [
                { label: 'Siyah', value: '#000000' },
                { label: 'Kahve', value: '#8B4513' },
                { label: 'Taba', value: '#D2691E' },
                { label: 'Bordo', value: '#800020' },
                { label: 'Lacivert', value: '#000080' }
            ]
        },
        {
            name: 'Boyut',
            type: 'text',
            is_required: false,
            sort_order: 2,
            options: [
                { label: 'S', value: 's' },
                { label: 'M', value: 'm' },
                { label: 'L', value: 'l' },
                { label: 'XL', value: 'xl' }
            ]
        },
        {
            name: 'Deri Tipi',
            type: 'text',
            is_required: false,
            sort_order: 3,
            options: [
                { label: 'Hakiki Deri', value: 'hakiki' },
                { label: 'Suni Deri', value: 'suni' },
                { label: 'Nubuk', value: 'nubuk' },
                { label: 'Süet', value: 'suet' }
            ]
        }
    ],

    // Textiles (Tekstil)
    'Textiles': [
        {
            name: 'Boyut',
            type: 'text',
            is_required: true,
            sort_order: 1,
            options: [
                { label: '50x50cm', value: '50x50' },
                { label: '100x100cm', value: '100x100' },
                { label: '150x200cm', value: '150x200' },
                { label: '200x300cm', value: '200x300' }
            ]
        },
        {
            name: 'Renk',
            type: 'color',
            is_required: false,
            sort_order: 2,
            options: [
                { label: 'Beyaz', value: '#FFFFFF' },
                { label: 'Krem', value: '#FFFDD0' },
                { label: 'Gri', value: '#808080' },
                { label: 'Lacivert', value: '#000080' },
                { label: 'Bordo', value: '#800000' }
            ]
        },
        {
            name: 'Malzeme',
            type: 'text',
            is_required: false,
            sort_order: 3,
            options: [
                { label: 'Pamuk', value: 'pamuk' },
                { label: 'Yün', value: 'yun' },
                { label: 'İpek', value: 'ipek' },
                { label: 'Keten', value: 'keten' },
                { label: 'Karışım', value: 'karisim' }
            ]
        },
        {
            name: 'Desen',
            type: 'text',
            is_required: false,
            sort_order: 4,
            options: [
                { label: 'Düz', value: 'duz' },
                { label: 'Çizgili', value: 'cizgili' },
                { label: 'Geometrik', value: 'geometrik' },
                { label: 'Geleneksel', value: 'geleneksel' },
                { label: 'Modern', value: 'modern' }
            ]
        }
    ],

    // Wood Carvings (Ahşap Oyma)
    'Wood Carvings': [
        {
            name: 'Boyut',
            type: 'text',
            is_required: true,
            sort_order: 1,
            options: [
                { label: 'Küçük (0-15cm)', value: 'kucuk' },
                { label: 'Orta (15-30cm)', value: 'orta' },
                { label: 'Büyük (30-50cm)', value: 'buyuk' },
                { label: 'Dev (50cm+)', value: 'dev' }
            ]
        },
        {
            name: 'Ahşap Türü',
            type: 'text',
            is_required: false,
            sort_order: 2,
            options: [
                { label: 'Ceviz', value: 'ceviz' },
                { label: 'Meşe', value: 'mese' },
                { label: 'Kayın', value: 'kayin' },
                { label: 'Çam', value: 'cam' },
                { label: 'Zeytin', value: 'zeytin' }
            ]
        },
        {
            name: 'Finish',
            type: 'text',
            is_required: false,
            sort_order: 3,
            options: [
                { label: 'Doğal', value: 'dogal' },
                { label: 'Cilalı', value: 'cilali' },
                { label: 'Boyalı', value: 'boyali' },
                { label: 'Antik', value: 'antik' }
            ]
        }
    ],

    // Siftah Test Kategorisi
    'Siftah Test Kategorisi': [
        {
            name: 'Test Boyut',
            type: 'text',
            is_required: false,
            sort_order: 1,
            options: [
                { label: 'A', value: 'a' },
                { label: 'B', value: 'b' },
                { label: 'C', value: 'c' }
            ]
        }
    ]
};

async function addCategoryVariants() {
    try {
        console.log('🚀 Starting category variants insertion...\n');

        // Load models relationship
        require('../models');

        // Get all categories
        const categories = await Category.findAll();
        console.log(`📦 Found ${categories.length} categories\n`);

        let totalInserted = 0;
        let totalSkipped = 0;

        for (const category of categories) {
            const variants = CATEGORY_VARIANTS[category.name];

            if (!variants) {
                console.log(`⚠️  No variants defined for category: ${category.name}`);
                continue;
            }

            console.log(`\n📂 Processing: ${category.name}`);

            for (const variant of variants) {
                try {
                    // Check if variant already exists
                    const existing = await CategoryVariant.findOne({
                        where: {
                            category_id: category.id,
                            name: variant.name
                        }
                    });

                    if (existing) {
                        console.log(`   ⏭️  Skipping "${variant.name}" (already exists)`);
                        totalSkipped++;
                        continue;
                    }

                    // Insert new variant
                    await CategoryVariant.create({
                        category_id: category.id,
                        name: variant.name,
                        type: variant.type,
                        options: variant.options,
                        is_required: variant.is_required,
                        sort_order: variant.sort_order
                    });

                    console.log(`   ✅ Added "${variant.name}" (${variant.options.length} options)`);
                    totalInserted++;

                } catch (error) {
                    console.error(`   ❌ Error adding "${variant.name}":`, error.message);
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✨ Complete!`);
        console.log(`   📥 Inserted: ${totalInserted} variants`);
        console.log(`   ⏭️  Skipped: ${totalSkipped} variants (already existed)`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

// Run the script
addCategoryVariants();
