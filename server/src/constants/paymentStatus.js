const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PAID_COUNTER: 'paid_counter',
  REFUNDED: 'refunded'
};

const PAYMENT_STATUS_LIST = Object.values(PAYMENT_STATUSES);

const PERMITTED_PAYMENT_TRANSITIONS = {
  [PAYMENT_STATUSES.PENDING]: [PAYMENT_STATUSES.PAID_COUNTER, PAYMENT_STATUSES.REFUNDED],
  [PAYMENT_STATUSES.PAID_COUNTER]: [PAYMENT_STATUSES.REFUNDED],
  [PAYMENT_STATUSES.REFUNDED]: [] // terminal
};

const isValidPaymentTransition = (currentStatus, targetStatus) => {
  if (!currentStatus || !targetStatus) return false;
  const allowed = PERMITTED_PAYMENT_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
};

module.exports = {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LIST,
  PERMITTED_PAYMENT_TRANSITIONS,
  isValidPaymentTransition
};
