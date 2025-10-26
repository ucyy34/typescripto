/**
 * Category Model
 * Product categories with hierarchical structure (parent-child)
 */

const { DataTypes } = require('sequelize');
const slugify = require('slugify');
const { sequelize } = require('../config/sequelize');

const Category = sequelize.define(
  'Category',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: {
          args: [2, 100],
          msg: 'Category name must be between 2 and 100 characters',
        },
      },
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Icon class or emoji for category',
    },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'For custom sorting',
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Category-specific commission rate (overrides global) - null means use global settings',
      validate: {
        min: 0,
        max: 100,
      },
    },
    meta_title: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'SEO meta title',
    },
    meta_description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'SEO meta description',
    },
  },
  {
    tableName: 'categories',
    indexes: [
      {
        unique: true,
        fields: ['slug'],
      },
      {
        fields: ['parent_id'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['is_featured'],
      },
      {
        fields: ['sort_order'],
      },
    ],
  }
);

// Self-referencing association for parent-child relationship
Category.hasMany(Category, {
  as: 'children',
  foreignKey: 'parent_id',
});

Category.belongsTo(Category, {
  as: 'parent',
  foreignKey: 'parent_id',
});

// Instance Methods

/**
 * Check if category is top-level (has no parent)
 * @returns {boolean}
 */
Category.prototype.isTopLevel = function () {
  return this.parent_id === null;
};

/**
 * Get full category path (e.g., "Electronics > Phones > Smartphones")
 * @returns {Promise<string>}
 */
Category.prototype.getFullPath = async function () {
  const path = [this.name];
  let current = this;

  while (current.parent_id) {
    current = await Category.findByPk(current.parent_id);
    if (current) {
      path.unshift(current.name);
    } else {
      break;
    }
  }

  return path.join(' > ');
};

// Class Methods

/**
 * Get all top-level categories
 * @param {Object} options
 * @returns {Promise<Array<Category>>}
 */
Category.getTopLevel = function (options = {}) {
  return this.findAll({
    where: { parent_id: null, is_active: true },
    order: [['sort_order', 'ASC'], ['name', 'ASC']],
    ...options,
  });
};

/**
 * Get category tree (hierarchical structure)
 * @returns {Promise<Array<Category>>}
 */
Category.getTree = async function () {
  const categories = await this.findAll({
    where: { is_active: true },
    order: [['sort_order', 'ASC'], ['name', 'ASC']],
    include: [
      {
        model: Category,
        as: 'children',
        where: { is_active: true },
        required: false,
        include: [
          {
            model: Category,
            as: 'children',
            where: { is_active: true },
            required: false,
          },
        ],
      },
    ],
  });

  return categories.filter((cat) => cat.parent_id === null);
};

/**
 * Find category by slug
 * @param {string} slug
 * @returns {Promise<Category|null>}
 */
Category.findBySlug = function (slug) {
  return this.findOne({ where: { slug } });
};

/**
 * Get featured categories
 * @returns {Promise<Array<Category>>}
 */
Category.getFeatured = function () {
  return this.findAll({
    where: { is_featured: true, is_active: true },
    order: [['sort_order', 'ASC']],
    limit: 10,
  });
};

// Hooks

/**
 * Generate slug before creating category
 */
Category.beforeCreate(async (category) => {
  if (!category.slug && category.name) {
    let slug = slugify(category.name, { lower: true, strict: true });

    // Check if slug exists, add suffix if needed
    const existing = await Category.findOne({ where: { slug } });
    if (existing) {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${randomSuffix}`;
    }

    category.slug = slug;
  }
});

/**
 * Update slug when name changes
 */
Category.beforeUpdate(async (category) => {
  if (category.changed('name')) {
    let slug = slugify(category.name, { lower: true, strict: true });

    // Ensure slug is unique
    const existing = await Category.findOne({
      where: {
        slug,
        id: { [sequelize.Sequelize.Op.ne]: category.id },
      },
    });

    if (existing) {
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      slug = `${slug}-${randomSuffix}`;
    }

    category.slug = slug;
  }
});

module.exports = Category;
