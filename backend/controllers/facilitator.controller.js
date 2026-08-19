const serverError = require('../utils/serverError');
const pool = require('../config/pg');
const { logAction } = require('../utils/auditLogger');

/**
 * Get Facilitator Scoped Stats
 */
exports.getFacilitatorStats = async (req, res) => {
  try {
    const facilitatorId = req.user.id;

    // 1. Get assigned colleges
    const colRes = await pool.query(
      'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
      [facilitatorId],
    );
    const collegeIds = colRes.rows.map((r) => r.college_id);

    if (collegeIds.length === 0) {
      return res.json({
        stats: {
          totalStudents: 0,
          totalColleges: 0,
          totalSubjects: 0,
        },
        recentActivity: [],
      });
    }

    const queries = [
      // Students in assigned colleges
      pool.query(
        `SELECT COUNT(*) FROM public.users u 
         JOIN public.student_profiles sp ON u.id = sp.user_id 
         WHERE u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT') AND sp.college_id = ANY($1) AND u.deleted_at IS NULL`,
        [collegeIds],
      ),
      // Subjects assigned to these colleges (via active students or facilitator_subjects)
      pool.query(
        `SELECT COUNT(DISTINCT subject_id) FROM public.user_subjects us
         JOIN public.student_profiles sp ON us.user_id = sp.user_id
         JOIN public.users u ON u.id = sp.user_id
         WHERE sp.college_id = ANY($1) AND u.deleted_at IS NULL`,
        [collegeIds],
      ),
      // Recent students joined in these colleges
      pool.query(
        `SELECT u.full_name, u.email, u.created_at FROM public.users u
         JOIN public.student_profiles sp ON u.id = sp.user_id
         WHERE u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT') AND sp.college_id = ANY($1) AND u.deleted_at IS NULL
         ORDER BY u.created_at DESC LIMIT 5`,
        [collegeIds],
      ),
    ];

    const [students, subjects, recentUsers] = await Promise.all(queries);

    res.status(200).json({
      stats: {
        totalStudents: parseInt(students.rows[0].count),
        totalColleges: collegeIds.length,
        totalSubjects: parseInt(subjects.rows[0].count),
      },
      recentActivity: recentUsers.rows,
    });
  } catch (error) {
    console.error('Facilitator Stats Error:', error);
    res
      .status(500)
      .json({ message: 'Error fetching stats' });
  }
};

/**
 * Get Students for Facilitator's Colleges
 */
exports.getFacilitatorStudents = async (req, res) => {
  try {
    const facilitatorId = req.user.id;

    // 1. Get assigned colleges
    const colRes = await pool.query(
      'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
      [facilitatorId],
    );
    const collegeIds = colRes.rows.map((r) => r.college_id);

    if (collegeIds.length === 0) {
      return res.json([]);
    }

    const query = `
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        sp.degree, 
        sp.year as batch, 
        u.created_at as joined_date,
        LOWER(r.role_key) AS role,
        u.is_verified,
        c.name as college_name,
        c.short_code as college_short_name,
        COALESCE(sm.enrolled_courses, 0) as enrolled_courses,
        COALESCE(sm.progress_percent, 0) as progress_percent
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      JOIN public.student_profiles sp ON u.id = sp.user_id
      LEFT JOIN public.colleges c ON sp.college_id = c.id
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(DISTINCT us.subject_id)::int as enrolled_courses,
          ROUND(AVG(
            COALESCE((
              SELECT (COUNT(usp.id)::float / NULLIF((SELECT COUNT(st.id) FROM public.subtopics st JOIN public.units u ON st.unit_id = u.id JOIN public.topics t ON u.topic_id = t.id WHERE t.subject_id = us.subject_id), 0) * 100)
              FROM public.user_subtopic_progress usp
              JOIN public.subtopics st2 ON usp.subtopic_id = st2.id
              JOIN public.units u2 ON st2.unit_id = u2.id
              JOIN public.topics t2 ON u2.topic_id = t2.id
              WHERE usp.user_id = u.id AND t2.subject_id = us.subject_id AND usp.is_completed = true
            ), 0)
          ))::int as progress_percent
        FROM public.user_subjects us
        WHERE us.user_id = u.id
      ) sm ON true
      WHERE u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT') AND sp.college_id = ANY($1) AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT 1000
    `;

    const result = await pool.query(query, [collegeIds]);
    res.json(result.rows);
  } catch (err) {
    console.error('Facilitator Students Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a single student's full profile (scoped to facilitator's colleges)
 * GET /api/facilitator/students/:id
 */
exports.getFacilitatorStudentProfile = async (req, res) => {
  try {
    const facilitatorId = req.user.id;
    const { id } = req.params;

    const colRes = await pool.query(
      'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
      [facilitatorId],
    );
    const collegeIds = colRes.rows.map((r) => r.college_id);

    const accessCheck = await pool.query(
      'SELECT 1 FROM student_profiles WHERE user_id = $1 AND college_id = ANY($2)',
      [id, collegeIds],
    );
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [userRes, statsRes, subjectsRes] = await Promise.all([
      pool.query(
        `SELECT u.id, u.full_name, u.email, u.is_verified, u.created_at,
                sp.degree, sp.year AS batch,
                c.name AS college_name, c.short_code AS college_short_name
         FROM users u
         LEFT JOIN student_profiles sp ON u.id = sp.user_id
         LEFT JOIN colleges c ON sp.college_id = c.id
         WHERE u.id = $1 AND u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT') AND u.deleted_at IS NULL`,
        [id],
      ),
      pool.query(
        `SELECT
           COUNT(DISTINCT us.subject_id)::int AS enrolled_subjects,
           COALESCE((SELECT COUNT(*)::int FROM user_subtopic_progress WHERE user_id = $1 AND is_completed = true), 0) AS completed_subtopics,
           COALESCE((SELECT SUM(points)::int FROM points_log WHERE user_id = $1), 0) AS total_points,
           COALESCE(MAX(str.current_streak), 0)::int AS current_streak,
           COALESCE(MAX(str.longest_streak), 0)::int AS longest_streak
         FROM users u
         LEFT JOIN user_subjects us ON u.id = us.user_id
         LEFT JOIN user_streaks str ON u.id = str.user_id
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [id],
      ),
      pool.query(
        `SELECT s.id, s.name,
           COALESCE((
             SELECT COUNT(*)::int FROM user_subtopic_progress usp
             JOIN subtopics st ON usp.subtopic_id = st.id
             JOIN units un ON st.unit_id = un.id
             JOIN topics t ON un.topic_id = t.id
             WHERE usp.user_id = $1 AND t.subject_id = s.id AND usp.is_completed = true
           ), 0) AS completed_subtopics,
           COALESCE((
             SELECT COUNT(*)::int FROM subtopics st
             JOIN units un ON st.unit_id = un.id
             JOIN topics t ON un.topic_id = t.id
             WHERE t.subject_id = s.id
           ), 0) AS total_subtopics
         FROM user_subjects us
         JOIN subjects s ON us.subject_id = s.id
         WHERE us.user_id = $1
         ORDER BY us.started_at DESC`,
        [id],
      ),
    ]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const subjects = subjectsRes.rows.map((s) => ({
      ...s,
      progress_percent:
        s.total_subtopics > 0
          ? Math.round((s.completed_subtopics / s.total_subtopics) * 100)
          : 0,
    }));

    res.json({
      success: true,
      data: { ...userRes.rows[0], stats: statsRes.rows[0], subjects },
    });
  } catch (err) {
    console.error('Facilitator Student Profile Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Facilitator access to student per-module analytics breakdown
 * GET /api/facilitator/students/:id/modules
 */
exports.getFacilitatorStudentModuleAnalytics = async (req, res) => {
  const facilitatorId = req.user.id;
  const studentId = req.params.id;
  try {
    // 1. Verify access
    let accessCheck;
    if (req.user.role === 'admin') {
      accessCheck = { rows: [{}] }; // Admins have full access
    } else {
      const colRes = await pool.query(
        'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
        [facilitatorId],
      );
      const collegeIds = colRes.rows.map((r) => r.college_id);

      accessCheck = await pool.query(
        'SELECT 1 FROM student_profiles WHERE user_id = $1 AND college_id = ANY($2)',
        [studentId, collegeIds],
      );
    }
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // 2. Fetch basic topics
    const result = await pool.query(
      `SELECT
         t.id AS topic_id,
         t.title AS topic_title,
         s.id AS subject_id,
         s.name AS subject_name
       FROM topics t
       JOIN subjects s ON s.id = t.subject_id
       JOIN user_subjects us ON us.subject_id = s.id AND us.user_id = $1
       ORDER BY s.name, t.order_index`,
      [studentId]
    );

    const topicIds = result.rows.map(r => r.topic_id);

    let assignmentsData = { rows: [] };
    let projectsData = { rows: [] };
    let quizzesData = { rows: [] };
    let lessonsData = { rows: [] };

    if (topicIds.length > 0) {
      // Fetch assignments
      assignmentsData = await pool.query(
        `SELECT a.id, a.title, u.topic_id, 
                CASE WHEN EXISTS(SELECT 1 FROM assignment_submissions WHERE assignment_id = a.id AND user_id = $1) 
                     THEN 'Submitted' ELSE 'Pending' END as status
         FROM assignments a
         JOIN units u ON a.unit_id = u.id
         WHERE u.topic_id = ANY($2::uuid[])`,
        [studentId, topicIds]
      );

      // Fetch projects
      projectsData = await pool.query(
        `SELECT p.id, p.title, p.topic_id, 
                CASE WHEN EXISTS(SELECT 1 FROM project_submissions WHERE project_id = p.id AND user_id = $1 AND is_approved = true) THEN 'Approved'
                     WHEN EXISTS(SELECT 1 FROM project_submissions WHERE project_id = p.id AND user_id = $1) THEN 'Submitted'
                     ELSE 'Not Started' END as status
         FROM projects p
         WHERE p.topic_id = ANY($2::uuid[])`,
        [studentId, topicIds]
      );

      // Fetch quizzes
      quizzesData = await pool.query(
        `SELECT q.id, u.title, q.max_score, u.topic_id, 
                COALESCE((SELECT MAX(score) FROM quiz_attempts WHERE quiz_id = q.id AND user_id = $1), 0) as score,
                CASE WHEN EXISTS(SELECT 1 FROM quiz_attempts WHERE quiz_id = q.id AND user_id = $1 AND is_passed = true) THEN 'Passed'
                     WHEN EXISTS(SELECT 1 FROM quiz_attempts WHERE quiz_id = q.id AND user_id = $1) THEN 'Failed'
                     ELSE 'Pending' END as status
         FROM quizzes q
         JOIN units u ON q.unit_id = u.id
         WHERE u.topic_id = ANY($2::uuid[])`,
        [studentId, topicIds]
      );

      // Fetch lessons
      lessonsData = await pool.query(
        `SELECT 
           un.topic_id,
           COUNT(lc.id)::int AS lessons_total,
           COUNT(CASE WHEN EXISTS(
               SELECT 1 FROM user_lesson_progress ulp 
               WHERE ulp.lesson_content_id = lc.id AND ulp.user_id = $1 AND ulp.is_completed = true
           ) THEN 1 END)::int AS lessons_completed
         FROM lesson_content lc
         JOIN subtopics st ON st.id = lc.subtopic_id
         JOIN units un ON un.id = st.unit_id
         WHERE un.topic_id = ANY($2::uuid[])
         GROUP BY un.topic_id`,
        [studentId, topicIds]
      );
    }

    // Map data by topic_id
    const assignmentsByTopic = {};
    const projectsByTopic = {};
    const quizzesByTopic = {};
    const lessonsByTopic = {};

    topicIds.forEach(id => {
      assignmentsByTopic[id] = [];
      projectsByTopic[id] = [];
      quizzesByTopic[id] = [];
      lessonsByTopic[id] = { completed: 0, total: 0 };
    });

    assignmentsData.rows.forEach(r => assignmentsByTopic[r.topic_id].push(r));
    projectsData.rows.forEach(r => projectsByTopic[r.topic_id].push(r));
    quizzesData.rows.forEach(r => quizzesByTopic[r.topic_id].push(r));
    lessonsData.rows.forEach(r => {
      lessonsByTopic[r.topic_id] = { completed: r.lessons_completed, total: r.lessons_total };
    });

    const subjectMap = new Map();
    let totalProgressSum = 0;
    let totalTopics = 0;

    for (const row of result.rows) {
      if (!subjectMap.has(row.subject_id)) {
        subjectMap.set(row.subject_id, { subject_id: row.subject_id, subject_name: row.subject_name, topics: [] });
      }

      const tid = row.topic_id;
      const asgs = assignmentsByTopic[tid];
      const projs = projectsByTopic[tid];
      const qzs = quizzesByTopic[tid];
      const less = lessonsByTopic[tid];

      const asg_total = asgs.length;
      const asg_submitted = asgs.filter(a => a.status === 'Submitted').length;
      const assignment_status = asg_total === 0 ? 'Pending' : (asg_submitted > 0 ? 'Submitted' : 'Pending');

      const proj_total = projs.length;
      const proj_submitted = projs.filter(p => p.status === 'Submitted' || p.status === 'Approved').length;
      const proj_approved = projs.filter(p => p.status === 'Approved').length;
      let project_status = null;
      if (proj_approved > 0) project_status = 'Approved';
      else if (proj_submitted > 0) project_status = 'Submitted';
      else if (proj_total > 0) project_status = 'Not Started';

      const quizzes_total = qzs.length;
      const quizzes_passed = qzs.filter(q => q.status === 'Passed').length;
      const quiz_score = qzs.reduce((acc, q) => acc + parseInt(q.score || 0), 0);
      const quiz_max = qzs.reduce((acc, q) => acc + parseInt(q.max_score || 0), 0);

      const lessons_total = less.total;
      const lessons_completed = less.completed;

      const calcPct = (completed, total) => total > 0 ? Math.round((completed / total) * 100) : null;
      const lessonPct = calcPct(lessons_completed, lessons_total);
      const quizPct = calcPct(quizzes_passed, quizzes_total);
      const asgPct = calcPct(asg_submitted, asg_total);
      const projPct = calcPct(proj_submitted, proj_total);
      
      const pcts = [lessonPct, quizPct, asgPct, projPct].filter(p => p !== null);
      const progress = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;

      totalProgressSum += progress;
      totalTopics++;

      subjectMap.get(row.subject_id).topics.push({
        topic_id: row.topic_id,
        topic_title: row.topic_title,
        quiz_score,
        quiz_max,
        assignment_status,
        project_status,
        progress,
        assignments_list: asgs,
        projects_list: projs,
        quizzes_list: qzs,
      });
    }

    const overall_progress = totalTopics > 0 ? Math.round(totalProgressSum / totalTopics) : 0;

    res.json({ success: true, overall_progress, data: Array.from(subjectMap.values()) });
  } catch (err) {
    console.error('getFacilitatorStudentModuleAnalytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch module analytics' });
  }
};

exports.getBatches = async (req, res) => {
  try {
    const facilitatorId = req.user.id;
    const colRes = await pool.query(
      'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
      [facilitatorId],
    );
    const collegeIds = colRes.rows.map((r) => r.college_id);
    if (collegeIds.length === 0) return res.json({ success: true, data: [] });

    const { rows } = await pool.query(
      `SELECT DISTINCT sp.expected_graduation_year AS id, sp.expected_graduation_year::text AS name
       FROM student_profiles sp
       WHERE sp.college_id = ANY($1::uuid[])
         AND sp.expected_graduation_year IS NOT NULL
       ORDER BY sp.expected_graduation_year DESC`,
      [collegeIds],
    );

    const unknownRes = await pool.query(
      `SELECT 1 FROM student_profiles sp WHERE sp.college_id = ANY($1::uuid[]) AND sp.expected_graduation_year IS NULL LIMIT 1`,
      [collegeIds]
    );
    if (unknownRes.rowCount > 0) {
      rows.push({ id: 'unknown', name: 'Unknown Batch' });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getBatches error:', err);
    serverError(res, err);
  }
};

/**
 * Verify or unverify a student — scoped to facilitator's assigned colleges
 */
exports.verifyStudent = async (req, res) => {
  try {
    const facilitatorId = req.user.id;
    const { id } = req.params;
    const { is_verified } = req.body;

    if (is_verified === undefined) {
      return res.status(400).json({ message: 'is_verified is required' });
    }

    const colRes = await pool.query(
      'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
      [facilitatorId],
    );
    const collegeIds = colRes.rows.map((r) => r.college_id);

    if (collegeIds.length === 0) {
      return res.status(403).json({ message: 'No colleges assigned to you' });
    }

    const studentRes = await pool.query(
      `SELECT u.id FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.id = $1 AND u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT') AND sp.college_id = ANY($2::uuid[]) AND u.deleted_at IS NULL`,
      [id, collegeIds],
    );

    if (!studentRes.rowCount) {
      return res
        .status(404)
        .json({ message: 'Student not found in your colleges' });
    }

    const result = await pool.query(
      `WITH updated AS (
         UPDATE users SET is_verified = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, full_name, role_id, is_verified
       )
       SELECT updated.id, updated.full_name, LOWER(r.role_key) AS role, updated.is_verified
       FROM updated
       LEFT JOIN roles r ON r.id = updated.role_id`,
      [is_verified, id],
    );

    logAction({ req, action: 'UPDATE', entityType: 'user', entityId: id, details: { is_verified } });
    res.json({
      success: true,
      message: `Student ${is_verified ? 'verified' : 'unverified'} successfully`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error('verifyStudent error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Edit limited student profile fields — scoped to facilitator's colleges
 */
exports.editStudent = async (req, res) => {
  try {
    const facilitatorId = req.user.id;
    const { id } = req.params;
    const { degree, current_academic_year, expected_graduation_year } =
      req.body;

    const colRes = await pool.query(
      'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
      [facilitatorId],
    );
    const collegeIds = colRes.rows.map((r) => r.college_id);
    if (collegeIds.length === 0) {
      return res.status(403).json({ message: 'No colleges assigned to you' });
    }

    const studentRes = await pool.query(
      `SELECT u.id FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.id = $1 AND u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT') AND sp.college_id = ANY($2::uuid[]) AND u.deleted_at IS NULL`,
      [id, collegeIds],
    );
    if (!studentRes.rowCount) {
      return res
        .status(404)
        .json({ message: 'Student not found in your colleges' });
    }

    const fields = [];
    const values = [];
    let i = 1;
    if (degree !== undefined) {
      fields.push(`degree = $${i++}`);
      values.push(degree);
    }
    if (current_academic_year !== undefined) {
      fields.push(`current_academic_year = $${i++}`);
      values.push(current_academic_year);
    }
    if (expected_graduation_year !== undefined) {
      fields.push(`expected_graduation_year = $${i++}`);
      values.push(expected_graduation_year);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    await pool.query(
      `UPDATE student_profiles SET ${fields.join(', ')} WHERE user_id = $${i}`,
      values,
    );

    logAction({ req, action: 'UPDATE', entityType: 'student_profile', entityId: id, details: { degree, current_academic_year, expected_graduation_year } });
    res.json({ success: true, message: 'Student profile updated' });
  } catch (err) {
    console.error('editStudent error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getFacilitatorColleges = async (req, res) => {
  try {
    const { id: facilitatorId, role } = req.user;
    let result;
    if (role === 'admin') {
      result = await pool.query(`SELECT id, name, is_verified FROM colleges ORDER BY name`);
    } else {
      result = await pool.query(
        `SELECT c.id, c.name, c.is_verified
         FROM colleges c
         JOIN facilitator_colleges fc ON c.id = fc.college_id
         WHERE fc.facilitator_id = $1
         ORDER BY c.name`,
        [facilitatorId],
      );
    }
    res.json({ success: true, data: result.rows });
  } catch (err) {
    serverError(res, err, 'getFacilitatorColleges');
  }
};

// ─── Analytics helpers ────────────────────────────────────────────────────────

async function getFacilitatorCollegeIds(facilitatorId, requestedCollegeId, role) {
  if (role === 'admin') {
    if (requestedCollegeId) return [requestedCollegeId];
    const allRes = await pool.query('SELECT id AS college_id FROM colleges');
    return allRes.rows.map((r) => r.college_id);
  }
  const colRes = await pool.query(
    'SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1',
    [facilitatorId],
  );
  const allowed = colRes.rows.map((r) => r.college_id);
  if (requestedCollegeId) {
    return allowed.includes(requestedCollegeId) ? [requestedCollegeId] : [];
  }
  return allowed;
}

async function getEnrolledStudentIds(collegeIds, batch, subjectId) {
  const params = [collegeIds];
  let batchClause = '';
  let subjectJoin = '';
  let subjectClause = '';

  if (batch) {
    if (batch === 'unknown') {
      batchClause = `AND sp.expected_graduation_year IS NULL`;
    } else {
      params.push(batch);
      batchClause = `AND sp.expected_graduation_year = $${params.length}`;
    }
  }
  if (subjectId) {
    subjectJoin = 'JOIN user_subjects us ON us.user_id = sp.user_id';
    params.push(subjectId);
    subjectClause = `AND us.subject_id = $${params.length}::uuid`;
  }

  const res = await pool.query(
    `SELECT DISTINCT sp.user_id
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     ${subjectJoin}
     WHERE sp.college_id = ANY($1::uuid[]) AND u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT') AND u.deleted_at IS NULL
     ${batchClause} ${subjectClause}`,
    params,
  );
  return res.rows.map((r) => r.user_id);
}

// ─── Analytics: subjects for a college/batch ─────────────────────────────────

exports.getAnalyticsSubjects = async (req, res) => {
  try {
    const { id: facilitatorId, role } = req.user;
    const { college_id, batch } = req.query;
    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: [] });

    const params = [colleges];
    let batchClause = '';
    if (batch) { 
      if (batch === 'unknown') {
        batchClause = `AND sp.expected_graduation_year IS NULL`;
      } else {
        params.push(batch); 
        batchClause = `AND sp.expected_graduation_year = $${params.length}`; 
      }
    }

    const { rows } = await pool.query(
      `SELECT DISTINCT s.id, s.name
       FROM subjects s
       JOIN user_subjects us ON us.subject_id = s.id
       JOIN student_profiles sp ON sp.user_id = us.user_id
       WHERE sp.college_id = ANY($1::uuid[]) ${batchClause}
       ORDER BY s.name`,
      params,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    serverError(res, err, 'getAnalyticsSubjects');
  }
};

exports.getAnalyticsTopics = async (req, res) => {
  try {
    const { subject_id } = req.query;
    if (!subject_id) return res.json({ success: true, data: [] });

    const { rows } = await pool.query(
      `SELECT id, title as name FROM topics WHERE subject_id = $1::uuid ORDER BY order_index, title`,
      [subject_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    serverError(res, err, 'getAnalyticsTopics');
  }
};

exports.getAnalyticsQuizzes = async (req, res) => {
  try {
    const { topic_id } = req.query;
    if (!topic_id) return res.json({ success: true, data: [] });

    const { rows } = await pool.query(
      `SELECT q.id, un.title as name
       FROM quizzes q
       JOIN units un ON q.unit_id = un.id
       WHERE un.topic_id = $1::uuid
       ORDER BY un.order_index`,
      [topic_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    serverError(res, err, 'getAnalyticsQuizzes');
  }
};

exports.getCourseAssignments = async (req, res) => {
  try {
    const { topic_id } = req.query;
    if (!topic_id) return res.json({ success: true, data: [] });

    const { rows } = await pool.query(
      `SELECT a.id, a.title as name
       FROM assignments a
       JOIN units un ON a.unit_id = un.id
       WHERE un.topic_id = $1::uuid
       ORDER BY un.order_index, a.title`,
      [topic_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    serverError(res, err, 'getCourseAssignments');
  }
};

exports.getAnalyticsModuleProjects = async (req, res) => {
  try {
    const { topic_id } = req.query;
    if (!topic_id) return res.json({ success: true, data: [] });

    const { rows } = await pool.query(
      `SELECT id, title as name
       FROM projects
       WHERE topic_id = $1::uuid
       ORDER BY title`,
      [topic_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    serverError(res, err, 'getAnalyticsModuleProjects');
  }
};

// ─── Analytics: Quiz ─────────────────────────────────────────────────────────

exports.getQuizAnalytics = async (req, res) => {
  try {
    const { id: facilitatorId, role } = req.user;
    const { college_id, batch, subject_id, topic_id, quiz_id, page, limit } = req.query;
    const qLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const qOffset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * qLimit;
    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: emptyQuizData() });

    const enrolledIds = await getEnrolledStudentIds(colleges, batch, subject_id);
    if (!enrolledIds.length) return res.json({ success: true, data: emptyQuizData() });

    const attParams = [enrolledIds];
    let subjectClause = '';
    
    if (quiz_id) {
      attParams.push(quiz_id);
      subjectClause = `AND q.id = $${attParams.length}::uuid`;
    } else if (topic_id) {
      attParams.push(topic_id);
      subjectClause = `AND t.id = $${attParams.length}::uuid`;
    } else if (subject_id) {
      attParams.push(subject_id);
      subjectClause = `AND t.subject_id = $${attParams.length}::uuid`;
    }

    const qParamsWithPaging = [...attParams, qLimit, qOffset];
    const [attRes, questionRes, questionCountRes] = await Promise.all([
      pool.query(
        `SELECT qa.user_id, qa.score::float, qa.is_passed,
                NULLIF((SELECT SUM(points) FROM quiz_questions WHERE quiz_id = q.id), 0)::float AS max_score
         FROM quiz_attempts qa
         JOIN quizzes q ON q.id = qa.quiz_id
         JOIN units un ON un.id = q.unit_id
         JOIN topics t ON t.id = un.topic_id
         WHERE qa.user_id = ANY($1::uuid[]) ${subjectClause}`,
        attParams,
      ),
      pool.query(
        `SELECT qq.id AS question_id, qq.question_text,
                COALESCE(
                  ROUND(
                    100.0 * COUNT(qqa.id) FILTER (WHERE qqa.is_correct = true)
                    / NULLIF(COUNT(qa.id), 0)
                  ), 0
                )::int AS correct_pct
         FROM quiz_questions qq
         JOIN quizzes q ON q.id = qq.quiz_id
         JOIN units un ON un.id = q.unit_id
         JOIN topics t ON t.id = un.topic_id
         LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = ANY($1::uuid[])
         LEFT JOIN quiz_question_answers qqa ON qqa.quiz_attempt_id = qa.id AND qqa.question_id = qq.id
         WHERE TRUE ${subjectClause}
         GROUP BY qq.id, qq.question_text, qq.order_index
         ORDER BY qq.order_index
         LIMIT $${qParamsWithPaging.length - 1} OFFSET $${qParamsWithPaging.length}`,
        qParamsWithPaging,
      ),
      pool.query(
        `SELECT COUNT(DISTINCT qq.id)::int AS total
         FROM quiz_questions qq
         JOIN quizzes q ON q.id = qq.quiz_id
         JOIN units un ON un.id = q.unit_id
         JOIN topics t ON t.id = un.topic_id
         WHERE $1::uuid[] IS NOT NULL ${subjectClause}`,
        attParams,
      ),
    ]);

    const rows = attRes.rows;
    const attemptedSet = new Set(rows.map((r) => r.user_id));
    const passedSet = new Set(rows.filter((r) => r.is_passed).map((r) => r.user_id));
    
    // Calculate one average score per student
    const studentScores = new Map();
    rows.forEach(r => {
      if (r.max_score) {
        if (!studentScores.has(r.user_id)) studentScores.set(r.user_id, []);
        studentScores.get(r.user_id).push((r.score / r.max_score) * 100);
      }
    });

    const pctScores = Array.from(studentScores.values()).map(
      scores => scores.reduce((a, b) => a + b, 0) / scores.length
    );

    const avgScore = pctScores.length
      ? Math.round(pctScores.reduce((a, b) => a + b, 0) / pctScores.length)
      : 0;

    const dist = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    pctScores.forEach((s) => {
      if (s <= 20) dist['0-20']++;
      else if (s <= 40) dist['21-40']++;
      else if (s <= 60) dist['41-60']++;
      else if (s <= 80) dist['61-80']++;
      else dist['81-100']++;
    });

    res.json({
      success: true,
      data: {
        enrolled: enrolledIds.length,
        attempted: attemptedSet.size,
        not_attempted: enrolledIds.length - attemptedSet.size,
        passed: passedSet.size,
        failed: attemptedSet.size - passedSet.size,
        avg_score_pct: avgScore,
        score_distribution: Object.entries(dist).map(([range, count]) => ({ range, count })),
        question_analytics: questionRes.rows,
        question_analytics_total: questionCountRes.rows[0]?.total ?? 0,
      },
    });
  } catch (err) {
    serverError(res, err, 'getQuizAnalytics');
  }
};

function emptyQuizData() {
  return {
    enrolled: 0, attempted: 0, not_attempted: 0,
    passed: 0, failed: 0, avg_score_pct: 0,
    score_distribution: ['0-20', '21-40', '41-60', '61-80', '81-100'].map((range) => ({ range, count: 0 })),
    question_analytics: [],
    question_analytics_total: 0,
  };
}

// ─── Analytics: Assignments ───────────────────────────────────────────────────

exports.getAssignmentAnalytics = async (req, res) => {
  try {
    const { id: facilitatorId, role } = req.user;
    const { college_id, batch, subject_id, assignment_id, assignment_type, page, limit } = req.query;
    const sLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const sOffset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * sLimit;
    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: { total: 0, submitted: 0, not_submitted: 0, rate: 0, students: [] } });

    const params = [colleges];
    let batchClause = '';
    if (batch) { 
      if (batch === 'unknown') {
        batchClause = `AND sp.expected_graduation_year IS NULL`;
      } else {
        params.push(batch); 
        batchClause = `AND sp.expected_graduation_year = $${params.length}`; 
      }
    }

    let subjectJoin = '';
    let subjectClause = '';
    if (subject_id) {
      subjectJoin = 'JOIN user_subjects us ON us.user_id = sp.user_id';
      params.push(subject_id);
      subjectClause = `AND us.subject_id = $${params.length}::uuid`;
    }

    const studentsRes = await pool.query(
      `SELECT DISTINCT u.id, u.full_name, u.email
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       ${subjectJoin}
       WHERE sp.college_id = ANY($1::uuid[]) AND u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT') AND u.deleted_at IS NULL ${batchClause} ${subjectClause}
       ORDER BY u.full_name`,
      params,
    );
    const students = studentsRes.rows;

    const studentIds = students.map((s) => s.id);
    let submittedIds = new Set();
    if (assignment_id) {
      if (assignment_type === 'course') {
        const subRes = await pool.query(
          `SELECT user_id as student_id FROM assignment_submissions WHERE assignment_id = $1`,
          [assignment_id]
        );
        submittedIds = new Set(subRes.rows.map((r) => r.student_id));
      } else {
        const subRes = await pool.query(
          `SELECT student_id FROM college_assignment_submissions WHERE assignment_id = $1`,
          [assignment_id],
        );
        submittedIds = new Set(subRes.rows.map((r) => r.student_id));
      }
    } else {
      // No specific assignment selected: fall back to "submitted at least one assignment"
      // (course or college), matching the definition used by the Student Dashboard tab's
      // "Assignments Submitted" aggregate — keeps the two views consistent.
      const courseParams = [studentIds];
      let courseSubjectClause = '';
      if (subject_id) {
        courseParams.push(subject_id);
        courseSubjectClause = `AND t.subject_id = $${courseParams.length}::uuid`;
      }
      const courseSubRes = await pool.query(
        `SELECT DISTINCT asub.user_id as student_id
         FROM assignment_submissions asub
         JOIN assignments a ON a.id = asub.assignment_id
         JOIN units un ON un.id = a.unit_id
         JOIN topics t ON t.id = un.topic_id
         WHERE asub.user_id = ANY($1::uuid[]) ${courseSubjectClause}`,
        courseParams,
      );
      const collegeSubRes = await pool.query(
        `SELECT DISTINCT cas.student_id
         FROM college_assignment_submissions cas
         JOIN college_assignments ca ON ca.id = cas.assignment_id AND ca.is_deleted = false
         WHERE cas.student_id = ANY($1::uuid[]) AND ca.college_id = ANY($2::uuid[])`,
        [studentIds, colleges],
      );
      courseSubRes.rows.forEach((r) => submittedIds.add(r.student_id));
      collegeSubRes.rows.forEach((r) => submittedIds.add(r.student_id));
    }

    const studentList = students.map((s) => ({
      id: s.id,
      name: s.full_name,
      email: s.email,
      status: submittedIds.has(s.id) ? 'Submitted' : 'Pending',
    }));

    const submitted = studentList.filter((s) => s.status === 'Submitted').length;
    const total = students.length;

    res.json({
      success: true,
      data: {
        total,
        submitted,
        not_submitted: total - submitted,
        rate: total > 0 ? Math.round((submitted / total) * 100) : 0,
        students: studentList.slice(sOffset, sOffset + sLimit),
      },
    });
  } catch (err) {
    serverError(res, err, 'getAssignmentAnalytics');
  }
};

// ─── Analytics: Projects ─────────────────────────────────────────────────────

exports.getProjectAnalytics = async (req, res) => {
  try {
    const { id: facilitatorId, role } = req.user;
    const { college_id, batch, subject_id, topic_id, project_id, page, limit } = req.query;
    
    const sLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const sOffset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * sLimit;

    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: { not_started: 0, submitted: 0, approved: 0, students: [], total: 0 } });

    const enrolledIds = await getEnrolledStudentIds(colleges, batch, subject_id);
    if (!enrolledIds.length) return res.json({ success: true, data: { not_started: 0, submitted: 0, approved: 0, students: [], total: 0 } });

    // Get student names
    const namesRes = await pool.query(
      `SELECT u.id, u.full_name, u.email FROM users u WHERE u.id = ANY($1::uuid[]) ORDER BY u.full_name`,
      [enrolledIds],
    );

    // Get project submissions scoped to subject (if provided)
    const psParams = [enrolledIds];
    let psJoin = '';
    let psClause = '';
    
    if (project_id) {
      psParams.push(project_id);
      psClause = `AND ps.project_id = $${psParams.length}::uuid`;
    } else if (topic_id) {
      psJoin = 'JOIN projects p ON p.id = ps.project_id';
      psParams.push(topic_id);
      psClause = `AND p.topic_id = $${psParams.length}::uuid`;
    } else if (subject_id) {
      psJoin = 'JOIN projects p ON p.id = ps.project_id JOIN topics t ON t.id = p.topic_id';
      psParams.push(subject_id);
      psClause = `AND t.subject_id = $${psParams.length}::uuid`;
    }

    const psRes = await pool.query(
      `SELECT ps.user_id, ps.is_approved
       FROM project_submissions ps
       ${psJoin}
       WHERE ps.user_id = ANY($1::uuid[]) ${psClause}`,
      psParams,
    );

    const submittedMap = new Map();
    psRes.rows.forEach((r) => {
      const existing = submittedMap.get(r.user_id);
      // is_approved takes priority
      if (!existing || r.is_approved) submittedMap.set(r.user_id, r.is_approved);
    });

    const students = namesRes.rows.map((s) => {
      let status = 'Not Started';
      if (submittedMap.has(s.id)) {
        status = submittedMap.get(s.id) ? 'Approved' : 'Submitted';
      }
      return { id: s.id, name: s.full_name, email: s.email, status };
    });

    const not_started = students.filter((s) => s.status === 'Not Started').length;
    const submitted = students.filter((s) => s.status === 'Submitted').length;
    const approved = students.filter((s) => s.status === 'Approved').length;
    const total = students.length;

    res.json({
      success: true,
      data: {
        total,
        not_started,
        submitted,
        approved,
        students: students.slice(sOffset, sOffset + sLimit),
      },
    });
  } catch (err) {
    serverError(res, err, 'getProjectAnalytics');
  }
};

// ─── Analytics: Batch Dashboard ───────────────────────────────────────────────

const { isUserOnline } = require('../services/presenceService');

exports.getBatchDashboard = async (req, res) => {
  try {
    const { id: facilitatorId, role } = req.user;
    const { college_id, batch, subject_id, topic_id } = req.query;
    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: { enrolled: 0, quiz_completion_rate: 0, quiz_pass_rate: 0, assignment_completion_rate: 0, project_completion_rate: 0, subjects: [] } });

    const enrolledIds = await getEnrolledStudentIds(colleges, batch, subject_id);
    if (!enrolledIds.length) return res.json({ success: true, data: { enrolled: 0, quiz_completion_rate: 0, quiz_pass_rate: 0, assignment_completion_rate: 0, project_completion_rate: 0, subjects: [] } });

    // Subjects enrolled by these students
    const subjectsRes = await pool.query(
      `SELECT DISTINCT s.id, s.name
       FROM subjects s
       JOIN user_subjects us ON us.subject_id = s.id
       WHERE us.user_id = ANY($1::uuid[])
       ORDER BY s.name`,
      [enrolledIds],
    );

    // For each subject: quiz completion, pass rate, assignment completion
    const subjectRows = await Promise.all(
      subjectsRes.rows.map(async (subj) => {
        const subjEnrolled = await getEnrolledStudentIds(colleges, batch, subj.id);
        if (!subjEnrolled.length) return { ...subj, quiz_completion: 0, pass_rate: 0, assignment_completion: 0 };

        const qParams = [subjEnrolled, subj.id];
        let topicClause = '';
        if (topic_id) {
          qParams.push(topic_id);
          topicClause = `AND t.id = $${qParams.length}::uuid`;
        }

        const quizRes = await pool.query(
          `SELECT qa.user_id, qa.is_passed
           FROM quiz_attempts qa
           JOIN quizzes q ON q.id = qa.quiz_id
           JOIN units un ON un.id = q.unit_id
           JOIN topics t ON t.id = un.topic_id
           WHERE qa.user_id = ANY($1::uuid[]) AND t.subject_id = $2::uuid ${topicClause}`,
          qParams,
        );
        const attempted = new Set(quizRes.rows.map((r) => r.user_id));
        const passed = new Set(quizRes.rows.filter((r) => r.is_passed).map((r) => r.user_id));

        // Assignment completion: Curriculum assignments for this subject/topic
        const aParams = [subjEnrolled, subj.id];
        let aTopicClause = '';
        if (topic_id) {
          aParams.push(topic_id);
          aTopicClause = `AND t.id = $${aParams.length}::uuid`;
        }

        const asgRes = await pool.query(
          `SELECT cas.user_id as student_id
           FROM assignment_submissions cas
           JOIN assignments a ON a.id = cas.assignment_id
           JOIN units un ON un.id = a.unit_id
           JOIN topics t ON t.id = un.topic_id
           WHERE cas.user_id = ANY($1::uuid[]) AND t.subject_id = $2::uuid ${aTopicClause}`,
          aParams,
        );
        const asgComplete = new Set(asgRes.rows.map((r) => r.student_id)).size;

        // Project completion
        const projRes = await pool.query(
          `SELECT ps.user_id
           FROM project_submissions ps
           JOIN projects p ON p.id = ps.project_id
           JOIN topics t ON t.id = p.topic_id
           WHERE ps.user_id = ANY($1::uuid[]) AND t.subject_id = $2::uuid ${topicClause}`,
          qParams,
        );
        const projComplete = new Set(projRes.rows.map((r) => r.user_id)).size;

        // Lesson completion
        const lessonRes = await pool.query(
          `SELECT ulp.user_id
           FROM user_lesson_progress ulp
           JOIN lesson_content lc ON lc.id = ulp.lesson_content_id
           JOIN subtopics st ON st.id = lc.subtopic_id
           JOIN units un ON un.id = st.unit_id
           JOIN topics t ON t.id = un.topic_id
           WHERE ulp.is_completed = true AND ulp.user_id = ANY($1::uuid[]) AND t.subject_id = $2::uuid ${topicClause}`,
          qParams,
        );
        const lessonComplete = new Set(lessonRes.rows.map((r) => r.user_id)).size;

        const quizPct = subjEnrolled.length > 0 ? Math.round((attempted.size / subjEnrolled.length) * 100) : 0;
        const passPct = attempted.size > 0 ? Math.round((passed.size / attempted.size) * 100) : 0;
        const asgPct = subjEnrolled.length > 0 ? Math.round((asgComplete / subjEnrolled.length) * 100) : 0;
        const projPct = subjEnrolled.length > 0 ? Math.round((projComplete / subjEnrolled.length) * 100) : 0;
        const lessonPct = subjEnrolled.length > 0 ? Math.round((lessonComplete / subjEnrolled.length) * 100) : 0;
        
        const avgModuleProgress = Math.round((quizPct + asgPct + projPct + lessonPct) / 4);

        return {
          id: subj.id,
          name: subj.name,
          quiz_completion: quizPct,
          pass_rate: passPct,
          assignment_completion: asgPct,
          project_completion: projPct,
          lesson_completion: lessonPct,
          module_progress: avgModuleProgress
        };
      }),
    );

    // Overall assignment completion (course + college assignments, at least one submitted)
    const asgRes = await pool.query(
      `SELECT COUNT(DISTINCT student_id) as submitted FROM (
         SELECT cas.student_id
         FROM college_assignment_submissions cas
         JOIN college_assignments ca ON ca.id = cas.assignment_id AND ca.is_deleted = false
         WHERE ca.college_id = ANY($1::uuid[]) AND cas.student_id = ANY($2::uuid[])
         UNION
         SELECT asub.user_id as student_id
         FROM assignment_submissions asub
         WHERE asub.user_id = ANY($2::uuid[])
       ) combined`,
      [colleges, enrolledIds],
    );
    const asgSubmitted = parseInt(asgRes.rows[0]?.submitted || 0);

    // Overall project completion
    const projRes = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as submitted
       FROM project_submissions
       WHERE user_id = ANY($1::uuid[])`,
      [enrolledIds],
    );
    const projSubmitted = parseInt(projRes.rows[0]?.submitted || 0);

    // Overall quiz stats
    const allQuizParams = [enrolledIds];
    let allQuizTopicClause = '';
    if (topic_id) {
      allQuizParams.push(topic_id);
      allQuizTopicClause = `JOIN quizzes q ON q.id = qa.quiz_id JOIN units un ON un.id = q.unit_id JOIN topics t ON t.id = un.topic_id WHERE t.id = $${allQuizParams.length}::uuid AND `;
    } else if (subject_id) {
      allQuizParams.push(subject_id);
      allQuizTopicClause = `JOIN quizzes q ON q.id = qa.quiz_id JOIN units un ON un.id = q.unit_id JOIN topics t ON t.id = un.topic_id WHERE t.subject_id = $${allQuizParams.length}::uuid AND `;
    } else {
      allQuizTopicClause = 'WHERE ';
    }

    const allQuizRes = await pool.query(
      `SELECT qa.user_id, qa.is_passed
       FROM quiz_attempts qa
       ${allQuizTopicClause} qa.user_id = ANY($1::uuid[])`,
      allQuizParams,
    );
    const allAttempted = new Set(allQuizRes.rows.map((r) => r.user_id));
    const allPassed = new Set(allQuizRes.rows.filter((r) => r.is_passed).map((r) => r.user_id));

    // Active students based on presence
    const activeStudents = enrolledIds.filter(id => isUserOnline(id)).length;

    // Average batch streak
    const streakRes = await pool.query(
      `SELECT COALESCE(AVG(current_streak), 0) as avg_streak FROM user_streaks WHERE user_id = ANY($1::uuid[])`,
      [enrolledIds]
    );
    const avgBatchStreak = Math.round(parseFloat(streakRes.rows[0]?.avg_streak || 0));

    // Overall module progress average
    const totalModuleProgress = subjectRows.reduce((sum, subj) => sum + subj.module_progress, 0);
    const avgModuleProgress = subjectRows.length > 0 ? Math.round(totalModuleProgress / subjectRows.length) : 0;

    res.json({
      success: true,
      data: {
        enrolled: enrolledIds.length,
        active_students: activeStudents,
        avg_batch_streak: avgBatchStreak,
        avg_module_progress: avgModuleProgress,
        quiz_completion_rate: enrolledIds.length > 0 ? Math.round((allAttempted.size / enrolledIds.length) * 100) : 0,
        quiz_pass_rate: allAttempted.size > 0 ? Math.round((allPassed.size / allAttempted.size) * 100) : 0,
        assignment_completion_rate: enrolledIds.length > 0 ? Math.round((asgSubmitted / enrolledIds.length) * 100) : 0,
        project_completion_rate: enrolledIds.length > 0 ? Math.round((projSubmitted / enrolledIds.length) * 100) : 0,
        subjects: subjectRows,
      },
    });
  } catch (err) {
    serverError(res, err, 'getBatchDashboard');
  }
};

// ─── Analytics: Student Performance ──────────────────────────────────────────

exports.getStudentAnalytics = async (req, res) => {
  try {
    const { id: facilitatorId, role } = req.user;
    const { college_id, batch, subject_id, topic_id, page, limit, search } = req.query;
    const sLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const sOffset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * sLimit;
    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: [], total: 0 });

    const enrolledIds = await getEnrolledStudentIds(colleges, batch, subject_id);
    if (!enrolledIds.length) return res.json({ success: true, data: [], total: 0 });

    let nameParams = [enrolledIds];
    let searchClause = '';
    
    if (search) {
      nameParams.push(`%${search}%`);
      searchClause = `AND u.full_name ILIKE $${nameParams.length}`;
    }

    const namesRes = await pool.query(
      `SELECT u.id, u.full_name, u.email FROM users u WHERE u.id = ANY($1::uuid[]) ${searchClause} ORDER BY u.full_name`,
      nameParams,
    );

    // Expected Total Quizzes Count per student
    let expectedQuizMap = new Map();
    let qParams = [enrolledIds];
    let qTopicClause = '';
    
    if (topic_id) {
      qParams.push(topic_id);
      qTopicClause = `AND t.id = $${qParams.length}::uuid`;
      const totalRes = await pool.query(`
        SELECT COUNT(DISTINCT q.id)::int as total 
        FROM quizzes q
        JOIN units un ON un.id = q.unit_id
        WHERE un.topic_id = $1::uuid
      `, [topic_id]);
      const total = totalRes.rows[0].total || 0;
      enrolledIds.forEach(id => expectedQuizMap.set(id, total));
    } else if (subject_id) {
      qParams.push(subject_id);
      qTopicClause = `AND t.subject_id = $${qParams.length}::uuid`;
      const totalRes = await pool.query(`
        SELECT COUNT(DISTINCT q.id)::int as total 
        FROM quizzes q
        JOIN units un ON un.id = q.unit_id
        JOIN topics t ON t.id = un.topic_id
        WHERE t.subject_id = $1::uuid
      `, [subject_id]);
      const total = totalRes.rows[0].total || 0;
      enrolledIds.forEach(id => expectedQuizMap.set(id, total));
    } else {
      const personalizedRes = await pool.query(`
        SELECT us.user_id as student_id, COUNT(DISTINCT q.id)::int as expected_total
        FROM user_subjects us
        JOIN subjects s ON s.id = us.subject_id
        JOIN topics t ON t.subject_id = s.id
        JOIN units un ON un.topic_id = t.id
        JOIN quizzes q ON q.unit_id = un.id
        WHERE us.user_id = ANY($1::uuid[])
        GROUP BY us.user_id
      `, [enrolledIds]);
      personalizedRes.rows.forEach(r => expectedQuizMap.set(r.student_id, r.expected_total));
    }

    // Quiz attempts per student
    const quizRes = await pool.query(`
        SELECT qa.user_id as student_id, COUNT(DISTINCT qa.quiz_id)::int as submitted_count
        FROM quiz_attempts qa
        JOIN quizzes q ON q.id = qa.quiz_id
        JOIN units un ON un.id = q.unit_id
        JOIN topics t ON t.id = un.topic_id
        WHERE qa.user_id = ANY($1::uuid[]) ${qTopicClause}
        GROUP BY qa.user_id
      `, qParams);
    const quizSubmittedMap = new Map(quizRes.rows.map((r) => [r.student_id, r.submitted_count]));

    // Expected Total Assignments Count per student (Curriculum Assignments)
    let expectedMap = new Map();
    let asgParams = [enrolledIds];
    let aTopicClause = '';
    
    if (topic_id) {
      asgParams.push(topic_id);
      aTopicClause = `AND t.id = $${asgParams.length}::uuid`;
      // Expected total is just the count of assignments for this topic.
      const totalRes = await pool.query(`
        SELECT COUNT(DISTINCT a.id)::int as total 
        FROM assignments a
        JOIN units un ON un.id = a.unit_id
        WHERE un.topic_id = $1::uuid
      `, [topic_id]);
      const total = totalRes.rows[0].total || 0;
      enrolledIds.forEach(id => expectedMap.set(id, total));
    } else if (subject_id) {
      asgParams.push(subject_id);
      aTopicClause = `AND t.subject_id = $${asgParams.length}::uuid`;
      // Expected total is just the count of assignments for this subject.
      const totalRes = await pool.query(`
        SELECT COUNT(DISTINCT a.id)::int as total 
        FROM assignments a
        JOIN units un ON un.id = a.unit_id
        JOIN topics t ON t.id = un.topic_id
        WHERE t.subject_id = $1::uuid
      `, [subject_id]);
      const total = totalRes.rows[0].total || 0;
      enrolledIds.forEach(id => expectedMap.set(id, total));
    } else {
      // "All Subjects" selected. Calculate personalized expected total per student based on their enrollments.
      const personalizedRes = await pool.query(`
        SELECT us.user_id as student_id, COUNT(DISTINCT a.id)::int as expected_total
        FROM user_subjects us
        JOIN subjects s ON s.id = us.subject_id
        JOIN topics t ON t.subject_id = s.id
        JOIN units un ON un.topic_id = t.id
        JOIN assignments a ON a.unit_id = un.id
        WHERE us.user_id = ANY($1::uuid[])
        GROUP BY us.user_id
      `, [enrolledIds]);
      personalizedRes.rows.forEach(r => expectedMap.set(r.student_id, r.expected_total));
    }

    // Assignment submissions per student
    let asgQuery = `
      SELECT cas.user_id as student_id, COUNT(DISTINCT cas.assignment_id)::int as submitted_count
      FROM assignment_submissions cas
      JOIN assignments a ON a.id = cas.assignment_id
      JOIN units un ON un.id = a.unit_id
      JOIN topics t ON t.id = un.topic_id
      WHERE cas.user_id = ANY($1::uuid[]) ${aTopicClause}
      GROUP BY cas.user_id
    `;
    const asgRes = await pool.query(asgQuery, asgParams);
    const asgSubmittedMap = new Map(asgRes.rows.map(r => [r.student_id, r.submitted_count]));

    // College assignments (ad-hoc, not tied to a subject/topic) — included so the
    // "submitted at least one assignment" definition matches the Assignment Tracker tab.
    const collegeAsgTotalRes = await pool.query(
      `SELECT COUNT(*)::int as total FROM college_assignments WHERE college_id = ANY($1::uuid[]) AND is_deleted = false`,
      [colleges],
    );
    const collegeAsgTotal = collegeAsgTotalRes.rows[0]?.total || 0;
    const collegeAsgRes = await pool.query(
      `SELECT cas.student_id, COUNT(DISTINCT cas.assignment_id)::int as submitted_count
       FROM college_assignment_submissions cas
       JOIN college_assignments ca ON ca.id = cas.assignment_id AND ca.is_deleted = false
       WHERE cas.student_id = ANY($1::uuid[]) AND ca.college_id = ANY($2::uuid[])
       GROUP BY cas.student_id`,
      [enrolledIds, colleges],
    );
    const collegeAsgSubmittedMap = new Map(collegeAsgRes.rows.map((r) => [r.student_id, r.submitted_count]));

    // Expected Total Projects Count per student
    let expectedProjMap = new Map();
    let pParams = [enrolledIds];
    let pTopicClause = '';
    
    if (topic_id) {
      pParams.push(topic_id);
      pTopicClause = `AND t.id = $${pParams.length}::uuid`;
      const totalRes = await pool.query(`
        SELECT COUNT(DISTINCT p.id)::int as total 
        FROM projects p
        WHERE p.topic_id = $1::uuid
      `, [topic_id]);
      const total = totalRes.rows[0].total || 0;
      enrolledIds.forEach(id => expectedProjMap.set(id, total));
    } else if (subject_id) {
      pParams.push(subject_id);
      pTopicClause = `AND t.subject_id = $${pParams.length}::uuid`;
      const totalRes = await pool.query(`
        SELECT COUNT(DISTINCT p.id)::int as total 
        FROM projects p
        JOIN topics t ON t.id = p.topic_id
        WHERE t.subject_id = $1::uuid
      `, [subject_id]);
      const total = totalRes.rows[0].total || 0;
      enrolledIds.forEach(id => expectedProjMap.set(id, total));
    } else {
      const personalizedRes = await pool.query(`
        SELECT us.user_id as student_id, COUNT(DISTINCT p.id)::int as expected_total
        FROM user_subjects us
        JOIN subjects s ON s.id = us.subject_id
        JOIN topics t ON t.subject_id = s.id
        JOIN projects p ON p.topic_id = t.id
        WHERE us.user_id = ANY($1::uuid[])
        GROUP BY us.user_id
      `, [enrolledIds]);
      personalizedRes.rows.forEach(r => expectedProjMap.set(r.student_id, r.expected_total));
    }

    // Project submissions per student
    let pQuery = `
      SELECT ps.user_id as student_id, COUNT(DISTINCT ps.project_id)::int as submitted_count
      FROM project_submissions ps
      JOIN projects p ON p.id = ps.project_id
      JOIN topics t ON t.id = p.topic_id
      WHERE ps.user_id = ANY($1::uuid[]) ${pTopicClause}
      GROUP BY ps.user_id
    `;
    const projRes = await pool.query(pQuery, pParams);
    const projSubmittedMap = new Map(projRes.rows.map(r => [r.student_id, r.submitted_count]));

    const data = namesRes.rows.map((s) => {
      return {
        id: s.id,
        name: s.full_name,
        email: s.email,
        quiz_submitted_count: quizSubmittedMap.get(s.id) || 0,
        quiz_total_count: expectedQuizMap.get(s.id) || 0,
        assignment_submitted_count: (asgSubmittedMap.get(s.id) || 0) + (collegeAsgSubmittedMap.get(s.id) || 0),
        assignment_total_count: (expectedMap.get(s.id) || 0) + collegeAsgTotal,
        project_submitted_count: projSubmittedMap.get(s.id) || 0,
        project_total_count: expectedProjMap.get(s.id) || 0,
      };
    });

    const aggregates = {
      quizzes_attempted: data.filter((s) => s.quiz_submitted_count > 0).length,
      assignments_submitted: data.filter((s) => s.assignment_submitted_count > 0).length,
      projects_completed: data.filter((s) => s.project_submitted_count > 0).length,
    };

    res.json({ 
      success: true, 
      data: data.slice(sOffset, sOffset + sLimit), 
      total: data.length, 
      aggregates 
    });
  } catch (err) {
    serverError(res, err, 'getStudentAnalytics');
  }
};

/**
 * SOFT DELETE STUDENT (Move to Recycle Bin)
 */
exports.deleteStudent = async (req, res) => {
  try {
    const facilitatorId = req.user.id;
    const { id } = req.params;
    
    // Verify access
    const colRes = await pool.query('SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1', [facilitatorId]);
    const collegeIds = colRes.rows.map(r => r.college_id);
    const accessCheck = await pool.query(
      `SELECT 1 FROM student_profiles sp
        JOIN users u ON u.id = sp.user_id
       WHERE sp.user_id = $1 AND sp.college_id = ANY($2::uuid[]) AND u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT')`,
      [id, collegeIds]
    );
    if (accessCheck.rowCount === 0) {
      return res.status(403).json({ message: 'Access denied. You can only delete your students.' });
    }
    await pool.query(`UPDATE users SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2`, [facilitatorId, id]);
    res.json({ success: true, message: 'Student moved to recycle bin' });
  } catch (err) {
    serverError(res, err, 'deleteStudent');
  }
};

/**
 * RESTORE STUDENT
 */
exports.restoreStudent = async (req, res) => {
  try {
    const facilitatorId = req.user.id;
    const { id } = req.params;
    
    const colRes = await pool.query('SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1', [facilitatorId]);
    const collegeIds = colRes.rows.map(r => r.college_id);
    const accessCheck = await pool.query(
      `SELECT 1 FROM student_profiles sp WHERE sp.user_id = $1 AND sp.college_id = ANY($2::uuid[])`,
      [id, collegeIds]
    );
    if (accessCheck.rowCount === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await pool.query(`UPDATE users SET deleted_at = NULL, deleted_by = NULL WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Student restored successfully' });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ 
        message: 'Cannot restore this student because another active account is already using this email address.' 
      });
    }
    serverError(res, err, 'restoreStudent');
  }
};

/**
 * PERMANENT DELETE STUDENT
 */
exports.permanentDeleteStudent = async (req, res) => {
  try {
    const facilitatorId = req.user.id;
    const { id } = req.params;
    
    const colRes = await pool.query('SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1', [facilitatorId]);
    const collegeIds = colRes.rows.map(r => r.college_id);
    const accessCheck = await pool.query(
      `SELECT 1 FROM student_profiles sp WHERE sp.user_id = $1 AND sp.college_id = ANY($2::uuid[])`,
      [id, collegeIds]
    );
    if (accessCheck.rowCount === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const check = await pool.query(`SELECT id FROM users WHERE id = $1 AND deleted_at IS NOT NULL`, [id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ message: 'Student must be in recycle bin to be permanently deleted' });
    }
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Student permanently deleted' });
  } catch (err) {
    serverError(res, err, 'permanentDeleteStudent');
  }
};

/**
 * GET RECYCLE BIN (Facilitator)
 */
exports.getRecycleBin = async (req, res) => {
  try {
    const facilitatorId = req.user.id;
    const colRes = await pool.query('SELECT college_id FROM facilitator_colleges WHERE facilitator_id = $1', [facilitatorId]);
    const collegeIds = colRes.rows.map(r => r.college_id);
    
    if (collegeIds.length === 0) return res.json({ success: true, data: [] });
    
    const query = `
      SELECT u.id, u.full_name, u.email, 'student' as role, u.deleted_at, db.full_name AS deleted_by_name
      FROM users u
      JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN users db ON db.id = u.deleted_by
      WHERE u.deleted_at IS NOT NULL AND sp.college_id = ANY($1::uuid[])
      ORDER BY u.deleted_at DESC
    `;
    const result = await pool.query(query, [collegeIds]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    serverError(res, err, 'getRecycleBin');
  }
};
