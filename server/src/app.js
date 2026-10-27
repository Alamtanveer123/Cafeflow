const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { sendError } = require('./utils/apiResponse');

const app = express();

// Middleware setup
app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API v1 Mounting
app.use('/api/v1', apiRoutes);

// Fallback for 404 routes
app.use((req, res) => {
  return sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`);
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
