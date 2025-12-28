/**
 * Payout Routes
 * API endpoints for vendor payouts and admin payout management
 */

import { Router } from 'express';

import payoutController from '../controllers/payout.controller';
import { authenticate, requireSeller, requireAdmin } from '../middlewares/auth';

const router: Router = Router();

// Vendor routes
router.get('/balance', authenticate, requireSeller, payoutController.getBalance);
router.post('/request', authenticate, requireSeller, payoutController.requestPayout);
router.get('/history', authenticate, requireSeller, payoutController.getHistory);

// Admin routes
router.get('/admin/pending', authenticate, requireAdmin, payoutController.getPendingPayouts);
router.get('/admin/stats', authenticate, requireAdmin, payoutController.getPayoutStats);
router.get('/admin/:id', authenticate, requireAdmin, payoutController.getPayoutDetails);
router.post('/admin/:id/approve', authenticate, requireAdmin, payoutController.approvePayout);
router.post('/admin/:id/reject', authenticate, requireAdmin, payoutController.rejectPayout);
router.post('/admin/:id/complete', authenticate, requireAdmin, payoutController.completePayout);

export = router;
