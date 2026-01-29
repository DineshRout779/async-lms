const pool = require('../config/pg');

// ============================================
// EXISTING ADMIN FEATURES
// ============================================

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

// ============================================
// NEW CONTENT MANAGEMENT FEATURES
// ============================================

// ============================================
// TOPIC MANAGEMENT
// ============================================

// Create a new topic
exports.createTopic = async (req, res) => {
  try {
    const { subject_id, title, description, order_index } = req.body;

    // Validation
    if (!subject_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'Subject ID and title are required',
      });
    }

    const query = `
      INSERT INTO topics (subject_id, title, description, order_index)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [subject_id, title, description || null, order_index || 0];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Topic created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating topic:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create topic',
      error: error.message,
    });
  }
};

// Update an existing topic
exports.updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order_index } = req.body;

    // Build dynamic query based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramCount++}`);
      values.push(order_index);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE topics
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.json({
      success: true,
      message: 'Topic updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating topic:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update topic',
      error: error.message,
    });
  }
};

// Delete a topic
exports.deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM topics WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }

    res.json({
      success: true,
      message: 'Topic deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete topic',
      error: error.message,
    });
  }
};

// ============================================
// SUBTOPIC MANAGEMENT
// ============================================

// Create a new subtopic
exports.createSubtopic = async (req, res) => {
  try {
    const { topic_id, title, description, slug, order_index } = req.body;

    // Validation
    if (!topic_id || !title || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Topic ID, title, and slug are required',
      });
    }

    const query = `
      INSERT INTO subtopics (topic_id, title, description, slug, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      topic_id,
      title,
      description || null,
      slug,
      order_index || 0,
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Subtopic created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating subtopic:', error);

    // Handle unique constraint violation for slug
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A subtopic with this slug already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create subtopic',
      error: error.message,
    });
  }
};

// Update an existing subtopic
exports.updateSubtopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, slug, order_index } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (slug !== undefined) {
      updates.push(`slug = $${paramCount++}`);
      values.push(slug);
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramCount++}`);
      values.push(order_index);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE subtopics
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subtopic not found',
      });
    }

    res.json({
      success: true,
      message: 'Subtopic updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating subtopic:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A subtopic with this slug already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update subtopic',
      error: error.message,
    });
  }
};

// Delete a subtopic
exports.deleteSubtopic = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM subtopics WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subtopic not found',
      });
    }

    res.json({
      success: true,
      message: 'Subtopic deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting subtopic:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subtopic',
      error: error.message,
    });
  }
};

// ============================================
// LESSON CONTENT MANAGEMENT
// ============================================

// Create lesson content
exports.createLessonContent = async (req, res) => {
  try {
    const {
      subtopic_id,
      content_type,
      markdown_path,
      estimated_read_time,
      is_published,
    } = req.body;

    // Validation
    if (!subtopic_id || !content_type || !markdown_path) {
      return res.status(400).json({
        success: false,
        message: 'Subtopic ID, content type, and path are required',
      });
    }

    // Validate content_type
    const validTypes = ['markdown', 'video', 'external'];
    if (!validTypes.includes(content_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type. Must be: markdown, video, or external',
      });
    }

    const query = `
      INSERT INTO lesson_content 
      (subtopic_id, content_type, markdown_path, estimated_read_time, is_published)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      subtopic_id,
      content_type,
      markdown_path,
      estimated_read_time || null,
      is_published || false,
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Lesson content created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating lesson content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create lesson content',
      error: error.message,
    });
  }
};

// Update lesson content
exports.updateLessonContent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      content_type,
      markdown_path,
      estimated_read_time,
      is_published,
      version,
    } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (content_type !== undefined) {
      updates.push(`content_type = $${paramCount++}`);
      values.push(content_type);
    }
    if (markdown_path !== undefined) {
      updates.push(`markdown_path = $${paramCount++}`);
      values.push(markdown_path);
    }
    if (estimated_read_time !== undefined) {
      updates.push(`estimated_read_time = $${paramCount++}`);
      values.push(estimated_read_time);
    }
    if (is_published !== undefined) {
      updates.push(`is_published = $${paramCount++}`);
      values.push(is_published);
    }
    if (version !== undefined) {
      updates.push(`version = $${paramCount++}`);
      values.push(version);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE lesson_content
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lesson content not found',
      });
    }

    res.json({
      success: true,
      message: 'Lesson content updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating lesson content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lesson content',
      error: error.message,
    });
  }
};

// Delete lesson content
exports.deleteLessonContent = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM lesson_content WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lesson content not found',
      });
    }

    res.json({
      success: true,
      message: 'Lesson content deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting lesson content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete lesson content',
      error: error.message,
    });
  }
};

// Publish/unpublish lesson content
exports.publishLessonContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_published } = req.body;

    const query = `
      UPDATE lesson_content
      SET is_published = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;

    const result = await pool.query(query, [is_published, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lesson content not found',
      });
    }

    res.json({
      success: true,
      message: `Lesson content ${
        is_published ? 'published' : 'unpublished'
      } successfully`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error publishing lesson content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish lesson content',
      error: error.message,
    });
  }
};

// ============================================
// QUIZ MANAGEMENT
// ============================================

exports.createQuiz = async (req, res) => {
  try {
    const { subtopic_id, passing_score, max_score } = req.body;

    if (!subtopic_id || !passing_score || !max_score) {
      return res.status(400).json({
        success: false,
        message: 'Subtopic ID, passing score, and max score are required',
      });
    }

    const query = `
      INSERT INTO quizzes (subtopic_id, passing_score, max_score)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      subtopic_id,
      passing_score,
      max_score,
    ]);

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz',
      error: error.message,
    });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { passing_score, max_score } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (passing_score !== undefined) {
      updates.push(`passing_score = $${paramCount++}`);
      values.push(passing_score);
    }
    if (max_score !== undefined) {
      updates.push(`max_score = $${paramCount++}`);
      values.push(max_score);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE quizzes
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz',
      error: error.message,
    });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM quizzes WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    res.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz',
      error: error.message,
    });
  }
};

// ============================================
// EXERCISE MANAGEMENT
// ============================================

exports.createExercise = async (req, res) => {
  try {
    const { subtopic_id, title, instructions, max_score } = req.body;

    if (!subtopic_id || !title || !max_score) {
      return res.status(400).json({
        success: false,
        message: 'Subtopic ID, title, and max score are required',
      });
    }

    const query = `
      INSERT INTO exercises (subtopic_id, title, instructions, max_score)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      subtopic_id,
      title,
      instructions,
      max_score,
    ]);

    res.status(201).json({
      success: true,
      message: 'Exercise created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create exercise',
      error: error.message,
    });
  }
};

exports.updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, instructions, max_score } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (instructions !== undefined) {
      updates.push(`instructions = $${paramCount++}`);
      values.push(instructions);
    }
    if (max_score !== undefined) {
      updates.push(`max_score = $${paramCount++}`);
      values.push(max_score);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE exercises
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Exercise updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exercise',
      error: error.message,
    });
  }
};

exports.deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM exercises WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found',
      });
    }

    res.json({
      success: true,
      message: 'Exercise deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exercise',
      error: error.message,
    });
  }
};

// ============================================
// PROJECT MANAGEMENT
// ============================================

exports.createProject = async (req, res) => {
  try {
    const { topic_id, title, type, max_score } = req.body;

    if (!topic_id || !title || !max_score) {
      return res.status(400).json({
        success: false,
        message: 'Topic ID, title, and max score are required',
      });
    }

    const query = `
      INSERT INTO projects (topic_id, title, type, max_score)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(query, [topic_id, title, type, max_score]);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message,
    });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, max_score } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramCount++}`);
      values.push(type);
    }
    if (max_score !== undefined) {
      updates.push(`max_score = $${paramCount++}`);
      values.push(max_score);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE projects
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message,
    });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM projects WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message,
    });
  }
};

module.exports = exports;
