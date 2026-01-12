/**
 * LMS Database Schema
 * PostgreSQL
 * Grouped by domain
 */

const tables = {
  /* ============================
       CORE REFERENCE TABLES
    ============================ */

  colleges: `
      CREATE TABLE IF NOT EXISTS colleges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) UNIQUE NOT NULL,
        short_code VARCHAR(50) UNIQUE,
        city VARCHAR(100),
        state VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,

  users: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL,
        degree VARCHAR(100),
        college_id INT REFERENCES colleges(id),
        year INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,

  subjects: `
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) UNIQUE NOT NULL,
        description TEXT,
        is_published BOOLEAN DEFAULT FALSE,
        order_index INT DEFAULT 0
      );
    `,

  user_subjects: `
      CREATE TABLE IF NOT EXISTS user_subjects (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE (user_id, subject_id)
      );
    `,

  /* ============================
       CONTENT HIERARCHY
    ============================ */

  topics: `
      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        order_index INT DEFAULT 0
      );
    `,

  subtopics: `
      CREATE TABLE IF NOT EXISTS subtopics (
        id SERIAL PRIMARY KEY,
        topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        order_index INT DEFAULT 0
      );
    `,

  lesson_content: `
      CREATE TABLE IF NOT EXISTS lesson_content (
        id SERIAL PRIMARY KEY,
        subtopic_id INT REFERENCES subtopics(id) ON DELETE CASCADE,
        content_type VARCHAR(50)
          CHECK (content_type IN ('markdown','video','external')),
        markdown_path TEXT NOT NULL,
        estimated_read_time INT,
        version INT DEFAULT 1,
        is_published BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (subtopic_id, version)
      );
    `,

  /* ============================
       ASSESSMENTS
    ============================ */

  exercises: `
      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        subtopic_id INT REFERENCES subtopics(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        instructions TEXT,
        max_score INT NOT NULL
      );
    `,

  quizzes: `
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        subtopic_id INT REFERENCES subtopics(id) ON DELETE CASCADE,
        passing_score INT NOT NULL,
        max_score INT NOT NULL
      );
    `,

  projects: `
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        type VARCHAR(50),
        max_score INT NOT NULL
      );
    `,

  /* ============================
       SUBMISSIONS & ATTEMPTS
    ============================ */

  exercise_submissions: `
      CREATE TABLE IF NOT EXISTS exercise_submissions (
        id SERIAL PRIMARY KEY,
        exercise_id INT REFERENCES exercises(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        score INT,
        is_passed BOOLEAN,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,

  quiz_attempts: `
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        quiz_id INT REFERENCES quizzes(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        score INT,
        is_passed BOOLEAN,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,

  project_submissions: `
      CREATE TABLE IF NOT EXISTS project_submissions (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        score INT,
        is_approved BOOLEAN,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,

  /* ============================
       PROGRESS TRACKING
    ============================ */

  user_subtopic_progress: `
      CREATE TABLE IF NOT EXISTS user_subtopic_progress (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        subtopic_id INT REFERENCES subtopics(id) ON DELETE CASCADE,
        is_unlocked BOOLEAN DEFAULT FALSE,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        UNIQUE (user_id, subtopic_id)
      );
    `,

  user_topic_progress: `
      CREATE TABLE IF NOT EXISTS user_topic_progress (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
        progress_percent INT DEFAULT 0,
        is_completed BOOLEAN DEFAULT FALSE,
        UNIQUE (user_id, topic_id)
      );
    `,

  user_lesson_progress: `
      CREATE TABLE IF NOT EXISTS user_lesson_progress (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        lesson_content_id INT REFERENCES lesson_content(id) ON DELETE CASCADE,
        last_scroll_position INT DEFAULT 0,
        is_completed BOOLEAN DEFAULT FALSE,
        UNIQUE (user_id, lesson_content_id)
      );
    `,

  /* ============================
       GAMIFICATION & ACTIVITY
    ============================ */

  points_log: `
      CREATE TABLE IF NOT EXISTS points_log (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        source VARCHAR(100),
        points INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,

  user_activity: `
      CREATE TABLE IF NOT EXISTS user_activity (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(100),
        activity_date DATE DEFAULT CURRENT_DATE
      );
    `,

  user_streaks: `
      CREATE TABLE IF NOT EXISTS user_streaks (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        current_streak INT DEFAULT 0,
        longest_streak INT DEFAULT 0,
        last_activity DATE
      );
    `,

  /* ============================
       BADGES & LEADERBOARDS
    ============================ */

  badges: `
      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT
      );
    `,

  user_badges: `
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        badge_id INT REFERENCES badges(id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, badge_id)
      );
    `,

  leaderboards_weekly: `
      CREATE TABLE IF NOT EXISTS leaderboards_weekly (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        week_start DATE,
        total_points INT,
        rank INT,
        PRIMARY KEY (user_id, week_start)
      );
    `,

  leaderboards_topic: `
      CREATE TABLE IF NOT EXISTS leaderboards_topic (
        topic_id INT REFERENCES topics(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        total_points INT,
        rank INT,
        PRIMARY KEY (topic_id, user_id)
      );
    `,

  leaderboards_college: `
      CREATE TABLE IF NOT EXISTS leaderboards_college (
        college_id INT REFERENCES colleges(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        total_points INT,
        rank INT,
        PRIMARY KEY (college_id, user_id)
      );
    `,
};

module.exports = tables;
