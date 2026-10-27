const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { sendError } = require('../utils/apiResponse');

/**
 * Verifies JWT token and attaches user object to request.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Token is invalid or has expired');
    }

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || !user.isActive) {
      return sendError(res, 401, 'USER_INACTIVE', 'User account not found or deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Authentication failed');
  }
};

/**
 * Restricts access to specific roles.
 * @param {Array<string>} roles e.g. ['admin'] or ['admin', 'staff']
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions for this resource');
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
