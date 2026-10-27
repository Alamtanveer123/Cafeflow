require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5001,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cafeflow',
  JWT_SECRET: process.env.JWT_SECRET || 'cafeflow_default_development_secret_key_32chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  TAX_RATE_PERCENTAGE: parseFloat(process.env.TAX_RATE_PERCENTAGE || '0.0')
};

module.exports = env;
