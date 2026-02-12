const pool = require('../config/pg');

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
        WHERE subtopic_id = $1
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
        AND q.subtopic_id = $2
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

  const [lessonDone, quizDone, exerciseDone] = await Promise.all([
    has_lesson ? pool.query(lessonDoneQuery, [userId, subtopicId]) : null,
    has_quiz ? pool.query(quizDoneQuery, [userId, subtopicId]) : null,
    has_exercise ? pool.query(exerciseDoneQuery, [userId, subtopicId]) : null,
  ]);

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
        COALESCE(usp.is_unlocked, false) AS is_unlocked,
        COALESCE(usp.is_completed, false) AS is_completed,
        usp.completed_at,

        -- Content Existence
        EXISTS(SELECT 1 FROM lesson_content WHERE subtopic_id = st.id AND is_published = true) AS has_lesson,
        EXISTS(SELECT 1 FROM quizzes WHERE subtopic_id = st.id) AS has_quiz,
        EXISTS(SELECT 1 FROM exercises WHERE subtopic_id = st.id) AS has_exercise,

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
          WHERE qa.user_id = $1 AND q.subtopic_id = st.id
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

    res.json({
      success: true,
      data: {
        overall_progress: overallProgress,
        total_subtopics: totalSubtopics,
        completed_subtopics: completedSubtopics,
        total_points: totalPoints, // This is calculated from fetched rows, but user stats has total_points too.
        // Note: The original code returned 'totalPoints' from the loop and 'stats' object.
        // We keep both to match API signature.
        stats: stats,
        topics: topics,
      },
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress',
      error: error.message,
    });
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
      `
        SELECT is_unlocked
        FROM user_subtopic_progress
        WHERE user_id = $1 AND subtopic_id = $2
        LIMIT 1;
      `,
      [userId, subtopicId],
    );

    if (!lockCheck.rows[0] || lockCheck.rows[0].is_unlocked !== true) {
      return res.status(200).json({
        success: false,
        message: 'This subtopic is locked by your admin.',
      });
    }

    res.json({
      success: true,
      message: 'Subtopic started',
      data: lockCheck.rows[0],
    });
  } catch (error) {
    console.error('Error starting subtopic:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start subtopic',
      error: error.message,
    });
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
      RETURNING *;
    `;

    const result = await pool.query(query, [userId, lessonId]);

    // Award points for lesson completion
    await pool.query(
      'INSERT INTO points_log (user_id, source, points) VALUES ($1, $2, $3)',
      [userId, 'lesson_completion', 10],
    );

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
    res.status(500).json({
      success: false,
      message: 'Failed to complete lesson',
      error: error.message,
    });
  }
};

/**
 * Submit quiz attempt
 * POST /api/students/quiz/:quizId/submit
 */
exports.submitQuizAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;
    const { score } = req.body;

    // Get quiz details
    const quizQuery = await pool.query(
      'SELECT passing_score, max_score FROM quizzes WHERE id = $1',
      [quizId],
    );

    if (quizQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    const quiz = quizQuery.rows[0];
    const isPassed = score >= quiz.passing_score;

    const query = `
      INSERT INTO quiz_attempts (quiz_id, user_id, score, is_passed)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(query, [quizId, userId, score, isPassed]);

    // Award points
    const pointsAwarded = Math.round((score / quiz.max_score) * 50);
    await pool.query(
      'INSERT INTO points_log (user_id, source, points) VALUES ($1, $2, $3)',
      [userId, 'quiz_completion', pointsAwarded],
    );

    const subtopicResult = await pool.query(
      'SELECT subtopic_id FROM quizzes WHERE id = $1 LIMIT 1',
      [quizId],
    );
    if (subtopicResult.rows[0]?.subtopic_id) {
      await checkAndCompleteSubtopic(
        userId,
        subtopicResult.rows[0].subtopic_id,
      );
    }

    res.json({
      success: true,
      message: isPassed ? 'Quiz passed!' : 'Quiz attempted',
      data: {
        attempt: result.rows[0],
        points_awarded: pointsAwarded,
      },
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz',
      error: error.message,
    });
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
    const { score } = req.body;

    // Get exercise details
    const exerciseQuery = await pool.query(
      'SELECT max_score FROM exercises WHERE id = $1',
      [exerciseId],
    );

    if (exerciseQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found',
      });
    }

    const exercise = exerciseQuery.rows[0];
    const isPassed = score >= exercise.max_score * 0.7; // 70% pass threshold

    const query = `
      INSERT INTO exercise_submissions (exercise_id, user_id, score, is_passed)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      exerciseId,
      userId,
      score,
      isPassed,
    ]);

    // Award points
    const pointsAwarded = Math.round((score / exercise.max_score) * 100);
    await pool.query(
      'INSERT INTO points_log (user_id, source, points) VALUES ($1, $2, $3)',
      [userId, 'exercise_completion', pointsAwarded],
    );

    const subtopicResult = await pool.query(
      'SELECT subtopic_id FROM exercises WHERE id = $1 LIMIT 1',
      [exerciseId],
    );
    if (subtopicResult.rows[0]?.subtopic_id) {
      await checkAndCompleteSubtopic(
        userId,
        subtopicResult.rows[0].subtopic_id,
      );
    }

    res.json({
      success: true,
      message: isPassed ? 'Exercise passed!' : 'Exercise submitted',
      data: {
        submission: result.rows[0],
        points_awarded: pointsAwarded,
      },
    });
  } catch (error) {
    console.error('Error submitting exercise:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit exercise',
      error: error.message,
    });
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

    const query = `
      SELECT 
        user_id,
        full_name,
        college_name,
        total_points,
        rank
      FROM leaderboard_overall
      LIMIT $1;
    `;

    const result = await pool.query(query, [limit]);

    // Get current user's rank
    const userRankQuery = `
      SELECT rank, total_points
      FROM leaderboard_overall
      WHERE user_id = $1;
    `;
    const userRank = await pool.query(userRankQuery, [userId]);

    res.json({
      success: true,
      data: {
        leaderboard: result.rows,
        my_rank: userRank.rows[0] || null,
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message,
    });
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

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const query = `
      SELECT 
        lw.user_id,
        u.full_name,
        c.name as college_name,
        lw.total_points,
        lw.rank
      FROM leaderboards_weekly lw
      INNER JOIN users u ON lw.user_id = u.id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN colleges c ON sp.college_id = c.id
      WHERE lw.week_start = $1
      ORDER BY lw.rank
      LIMIT $2;
    `;

    const result = await pool.query(query, [weekStartStr, limit]);

    // Get current user's rank
    const userRankQuery = `
      SELECT rank, total_points
      FROM leaderboards_weekly
      WHERE user_id = $1 AND week_start = $2;
    `;
    const userRank = await pool.query(userRankQuery, [userId, weekStartStr]);

    res.json({
      success: true,
      week_start: weekStartStr,
      data: {
        leaderboard: result.rows,
        my_rank: userRank.rows[0] || null,
      },
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
 * Get college leaderboard (student view)
 * GET /api/students/leaderboard/college
 */
exports.getCollegeLeaderboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    // Get user's college
    const userQuery = await pool.query(
      'SELECT college_id FROM student_profiles WHERE user_id = $1',
      [userId],
    );

    if (!userQuery.rows[0] || !userQuery.rows[0].college_id) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with any college',
      });
    }

    const collegeId = userQuery.rows[0].college_id;

    const query = `
      SELECT 
        lc.user_id,
        u.full_name,
        lc.total_points,
        lc.rank
      FROM leaderboards_college lc
      INNER JOIN users u ON lc.user_id = u.id
      WHERE lc.college_id = $1
      ORDER BY lc.rank
      LIMIT $2;
    `;

    const result = await pool.query(query, [collegeId, limit]);

    // Get current user's rank
    const userRankQuery = `
      SELECT rank, total_points
      FROM leaderboards_college
      WHERE user_id = $1 AND college_id = $2;
    `;
    const userRank = await pool.query(userRankQuery, [userId, collegeId]);

    res.json({
      success: true,
      college_id: collegeId,
      data: {
        leaderboard: result.rows,
        my_rank: userRank.rows[0] || null,
      },
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

module.exports = exports;
