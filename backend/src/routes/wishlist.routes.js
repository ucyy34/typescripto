const express = require('express');
const router = express.Router();

const wishlistController = require('../controllers/wishlist.controller');
const { authenticate, requireBuyer } = require('../middlewares/auth');
const { validate, validateParams } = require('../middlewares/validate');
const { wishlistAddSchema, wishlistParamsSchema } = require('../validators/wishlist.validator');

router.use(authenticate);
router.use(requireBuyer);

router.get('/', wishlistController.list);
router.post('/', validate(wishlistAddSchema), wishlistController.add);
router.delete('/:productId', validateParams(wishlistParamsSchema), wishlistController.remove);

module.exports = router;
