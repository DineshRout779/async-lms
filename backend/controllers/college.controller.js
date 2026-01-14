const pool = require('../config/pg');

exports.getAllColleges = async (req, res) => {
  try {
    const q = `
            SELECT * 
            FROM colleges 
            ORDER BY name ASC
        `;

    // 1. Await the query execution
    const result = await pool.query(q);

    // 2. Return the rows in a success response
    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching colleges:', error);

    // 3. Return a 500 error for database/server issues
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch colleges. Please try again later.',
    });
  }
};

exports.addCollege = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to add college. Please try again later.',
    });
  }
};
