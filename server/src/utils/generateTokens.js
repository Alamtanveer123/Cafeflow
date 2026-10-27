const crypto = require('crypto');

/**
 * Generate a cryptographically secure random token string.
 * @param {number} bytes
 * @returns {string} hex string
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generate human readable sequential-like order code (e.g. CF-8392)
 * @returns {string}
 */
const generateOrderNumber = () => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CF-${randomSuffix}`;
};

module.exports = {
  generateSecureToken,
  generateOrderNumber
};
