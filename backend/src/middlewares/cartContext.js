const { v4: uuidv4 } = require('uuid');

const GUEST_COOKIE_NAME = 'guest_id';
const GUEST_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Attach cart context (user or guest) to request and ensure guest cookie exists.
 */
const attachCartContext = (req, res, next) => {
  const userId = req.user?.id || null;
  let guestId = req.cookies?.[GUEST_COOKIE_NAME] || null;

  if (!userId && !guestId) {
    guestId = uuidv4();
    res.cookie(GUEST_COOKIE_NAME, guestId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: GUEST_COOKIE_MAX_AGE,
    });
  }

  if (userId && !guestId) {
    guestId = null;
  }

  req.cartContext = {
    userId,
    guestId,
  };

  next();
};

module.exports = {
  attachCartContext,
  GUEST_COOKIE_NAME,
};
