const pool = require('../config/pg');
const verifyToken = require('../middlewares/verfiyToken');

const router = require('express').Router();

// GET: Fetch all published subjects for the user to pick from
router.get('/', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, slug FROM subjects WHERE is_published = true ORDER BY order_index ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching subjects' });
  }
});

module.exports = router;
