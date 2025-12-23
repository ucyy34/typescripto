const { v4: uuidv4, validate: uuidValidate } = require('uuid');

const COOKIE_NAME = 'guest_id';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const GUEST_HEADER_NAME = 'x-guest-id';

const normalizeGuestId = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return uuidValidate(trimmed) ? trimmed : null;
};

const attachGuestId = (req, res, next) => {
  try {
    const headerGuest = normalizeGuestId(req.headers?.[GUEST_HEADER_NAME]);
    const cookieGuest = normalizeGuestId(req.cookies?.[COOKIE_NAME]);
    let guestId = cookieGuest || headerGuest;

    if (!guestId) {
      guestId = uuidv4();
    }

    if (!cookieGuest || cookieGuest !== guestId) {
      res.cookie(COOKIE_NAME, guestId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: COOKIE_MAX_AGE,
      });
    }

    req.guestId = guestId;
    res.setHeader('X-Guest-Id', guestId);
  } catch (error) {
    console.error('[GuestMiddleware] Failed to attach guest id', error);
    req.guestId = req.guestId || null;
  } finally {
    next();
  }
};

module.exports = {
  attachGuestId,
};
