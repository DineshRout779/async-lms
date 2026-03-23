const pool = require('../config/pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// ─── Upload Instruction Document to S3 ───────────────────────────────────────

// POST /api/v1/college-assignments/upload-instruction
exports.uploadInstructionDoc = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;

    if (!bucket || !region) {
      return res.status(500).json({
        success: false,
        message: 'S3 is not configured (AWS_S3_BUCKET/AWS_REGION)',
      });
    }

    const ext = path.extname(req.file.originalname) || '';
    const safeName = req.file.originalname
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    const key = `assignment-instructions/${Date.now()}-${safeName}`;

    const s3 = new S3Client({ region });
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }),
    );

    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    res.json({ success: true, url, filename: req.file.originalname });
  } catch (error) {
    console.error('uploadInstructionDoc:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Student ─────────────────────────────────────────────────────────────────

// GET /api/v1/college-assignments
// Returns assignments for the student's own college (college_id comes from JWT).
exports.getMyCollegeAssignments = async (req, res) => {
  const college_id = req.user.college_id;

  if (!college_id) {
    return res
      .status(400)
      .json({ success: false, message: 'No college linked to your account' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT ca.id, ca.title, ca.description, ca.due_date, ca.created_at,
              u.full_name AS created_by_name
       FROM college_assignments ca
       JOIN users u ON u.id = ca.created_by
       WHERE ca.college_id = $1
       ORDER BY ca.due_date ASC NULLS LAST, ca.created_at DESC`,
      [college_id],
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getMyCollegeAssignments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin / Facilitator ──────────────────────────────────────────────────────

// GET /api/v1/college-assignments/manage
// Admin → all assignments across all colleges.
// Facilitator → only assignments for their managed colleges.
exports.manageAssignments = async (req, res) => {
  try {
    let query, values;

    if (req.user.role === 'admin') {
      query = `
        SELECT ca.id, ca.title, ca.description, ca.due_date, ca.created_at, ca.updated_at,
               ca.college_id, c.name AS college_name,
               u.full_name AS created_by_name
        FROM college_assignments ca
        JOIN colleges c ON c.id = ca.college_id
        JOIN users u ON u.id = ca.created_by
        ORDER BY c.name ASC, ca.due_date ASC NULLS LAST`;
      values = [];
    } else {
      // Facilitator: scope to their colleges
      const college_ids = req.user.college_ids || [];
      if (!college_ids.length) {
        return res.json({ success: true, data: [] });
      }
      query = `
        SELECT ca.id, ca.title, ca.description, ca.due_date, ca.created_at, ca.updated_at,
               ca.college_id, c.name AS college_name,
               u.full_name AS created_by_name
        FROM college_assignments ca
        JOIN colleges c ON c.id = ca.college_id
        JOIN users u ON u.id = ca.created_by
        WHERE ca.college_id = ANY($1::uuid[])
        ORDER BY c.name ASC, ca.due_date ASC NULLS LAST`;
      values = [college_ids];
    }

    const { rows } = await pool.query(query, values);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('manageAssignments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/college-assignments
// Body: { college_id, title, description?, due_date? }
exports.createAssignment = async (req, res) => {
  const { college_id, title, description, due_date } = req.body;

  if (!college_id || !title) {
    return res
      .status(400)
      .json({ success: false, message: 'college_id and title are required' });
  }

  // Facilitators may only create assignments for their own colleges
  if (req.user.role === 'facilitator') {
    const allowed = req.user.college_ids || [];
    if (!allowed.includes(college_id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this college',
      });
    }
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO college_assignments (college_id, created_by, title, description, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [college_id, req.user.id, title, description || null, due_date || null],
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('createAssignment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/v1/college-assignments/:id
// Body: { title?, description?, due_date? }
exports.updateAssignment = async (req, res) => {
  const { id } = req.params;
  const { title, description, due_date } = req.body;

  try {
    // Fetch existing to check ownership scope for facilitators
    const existing = await pool.query(
      'SELECT * FROM college_assignments WHERE id = $1',
      [id],
    );
    if (!existing.rowCount) {
      return res
        .status(404)
        .json({ success: false, message: 'Assignment not found' });
    }

    if (req.user.role === 'facilitator') {
      const allowed = req.user.college_ids || [];
      if (!allowed.includes(existing.rows[0].college_id)) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this college',
        });
      }
    }

    const { rows } = await pool.query(
      `UPDATE college_assignments
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           due_date    = COALESCE($3, due_date),
           updated_at  = NOW()
       WHERE id = $4
       RETURNING *`,
      [title || null, description || null, due_date || null, id],
    );
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('updateAssignment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/v1/college-assignments/:id
exports.deleteAssignment = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query(
      'SELECT college_id FROM college_assignments WHERE id = $1',
      [id],
    );
    if (!existing.rowCount) {
      return res
        .status(404)
        .json({ success: false, message: 'Assignment not found' });
    }

    if (req.user.role === 'facilitator') {
      const allowed = req.user.college_ids || [];
      if (!allowed.includes(existing.rows[0].college_id)) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this college',
        });
      }
    }

    await pool.query('DELETE FROM college_assignments WHERE id = $1', [id]);
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    console.error('deleteAssignment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
