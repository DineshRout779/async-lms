const pool = require('../config/pg');
const { logAction } = require('../utils/auditLogger');

/**
 * Add a channel to the whitelist
 */
exports.addChannelToWhitelist = async (req, res) => {
  try {
    const { channel_id, channel_name } = req.body;
    if (!channel_id || !channel_name) {
      return res.status(400).json({ success: false, message: 'channel_id and channel_name are required' });
    }

    const result = await pool.query(
      `INSERT INTO channel_whitelist (channel_id, channel_name, added_by) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (channel_id) DO NOTHING 
       RETURNING *`,
      [channel_id, channel_name, req.user?.id || null]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Channel is already whitelisted' });
    }

    logAction({ req, action: 'CREATE', entityType: 'channel_whitelist', entityId: result.rows[0].id, details: { channel_name } });
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding channel to whitelist:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get all whitelisted channels
 */
exports.getWhitelistedChannels = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM channel_whitelist WHERE is_deleted = false ORDER BY created_at DESC`);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching whitelisted channels:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Remove a channel from the whitelist
 */
exports.removeChannelFromWhitelist = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE channel_whitelist SET is_deleted = true WHERE id = $1 AND is_deleted = false RETURNING *`,
      [id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Channel not found' });
    }
    logAction({ req, action: 'DELETE', entityType: 'channel_whitelist', entityId: id, details: { channel_name: result.rows[0].channel_name } });
    return res.status(200).json({ success: true, message: 'Channel removed from whitelist' });
  } catch (error) {
    console.error('Error removing channel from whitelist:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get video pipeline logs for debugging and monitoring
 */
exports.getPipelineLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const result = await pool.query(
      `SELECT l.*, a.title as lesson_title 
       FROM video_pipeline_logs l
       LEFT JOIN ai_course_lessons a ON l.lesson_id = a.id
       ORDER BY l.created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching pipeline logs:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
