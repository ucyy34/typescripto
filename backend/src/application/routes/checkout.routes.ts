/**
 * Checkout V2 Routes
 * Handles checkout flow: init, confirm, status
 */

import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller';
const { authenticate } = require('../../middlewares/auth');

const router = Router();

// All checkout routes require authentication
router.use(authenticate);

/**
 * POST /api/v2/checkout/init
 * Get checkout summary with totals
 */
router.post('/init', CheckoutController.init);

/**
 * POST /api/v2/checkout/confirm
 * Confirm and create order atomically
 */
router.post('/confirm', CheckoutController.confirm);

/**
 * GET /api/v2/checkout/status/:idempotencyKey
 * Get order status by idempotency key
 */
router.get('/status/:idempotencyKey', CheckoutController.status);

export default router;
