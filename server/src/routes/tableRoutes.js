const express = require('express');
const { validateQR, getTables, createTable } = require('../controllers/tableController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public: Customer QR validation
router.get('/validate-qr/:qrCodeToken', validateQR);

// Admin: Table management (also available directly at /tables and /admin/tables)
router.get('/', authenticate, authorize(['admin', 'staff']), getTables);
router.post('/', authenticate, authorize(['admin']), createTable);

// Backward-compatibility alias for tests
router.get('/admin', authenticate, authorize(['admin', 'staff']), getTables);
router.post('/admin', authenticate, authorize(['admin']), createTable);

module.exports = router;
