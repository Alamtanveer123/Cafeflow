const { sendError } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  // If headers are already sent, delegate to standard Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.keys(err.errors).map((field) => ({
      field,
      issue: err.errors[field].message
    }));
    return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', details);
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    const details = fields.map((field) => ({
      field,
      issue: `${field} must be unique. '${err.keyValue[field]}' already exists.`
    }));
    return sendError(res, 409, 'DUPLICATE_RESOURCE', 'Resource already exists', details);
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, 400, 'INVALID_ID', `Invalid identifier format for ${err.path}`);
  }

  // Custom client errors
  if (err.statusCode && err.code) {
    return sendError(res, err.statusCode, err.code, err.message, err.details || []);
  }

  // Generic internal server error (never leak raw stack or secrets in production)
  console.error('[CafeFlow Server Error]:', err);
  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred on the server');
};

module.exports = errorHandler;
