const Category = require('../models/Category');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Public: List all active categories
 * GET /api/v1/categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .select('_id name description displayOrder');

    return sendSuccess(res, 200, { categories });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create a new category
 * POST /api/v1/admin/categories
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, description, displayOrder } = req.body;
    if (!name || !name.trim()) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Category name is required', [
        { field: 'name', issue: 'Cannot be empty' }
      ]);
    }

    const category = await Category.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0
    });

    return sendSuccess(res, 201, { category }, 'Category created successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory
};
