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
