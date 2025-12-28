/**
 * Order Controller
 * Handles order operations with FSM state management
 */

import { Request, Response } from 'express';

import orderService = require('../services/order.service');
import paymentService = require('../services/payment.service');

import { success, paginated } from '../utils/response';
import { asyncHandler } from '../middlewares/errorHandler';
import type { AuthenticatedRequest } from '../domain/types';
import type { CreateOrderDTO, OrderIdParams, UpdateOrderStatusDTO } from '../application/schemas/order.schema';

interface StoreIdParams {
  storeId: string;
}

interface OrderNumberParams {
  orderNumber: string;
}

interface OrdersQuery {
  page?: string;
  limit?: string;
  status?: string;
  sort?: string;
  store_id?: string;
  user_id?: string;
}

class OrderController {
  createOrder = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, CreateOrderDTO>, res: Response) => {
    const authReq = req;
    const userId = authReq.user ? authReq.user.id : null;
    const order = await orderService.createOrder(userId, req.body);
    return success(res, order, 'Order created successfully', 201);
  });

  getUserOrders = asyncHandler(async (req: AuthenticatedRequest<Record<string, string>, unknown, unknown, OrdersQuery>, res: Response) => {
    const authReq = req;
    const { orders, pagination } = await orderService.getUserOrders(authReq.user!.id, req.query);
    return paginated(res, orders, pagination, 'Orders retrieved successfully');
  });

  getOrder = asyncHandler(async (req: AuthenticatedRequest<OrderIdParams>, res: Response) => {
    const authReq = req;
    const order = await orderService.getOrderById(req.params.id, authReq.user!.id, authReq.user!.role);
    return success(res, order, 'Order retrieved successfully');
  });

  updateOrderStatus = asyncHandler(async (req: AuthenticatedRequest<OrderIdParams, unknown, UpdateOrderStatusDTO>, res: Response) => {
    const authReq = req;
    const order = await orderService.updateOrderStatus(
      req.params.id,
      authReq.user!.id,
      authReq.user!.role,
      req.body
    );
    return success(res, order, `Order status updated to ${req.body.status}`);
  });

  getAllOrders = asyncHandler(async (req: Request<Record<string, string>, unknown, unknown, OrdersQuery>, res: Response) => {
    const { orders, pagination } = await orderService.getAllOrders(req.query);
    return paginated(res, orders, pagination, 'All orders retrieved successfully');
  });

  getStoreOrders = asyncHandler(async (req: AuthenticatedRequest<StoreIdParams, unknown, unknown, OrdersQuery>, res: Response) => {
    const authReq = req;
    const { orders, pagination } = await orderService.getStoreOrders(
      req.params.storeId,
      authReq.user!.id,
      req.query
    );
    return paginated(res, orders, pagination, 'Store orders retrieved successfully');
  });

  markPaid = asyncHandler(async (req: Request<OrderIdParams, unknown, Record<string, unknown>>, res: Response) => {
    const order = await paymentService.markPaymentSuccessful(req.params.id, req.body || {});
    return success(res, order, 'Order marked as paid');
  });

  markShipped = asyncHandler(async (req: Request<OrderIdParams, unknown, Record<string, unknown>>, res: Response) => {
    const order = await orderService.markOrderShipped(req.params.id, req.body || {});
    return success(res, order, 'Order marked as shipped');
  });

  markCompleted = asyncHandler(async (req: Request<OrderIdParams, unknown, Record<string, unknown>>, res: Response) => {
    const order = await orderService.markOrderCompleted(req.params.id, req.body || {});
    return success(res, order, 'Order marked as completed');
  });

  trackOrder = asyncHandler(async (req: Request<OrderNumberParams>, res: Response) => {
    const order = await orderService.getOrderByNumber(req.params.orderNumber);
    return success(res, order, 'Sipariş bilgisi alındı');
  });
}

export = new OrderController();
