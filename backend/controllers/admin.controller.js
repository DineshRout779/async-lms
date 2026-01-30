const pool = require('../config/pg');

// ============================================
// EXISTING ADMIN FEATURES (Keep these!)
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

// ============================================
// QUIZ QUESTIONS MANAGEMENT
// ============================================

/**
 * Create a new quiz question
 * POST /api/admin/quiz-questions
 */
exports.createQuizQuestion = async (req, res) => {
  try {
    const {
      quiz_id,
      question_text,
      question_type,
      points,
      explanation,
      order_index,
    } = req.body;

    if (!quiz_id || !question_text || !question_type || !points) {
      return res.status(400).json({
        success: false,
        message: 'Quiz ID, question text, type, and points are required',
      });
    }

    const query = `
      INSERT INTO quiz_questions 
        (quiz_id, question_text, question_type, points, explanation, order_index)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, (
        SELECT COALESCE(MAX(order_index), 0) + 1 
        FROM quiz_questions 
        WHERE quiz_id = $1
      )))
      RETURNING *;
    `;

    const result = await pool.query(query, [
      quiz_id,
      question_text,
      question_type,
      points,
      explanation || null,
      order_index || null,
    ]);

    res.status(201).json({
      success: true,
      message: 'Quiz question created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating quiz question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz question',
      error: error.message,
    });
  }
};

/**
 * Update a quiz question
 * PUT /api/admin/quiz-questions/:id
 */
exports.updateQuizQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question_text, question_type, points, explanation, order_index } =
      req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (question_text !== undefined) {
      updates.push(`question_text = $${paramCount++}`);
      values.push(question_text);
    }
    if (question_type !== undefined) {
      updates.push(`question_type = $${paramCount++}`);
      values.push(question_type);
    }
    if (points !== undefined) {
      updates.push(`points = $${paramCount++}`);
      values.push(points);
    }
    if (explanation !== undefined) {
      updates.push(`explanation = $${paramCount++}`);
      values.push(explanation);
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

    values.push(id);

    const query = `
      UPDATE quiz_questions
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz question not found',
      });
    }

    res.json({
      success: true,
      message: 'Quiz question updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating quiz question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz question',
      error: error.message,
    });
  }
};

/**
 * Delete a quiz question
 * DELETE /api/admin/quiz-questions/:id
 */
exports.deleteQuizQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM quiz_questions WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz question not found',
      });
    }

    res.json({
      success: true,
      message: 'Quiz question deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting quiz question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz question',
      error: error.message,
    });
  }
};

/**
 * Get all questions for a quiz
 * GET /api/admin/quizzes/:quizId/questions
 */
exports.getQuizQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;

    const query = `
      SELECT qq.*, 
        json_agg(
          json_build_object(
            'id', qo.id,
            'option_text', qo.option_text,
            'is_correct', qo.is_correct,
            'order_index', qo.order_index
          ) ORDER BY qo.order_index
        ) FILTER (WHERE qo.id IS NOT NULL) as options
      FROM quiz_questions qq
      LEFT JOIN quiz_question_options qo ON qq.id = qo.question_id
      WHERE qq.quiz_id = $1
      GROUP BY qq.id
      ORDER BY qq.order_index;
    `;

    const result = await pool.query(query, [quizId]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz questions',
      error: error.message,
    });
  }
};

// ============================================
// QUIZ QUESTION OPTIONS MANAGEMENT
// ============================================

/**
 * Create a new quiz question option
 * POST /api/admin/quiz-question-options
 */
exports.createQuizQuestionOption = async (req, res) => {
  try {
    const { question_id, option_text, is_correct, order_index } = req.body;

    if (!question_id || !option_text) {
      return res.status(400).json({
        success: false,
        message: 'Question ID and option text are required',
      });
    }

    const query = `
      INSERT INTO quiz_question_options 
        (question_id, option_text, is_correct, order_index)
      VALUES ($1, $2, $3, COALESCE($4, (
        SELECT COALESCE(MAX(order_index), 0) + 1 
        FROM quiz_question_options 
        WHERE question_id = $1
      )))
      RETURNING *;
    `;

    const result = await pool.query(query, [
      question_id,
      option_text,
      is_correct || false,
      order_index || null,
    ]);

    res.status(201).json({
      success: true,
      message: 'Quiz option created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating quiz option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz option',
      error: error.message,
    });
  }
};

/**
 * Update a quiz question option
 * PUT /api/admin/quiz-question-options/:id
 */
exports.updateQuizQuestionOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { option_text, is_correct, order_index } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (option_text !== undefined) {
      updates.push(`option_text = $${paramCount++}`);
      values.push(option_text);
    }
    if (is_correct !== undefined) {
      updates.push(`is_correct = $${paramCount++}`);
      values.push(is_correct);
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

    values.push(id);

    const query = `
      UPDATE quiz_question_options
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz option not found',
      });
    }

    res.json({
      success: true,
      message: 'Quiz option updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating quiz option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz option',
      error: error.message,
    });
  }
};

/**
 * Delete a quiz question option
 * DELETE /api/admin/quiz-question-options/:id
 */
exports.deleteQuizQuestionOption = async (req, res) => {
  try {
    const { id } = req.params;

    const query =
      'DELETE FROM quiz_question_options WHERE id = $1 RETURNING id;';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz option not found',
      });
    }

    res.json({
      success: true,
      message: 'Quiz option deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting quiz option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quiz option',
      error: error.message,
    });
  }
};

// ============================================
// STUDENT PROGRESS TRACKING
// ============================================

/**
 * Get student progress for a specific course
 * GET /api/admin/students/:userId/progress/:subjectId
 */
exports.getStudentProgress = async (req, res) => {
  try {
    const { userId, subjectId } = req.params;

    const query = `
      SELECT 
        t.id as topic_id,
        t.title as topic_title,
        utp.progress_percent,
        utp.is_completed as topic_completed,
        
        json_agg(
          json_build_object(
            'subtopic_id', st.id,
            'subtopic_title', st.title,
            'is_unlocked', usp.is_unlocked,
            'is_completed', usp.is_completed,
            'completed_at', usp.completed_at,
            'lesson_progress', (
              SELECT json_build_object(
                'is_completed', ulp.is_completed,
                'last_scroll_position', ulp.last_scroll_position
              )
              FROM user_lesson_progress ulp
              INNER JOIN lesson_content lc ON ulp.lesson_content_id = lc.id
              WHERE ulp.user_id = $1 AND lc.subtopic_id = st.id
              LIMIT 1
            ),
            'quiz_attempts', (
              SELECT json_agg(
                json_build_object(
                  'quiz_id', qa.quiz_id,
                  'score', qa.score,
                  'is_passed', qa.is_passed,
                  'attempted_at', qa.attempted_at
                )
              )
              FROM quiz_attempts qa
              INNER JOIN quizzes q ON qa.quiz_id = q.id
              WHERE qa.user_id = $1 AND q.subtopic_id = st.id
            ),
            'exercise_submissions', (
              SELECT json_agg(
                json_build_object(
                  'exercise_id', es.exercise_id,
                  'score', es.score,
                  'is_passed', es.is_passed,
                  'submitted_at', es.submitted_at
                )
              )
              FROM exercise_submissions es
              INNER JOIN exercises e ON es.exercise_id = e.id
              WHERE es.user_id = $1 AND e.subtopic_id = st.id
            )
          )
          ORDER BY st.order_index
        ) as subtopics
      FROM topics t
      INNER JOIN subtopics st ON t.id = st.topic_id
      LEFT JOIN user_topic_progress utp ON utp.topic_id = t.id AND utp.user_id = $1
      LEFT JOIN user_subtopic_progress usp ON usp.subtopic_id = st.id AND usp.user_id = $1
      WHERE t.subject_id = $2
      GROUP BY t.id, t.title, t.order_index, utp.progress_percent, utp.is_completed
      ORDER BY t.order_index;
    `;

    const result = await pool.query(query, [userId, subjectId]);

    // Calculate overall progress
    let totalSubtopics = 0;
    let completedSubtopics = 0;

    result.rows.forEach((topic) => {
      topic.subtopics.forEach((subtopic) => {
        totalSubtopics++;
        if (subtopic.is_completed) completedSubtopics++;
      });
    });

    const overallProgress =
      totalSubtopics > 0
        ? Math.round((completedSubtopics / totalSubtopics) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        overall_progress: overallProgress,
        total_subtopics: totalSubtopics,
        completed_subtopics: completedSubtopics,
        topics: result.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student progress',
      error: error.message,
    });
  }
};

/**
 * Get all students progress summary
 * GET /api/admin/students/progress-summary
 */
exports.getAllStudentsProgressSummary = async (req, res) => {
  try {
    const { subjectId } = req.query;

    let query = `
      SELECT 
        u.id as user_id,
        u.full_name,
        u.email,
        c.name as college_name,
        COUNT(DISTINCT usp.subtopic_id) FILTER (WHERE usp.is_completed = true) as completed_subtopics,
        COUNT(DISTINCT usp.subtopic_id) as total_assigned_subtopics,
        COALESCE(SUM(pl.points), 0) as total_points,
        MAX(us.current_streak) as current_streak
      FROM users u
      LEFT JOIN colleges c ON u.college_id = c.id
      LEFT JOIN user_subtopic_progress usp ON u.id = usp.user_id
      LEFT JOIN points_log pl ON u.id = pl.user_id
      LEFT JOIN user_streaks us ON u.id = us.user_id
      WHERE u.role = 'student'
    `;

    const params = [];

    if (subjectId) {
      query += ` AND usp.subtopic_id IN (
        SELECT st.id FROM subtopics st
        INNER JOIN topics t ON st.topic_id = t.id
        WHERE t.subject_id = $1
      )`;
      params.push(subjectId);
    }

    query += `
      GROUP BY u.id, u.full_name, u.email, c.name
      ORDER BY total_points DESC;
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching students progress summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students progress summary',
      error: error.message,
    });
  }
};

// ============================================
// LEADERBOARD MANAGEMENT
// ============================================

/**
 * Get overall leaderboard
 * GET /api/admin/leaderboard/overall
 */
exports.getOverallLeaderboard = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const query = `
      SELECT * FROM leaderboard_overall
      LIMIT $1;
    `;

    const result = await pool.query(query, [limit]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching overall leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overall leaderboard',
      error: error.message,
    });
  }
};

/**
 * Get weekly leaderboard
 * GET /api/admin/leaderboard/weekly
 */
exports.getWeeklyLeaderboard = async (req, res) => {
  try {
    const { weekStart, limit = 100 } = req.query;

    const targetWeek = weekStart || new Date().toISOString().split('T')[0];

    const query = `
      SELECT 
        lw.*,
        u.full_name,
        u.email,
        c.name as college_name
      FROM leaderboards_weekly lw
      INNER JOIN users u ON lw.user_id = u.id
      LEFT JOIN colleges c ON u.college_id = c.id
      WHERE lw.week_start = $1
      ORDER BY lw.rank
      LIMIT $2;
    `;

    const result = await pool.query(query, [targetWeek, limit]);

    res.json({
      success: true,
      week_start: targetWeek,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly leaderboard',
      error: error.message,
    });
  }
};

/**
 * Get topic-specific leaderboard
 * GET /api/admin/leaderboard/topic/:topicId
 */
exports.getTopicLeaderboard = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { limit = 100 } = req.query;

    const query = `
      SELECT 
        lt.*,
        u.full_name,
        u.email,
        c.name as college_name,
        t.title as topic_title
      FROM leaderboards_topic lt
      INNER JOIN users u ON lt.user_id = u.id
      LEFT JOIN colleges c ON u.college_id = c.id
      INNER JOIN topics t ON lt.topic_id = t.id
      WHERE lt.topic_id = $1
      ORDER BY lt.rank
      LIMIT $2;
    `;

    const result = await pool.query(query, [topicId, limit]);

    res.json({
      success: true,
      topic_id: topicId,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching topic leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch topic leaderboard',
      error: error.message,
    });
  }
};

/**
 * Get college-specific leaderboard
 * GET /api/admin/leaderboard/college/:collegeId
 */
exports.getCollegeLeaderboard = async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { limit = 100 } = req.query;

    const query = `
      SELECT 
        lc.*,
        u.full_name,
        u.email,
        c.name as college_name
      FROM leaderboards_college lc
      INNER JOIN users u ON lc.user_id = u.id
      INNER JOIN colleges c ON lc.college_id = c.id
      WHERE lc.college_id = $1
      ORDER BY lc.rank
      LIMIT $2;
    `;

    const result = await pool.query(query, [collegeId, limit]);

    res.json({
      success: true,
      college_id: collegeId,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching college leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch college leaderboard',
      error: error.message,
    });
  }
};

/**
 * Manually trigger leaderboard updates
 * POST /api/admin/leaderboard/update
 */
exports.updateLeaderboards = async (req, res) => {
  try {
    const { type, id } = req.body; // type: 'weekly', 'topic', 'college', 'all'

    if (type === 'weekly' || type === 'all') {
      await pool.query('SELECT update_weekly_leaderboard()');
    }

    if (type === 'topic' && id) {
      await pool.query('SELECT update_topic_leaderboard($1)', [id]);
    }

    if (type === 'college' && id) {
      await pool.query('SELECT update_college_leaderboard($1)', [id]);
    }

    if (type === 'all') {
      // Update all topic leaderboards
      const topics = await pool.query('SELECT id FROM topics');
      for (const topic of topics.rows) {
        await pool.query('SELECT update_topic_leaderboard($1)', [topic.id]);
      }

      // Update all college leaderboards
      const colleges = await pool.query('SELECT id FROM colleges');
      for (const college of colleges.rows) {
        await pool.query('SELECT update_college_leaderboard($1)', [college.id]);
      }
    }

    res.json({
      success: true,
      message: 'Leaderboards updated successfully',
    });
  } catch (error) {
    console.error('Error updating leaderboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leaderboards',
      error: error.message,
    });
  }
};

module.exports = exports;
