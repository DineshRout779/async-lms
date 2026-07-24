const moment = require('moment-timezone');

function logAction({ req, action, entityType, entityId, details }) {
  const entry = {
    timestamp: moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss A'),
    userId: req?.user?.id ?? null,
    userRole: req?.user?.role ?? null,
    method: req?.method,
    path: req?.originalUrl,
    action,
    entityType,
    entityId,
    ...(details !== undefined ? { details } : {}),
  };
  console.log('[AUDIT]', JSON.stringify(entry));
}

module.exports = { logAction };
