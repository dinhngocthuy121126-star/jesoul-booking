const logger = require('../utils/logger');

function errorMiddleware(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || 'Internal Server Error',
    errors: err.errors || null
  });
}

module.exports = errorMiddleware;

