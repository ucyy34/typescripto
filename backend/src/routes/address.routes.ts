/**
 * Address Routes
 */

import { Router } from 'express';

import addressController from '../controllers/address.controller';
import { authenticate } from '../middlewares/auth';

const router: Router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/default/:type', addressController.getDefaultAddress);
router.get('/', addressController.getUserAddresses);
router.get('/:id', addressController.getAddressById);
router.post('/', addressController.createAddress);
router.put('/:id', addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);
router.post('/:id/set-default', addressController.setDefaultAddress);

export = router;
