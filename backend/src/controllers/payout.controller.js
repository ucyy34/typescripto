/**
 * Payout Controller
 * Handles payout HTTP requests for vendors and admins
 */

const payoutService = require('../services/payout.service');
const storeService = require('../services/store.service');
const { success } = require('../utils/response');
const { asyncHandler, ApiError } = require('../middlewares/errorHandler');
const { StatusCodes } = require('http-status-codes');

class PayoutController {
    // ================== VENDOR ENDPOINTS ==================

    /**
     * Get vendor's balance and payout eligibility
     * GET /api/v1/payouts/balance
     */
    getBalance = asyncHandler(async (req, res) => {
        const store = await storeService.getStoreByUserId(req.user.id);

        if (!store) {
            throw new ApiError('Mağaza bulunamadı', StatusCodes.NOT_FOUND);
        }

        const balance = await payoutService.getVendorBalance(store.id);

        return success(res, balance, 'Bakiye bilgisi alındı');
    });

    /**
     * Request a payout
     * POST /api/v1/payouts/request
     * Body: { amount: number }
     */
    requestPayout = asyncHandler(async (req, res) => {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            throw new ApiError('Geçerli bir tutar giriniz', StatusCodes.BAD_REQUEST);
        }

        const store = await storeService.getStoreByUserId(req.user.id);

        if (!store) {
            throw new ApiError('Mağaza bulunamadı', StatusCodes.NOT_FOUND);
        }

        const payout = await payoutService.requestPayout(store.id, parseFloat(amount));

        return success(res, payout, 'Ödeme talebi oluşturuldu', StatusCodes.CREATED);
    });

    /**
     * Get vendor's payout history
     * GET /api/v1/payouts/history
     */
    getHistory = asyncHandler(async (req, res) => {
        const { limit = 20, offset = 0, status } = req.query;

        const store = await storeService.getStoreByUserId(req.user.id);

        if (!store) {
            throw new ApiError('Mağaza bulunamadı', StatusCodes.NOT_FOUND);
        }

        const history = await payoutService.getPayoutHistory(store.id, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            status: status || null,
        });

        return success(res, history, 'Ödeme geçmişi alındı');
    });

    // ================== ADMIN ENDPOINTS ==================

    /**
     * Get all pending payout requests
     * GET /api/v1/payouts/admin/pending
     */
    getPendingPayouts = asyncHandler(async (req, res) => {
        const { limit = 50, offset = 0 } = req.query;

        const payouts = await payoutService.getPendingPayouts({
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        return success(res, payouts, 'Bekleyen ödemeler alındı');
    });

    /**
     * Get payout statistics
     * GET /api/v1/payouts/admin/stats
     */
    getPayoutStats = asyncHandler(async (req, res) => {
        const stats = await payoutService.getPayoutStats();

        return success(res, stats, 'Ödeme istatistikleri alındı');
    });

    /**
     * Approve a payout request
     * POST /api/v1/payouts/admin/:id/approve
     * Body: { approvedAmount?: number, notes?: string }
     */
    approvePayout = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { approvedAmount, notes } = req.body;

        const payout = await payoutService.approvePayout(
            id,
            req.user.id,
            approvedAmount ? parseFloat(approvedAmount) : null,
            notes || null
        );

        return success(res, payout, 'Ödeme talebi onaylandı');
    });

    /**
     * Reject a payout request
     * POST /api/v1/payouts/admin/:id/reject
     * Body: { reason: string }
     */
    rejectPayout = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            throw new ApiError('Ret sebebi belirtilmeli', StatusCodes.BAD_REQUEST);
        }

        const payout = await payoutService.rejectPayout(id, req.user.id, reason);

        return success(res, payout, 'Ödeme talebi reddedildi');
    });

    /**
     * Complete a payout (mark as paid)
     * POST /api/v1/payouts/admin/:id/complete
     * Body: { transactionRef: string }
     */
    completePayout = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { transactionRef } = req.body;

        if (!transactionRef) {
            throw new ApiError('İşlem referansı girilmeli', StatusCodes.BAD_REQUEST);
        }

        const payout = await payoutService.completePayout(id, transactionRef);

        return success(res, payout, 'Ödeme tamamlandı');
    });

    /**
     * Get single payout details
     * GET /api/v1/payouts/admin/:id
     */
    getPayoutDetails = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { VendorPayout, Store, User } = require('../models');

        const payout = await VendorPayout.findByPk(id, {
            include: [
                { model: Store, as: 'store', attributes: ['id', 'name', 'slug', 'logo', 'bank_details'] },
                { model: User, as: 'reviewer', attributes: ['id', 'first_name', 'last_name', 'email'] },
            ],
        });

        if (!payout) {
            throw new ApiError('Ödeme talebi bulunamadı', StatusCodes.NOT_FOUND);
        }

        return success(res, payout, 'Ödeme detayları alındı');
    });
}

module.exports = new PayoutController();
