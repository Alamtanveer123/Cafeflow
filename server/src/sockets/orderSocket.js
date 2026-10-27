const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Order = require('../models/Order');
const User = require('../models/User');

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    // 1. Customer joins their specific order room for live tracking
    socket.on('order:join_tracking', async (data) => {
      try {
        const { orderId, customerTrackingToken } = data || {};
        if (!orderId || !customerTrackingToken) {
          return socket.emit('tracking_error', {
            message: 'Both orderId and customerTrackingToken are required'
          });
        }

        const order = await Order.findById(orderId).select('customerTrackingToken');
        if (!order || order.customerTrackingToken !== customerTrackingToken) {
          return socket.emit('tracking_error', {
            message: 'Invalid tracking token or order not found'
          });
        }

        const roomName = `order:${orderId}`;
        socket.join(roomName);
        socket.emit('order:joined', { room: roomName, orderId });
      } catch (err) {
        socket.emit('tracking_error', { message: 'Failed to join tracking room' });
      }
    });

    // 2. Staff/Admin joins administrative live order stream
    socket.on('admin:join', async (data) => {
      try {
        const token = data?.token;
        if (!token) {
          return socket.emit('admin:error', { message: 'Authentication token required' });
        }

        let decoded;
        try {
          decoded = jwt.verify(token, env.JWT_SECRET);
        } catch (e) {
          return socket.emit('admin:error', { message: 'Invalid or expired token' });
        }

        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
          return socket.emit('admin:error', { message: 'Unauthorized user' });
        }

        socket.join('admin:orders');
        socket.emit('admin:joined', {
          room: 'admin:orders',
          user: { name: user.name, role: user.role }
        });
      } catch (err) {
        socket.emit('admin:error', { message: 'Failed to join admin stream' });
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
};

module.exports = {
  setupSocketHandlers
};
