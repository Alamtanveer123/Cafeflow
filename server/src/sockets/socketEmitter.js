let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => {
  return ioInstance;
};

/**
 * Emit event to staff/kitchen dashboard room
 */
const emitToAdmin = (event, data) => {
  if (ioInstance) {
    ioInstance.to('admin:orders').emit(event, data);
  }
};

/**
 * Emit event to specific order tracking room
 */
const emitToOrder = (orderId, event, data) => {
  if (ioInstance) {
    ioInstance.to(`order:${orderId}`).emit(event, data);
  }
};

/**
 * Broadcast event to all connected sockets
 */
const emitToAll = (event, data) => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
};

module.exports = {
  setIO,
  getIO,
  emitToAdmin,
  emitToOrder,
  emitToAll
};
