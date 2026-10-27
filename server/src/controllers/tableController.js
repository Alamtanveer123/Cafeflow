const Table = require('../models/Table');
const { generateSecureToken } = require('../utils/generateTokens');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Public: Validate QR token when customer scans a table
 * GET /api/v1/tables/validate-qr/:qrCodeToken
 */
const validateQR = async (req, res, next) => {
  try {
    const { qrCodeToken } = req.params;
    if (!qrCodeToken) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'QR code token is required');
    }

    const table = await Table.findOne({ qrCodeToken, isActive: true });
    if (!table) {
      return sendError(res, 404, 'TABLE_NOT_FOUND', 'Scanned QR code does not match an active table');
    }

    return sendSuccess(res, 200, {
      table: {
        _id: table._id,
        tableNumber: table.tableNumber,
        status: table.status,
        isActive: table.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: List all cafe tables
 * GET /api/v1/admin/tables
 */
const getTables = async (req, res, next) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    return sendSuccess(res, 200, { tables });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create a new cafe table
 * POST /api/v1/admin/tables
 */
const createTable = async (req, res, next) => {
  try {
    const { tableNumber, capacity } = req.body;

    if (!tableNumber || !String(tableNumber).trim()) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Table number is required', [
        { field: 'tableNumber', issue: 'Cannot be empty' }
      ]);
    }

    const qrCodeToken = `qr_tab_${generateSecureToken(16)}`;

    const table = await Table.create({
      tableNumber: String(tableNumber).trim(),
      capacity: capacity ? Number(capacity) : 2,
      qrCodeToken
    });

    return sendSuccess(res, 201, { table }, 'Table created successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateQR,
  getTables,
  createTable
};
