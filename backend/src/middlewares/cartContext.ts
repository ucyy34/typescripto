/**
 * Cart Context Middleware
 * Attach cart context (user or guest) to request and ensure guest cookie exists.
 */

import { Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { CartContextRequest } from '../domain/types/common.types';

const GUEST_COOKIE_NAME = 'guest_id';
const GUEST_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const GUEST_HEADER_NAME = 'x-guest-id';

const normalizeGuestId = (value: unknown): string | null => {
    if (!value || typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return uuidValidate(trimmed) ? trimmed : null;
};

/**
 * Attach cart context (user or guest) to request and ensure guest cookie exists.
 */
const attachCartContext = (req: CartContextRequest, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || null;
    let guestId: string | null = null;

    if (!userId) {
        guestId =
            normalizeGuestId(req.guestId) ||
            normalizeGuestId(req.headers?.[GUEST_HEADER_NAME]) ||
            normalizeGuestId(req.cookies?.[GUEST_COOKIE_NAME]) ||
            null;

        if (!guestId) {
            guestId = uuidv4();
            res.cookie(GUEST_COOKIE_NAME, guestId, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: GUEST_COOKIE_MAX_AGE,
            });
            res.setHeader('X-Guest-Id', guestId);
        }
    } else {
        guestId = null;
    }

    req.cartContext = {
        userId,
        guestId,
    };

    if (!req.guestId && guestId) {
        req.guestId = guestId;
    }

    next();
};

export {
    attachCartContext,
    GUEST_COOKIE_NAME,
};

// CommonJS compatibility
module.exports = {
    attachCartContext,
    GUEST_COOKIE_NAME,
};
