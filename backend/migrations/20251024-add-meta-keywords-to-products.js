/**
 * Migration: Add meta_keywords to products table
 * Allows vendors to add SEO keywords when creating products
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'meta_keywords', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
      comment: 'SEO keywords for search engines',
    });

    // Update existing seo fields with comments
    await queryInterface.changeColumn('products', 'seo_title', {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'SEO optimized title for search engines (50-60 chars)',
    });

    await queryInterface.changeColumn('products', 'seo_description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'SEO meta description for search engines (150-160 chars)',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('products', 'meta_keywords');
  },
};
