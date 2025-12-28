/**
 * Application Schemas Barrel Export
 */

// Order schemas (includes UuidSchema)
export * from './order.schema';

// Product schemas (exclude duplicate UuidSchema)
export {
    ProductIdParamSchema,
    ProductStatusEnum,
    ProductListQuerySchema,
    ProductDimensionsSchema,
    CreateProductSchema,
    ProductResponseSchema,
    ProductListItemSchema,
    type ProductIdParams,
    type ProductListQuery,
    type CreateProductDTO,
    type ProductResponseDTO,
    type ProductListItemDTO,
    type ProductStatusValue,
} from './product.schema';

export * from './cart.schema';
