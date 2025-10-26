/**
 * Seed Categories Script
 * Creates initial product categories
 */

require('dotenv').config();
const { sequelize } = require('../models');
const Category = require('../models/Category');
const slugify = require('slugify');

const categories = [
  {
    name: 'Wood Carvings',
    description: 'Handmade wood carvings and sculptures',
    icon: '🪵',
    is_featured: true,
    sort_order: 1,
  },
  {
    name: 'Glass Art',
    description: 'Beautiful handcrafted glass art and decorations',
    icon: '🍶',
    is_featured: true,
    sort_order: 2,
  },
  {
    name: 'Textiles',
    description: 'Traditional textiles and woven products',
    icon: '🧵',
    is_featured: true,
    sort_order: 3,
  },
  {
    name: 'Ceramics',
    description: 'Handmade ceramic pottery and dishes',
    icon: '🏺',
    is_featured: true,
    sort_order: 4,
  },
  {
    name: 'Jewelry',
    description: 'Handcrafted jewelry and accessories',
    icon: '💍',
    is_featured: false,
    sort_order: 5,
  },
  {
    name: 'Leather Goods',
    description: 'Quality leather products and accessories',
    icon: '👜',
    is_featured: false,
    sort_order: 6,
  },
];

async function seedCategories() {
  try {
    console.log('🌱 Starting category seed...');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Create categories
    for (const categoryData of categories) {
      // Generate slug
      let slug = slugify(categoryData.name, { lower: true, strict: true });

      // Check if slug exists
      const existing = await Category.findOne({ where: { slug } });
      if (existing) {
        console.log(`⚠️ Category "${categoryData.name}" already exists, skipping...`);
        continue;
      }

      // Create category with slug
      const category = await Category.create({
        ...categoryData,
        slug,
      });

      console.log(`✅ Created category: ${category.name} (${category.slug})`);
    }

    console.log('✅ Categories seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedCategories();
