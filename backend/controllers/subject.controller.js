const pool = require('../config/pg');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');
const http = require('http');
const slugify = require('../utils/slugify');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function presignIfS3(url) {
  if (!url || !url.includes('.amazonaws.com/')) return url;
  try {
    const { hostname, pathname } = new URL(url);
    const bucket = hostname.split('.')[0];
    const key = decodeURIComponent(pathname.slice(1));
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return await getSignedUrl(s3, cmd, { expiresIn: 3600 });
  } catch {
    return url;
  }
}

const fetchTextFromUrl = (url) =>
  new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Failed to fetch markdown: ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString('utf8');
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });

// 1. Get all published subjects
exports.getAllSubjects = async (req, res) => {
  try {
    // Note: We use order_index to keep your curated order
    const { rows } = await pool.query(`
      SELECT s.*, 
             COUNT(DISTINCT u.id)::int as units_count, 
             COUNT(DISTINCT st.id)::int as topics_count
      FROM subjects s
      LEFT JOIN topics t ON s.id = t.subject_id
      LEFT JOIN units u ON t.id = u.topic_id
      LEFT JOIN subtopics st ON u.id = st.unit_id
      GROUP BY s.id
      ORDER BY s.order_index ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error | getAllSubjects:', err);
    res.status(500).json({ message: 'Error fetching subjects' });
  }
};

// 2. Get all published subjects
exports.getAllPublishedSubjects = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        s.id, s.name, s.slug, s.description, s.level,
        (
          SELECT COUNT(st.id)
          FROM subtopics st
          JOIN units u ON st.unit_id = u.id
          JOIN topics t ON u.topic_id = t.id
          WHERE t.subject_id = s.id
        ) AS total_lessons
      FROM subjects s
      WHERE s.is_published = true
      ORDER BY s.order_index ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error | getAllPublishedSubjects:', err);
    res.status(500).json({ message: 'Error fetching subjects' });
  }
};

// 2. Get a course with its nested topics, units, subtopics, and all related content
exports.getCourseStructure = async (req, res) => {
  try {
    const { slug } = req.params;

    // 1. Fetch subject
    const subjectResult = await pool.query(
      `SELECT id, name, description 
       FROM subjects 
       WHERE slug = $1 AND is_published = true`,
      [slug],
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

        -- Unit
        u.id AS unit_id,
        u.title AS unit_title,
        u.slug AS unit_slug,
        u.description AS unit_description,
        u.order_index AS unit_order,

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
        lc.video_url AS lesson_video_url,

        -- Quiz (presence only — questions/options fetched on demand via /subjects/quiz/:id)
        q.id AS quiz_id,
        q.passing_score AS quiz_passing_score,
        q.max_score AS quiz_max_score,

        -- Exercise (subtopic-level)
        e.id AS exercise_id,
        e.title AS exercise_title,
        e.instructions AS exercise_instructions,
        e.max_score AS exercise_max_score,

        -- Assignment (unit-level)
        a.id AS assignment_id,
        a.title AS assignment_title,
        a.instructions AS assignment_instructions,
        a.max_score AS assignment_max_score,

        -- Capstone (topic-level)
        p.id AS capstone_id,
        p.title AS capstone_title,
        p.instructions AS capstone_instructions,
        p.max_score AS capstone_max_score

      FROM topics t
      LEFT JOIN projects p ON t.id = p.topic_id
      LEFT JOIN units u ON t.id = u.topic_id
      LEFT JOIN subtopics st ON u.id = st.unit_id
      LEFT JOIN lesson_content lc 
        ON st.id = lc.subtopic_id AND lc.is_published = true
      LEFT JOIN quizzes q ON u.id = q.unit_id
      LEFT JOIN exercises e ON st.id = e.subtopic_id
      LEFT JOIN assignments a ON u.id = a.unit_id

      WHERE t.subject_id = $1
      ORDER BY
        t.order_index,
        u.order_index,
        st.order_index;
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
          capstone: row.capstone_id
            ? { id: row.capstone_id, title: row.capstone_title, instructions: row.capstone_instructions, max_score: row.capstone_max_score }
            : null,
          units: new Map(),
        });
      }

      const topic = topicsMap.get(row.topic_id);

      // Unit
      if (row.unit_id && !topic.units.has(row.unit_id)) {
        topic.units.set(row.unit_id, {
          id: row.unit_id,
          title: row.unit_title,
          slug: row.unit_slug,
          description: row.unit_description,
          order_index: row.unit_order,
          subtopics: new Map(),
          assignments: [],
          quizzes: new Map(),
        });
      }

      const unit = topic.units.get(row.unit_id);

      // Subtopic
      if (row.subtopic_id && unit && !unit.subtopics.has(row.subtopic_id)) {
        unit.subtopics.set(row.subtopic_id, {
          id: row.subtopic_id,
          title: row.subtopic_title,
          slug: row.subtopic_slug,
          description: row.subtopic_description,
          order_index: row.subtopic_order,
          lesson_content: [],
          exercises: [],
        });
      }

      const subtopic = unit ? unit.subtopics.get(row.subtopic_id) : null;

      // Lesson Content
      if (row.lesson_id && subtopic) {
        if (!subtopic.lesson_content.some((l) => l.id === row.lesson_id)) {
          subtopic.lesson_content.push({
            id: row.lesson_id,
            content_type: row.lesson_type,
            markdown_path: row.lesson_path,
            estimated_read_time: row.lesson_read_time,
            version: row.lesson_version,
            video_url: row.lesson_video_url,
          });
        }
      }

      // Quiz (presence only)
      if (row.quiz_id && unit) {
        if (!unit.quizzes.has(row.quiz_id)) {
          unit.quizzes.set(row.quiz_id, {
            id: row.quiz_id,
            passing_score: row.quiz_passing_score,
            max_score: row.quiz_max_score,
          });
        }
      }

      // Exercise (subtopic-level)
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

      // Assignment (unit-level)
      if (row.assignment_id && unit) {
        if (!unit.assignments.some((a) => a.id === row.assignment_id)) {
          unit.assignments.push({
            id: row.assignment_id,
            title: row.assignment_title,
            instructions: row.assignment_instructions,
            max_score: row.assignment_max_score,
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
      capstone: topic.capstone,
      units: Array.from(topic.units.values()).map((unit) => ({
        id: unit.id,
        title: unit.title,
        slug: unit.slug,
        description: unit.description,
        order_index: unit.order_index,
        assignments: unit.assignments || [],
        quizzes: Array.from(unit.quizzes.values()),
        subtopics: Array.from(unit.subtopics.values()).map((sub) => ({
          ...sub,
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
    const userId = req.user?.id;
    const userRole = req.user?.role;
    let lessonCompleted = false;

    const subtopicResult = await pool.query(
      `SELECT id FROM subtopics WHERE slug = $1 LIMIT 1`,
      [subtopicSlug],
    );

    if (subtopicResult.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const subtopicId = subtopicResult.rows[0].id;

    if (userRole === 'student') {
      const lockCheck = await pool.query(
        `
          SELECT is_unlocked
          FROM user_subtopic_progress
          WHERE user_id = $1 AND subtopic_id = $2
          LIMIT 1;
        `,
        [userId, subtopicId],
      );

      if (lockCheck.rows[0]?.is_unlocked === false) {
        return res.status(403).json({
          success: false,
          message: 'This subtopic is locked by your admin.',
        });
      }
    }

    if (userRole === 'student') {
      const completionResult = await pool.query(
        `
          SELECT EXISTS (
            SELECT 1
            FROM user_lesson_progress ulp
            INNER JOIN lesson_content lc ON lc.id = ulp.lesson_content_id
            WHERE ulp.user_id = $1
              AND lc.subtopic_id = $2
              AND ulp.is_completed = true
              AND lc.is_published = true
          ) AS lesson_completed
        `,
        [userId, subtopicId],
      );
      lessonCompleted = completionResult.rows[0]?.lesson_completed || false;
    }

    const query = `
      SELECT
        st.id AS subtopic_id,
        st.slug AS subtopic_slug,
        st.title AS subtopic_title,
        st.description AS subtopic_description,

        lc.id AS lesson_id,
        lc.content_type,
        lc.markdown_path,
        lc.estimated_read_time,
        lc.version AS lesson_version,
        lc.video_url,

        q.id AS quiz_id,
        q.passing_score,
        q.max_score,

        qq.id AS question_id,
        qq.question_text,
        qq.question_type,
        qq.points,
        qq.order_index AS question_order,
        qq.explanation,

        qo.id AS option_id,
        qo.option_text,
        qo.order_index AS option_order,

        e.id AS exercise_id,
        e.title AS exercise_title,
        e.instructions,
        e.max_score AS exercise_max_score,
        e.language AS exercise_language,
        e.initial_files AS exercise_initial_files,
        e.test_cases AS exercise_test_cases,
        e.tasks AS exercise_tasks

      FROM subtopics st
      LEFT JOIN lesson_content lc
        ON lc.subtopic_id = st.id AND lc.is_published = true
      LEFT JOIN quizzes q ON q.unit_id = (SELECT unit_id FROM subtopics WHERE slug = $1)
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
    const lessonRows = rows.filter((r) => r.lesson_id);
    const markdownRow = lessonRows
      .filter((r) => r.content_type === 'markdown')
      .sort((a, b) => (b.lesson_version || 0) - (a.lesson_version || 0))[0];
    const videoRow =
      lessonRows.find((r) => r.video_url) ||
      lessonRows.find((r) => r.content_type === 'video');

    // Read markdown — three sources: inline AI content, remote URL, or local file
    let markdownContent = '';
    if (markdownRow?.markdown_path) {
      try {
        if (markdownRow.markdown_path.startsWith('ai-generated:')) {
          markdownContent = markdownRow.markdown_path.slice('ai-generated:'.length);
        } else if (markdownRow.markdown_path.startsWith('http')) {
          const fetchUrl = await presignIfS3(markdownRow.markdown_path);
          markdownContent = await fetchTextFromUrl(fetchUrl);
        } else {
          const relativePath = markdownRow.markdown_path.replace(/^\/+/, '');
          const filePath = path.join(__dirname, '..', 'data', relativePath);
          markdownContent = await fs.readFile(filePath, 'utf8');
        }
      } catch (err) {
        console.error('[lesson-content] Failed to load markdown');
        console.error('  subtopic_id :', base?.subtopic_id ?? 'unknown');
        console.error('  lesson_id   :', markdownRow?.lesson_id ?? 'unknown');
        console.error('  path        :', markdownRow?.markdown_path);
        console.error('  error       :', err.message);
        markdownContent = markdownRow.markdown_path.startsWith('http')
          ? '_Lesson content is temporarily unavailable. Please try again later._'
          : '';
      }
    }

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
              question_text: row.question_text,
              question_type: row.question_type,
              points: row.points,
              explanation: row.explanation,
              options: [],
            });
          }

          const question = quiz.questions.get(row.question_id);

          if (row.option_id) {
            question.options.push({
              id: row.option_id,
              option_text: row.option_text,
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
          language: row.exercise_language,
          initial_files: row.exercise_initial_files,
          test_cases: row.exercise_test_cases,
          tasks: row.exercise_tasks,
        });
      }
    });

    res.json({
      success: true,
      data: {
        subtopic: {
          id: base.subtopic_id,
          slug: base.subtopic_slug,
          title: base.subtopic_title,
          description: base.subtopic_description,
        },
        lesson: {
          id: markdownRow?.lesson_id || videoRow?.lesson_id || null,
          content_type: base.content_type,
          markdown_content: markdownContent,
          read_time:
            markdownRow?.estimated_read_time ??
            videoRow?.estimated_read_time ??
            null,
          video_url: videoRow?.video_url || null,
        },
        lesson_completed: lessonCompleted,
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
  const { name, slug: manualSlug, description } = req.body;
  const slug = manualSlug || slugify(name);

  // Basic validation
  if (!name || !slug) {
    return res.status(400).json({
      success: false,
      message: 'Name is required.',
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
  const { name, slug: manualSlug, description, is_published } = req.body;
  const slug = manualSlug || slugify(name);
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
      [id],
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
// 5. Get a specific exercise content
exports.getExerciseContent = async (req, res) => {
  try {
    const { exerciseId } = req.params;

    const query = `
      SELECT
        e.id AS exercise_id,
        e.title AS exercise_title,
        e.instructions,
        e.max_score AS exercise_max_score,
        e.language AS exercise_language,
        e.initial_files AS exercise_initial_files,
        e.test_cases AS exercise_test_cases,
        e.tasks AS exercise_tasks,
        e.subtopic_id,
        e.unit_id,
        st.title AS subtopic_title,
        u.title AS unit_title
      FROM exercises e
      LEFT JOIN subtopics st ON e.subtopic_id = st.id
      LEFT JOIN units u ON e.unit_id = u.id
      WHERE e.id = $1
    `;

    const { rows } = await pool.query(query, [exerciseId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    const row = rows[0];

    res.json({
      success: true,
      data: {
        subtopic: {
          id: row.subtopic_id || row.unit_id,
          title: row.subtopic_title || row.unit_title,
          description: row.instructions,
        },
        lesson: {
          id: null,
          content_type: 'exercise',
          markdown_content: row.instructions,
        },
        quizzes: [],
        exercises: [
          {
            id: row.exercise_id,
            title: row.exercise_title,
            instructions: row.instructions,
            max_score: row.exercise_max_score,
            language: row.exercise_language,
            initial_files: row.exercise_initial_files,
            test_cases: row.exercise_test_cases,
            tasks: row.exercise_tasks,
          },
        ],
      },
    });
  } catch (err) {
    console.error('Error | getExerciseContent:', err);
    res.status(500).json({ message: 'Failed to load exercise' });
  }
};
// 6. Get a specific quiz content
exports.getQuizContent = async (req, res) => {
  try {
    const { quizId } = req.params;

    const query = `
      SELECT 
        q.id AS quiz_id,
        q.passing_score,
        q.max_score,
        q.unit_id,
        u.title AS unit_title,
        u.description AS unit_description,
        qq.id AS question_id,
        qq.question_text,
        qq.question_type,
        qq.points,
        qq.explanation,
        qo.id AS option_id,
        qo.option_text
      FROM quizzes q
      LEFT JOIN units u ON q.unit_id = u.id
      LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
      LEFT JOIN quiz_question_options qo ON qq.id = qo.question_id
      WHERE q.id = $1
      ORDER BY qq.order_index, qo.order_index
    `;

    const { rows } = await pool.query(query, [quizId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const base = rows[0];
    const questionsMap = new Map();

    rows.forEach((row) => {
      if (row.question_id) {
        if (!questionsMap.has(row.question_id)) {
          questionsMap.set(row.question_id, {
            id: row.question_id,
            question_text: row.question_text,
            question_type: row.question_type,
            points: row.points,
            explanation: row.explanation,
            options: [],
          });
        }
        const question = questionsMap.get(row.question_id);
        if (row.option_id) {
          question.options.push({
            id: row.option_id,
            option_text: row.option_text,
          });
        }
      }
    });

    res.json({
      success: true,
      data: {
        subtopic: {
          id: base.unit_id,
          title: `Quiz: ${base.unit_title}`,
          description: base.unit_description,
        },
        lesson: {
          id: null,
          content_type: 'quiz',
          markdown_content: 'Please complete the quiz to proceed.',
        },
        quizzes: [
          {
            id: base.quiz_id,
            passing_score: base.passing_score,
            max_score: base.max_score,
            questions: Array.from(questionsMap.values()),
          },
        ],
        exercises: [],
      },
    });
  } catch (err) {
    console.error('Error | getQuizContent:', err);
    res.status(500).json({ message: 'Failed to load quiz' });
  }
};

exports.getMarkdownContent = async (req, res) => {
  try {
    const { markdownPathURL } = req.body;
    const content = await fetchTextFromUrl(markdownPathURL);
    res.json({ success: true, data: content });
  } catch (err) {
    console.error('Error | getMarkdownContent:', err);
    res.status(500).json({ message: 'Failed to load markdown content' });
  }
};
