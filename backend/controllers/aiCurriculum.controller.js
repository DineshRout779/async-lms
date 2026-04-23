const pool = require('../config/pg');
const { generateCurriculum, regenerateLesson, extractSkillsFromJD } = require('../services/aiCurriculumService');
const { notify } = require('../services/notificationService');

// ─── Helper ───────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function uniqueSlug(base, suffix) {
  return `${slugify(base)}-${suffix}`.substring(0, 80);
}

// ─── Extract skills from JD ───────────────────────────────────────────────────

exports.extractSkills = async (req, res) => {
  try {
    const { jd_text } = req.body;
    if (!jd_text) return res.status(400).json({ success: false, message: 'jd_text is required' });

    const skills = await extractSkillsFromJD(jd_text);
    res.json({ success: true, data: skills });
  } catch (err) {
    console.error('extractSkills error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Generate curriculum via AI ───────────────────────────────────────────────

exports.generate = async (req, res) => {
  try {
    const {
      title, domain, role_focus, jd_text, skills,
      audience, level, learning_goal,
      duration_weeks, daily_hours, content_preference,
    } = req.body;

    if (!title || !domain || !role_focus || !audience || !level || !learning_goal) {
      return res.status(400).json({ success: false, message: 'title, domain, role_focus, audience, level, learning_goal are required' });
    }

    const curriculum = await generateCurriculum({
      title, domain, roleFocus: role_focus, jdText: jd_text, skills,
      audience, level, learningGoal: learning_goal,
      durationWeeks: duration_weeks, dailyHours: daily_hours,
      contentPreference: content_preference,
    });

    res.json({ success: true, data: curriculum });
  } catch (err) {
    console.error('generate error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Save course (draft) ──────────────────────────────────────────────────────

exports.saveCourse = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      title, domain, role_focus, jd_text, skills,
      audience, level, learning_goal,
      duration_weeks, daily_hours, content_preference,
      modules, // full generated tree
    } = req.body;

    const userId = req.user.id;

    await client.query('BEGIN');

    // Insert course
    const courseRes = await client.query(
      `INSERT INTO ai_courses
         (title, domain, role_focus, jd_text, skills, audience, level,
          learning_goal, duration_weeks, daily_hours, content_preference, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [title, domain, role_focus, jd_text || null,
       JSON.stringify(skills || []), audience, level, learning_goal,
       duration_weeks || null, daily_hours || null, content_preference || null, userId],
    );
    const course = courseRes.rows[0];

    // Insert modules → topics → lessons
    for (let mi = 0; mi < (modules || []).length; mi++) {
      const mod = modules[mi];
      const modRes = await client.query(
        `INSERT INTO ai_course_modules (course_id, title, description, order_index, practice_tasks, case_studies)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [course.id, mod.title, mod.description || null, mi,
         JSON.stringify(mod.practice_tasks || []), JSON.stringify(mod.case_studies || [])],
      );
      const moduleId = modRes.rows[0].id;

      for (let ti = 0; ti < (mod.topics || []).length; ti++) {
        const topic = mod.topics[ti];
        const topicRes = await client.query(
          `INSERT INTO ai_course_topics (module_id, title, description, order_index)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [moduleId, topic.title, topic.description || null, ti],
        );
        const topicId = topicRes.rows[0].id;

        for (let li = 0; li < (topic.lessons || []).length; li++) {
          const lesson = topic.lessons[li];
          await client.query(
            `INSERT INTO ai_course_lessons
               (topic_id, title, explanation, example, activity, interview_questions, order_index)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [topicId, lesson.title, lesson.explanation || null, lesson.example || null,
             lesson.activity || null, JSON.stringify(lesson.interview_questions || []), li],
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { id: course.id } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('saveCourse error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ─── List courses ─────────────────────────────────────────────────────────────

exports.listCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status } = req.query;

    let query = `
      SELECT c.*, u.full_name AS creator_name
      FROM ai_courses c
      JOIN users u ON c.created_by = u.id
    `;
    const params = [];

    if (role === 'admin') {
      if (status) { query += ` WHERE c.status = $1`; params.push(status); }
    } else {
      // facilitators see only their own
      query += ` WHERE c.created_by = $1`;
      params.push(userId);
      if (status) { query += ` AND c.status = $2`; params.push(status); }
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('listCourses error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get single course with full tree ────────────────────────────────────────

exports.getCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const courseRes = await pool.query(
      `SELECT c.*, u.full_name AS creator_name,
              r.full_name AS reviewer_name
       FROM ai_courses c
       JOIN users u ON c.created_by = u.id
       LEFT JOIN users r ON c.reviewed_by = r.id
       WHERE c.id = $1`,
      [id],
    );
    if (!courseRes.rows.length) return res.status(404).json({ success: false, message: 'Course not found' });

    const course = courseRes.rows[0];

    const modulesRes = await pool.query(
      `SELECT * FROM ai_course_modules WHERE course_id = $1 ORDER BY order_index`,
      [id],
    );

    const modules = [];
    for (const mod of modulesRes.rows) {
      const topicsRes = await pool.query(
        `SELECT * FROM ai_course_topics WHERE module_id = $1 ORDER BY order_index`,
        [mod.id],
      );
      const topics = [];
      for (const topic of topicsRes.rows) {
        const lessonsRes = await pool.query(
          `SELECT * FROM ai_course_lessons WHERE topic_id = $1 ORDER BY order_index`,
          [topic.id],
        );
        topics.push({ ...topic, lessons: lessonsRes.rows });
      }
      modules.push({ ...mod, topics });
    }

    // Review history
    const reviewsRes = await pool.query(
      `SELECT r.*, u.full_name AS reviewer_name
       FROM ai_course_reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.course_id = $1 ORDER BY r.created_at DESC`,
      [id],
    );

    res.json({ success: true, data: { ...course, modules, reviews: reviewsRes.rows } });
  } catch (err) {
    console.error('getCourse error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update course metadata ───────────────────────────────────────────────────

exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = ['title','domain','role_focus','jd_text','skills','audience','level',
                    'learning_goal','duration_weeks','daily_hours','content_preference'];
    const updates = [];
    const values = [];
    let i = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${i++}`);
        values.push(f === 'skills' ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    }
    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    updates.push(`updated_at = NOW()`);
    values.push(id);
    await pool.query(`UPDATE ai_courses SET ${updates.join(', ')} WHERE id = $${i}`, values);
    res.json({ success: true });
  } catch (err) {
    console.error('updateCourse error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Submit for review ────────────────────────────────────────────────────────

exports.submitForReview = async (req, res) => {
  try {
    const { id } = req.params;
    const courseRes = await pool.query(`SELECT * FROM ai_courses WHERE id = $1`, [id]);
    if (!courseRes.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const course = courseRes.rows[0];
    const allowed = ['draft', 'changes_requested'];
    if (!allowed.includes(course.status)) {
      return res.status(400).json({ success: false, message: `Cannot submit from status: ${course.status}` });
    }

    await pool.query(
      `UPDATE ai_courses SET status = 'in_review', updated_at = NOW() WHERE id = $1`,
      [id],
    );

    // Notify all admins
    const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
    for (const admin of admins.rows) {
      notify({
        userId: admin.id,
        type: 'general',
        title: 'Course Submitted for Review',
        body: `"${course.title}" has been submitted for vetting.`,
        link: `/dashboard/admin/ai-curriculum/${id}/review`,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('submitForReview error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Review action (admin only) ───────────────────────────────────────────────

exports.reviewCourse = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { action, feedback } = req.body; // action: approved | changes_requested | rejected
    const reviewerId = req.user.id;

    const validActions = { approved: 'approved', changes_requested: 'changes_requested', rejected: 'rejected' };
    if (!validActions[action]) {
      return res.status(400).json({ success: false, message: 'action must be: approved | changes_requested | rejected' });
    }

    const courseRes = await client.query(`SELECT * FROM ai_courses WHERE id = $1`, [id]);
    if (!courseRes.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const course = courseRes.rows[0];

    if (course.status !== 'in_review') {
      return res.status(400).json({ success: false, message: 'Course is not in review' });
    }

    await client.query('BEGIN');

    await client.query(
      `UPDATE ai_courses SET status = $1, reviewed_by = $2, updated_at = NOW() WHERE id = $3`,
      [action, reviewerId, id],
    );

    await client.query(
      `INSERT INTO ai_course_reviews (course_id, reviewer_id, action, feedback) VALUES ($1,$2,$3,$4)`,
      [id, reviewerId, action, JSON.stringify(feedback || {})],
    );

    await client.query('COMMIT');

    // Notify the creator
    const notifMessages = {
      approved: { title: 'Course Approved', body: `"${course.title}" has been approved and is ready to publish.` },
      changes_requested: { title: 'Changes Requested', body: `"${course.title}" needs revisions before approval.` },
      rejected: { title: 'Course Rejected', body: `"${course.title}" has been rejected. See reviewer feedback.` },
    };
    notify({
      userId: course.created_by,
      type: action === 'approved' ? 'achievement' : 'general',
      title: notifMessages[action].title,
      body: notifMessages[action].body,
      link: `/dashboard/facilitator/ai-curriculum/${id}`,
    });

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('reviewCourse error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ─── Publish (approved → published, creates Subject tree) ────────────────────

exports.publishCourse = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const courseRes = await client.query(
      `SELECT c.*, u.full_name AS creator_name FROM ai_courses c JOIN users u ON c.created_by = u.id WHERE c.id = $1`,
      [id],
    );
    if (!courseRes.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const course = courseRes.rows[0];

    if (course.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only approved courses can be published' });
    }

    await client.query('BEGIN');

    // 1. Create Subject
    const subjectSlug = uniqueSlug(course.title, Date.now());
    const subjectRes = await client.query(
      `INSERT INTO subjects (name, slug, description, is_published, order_index)
       VALUES ($1, $2, $3, true, (SELECT COALESCE(MAX(order_index),0)+1 FROM subjects))
       RETURNING id`,
      [course.title, subjectSlug, `${course.role_focus} — ${course.domain} course`],
    );
    const subjectId = subjectRes.rows[0].id;

    // 2. Fetch modules
    const modulesRes = await client.query(
      `SELECT * FROM ai_course_modules WHERE course_id = $1 ORDER BY order_index`, [id],
    );

    for (let mi = 0; mi < modulesRes.rows.length; mi++) {
      const mod = modulesRes.rows[mi];

      // 3. Create Topic (= module)
      const topicRes = await client.query(
        `INSERT INTO topics (subject_id, title, description, order_index) VALUES ($1,$2,$3,$4) RETURNING id`,
        [subjectId, mod.title, mod.description || null, mi],
      );
      const topicId = topicRes.rows[0].id;

      const aiTopics = await client.query(
        `SELECT * FROM ai_course_topics WHERE module_id = $1 ORDER BY order_index`, [mod.id],
      );

      for (let ti = 0; ti < aiTopics.rows.length; ti++) {
        const aiTopic = aiTopics.rows[ti];

        // 4. Create Unit (= ai topic)
        const unitSlug = uniqueSlug(aiTopic.title, `${Date.now()}-${ti}`);
        const unitRes = await client.query(
          `INSERT INTO units (topic_id, title, description, slug, order_index) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [topicId, aiTopic.title, aiTopic.description || null, unitSlug, ti],
        );
        const unitId = unitRes.rows[0].id;

        const aiLessons = await client.query(
          `SELECT * FROM ai_course_lessons WHERE topic_id = $1 ORDER BY order_index`, [aiTopic.id],
        );

        for (let li = 0; li < aiLessons.rows.length; li++) {
          const aiLesson = aiLessons.rows[li];

          // 5. Create Subtopic (= ai lesson)
          const subtopicSlug = uniqueSlug(aiLesson.title, `${Date.now()}-${li}`);
          const subtopicRes = await client.query(
            `INSERT INTO subtopics (unit_id, title, description, slug, order_index) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
            [unitId, aiLesson.title, aiLesson.explanation?.substring(0, 200) || null, subtopicSlug, li],
          );
          const subtopicId = subtopicRes.rows[0].id;

          // 6. Create Lesson Content (inline markdown from AI)
          const markdown = [
            `## ${aiLesson.title}`,
            '',
            aiLesson.explanation || '',
            '',
            aiLesson.example ? `### Example\n\n${aiLesson.example}` : '',
            '',
            aiLesson.activity ? `### Activity\n\n${aiLesson.activity}` : '',
            '',
            aiLesson.interview_questions?.length
              ? `### Interview Questions\n\n${aiLesson.interview_questions.map((q) => `- ${q}`).join('\n')}`
              : '',
          ].filter(Boolean).join('\n');

          // Store inline content as a text path marker; actual S3 upload skipped for now
          await client.query(
            `INSERT INTO lesson_content (subtopic_id, content_type, markdown_path, is_published, version)
             VALUES ($1, 'markdown', $2, true, 1)
             ON CONFLICT (subtopic_id, version) DO UPDATE SET markdown_path = EXCLUDED.markdown_path`,
            [subtopicId, `ai-generated:${JSON.stringify({ markdown })}`],
          );
        }
      }
    }

    // 7. Update ai_course
    await client.query(
      `UPDATE ai_courses SET status = 'published', subject_id = $1, updated_at = NOW() WHERE id = $2`,
      [subjectId, id],
    );

    await client.query('COMMIT');

    // Notify creator
    notify({
      userId: course.created_by,
      type: 'achievement',
      title: 'Course Published!',
      body: `"${course.title}" is now live as a subject for students.`,
      link: `/dashboard/admin/subjects`,
    });

    res.json({ success: true, data: { subject_id: subjectId } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('publishCourse error:', err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ─── Inline edit module / topic / lesson ─────────────────────────────────────

exports.updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, practice_tasks, case_studies } = req.body;
    await pool.query(
      `UPDATE ai_course_modules SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         practice_tasks = COALESCE($3, practice_tasks),
         case_studies = COALESCE($4, case_studies)
       WHERE id = $5`,
      [title || null, description || null,
       practice_tasks ? JSON.stringify(practice_tasks) : null,
       case_studies ? JSON.stringify(case_studies) : null, id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    await pool.query(
      `UPDATE ai_course_topics SET
         title = COALESCE($1, title),
         description = COALESCE($2, description)
       WHERE id = $3`,
      [title || null, description || null, id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, explanation, example, activity, interview_questions } = req.body;
    await pool.query(
      `UPDATE ai_course_lessons SET
         title = COALESCE($1, title),
         explanation = COALESCE($2, explanation),
         example = COALESCE($3, example),
         activity = COALESCE($4, activity),
         interview_questions = COALESCE($5, interview_questions)
       WHERE id = $6`,
      [title || null, explanation || null, example || null, activity || null,
       interview_questions ? JSON.stringify(interview_questions) : null, id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Reorder modules ──────────────────────────────────────────────────────────

exports.reorderModules = async (req, res) => {
  const client = await pool.connect();
  try {
    // orderedIds: [{ id, order_index }]
    const { ordered_ids } = req.body;
    await client.query('BEGIN');
    for (const { id, order_index } of ordered_ids) {
      await client.query(`UPDATE ai_course_modules SET order_index = $1 WHERE id = $2`, [order_index, id]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ─── Regenerate a single lesson via AI ───────────────────────────────────────

exports.regenerateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { instruction } = req.body;

    const lessonRes = await pool.query(
      `SELECT l.*, t.module_id,
              c.role_focus, c.level
       FROM ai_course_lessons l
       JOIN ai_course_topics t ON l.topic_id = t.id
       JOIN ai_course_modules m ON t.module_id = m.id
       JOIN ai_courses c ON m.course_id = c.id
       WHERE l.id = $1`,
      [id],
    );
    if (!lessonRes.rows.length) return res.status(404).json({ success: false, message: 'Lesson not found' });

    const row = lessonRes.rows[0];
    const updated = await regenerateLesson({
      lesson: row,
      instruction: instruction || 'Improve clarity and add a better example',
      roleFocus: row.role_focus,
      level: row.level,
    });

    await pool.query(
      `UPDATE ai_course_lessons SET
         title = $1, explanation = $2, example = $3,
         activity = $4, interview_questions = $5
       WHERE id = $6`,
      [updated.title, updated.explanation, updated.example,
       updated.activity, JSON.stringify(updated.interview_questions || []), id],
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('regenerateLesson error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Delete course ────────────────────────────────────────────────────────────

exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const courseRes = await pool.query(`SELECT * FROM ai_courses WHERE id = $1`, [id]);
    if (!courseRes.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const course = courseRes.rows[0];
    if (role !== 'admin' && course.created_by !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (course.status === 'published') {
      return res.status(400).json({ success: false, message: 'Cannot delete a published course' });
    }

    await pool.query(`DELETE FROM ai_courses WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
