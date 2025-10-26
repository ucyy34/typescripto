const shippingService = require('../services/shipping.service');
const { success, created } = require('../utils/response');

async function getRates(req, res) {
  const data = await shippingService.getRates(req.body);
  return success(res, { rates: data }, 'Rates fetched');
}

async function createShipment(req, res) {
  const payload = { ...req.body, storeId: req.params.storeId };
  const data = await shippingService.createShipment(payload);
  return created(res, data, 'Shipment created');
}

async function getShipment(req, res) {
  const data = await shippingService.getShipmentById(req.params.id);
  return success(res, data, 'Shipment fetched');
}

async function cancelShipment(req, res) {
  const data = await shippingService.cancelShipment(req.params.id);
  return success(res, data, 'Shipment cancelled');
}

async function track(req, res) {
  const data = await shippingService.track(req.params.trackingNumber);
  return success(res, data, 'Tracking fetched');
}

module.exports = {
  getRates,
  createShipment,
  getShipment,
  cancelShipment,
  track,
};
