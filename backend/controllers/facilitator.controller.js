const serverError = require('../utils/serverError');
const pool = require('../config/pg');

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
         WHERE u.role = 'student' AND sp.college_id = ANY($1)`,
        [collegeIds],
      ),
      // Subjects assigned to these colleges (via students or facilitator_subjects - let's keep it simple for now)
      pool.query(
        `SELECT COUNT(DISTINCT subject_id) FROM public.user_subjects us
         JOIN public.student_profiles sp ON us.user_id = sp.user_id
         WHERE sp.college_id = ANY($1)`,
        [collegeIds],
      ),
      // Recent students joined in these colleges
      pool.query(
        `SELECT u.full_name, u.email, u.created_at FROM public.users u
         JOIN public.student_profiles sp ON u.id = sp.user_id
         WHERE u.role = 'student' AND sp.college_id = ANY($1)
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
      .json({ message: 'Error fetching stats', error: error.message });
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
        u.role,
        u.is_verified,
        c.name as college_name,
        c.short_code as college_short_name,
        COALESCE(sm.enrolled_courses, 0) as enrolled_courses,
        COALESCE(sm.progress_percent, 0) as progress_percent
      FROM public.users u
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
      WHERE u.role = 'student' AND sp.college_id = ANY($1)
      ORDER BY u.created_at DESC
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
         WHERE u.id = $1 AND u.role = 'student'`,
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
         WHERE u.id = $1`,
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
       WHERE u.id = $1 AND u.role = 'student' AND sp.college_id = ANY($2::uuid[])`,
      [id, collegeIds],
    );

    if (!studentRes.rowCount) {
      return res
        .status(404)
        .json({ message: 'Student not found in your colleges' });
    }

    const result = await pool.query(
      `UPDATE users SET is_verified = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, full_name, role, is_verified`,
      [is_verified, id],
    );

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
       WHERE u.id = $1 AND u.role = 'student' AND sp.college_id = ANY($2::uuid[])`,
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
    params.push(batch);
    batchClause = `AND sp.year = $${params.length}`;
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
     WHERE sp.college_id = ANY($1::uuid[]) AND u.role = 'student'
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
    if (batch) { params.push(batch); batchClause = `AND sp.year = $${params.length}`; }

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

// ─── Analytics: Quiz ─────────────────────────────────────────────────────────

exports.getQuizAnalytics = async (req, res) => {
  try {
    const { id: facilitatorId, role } = req.user;
    const { college_id, batch, subject_id, page, limit } = req.query;
    const qLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const qOffset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * qLimit;
    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: emptyQuizData() });

    const enrolledIds = await getEnrolledStudentIds(colleges, batch, subject_id);
    if (!enrolledIds.length) return res.json({ success: true, data: emptyQuizData() });

    const attParams = [enrolledIds];
    let subjectClause = '';
    if (subject_id) {
      attParams.push(subject_id);
      subjectClause = `AND t.subject_id = $${attParams.length}::uuid`;
    }

    const qParamsWithPaging = [...attParams, qLimit, qOffset];
    const [attRes, questionRes, questionCountRes] = await Promise.all([
      pool.query(
        `SELECT qa.user_id, qa.score::float, qa.is_passed, NULLIF(q.max_score, 0)::float AS max_score
         FROM quiz_attempts qa
         JOIN quizzes q ON q.id = qa.quiz_id
         JOIN units un ON un.id = q.unit_id
         JOIN topics t ON t.id = un.topic_id
         WHERE qa.user_id = ANY($1::uuid[]) ${subjectClause}`,
        attParams,
      ),
      pool.query(
        `SELECT qq.id AS question_id, qq.question_text,
                ROUND(
                  100.0 * COUNT(*) FILTER (WHERE qqa.is_correct = true)
                  / NULLIF(COUNT(*), 0)
                )::int AS correct_pct
         FROM quiz_questions qq
         JOIN quizzes q ON q.id = qq.quiz_id
         JOIN units un ON un.id = q.unit_id
         JOIN topics t ON t.id = un.topic_id
         JOIN quiz_question_answers qqa ON qqa.question_id = qq.id
         JOIN quiz_attempts qa ON qa.id = qqa.quiz_attempt_id AND qa.user_id = ANY($1::uuid[])
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
         JOIN quiz_question_answers qqa ON qqa.question_id = qq.id
         JOIN quiz_attempts qa ON qa.id = qqa.quiz_attempt_id AND qa.user_id = ANY($1::uuid[])
         WHERE TRUE ${subjectClause}`,
        attParams,
      ),
    ]);

    const rows = attRes.rows;
    const attemptedSet = new Set(rows.map((r) => r.user_id));
    const passedSet = new Set(rows.filter((r) => r.is_passed).map((r) => r.user_id));
    const pctScores = rows
      .filter((r) => r.max_score)
      .map((r) => (r.score / r.max_score) * 100);

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
    const { college_id, batch, assignment_id } = req.query;
    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: { total: 0, submitted: 0, not_submitted: 0, rate: 0, students: [] } });

    const params = [colleges];
    let batchClause = '';
    if (batch) { params.push(batch); batchClause = `AND sp.year = $${params.length}`; }

    const studentsRes = await pool.query(
      `SELECT u.id, u.full_name, u.email
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       WHERE sp.college_id = ANY($1::uuid[]) AND u.role = 'student' ${batchClause}
       ORDER BY u.full_name`,
      params,
    );
    const students = studentsRes.rows;

    let submittedIds = new Set();
    if (assignment_id) {
      const subRes = await pool.query(
        `SELECT student_id FROM college_assignment_submissions WHERE assignment_id = $1`,
        [assignment_id],
      );
      submittedIds = new Set(subRes.rows.map((r) => r.student_id));
    }

    const studentList = students.map((s) => ({
      id: s.id,
      name: s.full_name,
      email: s.email,
      status: assignment_id ? (submittedIds.has(s.id) ? 'Submitted' : 'Pending') : null,
    }));

    const submitted = assignment_id ? studentList.filter((s) => s.status === 'Submitted').length : 0;
    const total = students.length;

    res.json({
      success: true,
      data: {
        total,
        submitted,
        not_submitted: total - submitted,
        rate: total > 0 ? Math.round((submitted / total) * 100) : 0,
        students: studentList,
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
    const { college_id, batch, subject_id } = req.query;
    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: { not_started: 0, submitted: 0, approved: 0, students: [] } });

    const enrolledIds = await getEnrolledStudentIds(colleges, batch, subject_id);
    if (!enrolledIds.length) return res.json({ success: true, data: { not_started: 0, submitted: 0, approved: 0, students: [] } });

    // Get student names
    const namesRes = await pool.query(
      `SELECT u.id, u.full_name, u.email FROM users u WHERE u.id = ANY($1::uuid[]) ORDER BY u.full_name`,
      [enrolledIds],
    );

    // Get project submissions scoped to subject (if provided)
    const psParams = [enrolledIds];
    let psJoin = '';
    let psClause = '';
    if (subject_id) {
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

    res.json({
      success: true,
      data: {
        not_started: students.filter((s) => s.status === 'Not Started').length,
        submitted: students.filter((s) => s.status === 'Submitted').length,
        approved: students.filter((s) => s.status === 'Approved').length,
        students,
      },
    });
  } catch (err) {
    serverError(res, err, 'getProjectAnalytics');
  }
};

// ─── Analytics: Batch Dashboard ───────────────────────────────────────────────

exports.getBatchDashboard = async (req, res) => {
  try {
    const { id: facilitatorId, role } = req.user;
    const { college_id, batch } = req.query;
    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: { enrolled: 0, quiz_completion_rate: 0, quiz_pass_rate: 0, assignment_completion_rate: 0, project_completion_rate: 0, subjects: [] } });

    const enrolledIds = await getEnrolledStudentIds(colleges, batch, null);
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

        const quizRes = await pool.query(
          `SELECT qa.user_id, qa.is_passed
           FROM quiz_attempts qa
           JOIN quizzes q ON q.id = qa.quiz_id
           JOIN units un ON un.id = q.unit_id
           JOIN topics t ON t.id = un.topic_id
           WHERE qa.user_id = ANY($1::uuid[]) AND t.subject_id = $2::uuid`,
          [subjEnrolled, subj.id],
        );
        const attempted = new Set(quizRes.rows.map((r) => r.user_id));
        const passed = new Set(quizRes.rows.filter((r) => r.is_passed).map((r) => r.user_id));

        // Assignment completion: college assignments for this college
        let asgComplete = 0;
        if (colleges.length) {
          const asgRes = await pool.query(
            `SELECT cas.student_id
             FROM college_assignment_submissions cas
             JOIN college_assignments ca ON ca.id = cas.assignment_id
             WHERE ca.college_id = ANY($1::uuid[]) AND cas.student_id = ANY($2::uuid[])`,
            [colleges, subjEnrolled],
          );
          asgComplete = new Set(asgRes.rows.map((r) => r.student_id)).size;
        }

        return {
          id: subj.id,
          name: subj.name,
          quiz_completion: subjEnrolled.length > 0 ? Math.round((attempted.size / subjEnrolled.length) * 100) : 0,
          pass_rate: attempted.size > 0 ? Math.round((passed.size / attempted.size) * 100) : 0,
          assignment_completion: subjEnrolled.length > 0 ? Math.round((asgComplete / subjEnrolled.length) * 100) : 0,
        };
      }),
    );

    // Overall assignment completion
    const asgRes = await pool.query(
      `SELECT COUNT(DISTINCT cas.student_id) as submitted
       FROM college_assignment_submissions cas
       JOIN college_assignments ca ON ca.id = cas.assignment_id
       WHERE ca.college_id = ANY($1::uuid[]) AND cas.student_id = ANY($2::uuid[])`,
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
    const allQuizRes = await pool.query(
      `SELECT qa.user_id, qa.is_passed
       FROM quiz_attempts qa
       WHERE qa.user_id = ANY($1::uuid[])`,
      [enrolledIds],
    );
    const allAttempted = new Set(allQuizRes.rows.map((r) => r.user_id));
    const allPassed = new Set(allQuizRes.rows.filter((r) => r.is_passed).map((r) => r.user_id));

    res.json({
      success: true,
      data: {
        enrolled: enrolledIds.length,
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
    const { college_id, batch, subject_id, page, limit } = req.query;
    const sLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const sOffset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * sLimit;
    const colleges = await getFacilitatorCollegeIds(facilitatorId, college_id, role);
    if (!colleges.length) return res.json({ success: true, data: [], total: 0 });

    const enrolledIds = await getEnrolledStudentIds(colleges, batch, subject_id);
    if (!enrolledIds.length) return res.json({ success: true, data: [], total: 0 });

    const namesRes = await pool.query(
      `SELECT u.id, u.full_name, u.email FROM users u WHERE u.id = ANY($1::uuid[]) ORDER BY u.full_name`,
      [enrolledIds],
    );

    // Quiz scores per student
    const quizParams = [enrolledIds];
    let subjQuizClause = '';
    if (subject_id) {
      quizParams.push(subject_id);
      subjQuizClause = `AND t.subject_id = $${quizParams.length}::uuid`;
    }
    const quizRes = await pool.query(
      `SELECT qa.user_id,
              ROUND(AVG(CASE WHEN q.max_score > 0 THEN qa.score::float / q.max_score * 100 ELSE 0 END))::int AS avg_pct,
              COUNT(*) AS total_attempts,
              SUM(CASE WHEN qa.is_passed THEN 1 ELSE 0 END) AS passed_count
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       JOIN units un ON un.id = q.unit_id
       JOIN topics t ON t.id = un.topic_id
       WHERE qa.user_id = ANY($1::uuid[]) ${subjQuizClause}
       GROUP BY qa.user_id`,
      quizParams,
    );
    const quizMap = new Map(quizRes.rows.map((r) => [r.user_id, r]));

    // Assignment submissions
    const asgRes = await pool.query(
      `SELECT DISTINCT cas.student_id
       FROM college_assignment_submissions cas
       JOIN college_assignments ca ON ca.id = cas.assignment_id
       WHERE ca.college_id = ANY($1::uuid[]) AND cas.student_id = ANY($2::uuid[])`,
      [colleges, enrolledIds],
    );
    const asgSubmitted = new Set(asgRes.rows.map((r) => r.student_id));

    // Project submissions
    const psParams = [enrolledIds];
    let projSubjClause = '';
    if (subject_id) {
      psParams.push(subject_id);
      projSubjClause = `AND t.subject_id = $${psParams.length}::uuid`;
    }
    const projRes = await pool.query(
      `SELECT ps.user_id, ps.is_approved
       FROM project_submissions ps
       JOIN projects p ON p.id = ps.project_id
       JOIN topics t ON t.id = p.topic_id
       WHERE ps.user_id = ANY($1::uuid[]) ${projSubjClause}`,
      psParams,
    );
    const projMap = new Map();
    projRes.rows.forEach((r) => {
      const ex = projMap.get(r.user_id);
      if (!ex || r.is_approved) projMap.set(r.user_id, r.is_approved);
    });

    const data = namesRes.rows.map((s) => {
      const quiz = quizMap.get(s.id);
      let projStatus = 'Not Started';
      if (projMap.has(s.id)) projStatus = projMap.get(s.id) ? 'Approved' : 'Submitted';
      return {
        id: s.id,
        name: s.full_name,
        email: s.email,
        quiz_avg_pct: quiz ? quiz.avg_pct : null,
        quiz_attempts: quiz ? parseInt(quiz.total_attempts) : 0,
        assignment_status: asgSubmitted.has(s.id) ? 'Submitted' : 'Pending',
        project_status: projStatus,
      };
    });

    res.json({ success: true, data: data.slice(sOffset, sOffset + sLimit), total: data.length });
  } catch (err) {
    serverError(res, err, 'getStudentAnalytics');
  }
};
