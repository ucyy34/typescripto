# Joi → Zod Migration Plan (Legacy routes)

Scope: Legacy route files in `backend/src/routes/` that still import `../validators/*.validator` (Joi).
Each item below is a single, trackable migration target with explicit steps.

## 1) `backend/src/routes/auth.routes.ts`
- **Current validator**: `backend/src/validators/auth.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/auth.schema.ts` with Zod request/response schemas mirroring Joi constraints.
  2. Replace Joi middleware usage with `validateZod` in `auth.routes.ts` (body/params/query as needed).
  3. Update controllers to type `req.body`/`req.params` with Zod output types.

## 2) `backend/src/routes/cart.routes.ts` (legacy)
- **Current validator**: `backend/src/validators/cart.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/cart.schema.ts` with Zod schemas per endpoint.
  2. Swap Joi middleware for `validateZod` in legacy cart routes.
  3. Align controller request typing with Zod DTOs.

## 3) `backend/src/routes/coupon.routes.ts`
- **Current validator**: `backend/src/validators/coupon.validator.ts`
- **Plan**:
  1. Add `backend/src/application/schemas/legacy/coupon.schema.ts` (Zod).
  2. Migrate route middleware to `validateZod`.
  3. Update controller request typing to Zod output types.

## 4) `backend/src/routes/campaign.routes.ts`
- **Current validator**: `backend/src/validators/campaign.validator.ts`
- **Plan**:
  1. Add `backend/src/application/schemas/legacy/campaign.schema.ts` (Zod).
  2. Replace Joi middleware in routes with `validateZod`.
  3. Align controllers to Zod DTOs.

## 5) `backend/src/routes/store-campaign.routes.ts`
- **Current validator**: `backend/src/validators/campaign.validator.ts`
- **Plan**:
  1. Reuse `legacy/campaign.schema.ts` for shared request/response shapes.
  2. Swap Joi validation for `validateZod`.
  3. Update controller request typing.

## 6) `backend/src/routes/category.routes.ts`
- **Current validator**: `backend/src/validators/category.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/category.schema.ts`.
  2. Migrate route validation to `validateZod`.
  3. Update controller request typing to Zod types.

## 7) `backend/src/routes/return.routes.ts`
- **Current validator**: `backend/src/validators/return.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/return.schema.ts`.
  2. Replace Joi middleware with `validateZod` in routes.
  3. Update controller request typing.

## 8) `backend/src/routes/shipping.routes.ts`
- **Current validator**: `backend/src/validators/shipping.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/shipping.schema.ts`.
  2. Migrate Joi validation to `validateZod` per endpoint.
  3. Update controller request typing to Zod DTOs.

## 9) `backend/src/routes/store.routes.ts`
- **Current validator**: `backend/src/validators/store.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/store.schema.ts`.
  2. Replace Joi validation with `validateZod`.
  3. Update controller request typing to Zod output types.

## 10) `backend/src/routes/user.routes.ts`
- **Current validator**: `backend/src/validators/user.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/user.schema.ts`.
  2. Swap Joi middleware for `validateZod`.
  3. Align controller request typing with Zod DTOs.

## 11) `backend/src/routes/recommendation.routes.ts`
- **Current validator**: `backend/src/validators/recommendation.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/recommendation.schema.ts`.
  2. Replace Joi validation with `validateZod`.
  3. Update controller request typing.

## 12) `backend/src/routes/commission.routes.ts`
- **Current validator**: `backend/src/validators/commission.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/commission.schema.ts`.
  2. Migrate route validation to `validateZod`.
  3. Align controller request typing.

## 13) `backend/src/routes/wishlist.routes.ts`
- **Current validator**: `backend/src/validators/wishlist.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/wishlist.schema.ts`.
  2. Replace Joi middleware with `validateZod`.
  3. Update controller request typing.

## 14) `backend/src/routes/order.routes.ts` (legacy)
- **Current validator**: `backend/src/validators/order.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/order.schema.ts` for V1/V1.5 endpoints.
  2. Replace Joi validation in legacy order routes with `validateZod`.
  3. Update legacy order controllers to use Zod output types.

## 15) `backend/src/routes/product.routes.ts` (legacy)
- **Current validator**: `backend/src/validators/product.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/product.schema.ts` mirroring current Joi product constraints.
  2. Migrate route validation to `validateZod`.
  3. Align controller request typing with Zod DTOs.

## 16) `backend/src/routes/review.routes.ts`
- **Current validator**: `backend/src/validators/review.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/review.schema.ts`.
  2. Replace Joi validation with `validateZod`.
  3. Update controller request typing.

## 17) `backend/src/routes/siftah.routes.ts`
- **Current validator**: `backend/src/validators/siftah.validator.ts`
- **Plan**:
  1. Create `backend/src/application/schemas/legacy/siftah.schema.ts`.
  2. Swap Joi validation for `validateZod` in routes.
  3. Align controller request typing to Zod output types.

