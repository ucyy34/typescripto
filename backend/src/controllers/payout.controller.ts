/**
 * Payout Controller
 * Handles payout HTTP requests for vendors and admins
 */

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import payoutService = require('../services/payout.service');
import storeService = require('../services/store.service');

import { success } from '../utils/response';
import { asyncHandler, ApiError } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../domain/types';

interface PaginationQuery {
    limit?: string;
    offset?: string;
    status?: string;
}

interface PayoutIdParams {
    id: string;
}

interface RequestPayoutBody {
    amount: number | string;
}

interface ApprovePayoutBody {
    approvedAmount?: number | string;
    notes?: string;
}

interface RejectPayoutBody {
    reason: string;
}

interface CompletePayoutBody {
    transactionRef: string;
}

class PayoutController {
    getBalance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const authReq = req;
        const store = await storeService.getStoreByUserId(authReq.user!.id);
        if (!store) {
            throw new ApiError('Mağaza bulunamadı', StatusCodes.NOT_FOUND);
        }
        const balance = await payoutService.getVendorBalance(store.id);
        return success(res, balance, 'Bakiye bilgisi alındı');
    });

    requestPayout = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, RequestPayoutBody>, res: Response) => {
        const authReq = req;
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            throw new ApiError('Geçerli bir tutar giriniz', StatusCodes.BAD_REQUEST);
        }
        const store = await storeService.getStoreByUserId(authReq.user!.id);
        if (!store) {
            throw new ApiError('Mağaza bulunamadı', StatusCodes.NOT_FOUND);
        }
        const payout = await payoutService.requestPayout(store.id, parseFloat(String(amount)));
        return success(res, payout, 'Ödeme talebi oluşturuldu', StatusCodes.CREATED);
    });

    getHistory = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, unknown, PaginationQuery>, res: Response) => {
        const authReq = req;
        const { limit = '20', offset = '0', status } = req.query;
        const store = await storeService.getStoreByUserId(authReq.user!.id);
        if (!store) {
            throw new ApiError('Mağaza bulunamadı', StatusCodes.NOT_FOUND);
        }
        const history = await payoutService.getPayoutHistory(store.id, {
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
            status: status || null,
        });
        return success(res, history, 'Ödeme geçmişi alındı');
    });

    getPendingPayouts = asyncHandler(async (req: Request<Record<string, string>, unknown, unknown, PaginationQuery>, res: Response) => {
        const { limit = '50', offset = '0' } = req.query;
        const payouts = await payoutService.getPendingPayouts({
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        });
        return success(res, payouts, 'Bekleyen ödemeler alındı');
    });

    getPayoutStats = asyncHandler(async (_req: Request, res: Response) => {
        const stats = await payoutService.getPayoutStats();
        return success(res, stats, 'Ödeme istatistikleri alındı');
    });

    approvePayout = asyncHandler(async (req: AuthenticatedRequest<PayoutIdParams, unknown, ApprovePayoutBody>, res: Response) => {
        const authReq = req;
        const { id } = req.params;
        const { approvedAmount, notes } = req.body;
        const payout = await payoutService.approvePayout(
            id,
            authReq.user!.id,
            approvedAmount ? parseFloat(String(approvedAmount)) : null,
            notes || null
        );
        return success(res, payout, 'Ödeme talebi onaylandı');
    });

    rejectPayout = asyncHandler(async (req: AuthenticatedRequest<PayoutIdParams, unknown, RejectPayoutBody>, res: Response) => {
        const authReq = req;
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) {
            throw new ApiError('Ret sebebi belirtilmeli', StatusCodes.BAD_REQUEST);
        }
        const payout = await payoutService.rejectPayout(id, authReq.user!.id, reason);
        return success(res, payout, 'Ödeme talebi reddedildi');
    });

    completePayout = asyncHandler(async (req: Request<PayoutIdParams, unknown, CompletePayoutBody>, res: Response) => {
        const { id } = req.params;
        const { transactionRef } = req.body;
        if (!transactionRef) {
            throw new ApiError('İşlem referansı girilmeli', StatusCodes.BAD_REQUEST);
        }
        const payout = await payoutService.completePayout(id, transactionRef);
        return success(res, payout, 'Ödeme tamamlandı');
    });

    getPayoutDetails = asyncHandler(async (req: Request<PayoutIdParams>, res: Response) => {
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
