/**
 * Order Controller
 * Handles order operations with FSM state management
 */

import { Request, Response } from 'express';

// TODO(ts-migration): replace any with proper service types when services are fully typed
import _orderService from '../services/order.service';
import _paymentService from '../services/payment.service';
const orderService = _orderService as any;
const paymentService = _paymentService as any;

import { success, paginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

class OrderController {
  createOrder = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user ? authReq.user.id : null;
    const order = await orderService.createOrder(userId, req.body);
    return success(res, order, 'Order created successfully', 201);
  });

  getUserOrders = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { orders, pagination } = await orderService.getUserOrders(authReq.user!.id, req.query);
    return paginated(res, orders, pagination, 'Orders retrieved successfully');
  });

  getOrder = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const order = await orderService.getOrderById(req.params.id, authReq.user!.id, authReq.user!.role);
    return success(res, order, 'Order retrieved successfully');
  });

  updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const order = await orderService.updateOrderStatus(
      req.params.id,
      authReq.user!.id,
      authReq.user!.role,
      req.body
    );
    return success(res, order, `Order status updated to ${req.body.status}`);
  });

  getAllOrders = asyncHandler(async (req: Request, res: Response) => {
    const { orders, pagination } = await orderService.getAllOrders(req.query);
    return paginated(res, orders, pagination, 'All orders retrieved successfully');
  });

  getStoreOrders = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { orders, pagination } = await orderService.getStoreOrders(
      req.params.storeId,
      authReq.user!.id,
      req.query
    );
    return paginated(res, orders, pagination, 'Store orders retrieved successfully');
  });

  markPaid = asyncHandler(async (req: Request, res: Response) => {
    const order = await paymentService.markPaymentSuccessful(req.params.id, req.body || {});
    return success(res, order, 'Order marked as paid');
  });

  markShipped = asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.markOrderShipped(req.params.id, req.body || {});
    return success(res, order, 'Order marked as shipped');
  });

  markCompleted = asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.markOrderCompleted(req.params.id, req.body || {});
    return success(res, order, 'Order marked as completed');
  });

  trackOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getOrderByNumber(req.params.orderNumber);
    return success(res, order, 'Sipariş bilgisi alındı');
  });
}

export = new OrderController();
