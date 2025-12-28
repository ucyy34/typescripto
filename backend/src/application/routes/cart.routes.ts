import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { validateZod } from '../middlewares/zodValidate';
import {
    AddToCartSchema,
    UpdateCartItemSchema,
    CartItemIdParamSchema,
    MergeCartSchema,
    GetCartRequestSchema,
    GetGuestCartRequestSchema,
    EmptyBodySchema
} from '../schemas/cart.schema';

const { authenticate } = require('../../middlewares/auth');

const router = Router();

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

// Get User Cart
router.get(
    '/',
    authenticate,
    validateZod(GetCartRequestSchema, 'query'),
    CartController.getCart as any
);

// Add Item (User)
router.post(
    '/items',
    authenticate,
    validateZod(AddToCartSchema, 'body'),
    CartController.addToCart as any
);

// Update Item (User)
router.patch(
    '/items/:id',
    authenticate,
    validateZod(CartItemIdParamSchema, 'params'),
    validateZod(UpdateCartItemSchema, 'body'),
    CartController.updateItem as any
);

// Remove Item (User)
router.delete(
    '/items/:id',
    authenticate,
    validateZod(CartItemIdParamSchema, 'params'),
    CartController.removeItem as any
);

// Clear Cart (User)
router.delete(
    '/',
    authenticate,
    validateZod(EmptyBodySchema, 'body'),
    CartController.clearCart as any
);

// Merge Guest Cart
router.post(
    '/merge',
    authenticate,
    validateZod(MergeCartSchema, 'body'),
    CartController.mergeCart as any
);

// ==========================================
// GUEST ROUTES (Required X-Guest-Key header)
// ==========================================

// Get Guest Cart
router.get(
    '/guest',
    validateZod(GetGuestCartRequestSchema, 'query'),
    CartController.getGuestCart as any
);

// Add Item (Guest)
router.post(
    '/guest/items',
    validateZod(AddToCartSchema, 'body'),
    CartController.addToGuestCart as any
);

// Update Item (Guest)
router.patch(
    '/guest/items/:id',
    validateZod(CartItemIdParamSchema, 'params'),
    validateZod(UpdateCartItemSchema, 'body'),
    CartController.updateGuestItem as any
);

// Remove Item (Guest)
router.delete(
    '/guest/items/:id',
    validateZod(CartItemIdParamSchema, 'params'),
    CartController.removeGuestItem as any
);

// Clear Cart (Guest)
router.delete(
    '/guest',
    validateZod(EmptyBodySchema, 'body'),
    CartController.clearGuestCart as any
);


export default router;
