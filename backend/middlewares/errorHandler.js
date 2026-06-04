'use strict';
/**
 * Global Express error handler — last-resort catch for any unhandled next(err).
 * Logs the full error but returns only a safe message to the client.
 */
function errorHandler(err, req, res, next) {
  console.error('[UNHANDLED ERROR]', req.method, req.originalUrl, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

module.exports = errorHandler;
