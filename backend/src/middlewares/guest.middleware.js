const { v4: uuidv4 } = require('uuid');

const COOKIE_NAME = 'guest_id';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const attachGuestId = (req, res, next) => {
  try {
    let guestId = req.cookies?.[COOKIE_NAME];

    if (!guestId) {
      guestId = uuidv4();
      res.cookie(COOKIE_NAME, guestId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: COOKIE_MAX_AGE,
      });
    }

    req.guestId = guestId;
  } catch (error) {
    console.error('[GuestMiddleware] Failed to attach guest id', error);
  } finally {
    next();
  }
};

module.exports = {
  attachGuestId,
};
