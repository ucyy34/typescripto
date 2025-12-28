/**
 * Variant Service
 * Business logic for product variant management
 */

import { ProductVariant, Product, Store } from '../models';
import { ApiError } from '../middlewares/errorHandler';
import { StatusCodes } from 'http-status-codes';
import { getVariantTypes, getVariantValues, generateSKUSuffix, isValidVariantType } from '../config/variantTypes';
import type ProductModel from '../models/Product';
import type ProductVariantModel from '../models/ProductVariant';

type ProductWithStore = ProductModel & { store?: { owner_id?: string } };

interface VariantType {
    key: string;
    label: string;
    values?: string[];
}

interface VariantData {
    sku?: string;
    color_hex?: string | null;
    color_name?: string | null;
    variant_type?: string | null;
    variant_value?: string | null;
    price: number;
    stock: number;
    image_url?: string | null;
    discount_percent?: number | null;
    discount_ends_at?: Date | null;
}

interface UpdateData {
    sku?: string;
    color_hex?: string | null;
    color_name?: string | null;
    variant_type?: string | null;
    variant_value?: string | null;
    price?: number;
    stock?: number;
    image_url?: string | null;
    discount_percent?: number | null;
    discount_ends_at?: Date | null;
    is_active?: boolean;
}

class VariantService {
    /**
     * Get all variant types for dropdown
     */
    getVariantTypes(): VariantType[] {
        return getVariantTypes();
    }

    /**
     * Get values for a specific variant type
     */
    getVariantValues(typeKey: string): string[] {
        if (!isValidVariantType(typeKey)) {
            throw new ApiError('Invalid variant type', StatusCodes.BAD_REQUEST);
        }
        return getVariantValues(typeKey);
    }

    /**
     * Get all variants for a product
     */
    async getProductVariants(productId: string): Promise<ProductVariantModel[]> {
        const product: ProductModel | null = await Product.findByPk(productId);
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
    async addVariant(productId: string, variantData: VariantData, userId: string): Promise<ProductVariantModel> {
        // Get product and verify ownership
        const product: ProductWithStore | null = await Product.findByPk(productId, {
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
            sku = suffix ? `${baseSKU}-${suffix}` : undefined;
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
        const variant: ProductVariantModel = await ProductVariant.create({
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
    async updateVariant(productId: string, variantId: string, updateData: UpdateData, userId: string): Promise<ProductVariantModel> {
        // Get product and verify ownership
        const product: ProductWithStore | null = await Product.findByPk(productId, {
            include: [{ model: Store, as: 'store' }]
        });

        if (!product) {
            throw new ApiError('Product not found', StatusCodes.NOT_FOUND);
        }

        if (product.store && product.store.owner_id !== userId) {
            throw new ApiError('Unauthorized to modify this product', StatusCodes.FORBIDDEN);
        }

        // Get variant
        const variant: ProductVariantModel | null = await ProductVariant.findOne({
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

        const updates: Partial<UpdateData> = {};
        for (const field of allowedFields) {
            const value = updateData[field as keyof UpdateData];
            if (value !== undefined) {
                updates[field as keyof UpdateData] = value;
            }
        }

        await variant.update(updates);
        return variant;
    }

    /**
     * Delete a variant (soft delete)
     */
    async deleteVariant(productId: string, variantId: string, userId: string): Promise<boolean> {
        // Get product and verify ownership
        const product: ProductWithStore | null = await Product.findByPk(productId, {
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

export = new VariantService();
