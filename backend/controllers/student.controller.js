const serverError = require('../utils/serverError');
const pool = require('../config/pg');
const { logAction } = require('../utils/auditLogger');
const { notify } = require('../services/notificationService');
const { getTotalXP } = require('../services/xpService');
// ============================================
// HELPERS
// ============================================

/**
 * Upsert streak for a user based on today's activity.
 * - Same day  → no change
 * - Yesterday → increment streak
 * - Older     → reset to 1
 */
const { markActionToday } = require('../services/presenceService');

// ============================================
// HELPERS
// ============================================

/**
 * Streak is now updated by presenceService when both action and time requirements are met.
 */

// ── XP-based badge definitions ─────────────────────────────────────────────────
const XP_BADGES = [
  {
    name: 'First Steps',
    description: 'Earned your first 10 XP',
    icon: '🌱',
    threshold: 10,
  },
  {
    name: 'Learner',
    description: 'Reached 100 XP',
    icon: '📚',
    threshold: 100,
  },
  {
    name: 'Scholar',
    description: 'Reached 500 XP',
    icon: '🎓',
    threshold: 500,
  },
  {
    name: 'Expert',
    description: 'Reached 1,000 XP',
    icon: '⚡',
    threshold: 1000,
  },
  {
    name: 'Master',
    description: 'Reached 2,500 XP',
    icon: '🏆',
    threshold: 2500,
  },
  {
    name: 'Legend',
    description: 'Reached 5,000 XP',
    icon: '🌟',
    threshold: 5000,
  },
];

async function checkAndAwardBadges(userId) {
  try {
    // Ensure all XP badge definitions exist (upsert by name using a safe SELECT-then-INSERT)
    for (const b of XP_BADGES) {
      await pool.query(
        `INSERT INTO badges (name, description, icon)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = $1)`,
        [b.name, b.description, b.icon],
      );
    }

    // Get current total XP
    const xpResult = await pool.query(
      'SELECT COALESCE(SUM(points), 0)::int AS total FROM points_log WHERE user_id = $1',
      [userId],
    );
    const totalXP = xpResult.rows[0].total;

    // Award every qualifying badge the user doesn't already have
    for (const b of XP_BADGES) {
      if (totalXP >= b.threshold) {
        const badgeInsert = await pool.query(
          `INSERT INTO user_badges (user_id, badge_id)
           SELECT $1, id FROM badges WHERE name = $2
           ON CONFLICT (user_id, badge_id) DO NOTHING
           RETURNING user_id`,
          [userId, b.name],
        );
        if (badgeInsert.rowCount > 0) {
          notify({
            userId,
            type: 'achievement',
            title: `${b.icon} Badge Unlocked: ${b.name}`,
            body: b.description,
            link: '/dashboard/student/profile',
          });
        }
      }
    }
  } catch (err) {
    console.error('checkAndAwardBadges error:', err.message);
  }
}

// ============================================
// STUDENT PROGRESS
// ============================================

const unlockNextSubtopicIfAvailable = async (userId, subtopicId) => {
  const nextQuery = `
    WITH ordered AS (
      SELECT
        st.id,
        t.subject_id,
        ROW_NUMBER() OVER (
          PARTITION BY t.subject_id
          ORDER BY t.order_index, u.order_index, st.order_index
        ) AS rn
      FROM subtopics st
      INNER JOIN units u ON st.unit_id = u.id
      INNER JOIN topics t ON u.topic_id = t.id
    ),
    current AS (
      SELECT subject_id, rn
      FROM ordered
      WHERE id = $1
    )
    SELECT o.id AS next_id
    FROM ordered o
    INNER JOIN current c ON o.subject_id = c.subject_id
    WHERE o.rn = c.rn + 1
    LIMIT 1;
  `;

  const nextResult = await pool.query(nextQuery, [subtopicId]);
  const nextId = nextResult.rows[0]?.next_id;
  if (!nextId) return;

  // Only unlock if no existing row (prevents overriding admin locks).
  await pool.query(
    `
      INSERT INTO user_subtopic_progress (user_id, subtopic_id, is_unlocked)
      VALUES ($1, $2, true)
      ON CONFLICT (user_id, subtopic_id) DO NOTHING;
    `,
    [userId, nextId],
  );
};

const checkAndCompleteSubtopic = async (userId, subtopicId) => {
  const requirementsQuery = `
    SELECT
      EXISTS (
        SELECT 1
        FROM lesson_content
        WHERE subtopic_id = $1 AND is_published = true
      ) AS has_lesson,
      EXISTS (
        SELECT 1
        FROM quizzes
        WHERE unit_id = (SELECT unit_id FROM subtopics WHERE id = $1)
      ) AS has_quiz,
      EXISTS (
        SELECT 1
        FROM exercises
        WHERE subtopic_id = $1
      ) AS has_exercise
  `;

  const requirements = await pool.query(requirementsQuery, [subtopicId]);
  const { has_lesson, has_quiz, has_exercise } = requirements.rows[0];

  const lessonDoneQuery = `
    SELECT EXISTS (
      SELECT 1
      FROM user_lesson_progress ulp
      INNER JOIN lesson_content lc ON lc.id = ulp.lesson_content_id
      WHERE ulp.user_id = $1
        AND lc.subtopic_id = $2
        AND ulp.is_completed = true
        AND lc.is_published = true
    ) AS lesson_done
  `;

  const quizDoneQuery = `
    SELECT EXISTS (
      SELECT 1
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON q.id = qa.quiz_id
      WHERE qa.user_id = $1
        AND q.unit_id = (SELECT unit_id FROM subtopics WHERE id = $2)
        AND qa.is_passed = true
    ) AS quiz_done
  `;

  const exerciseDoneQuery = `
    SELECT EXISTS (
      SELECT 1
      FROM exercise_submissions es
      INNER JOIN exercises e ON e.id = es.exercise_id
      WHERE es.user_id = $1
        AND e.subtopic_id = $2
        AND es.is_passed = true
    ) AS exercise_done
  `;

  let lessonDone = null;
  if (has_lesson)
    lessonDone = await pool.query(lessonDoneQuery, [userId, subtopicId]);

  let quizDone = null;
  if (has_quiz)
    quizDone = await pool.query(quizDoneQuery, [userId, subtopicId]);

  let exerciseDone = null;
  if (has_exercise)
    exerciseDone = await pool.query(exerciseDoneQuery, [userId, subtopicId]);

  const isLessonDone = has_lesson ? lessonDone.rows[0].lesson_done : true;
  const isQuizDone = has_quiz ? quizDone.rows[0].quiz_done : true;
  const isExerciseDone = has_exercise
    ? exerciseDone.rows[0].exercise_done
    : true;

  if (!isLessonDone || !isQuizDone || !isExerciseDone) return;

  const updateResult = await pool.query(
    `
      UPDATE user_subtopic_progress
      SET is_completed = true, completed_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND subtopic_id = $2 AND is_unlocked = true
      RETURNING *;
    `,
    [userId, subtopicId],
  );

  if (updateResult.rowCount > 0) {
    await unlockNextSubtopicIfAvailable(userId, subtopicId);
  }
};

/**
 * Get current student's progress for a subject
 * GET /api// Get current user's progress for a specific subject
 */
exports.getMyProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subjectId } = req.query;

    const enrollment = await pool.query(
      'SELECT 1 FROM user_subjects WHERE user_id = $1 AND subject_id = $2',
      [userId, subjectId],
    );
    if (enrollment.rows.length === 0) {
      return res
        .status(403)
        .json({ success: false, message: 'Not enrolled in this subject' });
    }

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
        u.order_index AS unit_order,

        -- Subtopic
        st.id AS subtopic_id,
        st.title AS subtopic_title,
        st.slug AS subtopic_slug,
        st.order_index AS subtopic_order,

        -- Progress
        COALESCE(usp.is_unlocked, true) AS is_unlocked,
        COALESCE(usp.is_completed, false) AS is_completed,
        usp.completed_at,

        -- Content Existence
        EXISTS(SELECT 1 FROM lesson_content WHERE subtopic_id = st.id AND is_published = true) AS has_lesson,
        EXISTS(SELECT 1 FROM quizzes WHERE unit_id = u.id) AS has_quiz,
        EXISTS(SELECT 1 FROM exercises WHERE subtopic_id = st.id) AS has_exercise,
        (
          SELECT json_agg(
            json_build_object(
              'id', e.id,
              'title', e.title,
              'instructions', e.instructions,
              'max_score', e.max_score,
              'is_passed', COALESCE(es_inner.is_passed, false),
              'best_score', COALESCE(es_inner.max_score, 0)
            )
          )
          FROM exercises e
          LEFT JOIN (
            SELECT exercise_id, bool_or(is_passed) as is_passed, MAX(score) as max_score
            FROM exercise_submissions
            WHERE user_id = $1
            GROUP BY exercise_id
          ) es_inner ON e.id = es_inner.exercise_id
          WHERE e.unit_id = u.id
        ) AS unit_exercises,

        -- Specific Content Progress
        COALESCE(ulp.is_completed, false) AS lesson_completed,
        
        -- Quiz Best Score / Passed
        (
          SELECT json_build_object(
            'is_passed', bool_or(qa.is_passed),
            'max_score', MAX(qa.score)
          )
          FROM quiz_attempts qa
          INNER JOIN quizzes q ON q.id = qa.quiz_id
          WHERE qa.user_id = $1 AND q.unit_id = u.id
        ) AS quiz_stats,

        -- Exercise Best Score / Passed
        (
          SELECT json_build_object(
            'is_passed', bool_or(es.is_passed),
            'max_score', MAX(es.score)
          )
          FROM exercise_submissions es
          INNER JOIN exercises e ON e.id = es.exercise_id
          WHERE es.user_id = $1 AND e.subtopic_id = st.id
        ) AS exercise_stats,
        
        -- Topic Progress (Pre-calculated if needed, or we calculate in JS)
        utp.progress_percent AS topic_progress,
        utp.is_completed AS topic_is_completed

      FROM topics t
      INNER JOIN units u ON t.id = u.topic_id
      INNER JOIN subtopics st ON u.id = st.unit_id
      LEFT JOIN user_topic_progress utp ON utp.topic_id = t.id AND utp.user_id = $1
      LEFT JOIN user_subtopic_progress usp ON usp.subtopic_id = st.id AND usp.user_id = $1
      LEFT JOIN lesson_content lc ON lc.subtopic_id = st.id AND lc.is_published = true
      LEFT JOIN user_lesson_progress ulp ON ulp.lesson_content_id = lc.id AND ulp.user_id = $1
      
      WHERE t.subject_id = $2
      ORDER BY 
        t.order_index,
        u.order_index,
        st.order_index;
    `;

    const { rows } = await pool.query(query, [userId, subjectId]);

    // Build Hierarchy
    const topicsMap = new Map();
    let totalSubtopics = 0;
    let completedSubtopics = 0;
    let totalPoints = 0;

    rows.forEach((row) => {
      // Topic
      if (!topicsMap.has(row.topic_id)) {
        topicsMap.set(row.topic_id, {
          id: row.topic_id,
          title: row.topic_title,
          description: row.topic_description,
          order_index: row.topic_order,
          progress_percent: row.topic_progress || 0,
          is_completed: row.topic_is_completed || false,
          units: new Map(),
        });
      }
      const topic = topicsMap.get(row.topic_id);

      // Unit
      if (!topic.units.has(row.unit_id)) {
        topic.units.set(row.unit_id, {
          id: row.unit_id,
          title: row.unit_title,
          order_index: row.unit_order,
          exercises: row.unit_exercises || [],
          subtopics: [],
        });
      }
      const unit = topic.units.get(row.unit_id);

      // Subtopic Stats
      const quizPassed = row.quiz_stats?.is_passed || false;
      const exercisePassed = row.exercise_stats?.is_passed || false;
      const bestQuizScore = row.quiz_stats?.max_score || 0;
      const bestExerciseScore = row.exercise_stats?.max_score || 0;

      // Add Subtopic
      unit.subtopics.push({
        subtopic_id: row.subtopic_id,
        subtopic_title: row.subtopic_title,
        subtopic_slug: row.subtopic_slug,
        is_unlocked: row.is_unlocked,
        is_completed: row.is_completed,
        completed_at: row.completed_at,
        has_lesson: row.has_lesson,
        has_quiz: row.has_quiz,
        has_exercise: row.has_exercise,
        lesson_completed: row.lesson_completed,
        quiz_passed: quizPassed,
        exercise_passed: exercisePassed,
        best_quiz_score: bestQuizScore,
        best_exercise_score: bestExerciseScore,
      });

      // Aggregates
      totalSubtopics++;
      if (row.is_completed) {
        completedSubtopics++;
      }
      totalPoints += (bestQuizScore || 0) + (bestExerciseScore || 0);
    });

    // Formatting Response
    const topics = Array.from(topicsMap.values()).map((topic) => ({
      ...topic,
      units: Array.from(topic.units.values()),
    }));

    const overallProgress =
      totalSubtopics > 0
        ? Math.round((completedSubtopics / totalSubtopics) * 100)
        : 0;

    // Get user stats
    const statsQuery = `
      SELECT 
        COALESCE(us.current_streak, 0) as current_streak,
        COALESCE(us.longest_streak, 0) as longest_streak,
        COALESCE(SUM(pl.points), 0) as total_points
      FROM users u
      LEFT JOIN user_streaks us ON u.id = us.user_id
      LEFT JOIN points_log pl ON u.id = pl.user_id
      WHERE u.id = $1
      GROUP BY us.current_streak, us.longest_streak;
    `;

    const statsResult = await pool.query(statsQuery, [userId]);
    const stats = statsResult.rows[0] || {
      current_streak: 0,
      longest_streak: 0,
      total_points: 0,
    };

    const enrollmentRow = await pool
      .query(
        `SELECT last_accessed_subtopic_slug FROM user_subjects WHERE user_id = $1 AND subject_id = $2`,
        [userId, subjectId],
      )
      .catch(() => ({ rows: [] }));
    const lastAccessedSlug =
      enrollmentRow.rows[0]?.last_accessed_subtopic_slug ?? null;

    res.json({
      success: true,
      data: {
        overall_progress: overallProgress,
        total_subtopics: totalSubtopics,
        completed_subtopics: completedSubtopics,
        total_points: totalPoints,
        last_accessed_subtopic_slug: lastAccessedSlug,
        stats: stats,
        topics: topics,
      },
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    serverError(res, error);
  }
};

/**
 * Mark subtopic as started/unlocked
 * POST /api/students/progress/subtopic/:subtopicId/start
 */
exports.startSubtopic = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subtopicId } = req.params;

    const lockCheck = await pool.query(
      `SELECT usp.is_unlocked, st.slug, st.unit_id,
              u.topic_id, t.subject_id
       FROM user_subtopic_progress usp
       JOIN subtopics st ON st.id = usp.subtopic_id
       JOIN units u ON u.id = st.unit_id
       JOIN topics t ON t.id = u.topic_id
       WHERE usp.user_id = $1 AND usp.subtopic_id = $2
       LIMIT 1`,
      [userId, subtopicId],
    );

    if (lockCheck.rows[0]?.is_unlocked === false) {
      return res.status(200).json({
        success: false,
        message: 'This subtopic is locked by your admin.',
      });
    }

    // Track last accessed subtopic for "Continue Learning"
    if (lockCheck.rows[0]?.subject_id && lockCheck.rows[0]?.slug) {
      await pool
        .query(
          `UPDATE user_subjects
         SET last_accessed_subtopic_slug = $1, last_accessed_at = NOW()
         WHERE user_id = $2 AND subject_id = $3`,
          [lockCheck.rows[0].slug, userId, lockCheck.rows[0].subject_id],
        )
        .catch(() => {}); // non-critical — column may not exist yet
    }

    res.json({
      success: true,
      message: 'Subtopic started',
      data: lockCheck.rows[0],
    });
  } catch (error) {
    console.error('Error starting subtopic:', error);
    serverError(res, error);
  }
};

/**
 * Mark lesson as completed
 * POST /api/students/progress/lesson/:lessonId/complete
 */
exports.completeLesson = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lessonId } = req.params;

    const query = `
      INSERT INTO user_lesson_progress (user_id, lesson_content_id, is_completed)
      VALUES ($1, $2, true)
      ON CONFLICT (user_id, lesson_content_id)
      DO UPDATE SET is_completed = true
      RETURNING *, (xmax = 0) AS is_new_row;
    `;

    const result = await pool.query(query, [userId, lessonId]);

    // Award points only on first completion
    if (result.rows[0].is_new_row) {
      await pool.query(
        'INSERT INTO points_log (user_id, source, points) VALUES ($1, $2, $3)',
        [userId, 'lesson_completion', 10],
      );
      markActionToday(userId);
      await checkAndAwardBadges(userId);
    }

    const subtopicResult = await pool.query(
      'SELECT subtopic_id FROM lesson_content WHERE id = $1 LIMIT 1',
      [lessonId],
    );

    if (subtopicResult.rows[0]?.subtopic_id) {
      await checkAndCompleteSubtopic(
        userId,
        subtopicResult.rows[0].subtopic_id,
      );
    }

    res.json({
      success: true,
      message: 'Lesson completed',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error completing lesson:', error);
    serverError(res, error);
  }
};

/**
 * Submit quiz attempt
 * POST /api/students/quiz/:quizId/submit
 * Body: { answers: { [question_id]: string } }
 *   For multiple_choice: value is the selected option UUID
 *   For true_false:      value is 'True' or 'False'
 * Score is calculated server-side — client never sends a score.
 */
exports.submitQuizAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;
    const { answers } = req.body; // { [question_id]: string }

    if (!answers || typeof answers !== 'object') {
      return res
        .status(400)
        .json({ success: false, message: 'answers object is required' });
    }

    // Fetch quiz + all questions + correct options in one query
    const quizQuery = await pool.query(
      `SELECT q.passing_score, q.max_score,
              qq.id AS question_id, qq.question_type, qq.points, qq.explanation,
              qo.id AS option_id, qo.option_text, qo.is_correct
       FROM quizzes q
       LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id AND qq.is_deleted = false
       LEFT JOIN quiz_question_options qo ON qo.question_id = qq.id AND qo.is_deleted = false
       WHERE q.id = $1 and q.is_deleted = false
       ORDER BY qq.order_index, qo.order_index`,
      [quizId],
    );

    if (quizQuery.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Quiz not found' });
    }

    const { passing_score, max_score } = quizQuery.rows[0];

    // Group options by question
    const questionsMap = new Map();
    for (const row of quizQuery.rows) {
      if (!row.question_id) continue;
      if (!questionsMap.has(row.question_id)) {
        questionsMap.set(row.question_id, {
          id: row.question_id,
          type: row.question_type,
          points: row.points,
          explanation: row.explanation,
          options: [],
        });
      }
      if (row.option_id) {
        questionsMap.get(row.question_id).options.push({
          id: row.option_id,
          option_text: row.option_text,
          is_correct: row.is_correct,
        });
      }
    }

    // Score each answer and build per-question result for feedback
    let score = 0;
    let actual_max_score = 0;
    const question_results = {};
    for (const [questionId, question] of questionsMap) {
      actual_max_score += question.points;
      const userAnswer = answers[questionId];
      let correctOption = null;
      let userIsCorrect = false;

      let selectedOptionId = null;

      if (question.type === 'multiple_choice') {
        correctOption = question.options.find((o) => o.is_correct);
        const selectedOption = question.options.find(
          (o) => o.id === userAnswer,
        );
        selectedOptionId = selectedOption?.id ?? null;
        if (correctOption && userAnswer === correctOption.id) {
          score += question.points;
          userIsCorrect = true;
        }
      } else if (question.type === 'true_false') {
        correctOption = question.options.find((o) => o.is_correct);
        const selectedOption = question.options.find(
          (o) => o.option_text === userAnswer,
        );
        selectedOptionId = selectedOption?.id ?? null;
        if (correctOption && userAnswer === correctOption.option_text) {
          score += question.points;
          userIsCorrect = true;
        }
      }
      // short_answer: skipped (manual review, no auto-score)

      // correct_option_id/text are withheld until the reveal threshold below —
      // otherwise a failing attempt would hand the student the answer key.
      question.correctOptionId = correctOption?.id ?? null;
      question.correctOptionText = correctOption?.option_text ?? null;

      question_results[questionId] = {
        is_correct: userIsCorrect,
        selected_option_id: selectedOptionId,
        correct_option_id: null,
        correct_option_text: null,
      };
    }

    // Derive passing threshold from actual question points to handle cases where
    // the stored max_score is out of sync with real question points.
    // Clamp to 1 so a stale/misconfigured passing_score > max_score can never
    // produce a threshold higher than the actual achievable score.
    const passingRatio =
      max_score > 0 ? Math.min(1, passing_score / max_score) : 0.7;
    const effectivePassingScore =
      actual_max_score > 0
        ? Math.ceil(actual_max_score * passingRatio)
        : passing_score;
    const isPassed = score >= effectivePassingScore;

    const result = await pool.query(
      `INSERT INTO quiz_attempts (quiz_id, user_id, score, is_passed)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [quizId, userId, score, isPassed],
    );

    // Only reveal the correct answer + explanation once the student has
    // attempted the quiz MIN_ATTEMPTS_FOR_REVEAL times — otherwise a failing
    // attempt would hand them the answer key outright. Until then, students
    // only learn whether their own selection was right or wrong.
    const MIN_ATTEMPTS_FOR_REVEAL = 3;
    const attemptCountResult = await pool.query(
      'SELECT COUNT(*) AS count FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2',
      [quizId, userId],
    );
    const attemptCount = parseInt(attemptCountResult.rows[0].count, 10);
    const canRevealAnswer = attemptCount >= MIN_ATTEMPTS_FOR_REVEAL;
    if (canRevealAnswer) {
      for (const [questionId, question] of questionsMap) {
        if (question_results[questionId]) {
          question_results[questionId].explanation = question.explanation;
          question_results[questionId].correct_option_id =
            question.correctOptionId;
          question_results[questionId].correct_option_text =
            question.correctOptionText;
        }
      }
    }

    // Save per-question results for analytics
    const attemptId = result.rows[0].id;
    const answerRows = Object.entries(question_results);
    if (answerRows.length > 0) {
      // Each row: (quiz_attempt_id, question_id, selected_option_id, is_correct, points_earned)
      const vals = answerRows
        .map(
          (_, i) =>
            `($1, $${i * 4 + 2}::uuid, $${i * 4 + 3}::uuid, $${i * 4 + 4}, $${i * 4 + 5})`,
        )
        .join(', ');
      const params = [
        attemptId,
        ...answerRows.flatMap(([qId, r]) => {
          const q = questionsMap.get(qId);
          return [
            qId,
            r.selected_option_id ?? null,
            r.is_correct,
            r.is_correct ? (q?.points ?? 0) : 0,
          ];
        }),
      ];
      await pool.query(
        `INSERT INTO quiz_question_answers (quiz_attempt_id, question_id, selected_option_id, is_correct, points_earned)
         VALUES ${vals} ON CONFLICT DO NOTHING`,
        params,
      );
    }

    // Award XP only when quiz is passed
    const pointsAwarded = isPassed ? 15 : 0;
    if (isPassed) {
      await pool.query(
        'INSERT INTO points_log (user_id, source, points) VALUES ($1, $2, $3)',
        [userId, 'quiz_completion', pointsAwarded],
      );
      markActionToday(userId);
      await checkAndAwardBadges(userId);
    }

    // Trigger completion check for ALL subtopics in the unit (not just the first)
    const unitResult = await pool.query(
      'SELECT unit_id FROM quizzes WHERE id = $1 LIMIT 1',
      [quizId],
    );
    if (unitResult.rows[0]?.unit_id) {
      const allSubtopics = await pool.query(
        'SELECT id FROM subtopics WHERE unit_id = $1 ORDER BY order_index',
        [unitResult.rows[0].unit_id],
      );
      for (const row of allSubtopics.rows) {
        await checkAndCompleteSubtopic(userId, row.id);
      }
    }

    res.json({
      success: true,
      message: isPassed ? 'Quiz passed!' : 'Quiz attempted',
      data: {
        attempt: result.rows[0],
        points_awarded: pointsAwarded,
        question_results,
        effective_passing_score: effectivePassingScore,
        actual_max_score,
      },
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    serverError(res, error);
  }
};

/**
 * Submit exercise
 * POST /api/students/exercise/:exerciseId/submit
 */
exports.submitExercise = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exerciseId } = req.params;

    const exerciseQuery = await pool.query(
      'SELECT max_score, language, test_cases, tasks, subtopic_id FROM exercises WHERE id = $1',
      [exerciseId],
    );

    if (exerciseQuery.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Exercise not found' });
    }

    const exercise = exerciseQuery.rows[0];
    let score;
    let testResults = null;

    const hasTasks = Array.isArray(exercise.tasks) && exercise.tasks.length > 0;

    if (hasTasks) {
      // Multi-task exercise: run tests for each task and aggregate
      let totalPassed = 0;
      let totalTests = 0;
      const taskResults = [];

      for (const task of exercise.tasks) {
        if (!task.test_cases || task.test_cases.length === 0) continue;
        const taskWorkspaceDir = path.join(
          WORKSPACE_ROOT,
          String(userId),
          `exercise-${exerciseId}-task-${task.id}`,
        );
        if (!fs.existsSync(taskWorkspaceDir)) continue;
        try {
          const result = await runTestCases(
            taskWorkspaceDir,
            exercise.language,
            task.test_cases,
          );
          totalPassed += result.passed;
          totalTests += result.total;
          taskResults.push({
            taskId: task.id,
            taskTitle: task.title,
            ...result,
          });
        } catch (err) {
          // count all tests in this task as failed
          totalTests += task.test_cases.length;
          taskResults.push({
            taskId: task.id,
            taskTitle: task.title,
            passed: 0,
            failed: task.test_cases.length,
            total: task.test_cases.length,
            error: err.message,
          });
        }
      }

      score =
        totalTests > 0
          ? Math.round((totalPassed / totalTests) * exercise.max_score)
          : exercise.max_score;
      testResults = { totalPassed, totalTests, taskResults };
    } else if (exercise.test_cases && exercise.test_cases.length > 0) {
      // Legacy: single workspace test cases
      const workspaceDir = path.join(
        WORKSPACE_ROOT,
        String(userId),
        `exercise-${exerciseId}`,
      );
      if (!fs.existsSync(workspaceDir)) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Workspace not initialised. Open the exercise first.',
          });
      }
      try {
        testResults = await runTestCases(
          workspaceDir,
          exercise.language,
          exercise.test_cases,
        );
        score =
          testResults.total > 0
            ? Math.round(
                (testResults.passed / testResults.total) * exercise.max_score,
              )
            : 0;
      } catch (err) {
        return serverError(res, err);
      }
    } else {
      // No test cases — accept manual score from body (legacy behaviour)
      score = req.body.score ?? exercise.max_score;
    }

    const isPassed = score >= exercise.max_score * 0.7;

    const submissionResult = await pool.query(
      `INSERT INTO exercise_submissions (exercise_id, user_id, score, is_passed)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [exerciseId, userId, score, isPassed],
    );

    const pointsAwarded = Math.round((score / exercise.max_score) * 100);
    await pool.query(
      'INSERT INTO points_log (user_id, source, points) VALUES ($1, $2, $3)',
      [userId, 'exercise_completion', pointsAwarded],
    );
    markActionToday(userId);
    await checkAndAwardBadges(userId);

    if (exercise.subtopic_id) {
      await checkAndCompleteSubtopic(userId, exercise.subtopic_id);
    }

    res.json({
      success: true,
      message: isPassed ? 'Exercise passed!' : 'Exercise submitted',
      data: {
        submission: submissionResult.rows[0],
        points_awarded: pointsAwarded,
        test_results: testResults,
      },
    });
  } catch (error) {
    console.error('Error submitting exercise:', error);
    serverError(res, error);
  }
};

// ============================================
// EXERCISE WORKSPACE
// ============================================

const fs = require('fs');
const path = require('path');
const runnerService = require('../services/runnerService');

const WORKSPACE_ROOT = path.join(__dirname, '..', 'workspaces');

const EXERCISE_RUNNER = {
  javascript: { image: 'workspace-node', cmd: ['node', 'index.js'] },
  python: { image: 'workspace-python', cmd: ['python3', 'main.py'] },
  java: {
    image: 'workspace-java',
    cmd: [
      'sh',
      '-c',
      'cd /workspace && javac Main.java 2>&1 && java -cp /workspace Main',
    ],
  },
  sql: {
    image: 'workspace-sql',
    cmd: [
      'sh',
      '-c',
      'sqlite3 -column -header :memory: < /workspace/solution.sql',
    ],
  },
};

const TEST_RUNNER_CMD = {
  javascript: { image: 'workspace-node', cmd: ['node', '__tests__.js'] },
  python: { image: 'workspace-python', cmd: ['python3', '__tests__.py'] },
  java: {
    image: 'workspace-java',
    cmd: [
      'sh',
      '-c',
      'cd /workspace && javac Main.java __Tests__.java 2>&1 && java -cp /workspace __Tests__',
    ],
  },
  // sql: not supported — no test runner for SQL exercises
};

const JS_TEST_HEADER = `let __p=0,__f=0,__r=[];
const __test=(d,fn)=>{try{fn();__r.push({description:d,passed:true});__p++;}catch(e){__r.push({description:d,passed:false,error:e.message});__f++;}};
const __expect=(a)=>({
  toBe:(e)=>{if(a!==e)throw new Error(\`Expected \${JSON.stringify(e)}, got \${JSON.stringify(a)}\`)},
  toEqual:(e)=>{if(JSON.stringify(a)!==JSON.stringify(e))throw new Error(\`Expected \${JSON.stringify(e)}, got \${JSON.stringify(a)}\`)},
  toBeTruthy:()=>{if(!a)throw new Error('Expected truthy')},
  toBeFalsy:()=>{if(a)throw new Error('Expected falsy')},
  toBeNull:()=>{if(a!==null)throw new Error('Expected null')},
  toBeUndefined:()=>{if(a!==undefined)throw new Error('Expected undefined')},
  toBeGreaterThan:(e)=>{if(a<=e)throw new Error(\`Expected greater than \${e}, got \${a}\`)},
  toBeLessThan:(e)=>{if(a>=e)throw new Error(\`Expected less than \${e}, got \${a}\`)},
});
`;
const JS_TEST_FOOTER = `\nconsole.log(JSON.stringify({passed:__p,failed:__f,total:__p+__f,results:__r}));\nprocess.exit(__f>0?1:0);\n`;

const PY_TEST_HEADER = `import json,sys\n_p,_f,_r=0,0,[]\ndef __test(d,fn):\n  global _p,_f\n  try: fn();_r.append({"description":d,"passed":True});_p+=1\n  except Exception as e: _r.append({"description":d,"passed":False,"error":str(e)});_f+=1\nclass _E:\n  def __init__(self,a):self._a=a\n  def to_be(self,e):\n    assert self._a==e,f"Expected {repr(e)}, got {repr(self._a)}"\n  def to_equal(self,e):\n    assert self._a==e,f"Expected {repr(e)}, got {repr(self._a)}"\n  def to_be_truthy(self):\n    assert self._a,"Expected truthy"\n  def to_be_falsy(self):\n    assert not self._a,"Expected falsy"\ndef __expect(a): return _E(a)\n`;
const PY_TEST_FOOTER = `\nprint(json.dumps({"passed":_p,"failed":_f,"total":_p+_f,"results":_r}))\nsys.exit(1 if _f>0 else 0)\n`;

// Java test framework — test cases call static methods on the student's Main class.
// Both Main.java and __Tests__.java are compiled together so Main's public members are accessible.
const JAVA_TEST_HEADER = `import java.util.*;
public class __Tests__ {
  static int __p=0,__f=0;
  static List<Map<String,Object>> __r=new ArrayList<>();
  @FunctionalInterface interface __Fn{void run()throws Exception;}
  static void __test(String d,__Fn fn){
    try{fn.run();Map<String,Object>m=new LinkedHashMap<>();m.put("description",d);m.put("passed",true);__r.add(m);__p++;}
    catch(Exception e){Map<String,Object>m=new LinkedHashMap<>();m.put("description",d);m.put("passed",false);String err=e.getMessage()==null?"error":e.getMessage().replace("\\\\","\\\\\\\\").replace("\\"","'");m.put("error",err);__r.add(m);__f++;}
  }
  static<T>__E<T>__expect(T a){return new __E<>(a);}
  static class __E<T>{T a;__E(T v){this.a=v;}
    public void toBe(T e){if(!Objects.equals(a,e))throw new AssertionError("Expected "+e+", got "+a);}
    public void toEqual(T e){if(!Objects.equals(a,e))throw new AssertionError("Expected "+e+", got "+a);}
    public void toBeTruthy(){if(a==null||Boolean.FALSE.equals(a)||Integer.valueOf(0).equals(a))throw new AssertionError("Expected truthy");}
    public void toBeFalsy(){if(a!=null&&!Boolean.FALSE.equals(a)&&!Integer.valueOf(0).equals(a))throw new AssertionError("Expected falsy");}
  }
  public static void main(String[]args)throws Exception{
`;
const JAVA_TEST_FOOTER = `
    StringBuilder sb=new StringBuilder();
    sb.append("{\\"passed\\":").append(__p).append(",\\"failed\\":").append(__f).append(",\\"total\\":").append(__p+__f).append(",\\"results\\":[");
    for(int i=0;i<__r.size();i++){Map<String,Object>m=__r.get(i);sb.append("{\\"description\\":\\"").append(m.get("description")).append("\\",\\"passed\\":").append(m.get("passed"));if(m.containsKey("error"))sb.append(",\\"error\\":\\"").append(m.get("error")).append("\\"");sb.append("}");if(i<__r.size()-1)sb.append(",");}
    sb.append("]}");
    System.out.println(sb);
    System.exit(__f>0?1:0);
  }
}
`;

/**
 * Write the test runner file to disk, execute it via the container pool,
 * and return { passed, failed, total, results }.
 */
async function runTestCases(workspaceDir, language, testCases) {
  let header, footer, testFile;

  if (language === 'python') {
    const studentCode = fs.readFileSync(
      path.join(workspaceDir, 'main.py'),
      'utf-8',
    );
    const escapedCode = studentCode
      .replace(/\\/g, '\\\\')
      .replace(/"""/g, '\\"\\"\\"');
    header =
      `studentCodeString = """${escapedCode}"""\n` +
      studentCode +
      `\n` +
      PY_TEST_HEADER;
    footer = PY_TEST_FOOTER;
    testFile = path.join(workspaceDir, '__tests__.py');
  } else if (language === 'java') {
    header = JAVA_TEST_HEADER;
    footer = JAVA_TEST_FOOTER;
    testFile = path.join(workspaceDir, '__Tests__.java');
  } else if (language === 'sql') {
    throw new Error(
      'Automated test cases are not supported for SQL exercises.',
    );
  } else {
    // javascript (default)
    const studentCode = fs.readFileSync(
      path.join(workspaceDir, 'index.js'),
      'utf-8',
    );
    const escapedCode = studentCode
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');
    header =
      `const studentCodeString = \`${escapedCode}\`;\n` +
      studentCode +
      `\n` +
      JS_TEST_HEADER;
    footer = JS_TEST_FOOTER;
    testFile = path.join(workspaceDir, '__tests__.js');
  }

  const testCode = testCases.map((tc) => tc.test_code).join('\n');
  fs.writeFileSync(testFile, header + testCode + footer, 'utf-8');

  const result = await runnerService.executeTests(workspaceDir, language);
  if (!result)
    throw new Error('Test execution is not supported for this language.');

  const { output } = result;
  const lines = output.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (typeof parsed.passed === 'number') return parsed;
    } catch {}
  }
  throw new Error(`Test runner produced no parseable output.\n${output}`);
}

const DEFAULT_INITIAL_FILES = {
  javascript: [{ name: 'index.js', content: '// Write your solution here\n' }],
  python: [{ name: 'main.py', content: '# Write your solution here\n' }],
  java: [
    {
      name: 'Main.java',
      content:
        'public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
    },
  ],
  sql: [{ name: 'solution.sql', content: '-- Write your SQL here\n' }],
};

/**
 * Initialise (or re-open) an exercise workspace for the student.
 * Creates the directory and seeds initial files on the first open.
 * POST /api/students/exercise/:exerciseId/workspace/init
 */
exports.initExerciseWorkspace = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exerciseId } = req.params;
    const { taskId } = req.body;

    const exerciseResult = await pool.query(
      'SELECT language, initial_files, tasks FROM exercises WHERE id = $1',
      [exerciseId],
    );

    if (exerciseResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Exercise not found' });
    }

    const { language, initial_files, tasks } = exerciseResult.rows[0];

    // Determine which files to seed: task-specific or exercise-level
    let filesToSeedFromDb = null;
    if (taskId && Array.isArray(tasks) && tasks.length > 0) {
      const task = tasks.find((t) => t.id === taskId);
      if (!task)
        return res
          .status(404)
          .json({ success: false, message: 'Task not found' });
      filesToSeedFromDb = task.initial_files;
    } else {
      filesToSeedFromDb = initial_files;
    }

    const projectId = taskId
      ? `exercise-${exerciseId}-task-${taskId}`
      : `exercise-${exerciseId}`;
    const workspaceDir = path.join(WORKSPACE_ROOT, String(userId), projectId);

    fs.mkdirSync(workspaceDir, { recursive: true });

    const existing = fs.readdirSync(workspaceDir);
    if (existing.length === 0) {
      const filesToSeed =
        Array.isArray(filesToSeedFromDb) && filesToSeedFromDb.length > 0
          ? filesToSeedFromDb
          : (DEFAULT_INITIAL_FILES[language] ??
            DEFAULT_INITIAL_FILES.javascript);

      for (const file of filesToSeed) {
        const filePath = path.join(workspaceDir, file.name);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, file.content, 'utf-8');
      }
    }

    // Return current files from disk so returning students see their saved work
    const files = fs
      .readdirSync(workspaceDir)
      .filter((f) => fs.statSync(path.join(workspaceDir, f)).isFile())
      .map((name) => ({
        name,
        content: fs.readFileSync(path.join(workspaceDir, name), 'utf-8'),
      }));

    res.json({ success: true, data: { language, files, projectId } });
  } catch (error) {
    console.error('Error initialising exercise workspace:', error);
    serverError(res, error);
  }
};

/**
 * Run the student's exercise code and return stdout + stderr.
 * POST /api/students/exercise/:exerciseId/run
 */
exports.runExercise = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exerciseId } = req.params;
    const { taskId } = req.body;

    const exerciseResult = await pool.query(
      'SELECT language FROM exercises WHERE id = $1',
      [exerciseId],
    );

    if (exerciseResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Exercise not found' });
    }

    const { language } = exerciseResult.rows[0];
    const runner = EXERCISE_RUNNER[language] ?? EXERCISE_RUNNER.javascript;
    const projectId = taskId
      ? `exercise-${exerciseId}-task-${taskId}`
      : `exercise-${exerciseId}`;
    const workspaceDir = path.join(WORKSPACE_ROOT, String(userId), projectId);

    if (!fs.existsSync(workspaceDir)) {
      return res
        .status(400)
        .json({ success: false, message: 'Workspace not initialised' });
    }

    const { output, exitCode } = await runnerService.execute(
      workspaceDir,
      language,
    );
    res.json({ success: true, data: { output, exitCode } });
  } catch (error) {
    console.error('Error running exercise:', error);
    serverError(res, error);
  }
};

/**
 * Run test cases against the student's workspace (without submitting).
 * POST /api/students/exercise/:exerciseId/run-tests
 */
exports.runExerciseTests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { exerciseId } = req.params;
    const { taskId } = req.body;

    const result = await pool.query(
      'SELECT language, test_cases, tasks FROM exercises WHERE id = $1',
      [exerciseId],
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Exercise not found' });
    }

    const { language, test_cases, tasks } = result.rows[0];

    // Resolve which test cases to run
    let testCasesToRun = test_cases;
    if (taskId && Array.isArray(tasks) && tasks.length > 0) {
      const task = tasks.find((t) => t.id === taskId);
      if (!task)
        return res
          .status(404)
          .json({ success: false, message: 'Task not found' });
      testCasesToRun = task.test_cases;
    }

    if (!testCasesToRun || testCasesToRun.length === 0) {
      return res.json({
        success: true,
        data: { message: 'No test cases defined for this task' },
      });
    }

    const projectId = taskId
      ? `exercise-${exerciseId}-task-${taskId}`
      : `exercise-${exerciseId}`;
    const workspaceDir = path.join(WORKSPACE_ROOT, String(userId), projectId);
    if (!fs.existsSync(workspaceDir)) {
      return res
        .status(400)
        .json({ success: false, message: 'Workspace not initialised' });
    }

    const testResult = await runTestCases(
      workspaceDir,
      language,
      testCasesToRun,
    );
    res.json({ success: true, data: testResult });
  } catch (error) {
    console.error('Error running exercise tests:', error);
    serverError(res, error);
  }
};

// ============================================
// STUDENT LEADERBOARDS
// ============================================

/**
 * Get overall leaderboard (student view)
 * GET /api/students/leaderboard/overall
 */
exports.getOverallLeaderboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const result = await pool.query(
      `WITH ranked AS (
        SELECT
          u.id AS user_id,
          u.full_name,
          c.name AS college_name,
          COALESCE(SUM(pl.points), 0)::integer AS total_points,
          RANK() OVER (ORDER BY COALESCE(SUM(pl.points), 0) DESC)::integer AS rank
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN colleges c ON sp.college_id = c.id
        LEFT JOIN points_log pl ON pl.user_id = u.id
        WHERE u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT')
        GROUP BY u.id, u.full_name, c.name
      )
      SELECT * FROM ranked ORDER BY rank LIMIT $1`,
      [limit],
    );

    const userRank = await pool.query(
      `SELECT rank, total_points FROM (
        SELECT
          u.id AS user_id,
          COALESCE(SUM(pl.points), 0)::integer AS total_points,
          RANK() OVER (ORDER BY COALESCE(SUM(pl.points), 0) DESC)::integer AS rank
        FROM users u
        LEFT JOIN points_log pl ON pl.user_id = u.id
        WHERE u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT')
        GROUP BY u.id
      ) ranked WHERE user_id = $1`,
      [userId],
    );

    res.json({
      success: true,
      data: { leaderboard: result.rows, my_rank: userRank.rows[0] || null },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    serverError(res, error);
  }
};

/**
 * Get weekly leaderboard (student view)
 * GET /api/students/leaderboard/weekly
 */
exports.getWeeklyLeaderboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    // ISO Monday of current week
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const weekStartStr = monday.toISOString().split('T')[0];

    const result = await pool.query(
      `WITH ranked AS (
        SELECT
          u.id AS user_id,
          u.full_name,
          c.name AS college_name,
          COALESCE(SUM(pl.points), 0)::integer AS total_points,
          RANK() OVER (ORDER BY COALESCE(SUM(pl.points), 0) DESC)::integer AS rank
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN colleges c ON sp.college_id = c.id
        LEFT JOIN points_log pl ON pl.user_id = u.id AND pl.created_at >= $2
        WHERE u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT')
        GROUP BY u.id, u.full_name, c.name
      )
      SELECT * FROM ranked ORDER BY rank LIMIT $1`,
      [limit, weekStartStr],
    );

    const userRank = await pool.query(
      `SELECT rank, total_points FROM (
        SELECT
          u.id AS user_id,
          COALESCE(SUM(pl.points), 0)::integer AS total_points,
          RANK() OVER (ORDER BY COALESCE(SUM(pl.points), 0) DESC)::integer AS rank
        FROM users u
        LEFT JOIN points_log pl ON pl.user_id = u.id AND pl.created_at >= $2
        WHERE u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT')
        GROUP BY u.id
      ) ranked WHERE user_id = $1`,
      [userId, weekStartStr],
    );

    res.json({
      success: true,
      week_start: weekStartStr,
      data: { leaderboard: result.rows, my_rank: userRank.rows[0] || null },
    });
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    serverError(res, error);
  }
};

/**
 * Get college leaderboard (student view)
 * GET /api/students/leaderboard/college
 */
exports.getCollegeLeaderboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const userQuery = await pool.query(
      'SELECT college_id FROM student_profiles WHERE user_id = $1',
      [userId],
    );
    if (!userQuery.rows[0]?.college_id) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'User is not associated with any college',
        });
    }

    const collegeId = userQuery.rows[0].college_id;

    const result = await pool.query(
      `WITH ranked AS (
        SELECT
          u.id AS user_id,
          u.full_name,
          COALESCE(SUM(pl.points), 0)::integer AS total_points,
          RANK() OVER (ORDER BY COALESCE(SUM(pl.points), 0) DESC)::integer AS rank
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN points_log pl ON pl.user_id = u.id
        WHERE u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT') AND sp.college_id = $2
        GROUP BY u.id, u.full_name
      )
      SELECT * FROM ranked ORDER BY rank LIMIT $1`,
      [limit, collegeId],
    );

    const userRank = await pool.query(
      `SELECT rank, total_points FROM (
        SELECT
          u.id AS user_id,
          COALESCE(SUM(pl.points), 0)::integer AS total_points,
          RANK() OVER (ORDER BY COALESCE(SUM(pl.points), 0) DESC)::integer AS rank
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN points_log pl ON pl.user_id = u.id
        WHERE u.role_id = (SELECT id FROM roles WHERE role_key = 'STUDENT') AND sp.college_id = $2
        GROUP BY u.id
      ) ranked WHERE user_id = $1`,
      [userId, collegeId],
    );

    res.json({
      success: true,
      college_id: collegeId,
      data: { leaderboard: result.rows, my_rank: userRank.rows[0] || null },
    });
  } catch (error) {
    console.error('Error fetching college leaderboard:', error);
    serverError(res, error);
  }
};

// ============================================
// STUDENT PROJECTS (personal editor workspaces)
// ============================================

/**
 * List all personal projects for the logged-in student
 * GET /api/students/projects
 */
exports.getStudentProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, name, profile, created_at, updated_at
       FROM student_projects
       WHERE user_id = $1 AND is_deleted = false
       ORDER BY updated_at DESC`,
      [userId],
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching student projects:', error);
    serverError(res, error);
  }
};

/**
 * Create a new personal project
 * POST /api/students/projects
 * Body: { name: string, profile: string }
 */
exports.createStudentProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, profile } = req.body;

    if (!name || !profile) {
      return res
        .status(400)
        .json({ success: false, message: 'name and profile are required' });
    }

    const result = await pool.query(
      `INSERT INTO student_projects (user_id, name, profile)
       VALUES ($1, $2, $3)
       RETURNING id, name, profile, created_at`,
      [userId, name.trim(), profile],
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating student project:', error);
    serverError(res, error);
  }
};

/**
 * Delete a personal project
 * DELETE /api/students/projects/:id
 */
exports.deleteStudentProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE student_projects SET is_deleted = true WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING *`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Project not found' });
    }

    logAction({
      req,
      action: 'DELETE',
      entityType: 'student_project',
      entityId: id,
      details: { name: result.rows[0].name },
    });
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Error deleting student project:', error);
    serverError(res, error);
  }
};

// ============================================
// ASSIGNMENTS
// ============================================

/**
 * Get a single assignment by ID (student must be enrolled in the subject)
 * GET /api/students/assignments/:id
 */
exports.getAssignmentById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        a.id,
        a.title,
        a.instructions,
        a.max_score,
        s.name AS subject_title,
        s.slug AS subject_slug,
        u.title AS unit_title,
        sub.submission_link,
        sub.submitted_at
       FROM assignments a
       INNER JOIN units u ON a.unit_id = u.id
       INNER JOIN topics t ON u.topic_id = t.id
       INNER JOIN subjects s ON t.subject_id = s.id
       INNER JOIN user_subjects us ON us.subject_id = s.id AND us.user_id = $1
       LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.user_id = $1
       WHERE a.id = $2`,
      [userId, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    serverError(res, error);
  }
};

/**
 * Submit (or update) an assignment solution link
 * POST /api/students/assignments/:id/submit
 */
exports.submitAssignment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { submission_link } = req.body;

    if (!submission_link || !submission_link.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'submission_link is required' });
    }

    // Verify the student is enrolled in the subject this assignment belongs to
    const enrolled = await pool.query(
      `SELECT a.id FROM assignments a
       INNER JOIN units u ON a.unit_id = u.id
       INNER JOIN topics t ON u.topic_id = t.id
       INNER JOIN subjects s ON t.subject_id = s.id
       INNER JOIN user_subjects us ON us.subject_id = s.id AND us.user_id = $1
       WHERE a.id = $2`,
      [userId, id],
    );

    if (enrolled.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Assignment not found' });
    }

    const result = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, user_id, submission_link)
       VALUES ($1, $2, $3)
       ON CONFLICT (assignment_id, user_id)
       DO UPDATE SET submission_link = EXCLUDED.submission_link, updated_at = CURRENT_TIMESTAMP
       RETURNING submission_link, submitted_at`,
      [id, userId, submission_link.trim()],
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    serverError(res, error);
  }
};

/**
 * Get all assignments for the student's enrolled subjects
 * GET /api/students/assignments
 */
exports.getStudentAssignments = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT
        a.id,
        a.title,
        a.instructions,
        a.max_score,
        s.name AS subject_title,
        s.slug AS subject_slug,
        u.title AS unit_title
      FROM assignments a
      INNER JOIN units u ON a.unit_id = u.id
      INNER JOIN topics t ON u.topic_id = t.id
      INNER JOIN subjects s ON t.subject_id = s.id
      INNER JOIN user_subjects us ON us.subject_id = s.id AND us.user_id = $1
      ORDER BY s.name, t.order_index, u.order_index, a.id;
    `;

    const result = await pool.query(query, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    serverError(res, error);
  }
};

// ============================================
// CAPSTONE PROJECTS
// ============================================

/**
 * Get capstone project for a topic (with existing submission if any)
 * GET /api/students/capstone/:projectId
 */
exports.getCapstone = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;

    const result = await pool.query(
      `SELECT
        p.id, p.title, p.instructions, p.max_score,
        ps.submission_link, ps.is_approved, ps.submitted_at
       FROM projects p
       INNER JOIN topics t ON p.topic_id = t.id
       INNER JOIN subjects s ON t.subject_id = s.id
       INNER JOIN user_subjects us ON us.subject_id = s.id AND us.user_id = $1
       LEFT JOIN project_submissions ps ON ps.project_id = p.id AND ps.user_id = $1
       WHERE p.id = $2`,
      [userId, projectId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Capstone project not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching capstone:', error);
    serverError(res, error);
  }
};

/**
 * Submit (or update) a capstone project solution link
 * POST /api/students/capstone/:projectId/submit
 */
exports.submitCapstone = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;
    const { submission_link } = req.body;

    if (!submission_link || !submission_link.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'submission_link is required' });
    }

    // Verify enrollment
    const enrolled = await pool.query(
      `SELECT p.id FROM projects p
       INNER JOIN topics t ON p.topic_id = t.id
       INNER JOIN subjects s ON t.subject_id = s.id
       INNER JOIN user_subjects us ON us.subject_id = s.id AND us.user_id = $1
       WHERE p.id = $2`,
      [userId, projectId],
    );

    if (enrolled.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Project not found' });
    }

    const result = await pool.query(
      `INSERT INTO project_submissions (project_id, user_id, submission_link)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id)
       DO UPDATE SET submission_link = EXCLUDED.submission_link, updated_at = CURRENT_TIMESTAMP
       RETURNING submission_link, submitted_at, is_approved`,
      [projectId, userId, submission_link.trim()],
    );

    // Award 20 points once per capstone (idempotent via unique source key)
    const source = `capstone_${projectId}`;
    const alreadyAwarded = await pool.query(
      'SELECT 1 FROM points_log WHERE user_id = $1 AND source = $2 LIMIT 1',
      [userId, source],
    );
    if (alreadyAwarded.rows.length === 0) {
      await pool.query(
        'INSERT INTO points_log (user_id, source, points) VALUES ($1, $2, $3)',
        [userId, source, 20],
      );
      markActionToday(userId);
      await checkAndAwardBadges(userId);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error submitting capstone:', error);
    serverError(res, error);
  }
};

// ── Enroll in Subject ──────────────────────────────────────────────────────────

exports.enrollInSubject = async (req, res) => {
  const userId = req.user.id;
  const { subjectId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify subject exists and is published
    const subjectCheck = await client.query(
      'SELECT id FROM subjects WHERE id = $1 AND is_published = true',
      [subjectId],
    );
    if (subjectCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({
          success: false,
          message: 'Subject not found or not available',
        });
    }

    // Insert enrollment (idempotent)
    await client.query(
      `INSERT INTO user_subjects (user_id, subject_id, started_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, subject_id) DO NOTHING`,
      [userId, subjectId],
    );

    // Seed subtopic progress: unlocked by default (peer-progression locking
    // not enforced yet); only locked if an admin explicitly locked it.
    await client.query(
      `WITH new_student_profile AS (
        SELECT college_id, year FROM student_profiles WHERE user_id = $1
      ),
      subject_subtopics AS (
        SELECT
          st.id AS subtopic_id,
          DENSE_RANK() OVER (
            PARTITION BY t.subject_id
            ORDER BY t.order_index, u.order_index
          ) AS unit_rn
        FROM topics t
        INNER JOIN units u ON u.topic_id = t.id
        INNER JOIN subtopics st ON st.unit_id = u.id
        WHERE t.subject_id = $2
      ),
      admin_locks AS (
        SELECT cal.subtopic_id, cal.is_locked
        FROM cohort_admin_locks cal
        CROSS JOIN new_student_profile nsp
        WHERE cal.college_id = nsp.college_id
          AND cal.year = nsp.year
      )
      INSERT INTO user_subtopic_progress (user_id, subtopic_id, is_unlocked)
      SELECT $1, ss.subtopic_id,
        CASE
          WHEN al.is_locked = true THEN false   -- admin explicitly locked
          ELSE true                             -- unlocked by default; locking mechanism TBD
        END
      FROM subject_subtopics ss
      LEFT JOIN admin_locks al ON al.subtopic_id = ss.subtopic_id
      ON CONFLICT (user_id, subtopic_id)
        DO UPDATE SET is_unlocked = (user_subtopic_progress.is_unlocked OR EXCLUDED.is_unlocked)`,
      [userId, subjectId],
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error enrolling in subject:', error);
    serverError(res, error);
  } finally {
    client.release();
  }
};

// ── Scorecard ──────────────────────────────────────────────────────────────────
// Returns topic-wise weighted scores for all subjects the student is enrolled in.
// Weights: exercises 20%, quizzes 10%, assignments 30%, projects 40%
//
// NOTE: Assignment scoring requires this column (run once on DB):
//   ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT NULL;

exports.getStudentScorecard = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `
      WITH enrolled AS (
        SELECT s.id AS subject_id, s.name AS subject_name
        FROM user_subjects us
        JOIN subjects s ON s.id = us.subject_id
        WHERE us.user_id = $1
      ),
      topic_list AS (
        SELECT t.id, t.title, t.order_index, t.subject_id
        FROM topics t
        WHERE t.subject_id IN (SELECT subject_id FROM enrolled)
      ),
      -- Best exercise score per exercise for this user
      best_exercise AS (
        SELECT exercise_id, MAX(score) AS best_score
        FROM exercise_submissions
        WHERE user_id = $1
        GROUP BY exercise_id
      ),
      -- Map exercises to topics (via unit_id or subtopic -> unit)
      exercise_topic AS (
        SELECT e.id AS exercise_id, u.topic_id
        FROM exercises e
        JOIN units u ON e.unit_id = u.id
        WHERE u.topic_id IN (SELECT id FROM topic_list)
        UNION
        SELECT e.id AS exercise_id, u.topic_id
        FROM exercises e
        JOIN subtopics st ON e.subtopic_id = st.id
        JOIN units u ON st.unit_id = u.id
        WHERE u.topic_id IN (SELECT id FROM topic_list)
      ),
      exercise_weighted AS (
        SELECT
          et.topic_id,
          ROUND(
            COALESCE(SUM(be.best_score)::numeric / NULLIF(SUM(e.max_score), 0) * 20, 0),
            1
          ) AS weighted
        FROM exercise_topic et
        JOIN exercises e ON e.id = et.exercise_id
        LEFT JOIN best_exercise be ON be.exercise_id = et.exercise_id
        GROUP BY et.topic_id
      ),
      -- Best quiz score per quiz for this user
      best_quiz AS (
        SELECT quiz_id, MAX(score) AS best_score
        FROM quiz_attempts
        WHERE user_id = $1
        GROUP BY quiz_id
      ),
      quiz_weighted AS (
        SELECT
          u.topic_id,
          ROUND(
            COALESCE(SUM(bq.best_score)::numeric / NULLIF(SUM(q.max_score), 0) * 10, 0),
            1
          ) AS weighted
        FROM best_quiz bq
        JOIN quizzes q ON q.id = bq.quiz_id
        JOIN units u ON q.unit_id = u.id
        WHERE u.topic_id IN (SELECT id FROM topic_list)
        GROUP BY u.topic_id
      ),
      -- Assignment scores (only graded submissions count)
      assignment_weighted AS (
        SELECT
          u.topic_id,
          ROUND(
            COALESCE(SUM(asub.score)::numeric / NULLIF(SUM(a.max_score), 0) * 30, 0),
            1
          ) AS weighted
        FROM assignment_submissions asub
        JOIN assignments a ON a.id = asub.assignment_id
        JOIN units u ON a.unit_id = u.id
        WHERE asub.user_id = $1
          AND asub.score IS NOT NULL
          AND u.topic_id IN (SELECT id FROM topic_list)
        GROUP BY u.topic_id
      ),
      -- Project (capstone) scores
      project_weighted AS (
        SELECT
          p.topic_id,
          ROUND(
            COALESCE(SUM(ps.score)::numeric / NULLIF(SUM(p.max_score), 0) * 40, 0),
            1
          ) AS weighted
        FROM project_submissions ps
        JOIN projects p ON p.id = ps.project_id
        WHERE ps.user_id = $1
          AND ps.score IS NOT NULL
          AND p.topic_id IN (SELECT id FROM topic_list)
        GROUP BY p.topic_id
      )
      SELECT
        e.subject_id,
        e.subject_name,
        t.id AS topic_id,
        t.title AS topic_title,
        t.order_index,
        COALESCE(ew.weighted, 0) AS exercise_score,
        COALESCE(qw.weighted, 0) AS quiz_score,
        COALESCE(aw.weighted, 0) AS assignment_score,
        COALESCE(pw.weighted, 0) AS project_score,
        ROUND(
          COALESCE(ew.weighted, 0) +
          COALESCE(qw.weighted, 0) +
          COALESCE(aw.weighted, 0) +
          COALESCE(pw.weighted, 0),
          1
        ) AS total_score
      FROM topic_list t
      JOIN enrolled e ON e.subject_id = t.subject_id
      LEFT JOIN exercise_weighted ew ON ew.topic_id = t.id
      LEFT JOIN quiz_weighted qw ON qw.topic_id = t.id
      LEFT JOIN assignment_weighted aw ON aw.topic_id = t.id
      LEFT JOIN project_weighted pw ON pw.topic_id = t.id
      ORDER BY e.subject_name, t.order_index
      `,
      [userId],
    );

    // Group topics by subject
    const subjectMap = new Map();
    for (const row of result.rows) {
      if (!subjectMap.has(row.subject_id)) {
        subjectMap.set(row.subject_id, {
          subject_id: row.subject_id,
          subject_name: row.subject_name,
          topics: [],
        });
      }
      subjectMap.get(row.subject_id).topics.push({
        topic_id: row.topic_id,
        topic_title: row.topic_title,
        exercise_score: parseFloat(row.exercise_score),
        quiz_score: parseFloat(row.quiz_score),
        assignment_score: parseFloat(row.assignment_score),
        project_score: parseFloat(row.project_score),
        total_score: parseFloat(row.total_score),
      });
    }

    res.json({ success: true, data: Array.from(subjectMap.values()) });
  } catch (error) {
    console.error('Error fetching scorecard:', error);
    res
      .status(500)
      .json({
        success: false,
        message: 'Failed to fetch scorecard',
        error: error.message,
      });
  }
};

/**
 * Student per-module analytics breakdown
 * GET /api/students/analytics/modules
 */
exports.getStudentModuleAnalytics = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT
         t.id AS topic_id,
         t.title AS topic_title,
         s.id AS subject_id,
         s.name AS subject_name,
         -- Best quiz score for this topic (sum of best per-quiz scores vs total max)
         COALESCE((
           SELECT SUM(bq.best_score)
           FROM (
             SELECT qa.quiz_id, MAX(qa.score) AS best_score
             FROM quiz_attempts qa
             JOIN quizzes q ON q.id = qa.quiz_id
             JOIN units un ON un.id = q.unit_id
             WHERE qa.user_id = $1 AND un.topic_id = t.id
             GROUP BY qa.quiz_id
           ) bq
         ), 0)::int AS quiz_score,
         COALESCE((
           SELECT SUM(q.max_score)
           FROM quizzes q
           JOIN units un ON un.id = q.unit_id
           WHERE un.topic_id = t.id
         ), 0)::int AS quiz_max,
         -- Assignment status: Submitted if any submission exists for this topic
         CASE
           WHEN EXISTS (
             SELECT 1 FROM assignment_submissions asub
             JOIN assignments a ON a.id = asub.assignment_id
             JOIN units un ON un.id = a.unit_id
             WHERE asub.user_id = $1 AND un.topic_id = t.id
           ) THEN 'Submitted'
           ELSE 'Pending'
         END AS assignment_status,
         -- Project status
         CASE
           WHEN EXISTS (
             SELECT 1 FROM project_submissions ps
             JOIN projects p ON p.id = ps.project_id
             WHERE ps.user_id = $1 AND p.topic_id = t.id AND ps.is_approved = true
           ) THEN 'Approved'
           WHEN EXISTS (
             SELECT 1 FROM project_submissions ps
             JOIN projects p ON p.id = ps.project_id
             WHERE ps.user_id = $1 AND p.topic_id = t.id
           ) THEN 'Submitted'
           WHEN EXISTS (
             SELECT 1 FROM projects p WHERE p.topic_id = t.id
           ) THEN 'Not Started'
           ELSE NULL
         END AS project_status,
         -- NEW PROGRESS COUNTS
         COALESCE((
           SELECT COUNT(*)::int
           FROM user_lesson_progress ulp
           JOIN lesson_content lc ON lc.id = ulp.lesson_content_id
           JOIN subtopics st ON st.id = lc.subtopic_id
           JOIN units un ON un.id = st.unit_id
           WHERE ulp.is_completed = true AND ulp.user_id = $1 AND un.topic_id = t.id
         ), 0) AS lessons_completed,
         COALESCE((
           SELECT COUNT(*)::int
           FROM lesson_content lc
           JOIN subtopics st ON st.id = lc.subtopic_id
           JOIN units un ON un.id = st.unit_id
           WHERE un.topic_id = t.id
         ), 0) AS lessons_total,
         COALESCE((
           SELECT COUNT(DISTINCT q.id)::int
           FROM quiz_attempts qa
           JOIN quizzes q ON q.id = qa.quiz_id
           JOIN units un ON un.id = q.unit_id
           WHERE qa.user_id = $1 AND qa.is_passed = true AND un.topic_id = t.id
         ), 0) AS quizzes_passed,
         COALESCE((
           SELECT COUNT(*)::int
           FROM quizzes q
           JOIN units un ON un.id = q.unit_id
           WHERE un.topic_id = t.id
         ), 0) AS quizzes_total,
         COALESCE((
           SELECT COUNT(*)::int
           FROM assignment_submissions sub
           JOIN assignments a ON a.id = sub.assignment_id
           JOIN units un ON un.id = a.unit_id
           WHERE sub.user_id = $1 AND un.topic_id = t.id
         ), 0) AS asg_submitted,
         COALESCE((
           SELECT COUNT(*)::int
           FROM assignments a
           JOIN units un ON un.id = a.unit_id
           WHERE un.topic_id = t.id
         ), 0) AS asg_total,
         COALESCE((
           SELECT COUNT(*)::int
           FROM project_submissions sub
           JOIN projects p ON p.id = sub.project_id
           WHERE sub.user_id = $1 AND p.topic_id = t.id
         ), 0) AS proj_submitted,
         COALESCE((
           SELECT COUNT(*)::int
           FROM projects p
           WHERE p.topic_id = t.id
         ), 0) AS proj_total
       FROM topics t
       JOIN subjects s ON s.id = t.subject_id
       JOIN user_subjects us ON us.subject_id = s.id AND us.user_id = $1
       ORDER BY s.name, t.order_index`,
      [userId],
    );

    // Group by subject
    const subjectMap = new Map();
    let totalProgressSum = 0;
    let totalTopics = 0;

    for (const row of result.rows) {
      if (!subjectMap.has(row.subject_id)) {
        subjectMap.set(row.subject_id, {
          subject_id: row.subject_id,
          subject_name: row.subject_name,
          topics: [],
        });
      }

      // Calculate progress for this topic
      const calcPct = (completed, total) =>
        total > 0 ? Math.round((completed / total) * 100) : null;
      const lessonPct = calcPct(row.lessons_completed, row.lessons_total);
      const quizPct = calcPct(row.quizzes_passed, row.quizzes_total);
      const asgPct = calcPct(row.asg_submitted, row.asg_total);
      const projPct = calcPct(row.proj_submitted, row.proj_total);

      const pcts = [lessonPct, quizPct, asgPct, projPct].filter(
        (p) => p !== null,
      );
      const progress =
        pcts.length > 0
          ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
          : 0;

      totalProgressSum += progress;
      totalTopics++;

      subjectMap.get(row.subject_id).topics.push({
        topic_id: row.topic_id,
        topic_title: row.topic_title,
        quiz_score: row.quiz_score,
        quiz_max: row.quiz_max,
        assignment_status: row.assignment_status,
        project_status: row.project_status,
        progress,
      });
    }

    const overall_progress =
      totalTopics > 0 ? Math.round(totalProgressSum / totalTopics) : 0;

    res.json({
      success: true,
      overall_progress,
      data: Array.from(subjectMap.values()),
    });
  } catch (err) {
    console.error('getStudentModuleAnalytics error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch module analytics' });
  }
};

/**
 * Student self-analytics summary
 * GET /api/students/analytics
 */
exports.getStudentAnalytics = async (req, res) => {
  const userId = req.user.id;
  try {
    // Fetch data sequentially to prevent Neon connection pool exhaustion/timeouts
    const metricsRes = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM quiz_attempts WHERE user_id = $1)         AS quizzes_attempted,
         COALESCE((
           SELECT ROUND(AVG(LEAST(100, qa.score::numeric / NULLIF(q.max_score,0) * 100)))::int
           FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id
           WHERE qa.user_id = $1 AND q.max_score > 0
         ), 0)                                                                 AS avg_quiz_score,
         (SELECT COUNT(*)::int FROM assignment_submissions WHERE user_id = $1) AS assignments_submitted,
         (SELECT COUNT(*)::int FROM project_submissions WHERE user_id = $1 AND is_approved = true)
                                                                               AS projects_completed,
         (SELECT current_streak FROM user_streaks WHERE user_id = $1)          AS current_streak,
         (SELECT last_activity FROM user_streaks WHERE user_id = $1)           AS last_activity,
         (SELECT (CURRENT_DATE - last_activity::date) FROM user_streaks WHERE user_id = $1) AS days_since_active`,
      [userId],
    );

    const recentQuizzesRes = await pool.query(
      `SELECT qa.id, un.title AS name,
              LEAST(100, ROUND(qa.score::numeric / NULLIF(q.max_score,0) * 100))::int AS score,
              CASE WHEN qa.is_passed THEN 'Passed' ELSE 'Failed' END AS status,
              qa.created_at
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       JOIN units un ON un.id = q.unit_id
       WHERE qa.user_id = $1
       ORDER BY qa.created_at DESC
       LIMIT 5`,
      [userId],
    );

    const pendingRes = await pool.query(
      `SELECT COUNT(*)::int AS assignments_pending
       FROM assignments a
       JOIN units u ON u.id = a.unit_id
       JOIN topics t ON t.id = u.topic_id
       JOIN subjects s ON s.id = t.subject_id
       JOIN user_subjects us ON us.subject_id = s.id AND us.user_id = $1
       WHERE NOT EXISTS (
         SELECT 1 FROM assignment_submissions sub
         WHERE sub.assignment_id = a.id AND sub.user_id = $1
       )`,
      [userId],
    );

    const totalXp = await getTotalXP(userId);

    const m = metricsRes.rows[0];
    res.json({
      success: true,
      data: {
        metrics: {
          quizzes_attempted: m.quizzes_attempted,
          avg_quiz_score: m.avg_quiz_score,
          assignments_submitted: m.assignments_submitted,
          assignments_pending: pendingRes.rows[0].assignments_pending,
          projects_completed: m.projects_completed,
          current_streak: m.current_streak || 0,
          last_activity: m.last_activity || null,
          days_since_active: m.days_since_active || 0,
          total_xp: totalXp,
        },
        recent_quizzes: recentQuizzesRes.rows,
      },
    });
  } catch (err) {
    console.error('getStudentAnalytics error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch analytics' });
  }
};

module.exports = exports;
