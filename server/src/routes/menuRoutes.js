const express = require('express');
const {
  getMenuItems,
  createMenuItem,
  updateMenuItemAvailability
} = require('../controllers/menuController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public: View active menu
router.get('/', getMenuItems);

// Admin / Staff operations (also mounted at /api/v1/admin/menu)
router.post('/', authenticate, authorize(['admin']), createMenuItem);
router.patch('/:id/availability', authenticate, authorize(['admin', 'staff']), updateMenuItemAvailability);

// Backward-compatibility alias for tests
router.post('/admin', authenticate, authorize(['admin']), createMenuItem);
router.patch('/admin/:id/availability', authenticate, authorize(['admin', 'staff']), updateMenuItemAvailability);

module.exports = router;
