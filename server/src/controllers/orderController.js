const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const env = require('../config/env');
const { generateSecureToken, generateOrderNumber } = require('../utils/generateTokens');
const { calculateOrderTotals } = require('../utils/priceCalculator');
const { isValidStatusTransition, ORDER_STATUSES } = require('../constants/orderStatus');
const { isValidPaymentTransition, PAYMENT_STATUSES } = require('../constants/paymentStatus');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { emitToAdmin, emitToOrder } = require('../sockets/socketEmitter');

/**
 * Public Customer: Place a new order
 * POST /api/v1/orders
 */
const createOrder = async (req, res, next) => {
  try {
    const { qrCodeToken, items, customerNotes } = req.body;

    if (!qrCodeToken) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'qrCodeToken is required');
    }

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'EMPTY_CART', 'Order must contain at least one item');
    }

    // 1. Verify table is active
    const table = await Table.findOne({ qrCodeToken, isActive: true });
    if (!table) {
      return sendError(res, 404, 'TABLE_NOT_FOUND', 'Valid active table required to place order');
    }

    // 2. Fetch and validate each MenuItem from database
    const validatedItems = [];
    const unavailableItems = [];

    for (const line of items) {
      const { menuItemId, quantity, specialInstructions } = line;

      if (!menuItemId || !quantity || Number(quantity) < 1) {
        return sendError(res, 400, 'INVALID_ITEM', 'Each line item must specify valid menuItemId and quantity >= 1');
      }

      const itemDoc = await MenuItem.findById(menuItemId);
      if (!itemDoc) {
        return sendError(res, 404, 'ITEM_NOT_FOUND', `Menu item ${menuItemId} does not exist`);
      }

      if (!itemDoc.isAvailable) {
        unavailableItems.push({
          menuItemId: itemDoc._id,
          name: itemDoc.name
        });
      }

      validatedItems.push({
        itemDoc,
        quantity: Math.floor(Number(quantity)),
        specialInstructions: specialInstructions ? String(specialInstructions).slice(0, 200) : ''
      });
    }

    // Reject if any item is not available
    if (unavailableItems.length > 0) {
      return sendError(
        res,
        400,
        'ITEM_UNAVAILABLE',
        'One or more items in your cart are currently out of stock',
        unavailableItems
      );
    }

    // 3. Server calculates prices & snapshots
    const { itemsSnapshot, subtotal, tax, totalAmount } = calculateOrderTotals(
      validatedItems,
      env.TAX_RATE_PERCENTAGE
    );

    const customerTrackingToken = generateSecureToken(32);
    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      table: table._id,
      tableNumberSnapshot: table.tableNumber,
      items: itemsSnapshot,
      subtotal,
      tax,
      totalAmount,
      orderStatus: ORDER_STATUSES.PLACED,
      paymentStatus: PAYMENT_STATUSES.PENDING,
      customerTrackingToken,
      customerNotes: customerNotes ? String(customerNotes).slice(0, 300) : '',
      statusHistory: [
        {
          status: ORDER_STATUSES.PLACED,
          changedAt: new Date(),
          note: 'Order placed by customer'
        }
      ]
    });

    // 4. Emit live alert to kitchen/staff dashboard room
    emitToAdmin('order:created', {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        tableNumberSnapshot: order.tableNumberSnapshot,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        items: order.items,
        customerNotes: order.customerNotes,
        createdAt: order.createdAt
      }
    });

    return sendSuccess(
      res,
      201,
      {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          tableNumber: order.tableNumberSnapshot,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          items: order.items,
          subtotal: order.subtotal,
          tax: order.tax,
          totalAmount: order.totalAmount,
          customerNotes: order.customerNotes,
          createdAt: order.createdAt
        },
        customerTrackingToken
      },
      'Order placed successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Customer: Track order status securely
 * GET /api/v1/orders/:orderId/track
 */
const trackOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const token = req.query.token || req.headers['x-customer-token'];

    if (!token) {
      return sendError(res, 401, 'TRACKING_TOKEN_REQUIRED', 'Customer tracking token is required');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Security Check: Customer token must match order's customerTrackingToken
    if (order.customerTrackingToken !== token) {
      return sendError(res, 403, 'FORBIDDEN', 'Invalid tracking token for this order');
    }

    return sendSuccess(res, 200, {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumberSnapshot,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        items: order.items,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: List orders with filters & pagination
 * GET /api/v1/admin/orders
 */
const getAdminOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-customerTrackingToken'),
      Order.countDocuments(filter)
    ]);

    return sendSuccess(res, 200, {
      orders,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update order status along state machine
 * PATCH /api/v1/admin/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { orderStatus, note } = req.body;

    if (!orderStatus) {
      return sendError(res, 400, 'VALIDATION_ERROR', "'orderStatus' is required");
    }

    const order = await Order.findById(id);
    if (!order) {
      return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Verify status transition
    if (!isValidStatusTransition(order.orderStatus, orderStatus)) {
      return sendError(
        res,
        400,
        'INVALID_STATUS_TRANSITION',
        `Cannot transition order status from '${order.orderStatus}' directly to '${orderStatus}'`
      );
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = orderStatus;
    order.statusHistory.push({
      status: orderStatus,
      changedAt: new Date(),
      changedBy: req.user._id,
      note: note || ''
    });

    await order.save();

    // 1. Broadcast status change to order room and admin stream
    emitToOrder(order._id, 'order:status_updated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      previousStatus,
      orderStatus: order.orderStatus,
      updatedAt: order.updatedAt,
      note: note || ''
    });

    emitToAdmin('order:status_updated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      previousStatus,
      orderStatus: order.orderStatus,
      updatedAt: order.updatedAt,
      note: note || ''
    });

    // 2. High priority alert if status is 'ready'
    if (orderStatus === ORDER_STATUSES.READY) {
      emitToOrder(order._id, 'order:ready', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: `Your order ${order.orderNumber} is ready for pickup at the counter!`,
        tableNumber: order.tableNumberSnapshot,
        paymentStatus: order.paymentStatus,
        readyAt: new Date()
      });
    }

    return sendSuccess(
      res,
      200,
      {
        orderId: order._id,
        orderStatus: order.orderStatus,
        previousStatus,
        updatedAt: order.updatedAt
      },
      `Order status updated to ${orderStatus}`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update counter payment status
 * PATCH /api/v1/admin/orders/:id/payment
 */
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentStatus, note } = req.body;

    if (!paymentStatus) {
      return sendError(res, 400, 'VALIDATION_ERROR', "'paymentStatus' is required");
    }

    const order = await Order.findById(id);
    if (!order) {
      return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    if (!isValidPaymentTransition(order.paymentStatus, paymentStatus)) {
      return sendError(
        res,
        400,
        'INVALID_PAYMENT_TRANSITION',
        `Cannot transition payment status from '${order.paymentStatus}' to '${paymentStatus}'`
      );
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    // Emit live event
    const payload = {
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      updatedAt: order.updatedAt
    };

    emitToOrder(order._id, 'order:payment_updated', payload);
    emitToAdmin('order:payment_updated', payload);

    return sendSuccess(
      res,
      200,
      {
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        updatedAt: order.updatedAt
      },
      'Payment status updated'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  trackOrder,
  getAdminOrders,
  updateOrderStatus,
  updatePaymentStatus
};
