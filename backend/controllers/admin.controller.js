const pool = require('../config/pg');

exports.getAdminStats = async (req, res) => {
  try {
    const queries = [
      pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['student']),
      pool.query('SELECT COUNT(*) FROM colleges'),
      pool.query('SELECT COUNT(*) FROM subjects'),
      pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['facilitator']),
      pool.query(
        'SELECT full_name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5'
      ),
    ];

    const [students, colleges, subjects, facilitators, recentUsers] =
      await Promise.all(queries);

    res.status(200).json({
      stats: {
        totalStudents: parseInt(students.rows[0].count),
        totalColleges: parseInt(colleges.rows[0].count),
        totalSubjects: parseInt(subjects.rows[0].count),
        totalFacilitators: parseInt(facilitators.rows[0].count),
      },
      recentActivity: recentUsers.rows,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching dashboard data', error: error.message });
  }
};

// Get all students with their college details
exports.getAllStudents = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.degree, 
        u.year as batch, 
        u.created_at as joined_date,
        u.role,
        c.name as college_name,
        c.short_code as college_short_name
      FROM public.users u
      LEFT JOIN public.colleges c ON u.college_id = c.id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProjectSubmissions = async (req, res) => {
  try {
    const query = `
      SELECT 
        ps.id,
        u.full_name as student_name,
        s.name as subject_name,      
        p.title as task_name,       
        p.type,                      
        ps.submitted_at,
        ps.is_approved               
      FROM public.project_submissions ps
      JOIN public.users u ON ps.user_id = u.id          
      JOIN public.projects p ON ps.project_id = p.id    
      JOIN public.topics t ON p.topic_id = t.id         
      JOIN public.subjects s ON t.subject_id = s.id     
      WHERE ps.is_approved IS NOT TRUE                 
      ORDER BY ps.submitted_at DESC;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
