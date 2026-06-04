'use strict';
/**
 * Log the full error server-side and return a safe generic response.
 * Never expose SQL, stack traces, or internal details to the client.
 */
function serverError(res, err, context = '') {
  console.error(`[SERVER ERROR]${context ? ' ' + context + ':' : ''}`, err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

module.exports = serverError;
