/**
 * Seed Category Variants
 * Adds common variant types for Nordic marketplace categories
 */

require('dotenv').config();
const { sequelize, Category, CategoryVariant } = require('../models');

async function seedVariants() {
  try {
    console.log('\n🌱 Seeding category variants...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Find categories
    const categories = await Category.findAll({
      where: { is_active: true },
    });

    console.log(`Found ${categories.length} categories\n`);

    // Default variants for ANY category that doesn't have specific mappings
    const defaultVariants = [
      {
        name: 'Beden',
        type: 'text',
        options: [
          { label: 'XS', value: 'xs' },
          { label: 'S', value: 's' },
          { label: 'M', value: 'm' },
          { label: 'L', value: 'l' },
          { label: 'XL', value: 'xl' },
          { label: 'XXL', value: 'xxl' },
        ],
        is_required: false,
        sort_order: 1,
      },
      {
        name: 'Renk',
        type: 'color',
        options: [
          { label: 'Beyaz', value: '#FFFFFF' },
          { label: 'Siyah', value: '#000000' },
          { label: 'Kırmızı', value: '#DC2626' },
          { label: 'Mavi', value: '#2563EB' },
          { label: 'Yeşil', value: '#10B981' },
          { label: 'Sarı', value: '#F59E0B' },
          { label: 'Turuncu', value: '#F97316' },
          { label: 'Mor', value: '#9333EA' },
          { label: 'Gri', value: '#6B7280' },
          { label: 'Kahverengi', value: '#92400E' },
        ],
        is_required: false,
        sort_order: 2,
      },
      {
        name: 'Boyut',
        type: 'text',
        options: [
          { label: 'Küçük', value: 'small' },
          { label: 'Orta', value: 'medium' },
          { label: 'Büyük', value: 'large' },
        ],
        is_required: false,
        sort_order: 3,
      },
    ];

    // Define variant mappings for different category types (case-insensitive matching)
    const variantMappings = {
      // Textiles (Clothing & Fabrics)
      'textiles': [
        {
          name: 'Beden',
          type: 'text',
          options: [
            { label: 'XS', value: 'xs' },
            { label: 'S', value: 's' },
            { label: 'M', value: 'm' },
            { label: 'L', value: 'l' },
            { label: 'XL', value: 'xl' },
            { label: 'XXL', value: 'xxl' },
          ],
          is_required: true,
          sort_order: 1,
        },
        {
          name: 'Renk',
          type: 'color',
          options: [
            { label: 'Beyaz', value: '#FFFFFF' },
            { label: 'Siyah', value: '#000000' },
            { label: 'Kırmızı', value: '#DC2626' },
            { label: 'Mavi', value: '#2563EB' },
            { label: 'Yeşil', value: '#10B981' },
            { label: 'Sarı', value: '#F59E0B' },
            { label: 'Turuncu', value: '#F97316' },
            { label: 'Mor', value: '#9333EA' },
            { label: 'Gri', value: '#6B7280' },
            { label: 'Kahverengi', value: '#92400E' },
          ],
          is_required: false,
          sort_order: 2,
        },
      ],
      // Wood Products
      'wood carvings': [
        {
          name: 'Malzeme',
          type: 'text',
          options: [
            { label: 'Meşe', value: 'oak' },
            { label: 'Çam', value: 'pine' },
            { label: 'Ceviz', value: 'walnut' },
            { label: 'Huş', value: 'birch' },
            { label: 'Göknar', value: 'fir' },
          ],
          is_required: false,
          sort_order: 1,
        },
        {
          name: 'Boyut',
          type: 'text',
          options: [
            { label: 'Küçük (0-20cm)', value: 'small' },
            { label: 'Orta (20-50cm)', value: 'medium' },
            { label: 'Büyük (50-100cm)', value: 'large' },
            { label: 'Çok Büyük (100cm+)', value: 'xlarge' },
          ],
          is_required: false,
          sort_order: 2,
        },
      ],
      // Ceramics
      'ceramics': [
        {
          name: 'Renk',
          type: 'color',
          options: [
            { label: 'Beyaz', value: '#FFFFFF' },
            { label: 'Krem', value: '#FEF3C7' },
            { label: 'Mavi', value: '#2563EB' },
            { label: 'Yeşil', value: '#10B981' },
            { label: 'Toprak Rengi', value: '#92400E' },
          ],
          is_required: false,
          sort_order: 1,
        },
        {
          name: 'Boyut',
          type: 'text',
          options: [
            { label: 'Küçük', value: 'small' },
            { label: 'Orta', value: 'medium' },
            { label: 'Büyük', value: 'large' },
          ],
          is_required: false,
          sort_order: 2,
        },
      ],
      // Jewelry
      'jewelry': [
        {
          name: 'Malzeme',
          type: 'text',
          options: [
            { label: 'Gümüş', value: 'silver' },
            { label: 'Altın', value: 'gold' },
            { label: 'Bronz', value: 'bronze' },
            { label: 'Deri', value: 'leather' },
            { label: 'Ahşap', value: 'wood' },
          ],
          is_required: false,
          sort_order: 1,
        },
        {
          name: 'Beden',
          type: 'text',
          options: [
            { label: 'XS', value: 'xs' },
            { label: 'S', value: 's' },
            { label: 'M', value: 'm' },
            { label: 'L', value: 'l' },
            { label: 'XL', value: 'xl' },
          ],
          is_required: false,
          sort_order: 2,
        },
      ],
    };


    // Create variants for each category
    let createdCount = 0;

    for (const category of categories) {
      // Case-insensitive matching
      const categoryNameLower = category.name.toLowerCase();
      const variants = variantMappings[categoryNameLower] || defaultVariants;

      console.log(`\n📦 Processing category: ${category.name} (${variants === defaultVariants ? 'using defaults' : 'using specific variants'})`);

      for (const variantData of variants) {
        const [variant, created] = await CategoryVariant.findOrCreate({
          where: {
            category_id: category.id,
            name: variantData.name,
          },
          defaults: {
            ...variantData,
            category_id: category.id,
          },
        });

        if (created) {
          console.log(`  ✅ Created variant: ${variantData.name}`);
          createdCount++;
        } else {
          console.log(`  ⏭️  Already exists: ${variantData.name}`);
        }
      }
    }

    console.log(`\n✅ Seeding complete! Created ${createdCount} new variants.\n`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding variants:', error);
    process.exit(1);
  }
}

seedVariants();
