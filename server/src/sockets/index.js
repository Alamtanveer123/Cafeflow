const { Server } = require('socket.io');
const env = require('../config/env');
const { setIO } = require('./socketEmitter');
const { setupSocketHandlers } = require('./orderSocket');

const initSocketIO = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true
    }
  });

  setIO(io);
  setupSocketHandlers(io);

  return io;
};

module.exports = {
  initSocketIO
};
