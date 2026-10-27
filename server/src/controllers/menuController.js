const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { emitToAll } = require('../sockets/socketEmitter');

/**
 * Public: Get active menu items
 * GET /api/v1/menu
 */
const getMenuItems = async (req, res, next) => {
  try {
    const { category, availableOnly } = req.query;
    const filter = {};

    // For customers, default availableOnly to true unless specified
    if (availableOnly === undefined || availableOnly === 'true') {
      filter.isAvailable = true;
    } else if (availableOnly === 'false') {
      filter.isAvailable = false;
    }

    if (category) {
      filter.category = category;
    }

    const menuItems = await MenuItem.find(filter)
      .populate('category', '_id name')
      .sort({ displayOrder: 1, name: 1 });

    return sendSuccess(res, 200, { menuItems });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create a new menu item
 * POST /api/v1/admin/menu
 */
const createMenuItem = async (req, res, next) => {
  try {
    const { name, description, category, price, imageUrl, isAvailable, dietaryFlags, displayOrder } = req.body;

    const details = [];
    if (!name || !name.trim()) details.push({ field: 'name', issue: 'Item name is required' });
    if (!category) details.push({ field: 'category', issue: 'Category is required' });
    if (price === undefined || isNaN(price) || Number(price) < 0) {
      details.push({ field: 'price', issue: 'Valid non-negative price is required' });
    }

    if (details.length > 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return sendError(res, 404, 'CATEGORY_NOT_FOUND', 'Specified category does not exist');
    }

    const item = await MenuItem.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      category,
      price: Number(price),
      imageUrl: imageUrl || '',
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      dietaryFlags: Array.isArray(dietaryFlags) ? dietaryFlags : [],
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0
    });

    const populatedItem = await item.populate('category', '_id name');
    return sendSuccess(res, 201, { menuItem: populatedItem }, 'Menu item created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Toggle or set menu item availability
 * PATCH /api/v1/admin/menu/:id/availability
 */
const updateMenuItemAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return sendError(res, 400, 'VALIDATION_ERROR', "'isAvailable' boolean field is required");
    }

    const item = await MenuItem.findByIdAndUpdate(
      id,
      { isAvailable },
      { new: true, runValidators: true }
    );

    if (!item) {
      return sendError(res, 404, 'ITEM_NOT_FOUND', 'Menu item not found');
    }

    // Emit live event to all clients to update menu cards instantly
    emitToAll('menu:availability_changed', {
      menuItemId: item._id,
      isAvailable: item.isAvailable
    });

    return sendSuccess(res, 200, { menuItem: item }, 'Item availability updated');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMenuItems,
  createMenuItem,
  updateMenuItemAvailability
};
