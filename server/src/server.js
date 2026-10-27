const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const { initSocketIO } = require('./sockets');

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Create HTTP server and mount Socket.IO
    const server = http.createServer(app);
    initSocketIO(server);

    // 3. Listen on configured port
    server.listen(env.PORT, () => {
      console.log(`[CafeFlow Server] Running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`[CafeFlow Server] REST API: http://localhost:${env.PORT}/api/v1`);
      console.log(`[CafeFlow Server] Socket.IO server ready`);
    });

    // Graceful shutdown
    const handleShutdown = () => {
      console.log('\n[CafeFlow Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[CafeFlow Server] Closed all HTTP and Socket connections.');
        process.exit(0);
      });
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
  } catch (error) {
    console.error(`[CafeFlow Server Startup Error]: ${error.message}`);
    process.exit(1);
  }
};

startServer();
