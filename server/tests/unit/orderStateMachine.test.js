const {
  ORDER_STATUSES,
  isValidStatusTransition,
  PERMITTED_TRANSITIONS
} = require('../../src/constants/orderStatus');

describe('Order State Machine & Transitions', () => {
  test('allows legal transition: placed -> confirmed', () => {
    expect(isValidStatusTransition(ORDER_STATUSES.PLACED, ORDER_STATUSES.CONFIRMED)).toBe(true);
  });

  test('allows legal transition: confirmed -> preparing', () => {
    expect(isValidStatusTransition(ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.PREPARING)).toBe(true);
  });

  test('allows legal transition: preparing -> ready', () => {
    expect(isValidStatusTransition(ORDER_STATUSES.PREPARING, ORDER_STATUSES.READY)).toBe(true);
  });

  test('allows legal transition: ready -> completed', () => {
    expect(isValidStatusTransition(ORDER_STATUSES.READY, ORDER_STATUSES.COMPLETED)).toBe(true);
  });

  test('allows cancellation from non-terminal states', () => {
    expect(isValidStatusTransition(ORDER_STATUSES.PLACED, ORDER_STATUSES.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(ORDER_STATUSES.PREPARING, ORDER_STATUSES.CANCELLED)).toBe(true);
    expect(isValidStatusTransition(ORDER_STATUSES.READY, ORDER_STATUSES.CANCELLED)).toBe(true);
  });

  test('rejects illegal transition: placed -> completed', () => {
    expect(isValidStatusTransition(ORDER_STATUSES.PLACED, ORDER_STATUSES.COMPLETED)).toBe(false);
  });

  test('rejects illegal transition: ready -> preparing (backward step)', () => {
    expect(isValidStatusTransition(ORDER_STATUSES.READY, ORDER_STATUSES.PREPARING)).toBe(false);
  });

  test('rejects transition from terminal states: completed', () => {
    expect(isValidStatusTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED)).toBe(false);
    expect(isValidStatusTransition(ORDER_STATUSES.COMPLETED, ORDER_STATUSES.PREPARING)).toBe(false);
  });

  test('rejects transition from terminal states: cancelled', () => {
    expect(isValidStatusTransition(ORDER_STATUSES.CANCELLED, ORDER_STATUSES.PLACED)).toBe(false);
  });

  test('rejects undefined or invalid inputs', () => {
    expect(isValidStatusTransition(null, 'ready')).toBe(false);
    expect(isValidStatusTransition('placed', null)).toBe(false);
    expect(isValidStatusTransition('unknown_state', 'ready')).toBe(false);
  });
});
