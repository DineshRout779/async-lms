const serverError = require('../utils/serverError');
const pool = require('../config/pg');
const { logAction } = require('../utils/auditLogger');

// GET all colleges
exports.getAllColleges = async (req, res) => {
  try {
    const showVerified = req.query.is_verfied ? true : false;
    const query = showVerified
      ? 'SELECT * FROM colleges WHERE is_verified = true AND is_deleted = false ORDER BY name ASC'
      : 'SELECT * FROM colleges WHERE is_deleted = false ORDER BY name ASC';
    const result = await pool.query(query);
    // Standardized response to match frontend expectations
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.log(`Error || getAllColleges: `, error);
    serverError(res, error);
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
    logAction({ req, action: 'CREATE', entityType: 'college', entityId: result.rows[0].id, details: { name } });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating college',
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
      SET name = COALESCE($1, name),
          short_code = COALESCE($2, short_code),
          city = COALESCE($3, city),
          state = COALESCE($4, state),
          is_verified = COALESCE($5, is_verified),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`;
    const values = [name, short_code, city, state, is_verified, id];
    const result = await pool.query(query, values);
    if (result.rowCount === 0)
      return res.status(404).json({ message: 'College not found' });
    logAction({ req, action: 'UPDATE', entityType: 'college', entityId: id, details: { name } });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('updateCollege:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating college',
    });
  }
};

// DELETE college (soft delete; cascades to facilitator_colleges mappings)
exports.deleteCollege = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE colleges SET is_deleted = true WHERE id = $1 AND is_deleted = false RETURNING *',
      [id],
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'College not found' });
    }
    await client.query(
      'UPDATE facilitator_colleges SET is_deleted = true WHERE college_id = $1 AND is_deleted = false',
      [id],
    );
    await client.query('COMMIT');
    logAction({ req, action: 'DELETE', entityType: 'college', entityId: id });
    res
      .status(200)
      .json({ success: true, message: 'College deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    serverError(res, error);
  } finally {
    client.release();
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
          WHERE fc.college_id = c.id AND fs.subject_id = $1 AND fc.is_deleted = false
        ) as assigned
      FROM public.colleges c
      WHERE c.is_deleted = false
      ORDER BY c.name ASC;
    `;
    const { rows } = await pool.query(query, [subjectId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    serverError(res, error);
  }
};

// Toggle college access via facilitator mapping
exports.toggleSubjectAccess = async (req, res) => {
  const { courseId, collegeId } = req.body;
  const facilitatorId = req.user.id; // From verifyToken middleware

  try {
    const existing = await pool.query(
      'SELECT id FROM facilitator_colleges WHERE facilitator_id = $1 AND college_id = $2 AND is_deleted = false',
      [facilitatorId, collegeId],
    );

    if (existing.rowCount > 0) {
      // Revoke access
      await pool.query(
        'UPDATE facilitator_colleges SET is_deleted = true WHERE id = $1 AND is_deleted = false',
        [existing.rows[0].id],
      );
      logAction({ req, action: 'DELETE', entityType: 'facilitator_college', entityId: existing.rows[0].id, details: { facilitatorId, collegeId } });
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
      logAction({ req, action: 'CREATE', entityType: 'facilitator_college', entityId: null, details: { facilitatorId, collegeId } });
    }
    res.json({ success: true, message: `Subject assigned!` });
  } catch (error) {
    serverError(res, error);
  }
};

// ASSIGN colleges to facilitator (Batch)
exports.assignFacilitator = async (req, res) => {
  const { facilitator_id, college_ids } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE facilitator_colleges SET is_deleted = true WHERE facilitator_id = $1 AND is_deleted = false',
      [facilitator_id],
    );
    if (college_ids?.length > 0) {
      await client.query(
        'INSERT INTO facilitator_colleges (facilitator_id, college_id) SELECT $1, unnest($2::uuid[])',
        [facilitator_id, college_ids],
      );
    }
    await client.query('COMMIT');
    logAction({ req, action: 'UPDATE', entityType: 'facilitator_college', entityId: facilitator_id, details: { college_ids } });
    res
      .status(200)
      .json({ success: true, message: 'Colleges assigned successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, message: 'Bad request' });
  } finally {
    client.release();
  }
};
