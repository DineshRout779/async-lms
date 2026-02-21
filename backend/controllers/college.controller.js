const pool = require('../config/pg');

// GET all colleges
exports.getAllColleges = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM colleges ORDER BY name ASC');
    // Standardized response to match frontend expectations
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching colleges',
      error: error.message,
    });
  }
};

// CREATE college
exports.createCollege = async (req, res) => {
  const { name, short_code, city, state } = req.body;
  try {
    const is_verfied = req.user.role === 'admin';
    const query = `
      INSERT INTO colleges (name, short_code, city, state, is_verified) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *`;
    const values = [name, short_code, city, state, is_verfied];
    const result = await pool.query(query, values);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating college',
      error: error.message,
    });
  }
};

// UPDATE college
exports.updateCollege = async (req, res) => {
  const { id } = req.params;
  const { name, short_code, city, state, is_verified } = req.body;
  try {
    const query = `
      UPDATE colleges 
      SET name = $1, short_code = $2, city = $3, state = $4, is_verified = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`;
    const values = [name, short_code, city, state, is_verified, id];
    const result = await pool.query(query, values);
    if (result.rowCount === 0)
      return res.status(404).json({ message: 'College not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating college',
      error: error.message,
    });
  }
};

// DELETE college
exports.deleteCollege = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM colleges WHERE id = $1', [id]);
    if (result.rowCount === 0)
      return res.status(404).json({ message: 'College not found' });
    res
      .status(200)
      .json({ success: true, message: 'College deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting college',
      error: error.message,
    });
  }
};

exports.getCollegesBySubject = async (req, res) => {
  const { subjectId } = req.params;
  try {
    const query = `
      SELECT 
        c.id, c.name, c.short_code,
        EXISTS (
          SELECT 1 FROM facilitator_colleges fc
          JOIN facilitator_subjects fs ON fc.facilitator_id = fs.facilitator_id
          WHERE fc.college_id = c.id AND fs.subject_id = $1
        ) as assigned
      FROM public.colleges c
      ORDER BY c.name ASC;
    `;
    const { rows } = await pool.query(query, [subjectId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Toggle college access via facilitator mapping
exports.toggleSubjectAccess = async (req, res) => {
  const { courseId, collegeId } = req.body;
  const facilitatorId = req.user.id; // From verifyToken middleware

  try {
    const existing = await pool.query(
      'SELECT id FROM facilitator_colleges WHERE facilitator_id = $1 AND college_id = $2',
      [facilitatorId, collegeId],
    );

    if (existing.rowCount > 0) {
      // Revoke access
      await pool.query('DELETE FROM facilitator_colleges WHERE id = $1', [
        existing.rows[0].id,
      ]);
    } else {
      // Grant access: ensure facilitator is linked to subject first
      await pool.query(
        'INSERT INTO facilitator_subjects (facilitator_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [facilitatorId, courseId],
      );
      await pool.query(
        'INSERT INTO facilitator_colleges (facilitator_id, college_id) VALUES ($1, $2)',
        [facilitatorId, collegeId],
      );
    }
    res.json({ success: true, message: `Subject assigned!` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ASSIGN colleges to facilitator (Batch)
exports.assignFacilitator = async (req, res) => {
  const { facilitator_id, college_ids } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM facilitator_colleges WHERE facilitator_id = $1',
      [facilitator_id],
    );
    if (college_ids?.length > 0) {
      await client.query(
        'INSERT INTO facilitator_colleges (facilitator_id, college_id) SELECT $1, unnest($2::uuid[])',
        [facilitator_id, college_ids],
      );
    }
    await client.query('COMMIT');
    res
      .status(200)
      .json({ success: true, message: 'Colleges assigned successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};
