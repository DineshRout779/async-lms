const pool = require('../config/pg');
const { notifyCollege } = require('../services/notificationService');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

// ─── S3 singleton (reused across requests) ───────────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const s3Configured = () =>
  !!(
    process.env.AWS_S3_BUCKET &&
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );

// ─── Shared file upload helper (S3 → local fallback) ─────────────────────────
// s3KeyPrefix  : e.g. 'assignment-instructions'
// localSubPath : subfolder under public/uploads, e.g. '' or 'submissions'
async function storeFile(file, { s3KeyPrefix, localSubPath }) {
  const safeName = file.originalname
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  const filename = `${Date.now()}-${safeName}`;

  if (s3Configured()) {
    try {
      const key = `${s3KeyPrefix}/${filename}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      console.log('S3 upload success:', url);
      return { url, name: file.originalname };
    } catch (s3Error) {
      console.error('S3 upload failed, using local fallback:', s3Error);
    }
  } else {
    console.log('S3 not configured, using local storage fallback');
  }

  // Local fallback
  const uploadDir = localSubPath
    ? path.join(__dirname, '..', 'public', 'uploads', localSubPath)
    : path.join(__dirname, '..', 'public', 'uploads');
  await mkdirAsync(uploadDir, { recursive: true });
  await writeFileAsync(path.join(uploadDir, filename), file.buffer);
  const base =
    process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  const urlPath = localSubPath
    ? `uploads/${localSubPath}/${filename}`
    : `uploads/${filename}`;
  const url = `${base}/${urlPath}`;
  console.log('Local upload success:', url);
  return { url, name: file.originalname };
}

// ─── Upload Instruction Document ─────────────────────────────────────────────

// POST /api/v1/college-assignments/upload-instruction
exports.uploadInstructionDoc = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'No file uploaded' });
    }

    const { url, name } = await storeFile(req.file, {
      s3KeyPrefix: 'assignment-instructions',
      localSubPath: '',
    });

    res.json({ success: true, url, filename: name });
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
// Facilitator → only assignments they created.
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
    const assignment = rows[0];
    // Notify all students in the college about the new assignment
    notifyCollege({
      collegeId: college_id,
      type: 'new_assignment',
      title: `New Assignment: ${title}`,
      body: due_date
        ? `Due ${new Date(due_date).toLocaleDateString()}: ${description || title}`
        : description || title,
      link: '/dashboard/student/assignments',
    });
    res.status(201).json({ success: true, data: assignment });
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
    const assignment = await pool.query(
      'SELECT id FROM college_assignments WHERE id = $1',
      [id],
    );
    if (!assignment.rowCount) {
      return res
        .status(404)
        .json({ success: false, message: 'Assignment not found' });
    }

    let file_url = null;
    let file_name = null;

    // 2. Handle file upload if present
    if (req.file) {
      const { url, name } = await storeFile(req.file, {
        s3KeyPrefix: 'college-submissions',
        localSubPath: 'submissions',
      });
      file_url = url;
      file_name = name;
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
      [id, student_id, submission_link || null, file_url, file_name],
    );

    res.json({
      success: true,
      data: rows[0],
      message: 'Assignment submitted successfully',
    });
  } catch (error) {
    console.error('submitCollegeAssignment ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
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
      [id, student_id],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('getCollegeAssignmentById:', error);
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
    const assignment = await pool.query(
      'SELECT id FROM college_assignments WHERE id = $1',
      [id],
    );
    if (!assignment.rowCount) {
      return res
        .status(404)
        .json({ success: false, message: 'Assignment not found' });
    }

    let file_url = null;
    let file_name = null;

    // 2. Handle file upload if present
    if (req.file) {
      const { url, name } = await storeFile(req.file, {
        s3KeyPrefix: 'college-submissions',
        localSubPath: 'submissions',
      });
      file_url = url;
      file_name = name;
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
      [id, student_id, submission_link || null, file_url, file_name],
    );

    res.json({
      success: true,
      data: rows[0],
      message: 'Assignment submitted successfully',
    });
  } catch (error) {
    console.error('submitCollegeAssignment ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
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
      [id, student_id],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('getCollegeAssignmentById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/college-assignments/submissions/:assignmentId
// Returns all student submissions for either a unit assignment or a college assignment.
// Facilitators only see submissions from students in their assigned colleges.
exports.getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const isFacilitator = req.user.role !== 'admin';
    const facilitatorCollegeIds = req.user.college_ids || [];

    // Determine assignment type
    const unitCheck = await pool.query(
      `SELECT id FROM assignments WHERE id = $1`,
      [assignmentId],
    );
    const isUnitAssignment = unitCheck.rowCount > 0;

    let rows;

    if (isUnitAssignment) {
      const collegeFilter = isFacilitator
        ? 'AND sp.college_id = ANY($2)'
        : '';
      const values = isFacilitator
        ? [assignmentId, facilitatorCollegeIds]
        : [assignmentId];

      const result = await pool.query(
        `SELECT
           asub.id,
           asub.submission_link,
           asub.submitted_at,
           u.full_name  AS student_name,
           u.email      AS student_email,
           c.name       AS college_name
         FROM assignment_submissions asub
         JOIN users u            ON u.id  = asub.user_id
         LEFT JOIN student_profiles sp ON sp.user_id = asub.user_id
         LEFT JOIN colleges c    ON c.id  = sp.college_id
         WHERE asub.assignment_id = $1
         ${collegeFilter}
         ORDER BY asub.submitted_at DESC`,
        values,
      );
      rows = result.rows;
    } else {
      // College assignment — check facilitator owns this college
      if (isFacilitator) {
        const ownerCheck = await pool.query(
          `SELECT college_id FROM college_assignments WHERE id = $1`,
          [assignmentId],
        );
        if (!ownerCheck.rowCount) {
          return res.status(404).json({ success: false, message: 'Assignment not found' });
        }
        if (!facilitatorCollegeIds.includes(ownerCheck.rows[0].college_id)) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }

      const result = await pool.query(
        `SELECT
           cas.id,
           cas.submission_link,
           cas.submission_file_url,
           cas.submission_file_name,
           cas.submitted_at,
           u.full_name  AS student_name,
           u.email      AS student_email,
           c.name       AS college_name
         FROM college_assignment_submissions cas
         JOIN users u            ON u.id  = cas.student_id
         LEFT JOIN student_profiles sp ON sp.user_id = cas.student_id
         LEFT JOIN colleges c    ON c.id  = sp.college_id
         WHERE cas.assignment_id = $1
         ORDER BY cas.submitted_at DESC`,
        [assignmentId],
      );
      rows = result.rows;
    }

    res.json({ success: true, data: rows, type: isUnitAssignment ? 'unit' : 'college' });
  } catch (error) {
    console.error('getAssignmentSubmissions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/v1/college-assignments/evaluation-filters
exports.getFilteredAssignments = async (req, res) => {
  try {
    const { collegeId, domain, search } = req.query;
    const isFacilitator = req.user.role !== 'admin';
    const facilitatorCollegeIds = req.user.college_ids || [];

    if (isFacilitator && !facilitatorCollegeIds.length) {
      return res.json({ success: true, data: [] });
    }

    // This query UNIONS facilitator-created "College Assignments" 
    // and curriculum-level "Unit Assignments" (from subjects/topics).
    let query = `
      WITH all_assignments AS (
        -- 1. Facilitator-Created College Assignments
        SELECT 
          ca.id, 
          ca.title, 
          ca.course, 
          'college' as type,
          ca.college_id, 
          c.name AS college_name,
          ca.created_at,
          ca.due_date,
          (
            SELECT COUNT(*)::int 
            FROM public.college_assignment_submissions cas 
            WHERE cas.assignment_id = ca.id
          ) as submissions_count,
          CASE WHEN e.status = 'completed' THEN 'evaluated' ELSE 'pending' END as status,
          e.id as evaluation_id
        FROM public.college_assignments ca
        JOIN public.colleges c ON c.id = ca.college_id
        LEFT JOIN public.evaluations e ON e.assignment_id = ca.id

        UNION ALL

        -- 2. Curriculum-level Unit Assignments
        SELECT 
          a.id, 
          a.title, 
          s.name as course, 
          'unit' as type,
          NULL as college_id, 
          'Curriculum' as college_name,
          NULL as created_at,
          NULL as due_date,
          (
            SELECT COUNT(DISTINCT asub.user_id)::int 
            FROM public.assignment_submissions asub
            JOIN public.student_profiles sp ON asub.user_id = sp.user_id
            WHERE asub.assignment_id = a.id
            ${isFacilitator ? 'AND sp.college_id = ANY($1)' : ''}
          ) as submissions_count,
          CASE WHEN e.status = 'completed' THEN 'evaluated' ELSE 'pending' END as status,
          e.id as evaluation_id
        FROM public.assignments a
        JOIN public.units u ON a.unit_id = u.id
        JOIN public.topics t ON u.topic_id = t.id
        JOIN public.subjects s ON t.subject_id = s.id
        LEFT JOIN public.evaluations e ON e.assignment_id = a.id
      )
      SELECT * FROM all_assignments
      WHERE 1=1
    `;

    const values = isFacilitator ? [facilitatorCollegeIds] : [];
    let index = isFacilitator ? 2 : 1;

    // 🔒 Role-based restriction (facilitator)
    if (isFacilitator) {
      // For College Assignments, they must match the facilitator's college.
      // For Unit Assignments, we show them if they belong to a subject the facilitator can see (simplified to 'all' for now)
      query += ` AND (college_id IS NULL OR college_id = ANY($1))`;
    }

    // 🎯 College filter
    if (collegeId) {
      query += ` AND (college_id = $${index} OR (type = 'unit' AND $${index} = ANY($1)))`;
      values.push(collegeId);
      index++;
    }

    // 🎯 Domain filter
    if (domain) {
      query += ` AND LOWER(course) LIKE LOWER($${index})`;
      values.push(`%${domain}%`);
      index++;
    }

    // 🔍 Search filter
    if (search) {
      query += ` AND LOWER(title) LIKE LOWER($${index})`;
      values.push(`%${search}%`);
      index++;
    }

    // Only show assignments that have at least one submission (to avoid cluttering with thousands of curriculum assignments)
    query += ` AND submissions_count > 0`;

    query += ` ORDER BY created_at DESC NULLS LAST, title ASC`;

    const { rows } = await pool.query(query, values);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getFilteredAssignments Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
