const express = require('express');
const { getCategories, createCategory } = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public: List active categories
router.get('/', getCategories);

// Protected Admin: Category creation (supports both /categories and /admin/categories)
router.post('/', authenticate, authorize(['admin']), createCategory);

module.exports = router;
