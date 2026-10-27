const express = require('express');
const {
  createOrder,
  trackOrder,
  getAdminOrders,
  updateOrderStatus,
  updatePaymentStatus
} = require('../controllers/orderController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public Customer endpoints
router.post('/', createOrder);
router.get('/:orderId/track', trackOrder);

// Staff / Admin endpoints (mounted both at /orders and via /admin/orders)
router.get('/', authenticate, authorize(['admin', 'staff']), getAdminOrders);
router.patch('/:id/status', authenticate, authorize(['admin', 'staff']), updateOrderStatus);
router.patch('/:id/payment', authenticate, authorize(['admin', 'staff']), updatePaymentStatus);

// Backward-compatibility alias for initial tests
router.get('/admin/orders', authenticate, authorize(['admin', 'staff']), getAdminOrders);
router.patch('/admin/orders/:id/status', authenticate, authorize(['admin', 'staff']), updateOrderStatus);
router.patch('/admin/orders/:id/payment', authenticate, authorize(['admin', 'staff']), updatePaymentStatus);

module.exports = router;
