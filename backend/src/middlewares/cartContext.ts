/**
 * Cart Context Middleware
 * Attach cart context (user or guest) to request and ensure guest cookie exists.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

const GUEST_COOKIE_NAME = 'guest_id';
const GUEST_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const GUEST_HEADER_NAME = 'x-guest-id';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            guestId?: string;
            cartContext?: {
                userId: string | null;
                guestId: string | null;
            };
        }
    }
}

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
const attachCartContext = (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as any).user?.id || null;
    let guestId: string | null = null;

    if (!userId) {
        guestId =
            normalizeGuestId((req as any).guestId) ||
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

    (req as any).cartContext = {
        userId,
        guestId,
    };

    if (!(req as any).guestId && guestId) {
        (req as any).guestId = guestId;
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
