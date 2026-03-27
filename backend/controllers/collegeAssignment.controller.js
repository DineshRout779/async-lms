const pool = require('../config/pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

// ─── Upload Instruction Document to S3 ───────────────────────────────────────

// POST /api/v1/college-assignments/upload-instruction
exports.uploadInstructionDoc = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    const ext = path.extname(req.file.originalname) || '';
    const safeName = req.file.originalname
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    const filename = `${Date.now()}-${safeName}`;
    const key = `assignment-instructions/${filename}`;

    // Try S3 if configured
    if (bucket && region && accessKeyId && secretAccessKey) {
      try {
        const s3 = new S3Client({
          region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
          }),
        );

        const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        console.log('S3 upload success:', url);
        return res.json({ success: true, url, filename: req.file.originalname });
      } catch (s3Error) {
        console.error('S3 upload failed, falling back to local storage:', s3Error);
      }
    } else {
      console.log('S3 not fully configured, using local storage fallback');
    }

    // Local storage fallback
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      await mkdirAsync(uploadDir, { recursive: true });
    }

    const localPath = path.join(uploadDir, filename);
    await writeFileAsync(localPath, req.file.buffer);

    // Generate local URL
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const url = `${baseUrl}/uploads/${filename}`;

    console.log('Local upload success:', url);
    res.json({ success: true, url, filename: req.file.originalname });
  } catch (error) {
    console.error('uploadInstructionDoc error:', error);
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
      `SELECT ca.id, ca.title, ca.description, ca.due_date, ca.created_at, ca.course,
              ca.instruction_file_url, ca.instruction_file_name,
              u.full_name AS created_by_name,
              cas.submission_link, cas.submission_file_url, cas.submitted_at
       FROM college_assignments ca
       LEFT JOIN users u ON u.id = ca.created_by
       LEFT JOIN college_assignment_submissions cas ON cas.assignment_id = ca.id AND cas.student_id = $2
       WHERE ca.college_id = $1
       ORDER BY ca.due_date ASC NULLS LAST, ca.created_at DESC`,
      [college_id, req.user.id],
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
        SELECT ca.id, ca.title, ca.description, ca.due_date, ca.course, ca.created_at, ca.updated_at,
               ca.instruction_file_url, ca.instruction_file_name,
               ca.college_id, c.name AS college_name,
               u.full_name AS created_by_name
        FROM college_assignments ca
        LEFT JOIN colleges c ON c.id = ca.college_id
        LEFT JOIN users u ON u.id = ca.created_by
        ORDER BY c.name ASC, ca.due_date ASC NULLS LAST`;
      values = [];
    } else {
      // Facilitator: only assignments they created
      query = `
        SELECT ca.id, ca.title, ca.description, ca.due_date, ca.course, ca.created_at, ca.updated_at,
               ca.instruction_file_url, ca.instruction_file_name,
               ca.college_id, c.name AS college_name,
               u.full_name AS created_by_name
        FROM college_assignments ca
        LEFT JOIN colleges c ON c.id = ca.college_id
        LEFT JOIN users u ON u.id = ca.created_by
        WHERE ca.created_by = $1
        ORDER BY c.name ASC, ca.due_date ASC NULLS LAST`;
      values = [req.user.id];
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
  const { college_id, title, description, due_date, course } = req.body;

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
      `INSERT INTO college_assignments (college_id, created_by, title, description, due_date, course, instruction_file_url, instruction_file_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        college_id,
        req.user.id,
        title,
        description || null,
        due_date || null,
        course || 'General',
        req.body.instruction_file_url || null,
        req.body.instruction_file_name || null,
      ],
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
  const { title, description, due_date, course } = req.body;

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
       SET title                 = COALESCE($1, title),
           description           = COALESCE($2, description),
           due_date              = COALESCE($3, due_date),
           course                = COALESCE($4, course),
           instruction_file_url  = COALESCE($5, instruction_file_url),
           instruction_file_name = COALESCE($6, instruction_file_name),
           updated_at  = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        title || null,
        description || null,
        due_date || null,
        course || null,
        req.body.instruction_file_url || null,
        req.body.instruction_file_name || null,
        id,
      ],
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

// ─── Submission ─────────────────────────────────────────────────────────────

// POST /api/v1/college-assignments/:id/submit
exports.submitCollegeAssignment = async (req, res) => {
  const { id } = req.params;
  const { submission_link } = req.body;
  const student_id = req.user.id;

  try {
    // 1. Verify existence
    const assignment = await pool.query('SELECT id FROM college_assignments WHERE id = $1', [id]);
    if (!assignment.rowCount) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    let file_url = null;
    let file_name = null;

    // 2. Handle file upload if present
    if (req.file) {
      const bucket = process.env.AWS_S3_BUCKET;
      const region = process.env.AWS_REGION;
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

      const safeName = req.file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
      const filename = `sub-${Date.now()}-${safeName}`;
      const key = `college-submissions/${filename}`;

      if (bucket && region && accessKeyId && secretAccessKey) {
        try {
          const s3 = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
          });
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: req.file.buffer,
              ContentType: req.file.mimetype,
            }),
          );
          file_url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
          file_name = req.file.originalname;
        } catch (s3Error) {
          console.error('S3 upload fallback for submission:', s3Error);
        }
      }

      if (!file_url) {
        // Local fallback
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'submissions');
        if (!fs.existsSync(uploadDir)) {
          await mkdirAsync(uploadDir, { recursive: true });
        }
        const localPath = path.join(uploadDir, filename);
        await writeFileAsync(localPath, req.file.buffer);
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
        file_url = `${baseUrl}/uploads/submissions/${filename}`;
        file_name = req.file.originalname;
      }
    }

    // 3. Upsert submission
    const { rows } = await pool.query(
      `INSERT INTO college_assignment_submissions 
       (assignment_id, student_id, submission_link, submission_file_url, submission_file_name, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET 
         submission_link = COALESCE(EXCLUDED.submission_link, college_assignment_submissions.submission_link),
         submission_file_url = COALESCE(EXCLUDED.submission_file_url, college_assignment_submissions.submission_file_url),
         submission_file_name = COALESCE(EXCLUDED.submission_file_name, college_assignment_submissions.submission_file_name),
         updated_at = NOW()
       RETURNING *`,
      [id, student_id, submission_link || null, file_url, file_name]
    );

    res.json({ success: true, data: rows[0], message: 'Assignment submitted successfully' });
  } catch (error) {
    console.error('submitCollegeAssignment ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      detail: error.detail || null // Postgres might provide more detail
    });
  }
};

// GET /api/v1/college-assignments/:id
// Returns a single assignment with student's specific submission
exports.getCollegeAssignmentById = async (req, res) => {
  const { id } = req.params;
  const student_id = req.user.id;

  try {
    const { rows } = await pool.query(
      `SELECT ca.id, ca.title, ca.description, ca.due_date, ca.created_at, ca.course,
              ca.instruction_file_url, ca.instruction_file_name,
              u.full_name AS created_by_name,
              cas.submission_link, cas.submission_file_url, cas.submission_file_name, cas.submitted_at
       FROM college_assignments ca
       LEFT JOIN users u ON u.id = ca.created_by
       LEFT JOIN college_assignment_submissions cas ON cas.assignment_id = ca.id AND cas.student_id = $2
       WHERE ca.id = $1`,
      [id, student_id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('getCollegeAssignmentById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
