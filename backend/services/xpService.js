const pool = require('../config/pg');

/**
 * Service to handle XP (points) calculations and logic
 */

/**
 * Get total XP earned by a user
 * @param {string} userId
 * @returns {Promise<number>}
 */
const getTotalXP = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT COALESCE(SUM(points), 0)::integer AS total_xp FROM points_log WHERE user_id = $1',
      [userId]
    );
    return result.rows[0].total_xp || 0;
  } catch (error) {
    console.error('Error fetching total XP:', error);
    return 0;
  }
};

module.exports = {
  getTotalXP,
};
