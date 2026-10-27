const ORDER_STATUSES = {
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const ORDER_STATUS_LIST = Object.values(ORDER_STATUSES);

// Directed transition graph
const PERMITTED_TRANSITIONS = {
  [ORDER_STATUSES.PLACED]: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.CONFIRMED]: [ORDER_STATUSES.PREPARING, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.PREPARING]: [ORDER_STATUSES.READY, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.READY]: [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.COMPLETED]: [], // terminal
  [ORDER_STATUSES.CANCELLED]: []  // terminal
};

/**
 * Validates if a transition from currentStatus to targetStatus is allowed.
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @returns {boolean}
 */
const isValidStatusTransition = (currentStatus, targetStatus) => {
  if (!currentStatus || !targetStatus) return false;
  const allowed = PERMITTED_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
};

module.exports = {
  ORDER_STATUSES,
  ORDER_STATUS_LIST,
  PERMITTED_TRANSITIONS,
  isValidStatusTransition
};
