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
         ORDER BY us.enrolled_at DESC`,
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
      `SELECT DISTINCT sp.year AS id, sp.year::text AS name
       FROM student_profiles sp
       WHERE sp.college_id = ANY($1::uuid[])
         AND sp.year IS NOT NULL
       ORDER BY sp.year DESC`,
      [collegeIds],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getBatches error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

