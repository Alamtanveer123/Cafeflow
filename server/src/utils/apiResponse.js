/**
 * Build standardized JSON success envelope.
 * @param {object} res Express response object
 * @param {number} statusCode HTTP status code (200, 201, etc.)
 * @param {object} data Payload object
 * @param {string} [message] Optional confirmation message
 */
const sendSuccess = (res, statusCode = 200, data = {}, message) => {
  const response = {
    success: true,
    data
  };
  if (message) {
    response.message = message;
  }
  return res.status(statusCode).json(response);
};

/**
 * Build standardized JSON error envelope.
 * @param {object} res Express response object
 * @param {number} statusCode HTTP status code (400, 401, 403, 404, 500)
 * @param {string} code Machine-readable error code
 * @param {string} message Human-readable message
 * @param {Array} [details] Array of specific field errors
 */
const sendError = (res, statusCode = 400, code = 'BAD_REQUEST', message = 'An error occurred', details = []) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
};

module.exports = {
  sendSuccess,
  sendError
};
