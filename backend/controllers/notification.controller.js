const serverError = require('../utils/serverError');
'use strict';
const pool = require('../config/pg');
const { logAction } = require('../utils/auditLogger');

/** GET /api/v1/notifications — last 50 for the authenticated user */
exports.list = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT id, type, title, body, link, is_read, created_at
       FROM notifications
       WHERE user_id = $1 AND is_deleted = false
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );
    const unreadCount = rows.filter((n) => !n.is_read).length;
    res.json({ success: true, data: rows, unread_count: unreadCount });
  } catch (err) {
    serverError(res, err);
  }
};

/** PATCH /api/v1/notifications/:id/read — mark one as read */
exports.markRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [id, userId],
    );
    logAction({ req, action: 'UPDATE', entityType: 'notification', entityId: id, details: { is_read: true } });
    res.json({ success: true });
  } catch (err) {
    serverError(res, err);
  }
};

/** PATCH /api/v1/notifications/read-all — mark all as read */
exports.markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false AND is_deleted = false`,
      [userId],
    );
    logAction({ req, action: 'UPDATE', entityType: 'notification', entityId: userId, details: { markAllRead: true } });
    res.json({ success: true });
  } catch (err) {
    serverError(res, err);
  }
};

/** DELETE /api/v1/notifications/:id */
exports.remove = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE notifications SET is_deleted = true WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING *`,
      [id, userId],
    );
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    logAction({ req, action: 'DELETE', entityType: 'notification', entityId: id });
    res.json({ success: true });
  } catch (err) {
    serverError(res, err);
  }
};
