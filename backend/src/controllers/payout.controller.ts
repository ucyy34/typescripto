/**
 * Payout Controller
 * Handles payout HTTP requests for vendors and admins
 */

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

// TODO(ts-migration): replace any with proper service types
import _payoutService from '../services/payout.service';
import _storeService from '../services/store.service';
const payoutService = _payoutService as any;
const storeService = _storeService as any;

import { success } from '../utils/response';
import { asyncHandler, ApiError } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
    user?: { id: string; role: string };
}

class PayoutController {
    getBalance = asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const store = await storeService.getStoreByUserId(authReq.user!.id);
        if (!store) {
            throw new ApiError('Mağaza bulunamadı', StatusCodes.NOT_FOUND);
        }
        const balance = await payoutService.getVendorBalance(store.id);
        return success(res, balance, 'Bakiye bilgisi alındı');
    });

    requestPayout = asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            throw new ApiError('Geçerli bir tutar giriniz', StatusCodes.BAD_REQUEST);
        }
        const store = await storeService.getStoreByUserId(authReq.user!.id);
        if (!store) {
            throw new ApiError('Mağaza bulunamadı', StatusCodes.NOT_FOUND);
        }
        const payout = await payoutService.requestPayout(store.id, parseFloat(amount));
        return success(res, payout, 'Ödeme talebi oluşturuldu', StatusCodes.CREATED);
    });

    getHistory = asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const { limit = '20', offset = '0', status } = req.query;
        const store = await storeService.getStoreByUserId(authReq.user!.id);
        if (!store) {
            throw new ApiError('Mağaza bulunamadı', StatusCodes.NOT_FOUND);
        }
        const history = await payoutService.getPayoutHistory(store.id, {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            status: status || null,
        });
        return success(res, history, 'Ödeme geçmişi alındı');
    });

    getPendingPayouts = asyncHandler(async (req: Request, res: Response) => {
        const { limit = '50', offset = '0' } = req.query;
        const payouts = await payoutService.getPendingPayouts({
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
        });
        return success(res, payouts, 'Bekleyen ödemeler alındı');
    });

    getPayoutStats = asyncHandler(async (req: Request, res: Response) => {
        const stats = await payoutService.getPayoutStats();
        return success(res, stats, 'Ödeme istatistikleri alındı');
    });

    approvePayout = asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const { id } = req.params;
        const { approvedAmount, notes } = req.body;
        const payout = await payoutService.approvePayout(
            id,
            authReq.user!.id,
            approvedAmount ? parseFloat(approvedAmount) : null,
            notes || null
        );
        return success(res, payout, 'Ödeme talebi onaylandı');
    });

    rejectPayout = asyncHandler(async (req: Request, res: Response) => {
        const authReq = req as AuthenticatedRequest;
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) {
            throw new ApiError('Ret sebebi belirtilmeli', StatusCodes.BAD_REQUEST);
        }
        const payout = await payoutService.rejectPayout(id, authReq.user!.id, reason);
        return success(res, payout, 'Ödeme talebi reddedildi');
    });

    completePayout = asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { transactionRef } = req.body;
        if (!transactionRef) {
            throw new ApiError('İşlem referansı girilmeli', StatusCodes.BAD_REQUEST);
        }
        const payout = await payoutService.completePayout(id, transactionRef);
        return success(res, payout, 'Ödeme tamamlandı');
    });

    getPayoutDetails = asyncHandler(async (req: Request, res: Response) => {
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

export = new PayoutController();
