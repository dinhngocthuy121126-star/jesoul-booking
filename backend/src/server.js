const app = require('./app');
const config = require('./config/environment');
const { connectDatabase } = require('./config/database');
const { initSeatReleaseJob } = require('./jobs/seatReleaseJob');
const { initNoReplyTimeoutJob } = require('./jobs/noReplyTimeoutJob');
const { initEmailDispatchJob } = require('./jobs/emailDispatchJob');
const logger = require('./utils/logger');

async function startServer() {
  try {
    // 1. Kết nối Microsoft SQL Server
    await connectDatabase();

    // 2. Khởi động các tiến trình Schedulers chạy ngầm
    initSeatReleaseJob();
    initNoReplyTimeoutJob();
    initEmailDispatchJob();

    // 3. Lắng nghe Port
    const server = app.listen(config.port, () => {
      logger.info(`=======================================================`);
      logger.info(` JESOUL BUS BOOKING BACKEND SERVER IS RUNNING`);
      logger.info(` Port: ${config.port} | Mode: ${config.nodeEnv}`);
      logger.info(` Health Check: http://localhost:${config.port}/api/v1/health`);
      logger.info(`=======================================================`);
    });

    return server;
  } catch (error) {
    logger.error(`Không thể khởi động server: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
