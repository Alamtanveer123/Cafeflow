const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async (customUri) => {
  const uri = customUri || env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(uri);
    if (env.NODE_ENV !== 'test') {
      console.log(`[CafeFlow DB] MongoDB connected: ${conn.connection.host}`);
    }
    return conn;
  } catch (err) {
    console.error(`[CafeFlow DB] MongoDB connection error: ${err.message}`);
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw err;
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = {
  connectDB,
  disconnectDB
};
