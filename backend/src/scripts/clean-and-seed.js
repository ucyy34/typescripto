/**
 * Clean Database and Seed with Real Test Data
 * Keeps admin user, creates realistic sellers, buyers, and products
 */

const {
  User,
  Store,
  Product,
  Category,
  Order,
  OrderItem,
  ReturnRequest,
  CommissionTransaction,
  CommissionSettings,
  Cart,
  sequelize
} = require('../models');
const bcrypt = require('bcrypt');
require('dotenv').config(); // Load env vars

// Seller data
const sellers = [
  {
    email: 'erik.nordstrom@nordic.com',
    password: 'Seller123!',
    first_name: 'Erik',
    last_name: 'Nordström',
    store: {
      name: 'Nordic Wood Masters',
      description: 'Master wood carvers specializing in traditional Scandinavian designs',
      phone: '+46 70 123 4567',
      email: 'contact@nordicwood.se',
      address: 'Drottninggatan 45',
      city: 'Stockholm',
      country: 'Sweden',
      postal_code: '111 21',
      tax_number: 'SE556123456701'
    }
  },
  {
    email: 'astrid.bjork@glassart.com',
    password: 'Seller123!',
    first_name: 'Astrid',
    last_name: 'Björk',
    store: {
      name: 'Aurora Glass Studio',
      description: 'Handblown glass art inspired by Northern Lights',
      phone: '+47 91 234 567',
      email: 'hello@auroraglass.no',
      address: 'Karl Johans gate 22',
      city: 'Oslo',
      country: 'Norway',
      postal_code: '0159',
      tax_number: 'NO987654321MVA'
    }
  },
  {
    email: 'magnus.eriksson@viking.com',
    password: 'Seller123!',
    first_name: 'Magnus',
    last_name: 'Eriksson',
    store: {
      name: 'Viking Leather Crafts',
      description: 'Traditional Viking-style leather goods and accessories',
      phone: '+358 40 123 4567',
      email: 'info@vikingleather.fi',
      address: 'Mannerheimintie 10',
      city: 'Helsinki',
      country: 'Finland',
      postal_code: '00100',
      tax_number: 'FI12345678'
    }
  },
  {
    email: 'ingrid.svensson@textiles.com',
    password: 'Seller123!',
    first_name: 'Ingrid',
    last_name: 'Svensson',
    store: {
      name: 'Nordic Textile Heritage',
      description: 'Traditional Scandinavian textiles and woven products',
      phone: '+45 20 12 34 56',
      email: 'contact@nordictextiles.dk',
      address: 'Strøget 15',
      city: 'Copenhagen',
      country: 'Denmark',
      postal_code: '1250',
      tax_number: 'DK87654321'
    }
  },
  {
    email: 'lars.hansen@ceramics.com',
    password: 'Seller123!',
    first_name: 'Lars',
    last_name: 'Hansen',
    store: {
      name: 'Fjord Ceramics',
      description: 'Handthrown ceramics inspired by Nordic fjords',
      phone: '+354 777 1234',
      email: 'studio@fjordceramics.is',
      address: 'Laugavegur 32',
      city: 'Reykjavik',
      country: 'Iceland',
      postal_code: '101',
      tax_number: 'IS123456'
    }
  }
];

// Buyer data
const buyers = [
  { email: 'anna.mueller@email.com', password: 'Buyer123!', first_name: 'Anna', last_name: 'Müller' },
  { email: 'john.smith@email.com', password: 'Buyer123!', first_name: 'John', last_name: 'Smith' },
  { email: 'marie.dubois@email.com', password: 'Buyer123!', first_name: 'Marie', last_name: 'Dubois' },
  { email: 'carlos.garcia@email.com', password: 'Buyer123!', first_name: 'Carlos', last_name: 'Garcia' },
  { email: 'yuki.tanaka@email.com', password: 'Buyer123!', first_name: 'Yuki', last_name: 'Tanaka' },
  { email: 'olivia.brown@email.com', password: 'Buyer123!', first_name: 'Olivia', last_name: 'Brown' },
  { email: 'lucas.silva@email.com', password: 'Buyer123!', first_name: 'Lucas', last_name: 'Silva' },
  { email: 'emma.wilson@email.com', password: 'Buyer123!', first_name: 'Emma', last_name: 'Wilson' }
];

// Products for each seller (4 products each)
const productsData = [
  // Nordic Wood Masters (Wood Carvings)
  [
    { title: 'Viking Dragon Sculpture', price: 299.99, compare_price: 399.99, stock: 15, description: 'Hand-carved Viking dragon head sculpture from premium oak wood' },
    { title: 'Yggdrasil Tree of Life', price: 449.99, stock: 8, description: 'Intricate tree of life carving representing Norse mythology' },
    { title: 'Rune Stone Wall Art', price: 189.99, compare_price: 249.99, stock: 25, description: 'Decorative wooden rune stones with ancient Norse symbols' },
    { title: 'Nordic Wolf Spirit Carving', price: 329.99, stock: 12, description: 'Majestic wolf sculpture inspired by Nordic folklore' }
  ],
  // Aurora Glass Studio (Glass Art)
  [
    { title: 'Northern Lights Glass Bowl', price: 259.99, stock: 10, description: 'Handblown glass bowl with aurora borealis color swirls' },
    { title: 'Arctic Crystal Vase', price: 349.99, compare_price: 449.99, stock: 6, description: 'Elegant crystal vase inspired by Arctic ice formations' },
    { title: 'Midnight Sun Glass Sphere', price: 199.99, stock: 20, description: 'Decorative glass sphere capturing the midnight sun phenomenon' },
    { title: 'Glacier Blue Art Glass', price: 419.99, stock: 5, description: 'Premium art glass piece with deep glacier blue tones' }
  ],
  // Viking Leather Crafts (Leather Goods)
  [
    { title: 'Viking Messenger Bag', price: 189.99, stock: 30, description: 'Handcrafted leather messenger bag with Viking motifs' },
    { title: 'Norse Leather Belt', price: 79.99, compare_price: 99.99, stock: 50, description: 'Traditional leather belt with brass Viking buckle' },
    { title: 'Leather Journal Cover', price: 129.99, stock: 40, description: 'Premium leather journal cover with embossed runes' },
    { title: 'Viking Leather Wallet', price: 89.99, stock: 45, description: 'Bifold wallet with hand-tooled Nordic patterns' }
  ],
  // Nordic Textile Heritage (Textiles)
  [
    { title: 'Scandinavian Wool Blanket', price: 159.99, compare_price: 199.99, stock: 22, description: 'Hand-woven wool blanket with traditional Nordic patterns' },
    { title: 'Viking Tapestry Wall Hanging', price: 229.99, stock: 12, description: 'Woven tapestry depicting Viking ship journey' },
    { title: 'Nordic Knit Throw Pillow Set', price: 79.99, stock: 35, description: 'Set of 2 hand-knit pillows with snowflake patterns' },
    { title: 'Traditional Table Runner', price: 49.99, stock: 40, description: 'Linen table runner with embroidered Nordic designs' }
  ],
  // Fjord Ceramics (Ceramics)
  [
    { title: 'Fjord Landscape Platter', price: 119.99, stock: 18, description: 'Large ceramic platter glazed with fjord-inspired colors' },
    { title: 'Nordic Coffee Mug Set', price: 69.99, compare_price: 89.99, stock: 50, description: 'Set of 4 handthrown mugs with Nordic glaze' },
    { title: 'Ceramic Viking Ship Bowl', price: 149.99, stock: 14, description: 'Unique bowl shaped like a Viking longship' },
    { title: 'Rune Inscribed Vase', price: 99.99, stock: 25, description: 'Ceramic vase with hand-carved runic inscriptions' }
  ]
];

async function cleanDatabase() {
  console.log('\n🧹 Cleaning database via Sync Force...\n');

  try {
    // FORCE SYNC: Drops and recreates all tables
    // This is perfect for sandbox environment initialization
    await sequelize.sync({ force: true });

    console.log('✅ Database schema created & cleaned (All tables reset)\n');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    // Continue despite error if specific tables fail, but usually sync throws.
    // For sandbox, we want to know if it fails.
    throw error;
  }
}

async function seedData() {
  console.log('🌱 Seeding database with realistic data...\n');

  try {
    // Create or get admin user
    let admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      console.log('👤 Creating admin user...');
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 12);
      admin = await User.create({
        email: process.env.ADMIN_EMAIL || 'admin@dostanmarket.com',
        password_hash: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_verified: true,
        is_active: true
      });
      console.log('  ✅ Admin user created\n');
    }

    // Create or get categories
    console.log('📁 Creating categories...');
    const categoryData = [
      { name: 'Wood Carvings', slug: 'wood-carvings', description: 'Handcrafted wooden art and sculptures' },
      { name: 'Glass Art', slug: 'glass-art', description: 'Beautiful handblown glass creations' },
      { name: 'Leather Goods', slug: 'leather-goods', description: 'Premium leather products and accessories' },
      { name: 'Textiles', slug: 'textiles', description: 'Traditional woven textiles and fabrics' },
      { name: 'Ceramics', slug: 'ceramics', description: 'Handthrown ceramic pottery and art' }
    ];

    const categoryMap = [];
    for (const cat of categoryData) {
      let category = await Category.findOne({ where: { slug: cat.slug } });
      if (!category) {
        category = await Category.create(cat);
      }
      categoryMap.push(category);
    }
    console.log(`  ✅ ${categoryMap.length} categories ready\n`);

    // Create sellers and stores
    console.log('👥 Creating sellers and stores...');
    const createdStores = [];

    for (let i = 0; i < sellers.length; i++) {
      const sellerData = sellers[i];

      // Hash password
      const hashedPassword = await bcrypt.hash(sellerData.password, 12);

      // Create seller user
      const seller = await User.create({
        email: sellerData.email,
        password_hash: hashedPassword,
        first_name: sellerData.first_name,
        last_name: sellerData.last_name,
        role: 'seller',
        is_verified: true,
        is_active: true
      });

      // Create store slug
      const slug = sellerData.store.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Create store
      const store = await Store.create({
        ...sellerData.store,
        slug: slug,
        user_id: seller.id,
        status: 'approved',
        approved_at: new Date(),
        approved_by: admin.id,
        is_featured: i < 2 // First 2 stores are featured
      });

      createdStores.push(store);
      console.log(`  ✅ ${sellerData.store.name} (${seller.email})`);

      // Create products for this store
      const storeProducts = productsData[i];
      const category = categoryMap[i];

      for (let j = 0; j < storeProducts.length; j++) {
        const productData = storeProducts[j];

        // Create product slug
        const productSlug = productData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        await Product.create({
          store_id: store.id,
          category_id: category.id,
          title: productData.title,
          slug: productSlug,
          description: productData.description,
          short_description: productData.description.substring(0, 100),
          price: productData.price,
          compare_price: productData.compare_price || null,
          stock: productData.stock,
          images: [`https://images.unsplash.com/photo-${1500000000000 + i * 1000 + j}?w=400&h=300`],
          status: 'approved',
          is_active: true,
          is_featured: j === 0, // First product of each store is featured
          approved_at: new Date(),
          approved_by: admin.id,
          rating: (4.2 + Math.random() * 0.8).toFixed(1),
          total_reviews: Math.floor(Math.random() * 50) + 10,
          low_stock_threshold: 5
        });
      }
      console.log(`    📦 Created 4 products`);
    }

    console.log('\n👤 Creating buyer accounts...');
    for (const buyerData of buyers) {
      const hashedPassword = await bcrypt.hash(buyerData.password, 12);

      await User.create({
        email: buyerData.email,
        password_hash: hashedPassword,
        first_name: buyerData.first_name,
        last_name: buyerData.last_name,
        role: 'buyer',
        is_verified: true,
        is_active: true
      });

      console.log(`  ✅ ${buyerData.first_name} ${buyerData.last_name} (${buyerData.email})`);
    }

    console.log('\n📊 Database Statistics:');
    const userCount = await User.count();
    const storeCount = await Store.count();
    const productCount = await Product.count();

    console.log(`  Users: ${userCount} (1 admin + 5 sellers + 8 buyers)`);
    console.log(`  Stores: ${storeCount} (all approved)`);
    console.log(`  Products: ${productCount} (all approved)`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting database cleanup and seed...\n');
    console.log('Connected to DB:', sequelize.config.database);

    // SAFETY CHECK: Ensure we are in a safe dev environment
    const { ENV_TAG, DB_NAME } = process.env;

    if (ENV_TAG !== 'dev') {
      console.error(`\n❌ FATAL: ENV_TAG must be "dev" to run seed. Found: "${ENV_TAG}"`);
      console.error('   This script wipes the database. Safety abort!');
      process.exit(1);
    }

    if (!DB_NAME || !DB_NAME.endsWith('_dev')) {
      console.error(`\n❌ FATAL: DB_NAME must end with "_dev". Found: "${DB_NAME}"`);
      console.error('   This script wipes the database. Safety abort!');
      process.exit(1);
    }

    await cleanDatabase();
    await seedData();

    // Cache is in-memory, will reset on server restart
    console.log('\n📦 Note: Cache is in-memory and will be cleared on server restart.');

    console.log('\n✅ Database cleanup and seed completed successfully!\n');
    console.log('📝 Test Credentials:');
    console.log('   Admin: admin@dostanmarket.com / Admin@123456');
    console.log('   Sellers: [name]@[domain].com / Seller123!');
    console.log('   Buyers: [name]@email.com / Buyer123!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { cleanDatabase, seedData };
