/**
 * Guest Identity Middleware
 * Attach guest identity to request for anonymous users
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

const GUEST_COOKIE_NAME = 'guest_id';
const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const attachGuestIdentity = (req: Request, res: Response, next: NextFunction): void => {
    try {
        let guestId = req.cookies?.[GUEST_COOKIE_NAME];

        if (!guestId) {
            guestId = uuid();
            res.cookie(GUEST_COOKIE_NAME, guestId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: DEFAULT_MAX_AGE,
            });
        }

        (req as any).guestId = guestId;
    } catch (error) {
        // In case cookies are not accessible (edge cases), still continue without blocking request
        console.warn('[GuestIdentity] Failed to attach guest ID', error);
        (req as any).guestId = undefined;
    }

    next();
};

export default attachGuestIdentity;

// CommonJS compatibility
module.exports = attachGuestIdentity;
