const express = require('express');
const { getAdminOrders, updateOrderStatus, updatePaymentStatus } = require('../controllers/orderController');
const { getTables, createTable } = require('../controllers/tableController');
const { createMenuItem, updateMenuItemAvailability } = require('../controllers/menuController');
const { createCategory } = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes here require authentication
router.use(authenticate);

// Orders
router.get('/orders', authorize(['admin', 'staff']), getAdminOrders);
router.patch('/orders/:id/status', authorize(['admin', 'staff']), updateOrderStatus);
router.patch('/orders/:id/payment', authorize(['admin', 'staff']), updatePaymentStatus);

// Tables
router.get('/tables', authorize(['admin', 'staff']), getTables);
router.post('/tables', authorize(['admin']), createTable);

// Menu & Categories
router.post('/menu', authorize(['admin']), createMenuItem);
router.patch('/menu/:id/availability', authorize(['admin', 'staff']), updateMenuItemAvailability);
router.post('/categories', authorize(['admin']), createCategory);

module.exports = router;
