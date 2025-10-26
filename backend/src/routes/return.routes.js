/**
 * Return Request Routes
 * Routes for handling product returns
 */

const express = require('express');
const router = express.Router();

const returnController = require('../controllers/return.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { validate, validateParams, validateQuery } = require('../middlewares/validate');
const {
  createReturnRequestSchema,
  updateReturnStatusSchema,
  returnIdParamSchema,
  returnQuerySchema,
} = require('../validators/return.validator');

/**
 * @route   POST /api/v1/returns
 * @desc    Create new return request
 * @access  Private (Buyer)
 */
router.post(
  '/',
  authenticate,
  validate(createReturnRequestSchema),
  returnController.createReturnRequest
);

/**
 * @route   GET /api/v1/returns
 * @desc    Get user's return requests
 * @access  Private (Buyer)
 */
router.get(
  '/',
  authenticate,
  validateQuery(returnQuerySchema),
  returnController.getUserReturns
);

/**
 * @route   GET /api/v1/returns/:id
 * @desc    Get return request by ID
 * @access  Private (Buyer/Seller/Admin)
 */
router.get(
  '/:id',
  authenticate,
  validateParams(returnIdParamSchema),
  returnController.getReturnRequest
);

/**
 * @route   PATCH /api/v1/returns/:id/status
 * @desc    Update return request status
 * @access  Private (Seller/Admin)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireRole('seller', 'admin'),
  validateParams(returnIdParamSchema),
  validate(updateReturnStatusSchema),
  returnController.updateReturnStatus
);

/**
 * @route   POST /api/v1/returns/:id/cancel
 * @desc    Cancel return request
 * @access  Private (Buyer)
 */
router.post(
  '/:id/cancel',
  authenticate,
  validateParams(returnIdParamSchema),
  returnController.cancelReturnRequest
);

/**
 * @route   GET /api/v1/stores/:storeId/returns
 * @desc    Get store's return requests
 * @access  Private (Seller/Admin)
 */
router.get(
  '/stores/:storeId',
  authenticate,
  requireRole('seller', 'admin'),
  returnController.getStoreReturns
);

module.exports = router;










