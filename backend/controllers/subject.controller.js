const pool = require('../config/pg');
const path = require('path');
const fs = require('fs').promises;

// 1. Get all published subjects
exports.getAllSubjects = async (req, res) => {
  try {
    // Note: We use order_index to keep your curated order
    const { rows } = await pool.query(
      'SELECT * FROM subjects ORDER BY order_index ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error | getAllSubjects:', err);
    res.status(500).json({ message: 'Error fetching subjects' });
  }
};

// 2. Get all published subjects
exports.getAllPublishedSubjects = async (req, res) => {
  try {
    // Note: We use order_index to keep your curated order
    const { rows } = await pool.query(
      'SELECT id, name, slug, description FROM subjects WHERE is_published = true ORDER BY order_index ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error | getAllSubjects:', err);
    res.status(500).json({ message: 'Error fetching subjects' });
  }
};

// 2. Get a course with its nested topics, subtopics, and all related content
exports.getCourseStructure = async (req, res) => {
  try {
    const { slug } = req.params;

    // 1. Fetch subject
    const subjectResult = await pool.query(
      `SELECT id, name, description 
       FROM subjects 
       WHERE slug = $1 AND is_published = true`,
      [slug]
    );

    if (subjectResult.rows.length === 0) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const subject = subjectResult.rows[0];

    // 2. Fetch full structure
    const query = `
      SELECT 
        -- Topic
        t.id AS topic_id,
        t.title AS topic_title,
        t.description AS topic_description,
        t.order_index AS topic_order,

        -- Subtopic
        st.id AS subtopic_id,
        st.title AS subtopic_title,
        st.slug AS subtopic_slug,
        st.description AS subtopic_description,
        st.order_index AS subtopic_order,

        -- Lesson Content (published only)
        lc.id AS lesson_id,
        lc.content_type AS lesson_type,
        lc.markdown_path AS lesson_path,
        lc.estimated_read_time AS lesson_read_time,
        lc.version AS lesson_version,

        -- Quiz
        q.id AS quiz_id,
        q.passing_score AS quiz_passing_score,
        q.max_score AS quiz_max_score,

        -- Quiz Question
        qq.id AS question_id,
        qq.question_text,
        qq.question_type,
        qq.points,
        qq.order_index AS question_order,
        qq.explanation,

        -- Quiz Options
        qo.id AS option_id,
        qo.option_text,
        qo.is_correct,
        qo.order_index AS option_order,

        -- Exercise
        e.id AS exercise_id,
        e.title AS exercise_title,
        e.instructions AS exercise_instructions,
        e.max_score AS exercise_max_score

      FROM topics t
      LEFT JOIN subtopics st ON t.id = st.topic_id
      LEFT JOIN lesson_content lc 
        ON st.id = lc.subtopic_id AND lc.is_published = true
      LEFT JOIN quizzes q ON st.id = q.subtopic_id
      LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
      LEFT JOIN quiz_question_options qo ON qq.id = qo.question_id
      LEFT JOIN exercises e ON st.id = e.subtopic_id

      WHERE t.subject_id = $1
      ORDER BY 
        t.order_index,
        st.order_index,
        qq.order_index,
        qo.order_index;
    `;

    const { rows } = await pool.query(query, [subject.id]);

    // 3. Build hierarchy safely
    const topicsMap = new Map();

    rows.forEach((row) => {
      // Topic
      if (!topicsMap.has(row.topic_id)) {
        topicsMap.set(row.topic_id, {
          id: row.topic_id,
          title: row.topic_title,
          description: row.topic_description,
          order_index: row.topic_order,
          subtopics: new Map(),
        });
      }

      const topic = topicsMap.get(row.topic_id);

      // Subtopic
      if (row.subtopic_id && !topic.subtopics.has(row.subtopic_id)) {
        topic.subtopics.set(row.subtopic_id, {
          id: row.subtopic_id,
          title: row.subtopic_title,
          slug: row.subtopic_slug,
          description: row.subtopic_description,
          order_index: row.subtopic_order,
          lesson_content: [],
          quizzes: new Map(),
          exercises: [],
        });
      }

      const subtopic = topic.subtopics.get(row.subtopic_id);

      // Lesson Content
      if (row.lesson_id && subtopic) {
        if (!subtopic.lesson_content.some((l) => l.id === row.lesson_id)) {
          subtopic.lesson_content.push({
            id: row.lesson_id,
            content_type: row.lesson_type,
            markdown_path: row.lesson_path,
            estimated_read_time: row.lesson_read_time,
            version: row.lesson_version,
          });
        }
      }

      // Quiz
      if (row.quiz_id && subtopic) {
        if (!subtopic.quizzes.has(row.quiz_id)) {
          subtopic.quizzes.set(row.quiz_id, {
            id: row.quiz_id,
            passing_score: row.quiz_passing_score,
            max_score: row.quiz_max_score,
            questions: new Map(),
          });
        }

        const quiz = subtopic.quizzes.get(row.quiz_id);

        // Question
        if (row.question_id && quiz) {
          if (!quiz.questions.has(row.question_id)) {
            quiz.questions.set(row.question_id, {
              id: row.question_id,
              question_text: row.question_text,
              question_type: row.question_type,
              points: row.points,
              order_index: row.question_order,
              explanation: row.explanation,
              options: [],
            });
          }

          const question = quiz.questions.get(row.question_id);

          // Options
          if (row.option_id && question) {
            if (!question.options.some((o) => o.id === row.option_id)) {
              question.options.push({
                id: row.option_id,
                option_text: row.option_text,
                is_correct: row.is_correct,
                order_index: row.option_order,
              });
            }
          }
        }
      }

      // Exercise
      if (row.exercise_id && subtopic) {
        if (!subtopic.exercises.some((e) => e.id === row.exercise_id)) {
          subtopic.exercises.push({
            id: row.exercise_id,
            title: row.exercise_title,
            instructions: row.exercise_instructions,
            max_score: row.exercise_max_score,
          });
        }
      }
    });

    // 4. Convert Maps → Arrays
    const structure = Array.from(topicsMap.values()).map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      order_index: topic.order_index,
      subtopics: Array.from(topic.subtopics.values()).map((sub) => ({
        ...sub,
        quizzes: Array.from(sub.quizzes.values()).map((q) => ({
          ...q,
          questions: Array.from(q.questions.values()),
        })),
      })),
    }));

    res.json({
      success: true,
      name: subject.name,
      description: subject.description,
      data: structure,
    });
  } catch (err) {
    console.error('Error | getCourseStructure:', err);
    res.status(500).json({ message: 'Error fetching course structure' });
  }
};

// 3. Get content for a specific subtopic
exports.getSubtopicContent = async (req, res) => {
  try {
    const { subtopicSlug } = req.params;

    const query = `
      SELECT
        st.id AS subtopic_id,
        st.title AS subtopic_title,
        st.description AS subtopic_description,

        lc.markdown_path,
        lc.estimated_read_time,

        q.id AS quiz_id,
        q.passing_score,
        q.max_score,

        qq.id AS question_id,
        qq.question_text,
        qq.question_type,
        qq.points,
        qq.order_index AS question_order,

        qo.id AS option_id,
        qo.option_text,
        qo.is_correct,
        qo.order_index AS option_order,

        e.id AS exercise_id,
        e.title AS exercise_title,
        e.instructions,
        e.max_score AS exercise_max_score

      FROM subtopics st
      LEFT JOIN lesson_content lc
        ON lc.subtopic_id = st.id AND lc.is_published = true
      LEFT JOIN quizzes q ON q.subtopic_id = st.id
      LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
      LEFT JOIN quiz_question_options qo ON qo.question_id = qq.id
      LEFT JOIN exercises e ON e.subtopic_id = st.id

      WHERE st.slug = $1
      ORDER BY qq.order_index, qo.order_index
    `;

    const { rows } = await pool.query(query, [subtopicSlug]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // ---- Build response ----
    const base = rows[0];

    // Read markdown
    let markdownContent = '';
    const relativePath = base.markdown_path.replace(/^\/+/, '');

    const filePath = path.join(__dirname, '..', 'data', relativePath);

    markdownContent = await fs.readFile(filePath, 'utf8');
    const quizzesMap = new Map();
    const exercisesMap = new Map();

    rows.forEach((row) => {
      // Quiz
      if (row.quiz_id) {
        if (!quizzesMap.has(row.quiz_id)) {
          quizzesMap.set(row.quiz_id, {
            id: row.quiz_id,
            passing_score: row.passing_score,
            max_score: row.max_score,
            questions: new Map(),
          });
        }

        const quiz = quizzesMap.get(row.quiz_id);

        // Question
        if (row.question_id) {
          if (!quiz.questions.has(row.question_id)) {
            quiz.questions.set(row.question_id, {
              id: row.question_id,
              text: row.question_text,
              type: row.question_type,
              points: row.points,
              options: [],
            });
          }

          const question = quiz.questions.get(row.question_id);

          if (row.option_id) {
            question.options.push({
              id: row.option_id,
              text: row.option_text,
              is_correct: row.is_correct,
            });
          }
        }
      }

      // Exercise
      if (row.exercise_id && !exercisesMap.has(row.exercise_id)) {
        exercisesMap.set(row.exercise_id, {
          id: row.exercise_id,
          title: row.exercise_title,
          instructions: row.instructions,
          max_score: row.exercise_max_score,
        });
      }
    });

    res.json({
      success: true,
      data: {
        subtopic: {
          id: base.subtopic_id,
          title: base.subtopic_title,
          description: base.subtopic_description,
        },
        lesson: {
          markdown_content: markdownContent,
          read_time: base.estimated_read_time,
        },
        quizzes: Array.from(quizzesMap.values()).map((q) => ({
          ...q,
          questions: Array.from(q.questions.values()),
        })),
        exercises: Array.from(exercisesMap.values()),
      },
    });
  } catch (err) {
    console.error('Error | getLessonContent:', err);
    res.status(500).json({ message: 'Failed to load lesson' });
  }
};

// 4. Create a new subject
exports.createSubject = async (req, res) => {
  const { name, slug, description } = req.body;

  // Basic validation
  if (!name || !slug) {
    return res.status(400).json({
      success: false,
      message: 'Name and Slug are required.',
    });
  }

  try {
    const query = `
      INSERT INTO public.subjects (name, slug, description, is_published, order_index)
      VALUES ($1, $2, $3, true, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM subjects))
      RETURNING id, name, slug, description, created_at;
    `;

    const values = [name, slug, description];
    const { rows } = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: rows[0],
    });
  } catch (err) {
    console.error('Error | createSubject:', err);

    // Handle unique constraint violation for the slug
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A subject with this slug already exists.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating subject',
      error: err.message,
    });
  }
};

// Update existing subject (Edit & Publish)
exports.updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, is_published } = req.body;
  try {
    const query = `
      UPDATE public.subjects 
      SET name = $1, slug = $2, description = $3, is_published = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 
      RETURNING *`;
    const values = [name, slug, description, is_published, id];
    const result = await pool.query(query, values);

    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Subject not found' });
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete subject
exports.deleteSubject = async (req, res) => {
  const { id } = req.params;
  try {
    // Note: Due to ON DELETE CASCADE in schema, this will also remove associated topics/subtopics
    const result = await pool.query(
      'DELETE FROM public.subjects WHERE id = $1',
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ message: 'Subject not found' });
    res
      .status(200)
      .json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
