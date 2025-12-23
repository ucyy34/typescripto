/**
 * Variant Service
 * Business logic for product variant management
 */

const { ProductVariant, Product, Store } = require('../models');
const { ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');
const { getVariantTypes, getVariantValues, generateSKUSuffix, isValidVariantType } = require('../config/variantTypes');

class VariantService {
    /**
     * Get all variant types for dropdown
     */
    getVariantTypes() {
        return getVariantTypes();
    }

    /**
     * Get values for a specific variant type
     */
    getVariantValues(typeKey) {
        if (!isValidVariantType(typeKey)) {
            throw new ApiError('Invalid variant type', StatusCodes.BAD_REQUEST);
        }
        return getVariantValues(typeKey);
    }

    /**
     * Get all variants for a product
     */
    async getProductVariants(productId) {
        const product = await Product.findByPk(productId);
        if (!product) {
            throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
        }

        const variants = await ProductVariant.findAll({
            where: {
                product_id: productId,
                is_active: true
            },
            order: [
                ['color_name', 'ASC'],
                ['variant_type', 'ASC'],
                ['variant_value', 'ASC']
            ]
        });

        return variants;
    }

    /**
     * Add a variant to a product
     */
    async addVariant(productId, variantData, userId) {
        // Get product and verify ownership
        const product = await Product.findByPk(productId, {
            include: [{ model: Store, as: 'store' }]
        });

        if (!product) {
            throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
        }

        // Check ownership (seller must own the store)
        if (product.store && product.store.owner_id !== userId) {
            throw new ApiError('Unauthorized to modify this product', StatusCodes.FORBIDDEN);
        }

        // Validate required fields
        if (!variantData.price || variantData.price <= 0) {
            throw new ApiError('Price is required and must be greater than 0', StatusCodes.BAD_REQUEST);
        }

        if (variantData.stock === undefined || variantData.stock < 0) {
            throw new ApiError('Stock is required and cannot be negative', StatusCodes.BAD_REQUEST);
        }

        // Must have either color or variant_type/value
        const hasColor = variantData.color_hex && variantData.color_name;
        const hasVariant = variantData.variant_type && variantData.variant_value;

        if (!hasColor && !hasVariant) {
            throw new ApiError('Either color or variant type/value must be provided', StatusCodes.BAD_REQUEST);
        }

        // Validate variant type if provided
        if (variantData.variant_type && variantData.variant_type !== 'diger') {
            if (!isValidVariantType(variantData.variant_type)) {
                throw new ApiError('Invalid variant type', StatusCodes.BAD_REQUEST);
            }
        }

        // Generate SKU if not provided
        let sku = variantData.sku;
        if (!sku) {
            const baseSKU = product.sku || `P${product.id.substring(0, 6).toUpperCase()}`;
            const suffix = generateSKUSuffix(
                variantData.color_name,
                variantData.variant_type,
                variantData.variant_value
            );
            sku = suffix ? `${baseSKU}-${suffix}` : null;
        }

        // Check if variant combination already exists
        const existingVariant = await ProductVariant.findOne({
            where: {
                product_id: productId,
                color_hex: variantData.color_hex || null,
                variant_type: variantData.variant_type || null,
                variant_value: variantData.variant_value || null
            }
        });

        if (existingVariant) {
            throw new ApiError('This variant combination already exists', StatusCodes.CONFLICT);
        }

        // Create variant
        const variant = await ProductVariant.create({
            product_id: productId,
            sku,
            color_hex: variantData.color_hex || null,
            color_name: variantData.color_name || null,
            variant_type: variantData.variant_type || null,
            variant_value: variantData.variant_value || null,
            price: variantData.price,
            stock: variantData.stock,
            image_url: variantData.image_url || null,
            discount_percent: variantData.discount_percent || null,
            discount_ends_at: variantData.discount_ends_at || null,
            is_active: true
        });

        return variant;
    }

    /**
     * Update a variant
     */
    async updateVariant(productId, variantId, updateData, userId) {
        // Get product and verify ownership
        const product = await Product.findByPk(productId, {
            include: [{ model: Store, as: 'store' }]
        });

        if (!product) {
            throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
        }

        if (product.store && product.store.owner_id !== userId) {
            throw new ApiError('Unauthorized to modify this product', StatusCodes.FORBIDDEN);
        }

        // Get variant
        const variant = await ProductVariant.findOne({
            where: { id: variantId, product_id: productId }
        });

        if (!variant) {
            throw new ApiError('Variant not found', StatusCodes.NOT_FOUND);
        }

        // Update allowed fields
        const allowedFields = [
            'sku', 'color_hex', 'color_name', 'variant_type', 'variant_value',
            'price', 'stock', 'image_url', 'discount_percent', 'discount_ends_at', 'is_active'
        ];

        const updates = {};
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates[field] = updateData[field];
            }
        }

        await variant.update(updates);
        return variant;
    }

    /**
     * Delete a variant (soft delete)
     */
    async deleteVariant(productId, variantId, userId) {
        // Get product and verify ownership
        const product = await Product.findByPk(productId, {
            include: [{ model: Store, as: 'store' }]
        });

        if (!product) {
            throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
        }

        if (product.store && product.store.owner_id !== userId) {
            throw new ApiError('Unauthorized to modify this product', StatusCodes.FORBIDDEN);
        }

        // Get variant
        const variant = await ProductVariant.findOne({
            where: { id: variantId, product_id: productId }
        });

        if (!variant) {
            throw new ApiError('Variant not found', StatusCodes.NOT_FOUND);
        }

        await variant.destroy(); // Soft delete (paranoid: true in model)
        return true;
    }
}

module.exports = new VariantService();
