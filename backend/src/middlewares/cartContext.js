const { v4: uuidv4, validate: uuidValidate } = require('uuid');

const GUEST_COOKIE_NAME = 'guest_id';
const GUEST_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const GUEST_HEADER_NAME = 'x-guest-id';

const normalizeGuestId = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return uuidValidate(trimmed) ? trimmed : null;
};

/**
 * Attach cart context (user or guest) to request and ensure guest cookie exists.
 */
const attachCartContext = (req, res, next) => {
  const userId = req.user?.id || null;
  let guestId = null;

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

module.exports = {
  attachCartContext,
  GUEST_COOKIE_NAME,
};
