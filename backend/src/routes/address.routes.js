const express = require('express');
const router = express.Router();
const addressController = require('../controllers/address.controller');
const { authenticate } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Get default address by type (shipping/billing)
router.get('/default/:type', addressController.getDefaultAddress);

// Get all user addresses
router.get('/', addressController.getUserAddresses);

// Get specific address
router.get('/:id', addressController.getAddressById);

// Create new address
router.post('/', addressController.createAddress);

// Update address
router.put('/:id', addressController.updateAddress);

// Delete address
router.delete('/:id', addressController.deleteAddress);

// Set address as default
router.post('/:id/set-default', addressController.setDefaultAddress);

module.exports = router;
