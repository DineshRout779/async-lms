# DATABASE TABLES - QUICK REFERENCE

## Total Tables: 30

### 📋 COMPLETE TABLE LIST

| #   | Table Name             | Category           | Primary Purpose                        |
| --- | ---------------------- | ------------------ | -------------------------------------- |
| 1   | users                  | User Management    | Core user accounts & authentication    |
| 2   | student_profiles       | User Management    | Student academic info                  |
| 3   | facilitator_colleges   | User Management    | Facilitator-college mapping            |
| 4   | facilitator_subjects   | User Management    | Facilitator-subject mapping            |
| 5   | colleges               | Academic Structure | Educational institutions               |
| 6   | subjects               | Academic Structure | Course catalog                         |
| 7   | topics                 | Academic Structure | Major sections in subjects             |
| 8   | subtopics              | Academic Structure | Lessons within topics                  |
| 9   | lesson_content         | Content            | Learning materials (md/video/external) |
| 10  | quizzes                | Assessments        | Quiz metadata                          |
| 11  | quiz_questions         | Assessments        | Individual questions                   |
| 12  | quiz_question_options  | Assessments        | Answer choices                         |
| 13  | quiz_attempts          | Submissions        | Student quiz submissions               |
| 14  | quiz_question_answers  | Submissions        | Individual answers                     |
| 15  | exercises              | Assessments        | Coding challenges                      |
| 16  | exercise_submissions   | Submissions        | Code submissions                       |
| 17  | projects               | Assessments        | Long-format assignments                |
| 18  | project_submissions    | Submissions        | Project submissions                    |
| 19  | user_lesson_progress   | Progress           | Lesson reading progress                |
| 20  | user_subtopic_progress | Progress           | Subtopic completion                    |
| 21  | user_topic_progress    | Progress           | Topic-level progress                   |
| 22  | user_subjects          | Progress           | Subject enrollment                     |
| 23  | user_activity          | Progress           | Daily activity log                     |
| 24  | user_streaks           | Gamification       | Learning streaks                       |
| 25  | badges                 | Gamification       | Badge definitions                      |
| 26  | user_badges            | Gamification       | Earned badges                          |
| 27  | points_log             | Gamification       | Point transactions                     |
| 28  | leaderboards_college   | Gamification       | College rankings                       |
| 29  | leaderboards_topic     | Gamification       | Topic rankings                         |
| 30  | leaderboards_weekly    | Gamification       | Weekly rankings                        |

---

## 📊 TABLES BY CATEGORY

### User Management (4)

- users, student_profiles, facilitator_colleges, facilitator_subjects

### Academic Structure (4)

- colleges, subjects, topics, subtopics

### Content & Assessments (6)

- lesson_content, quizzes, quiz_questions, quiz_question_options, exercises, projects

### Submissions & Attempts (4)

- quiz_attempts, quiz_question_answers, exercise_submissions, project_submissions

### Progress Tracking (5)

- user_lesson_progress, user_subtopic_progress, user_topic_progress, user_subjects, user_activity

### Gamification (7)

- user_streaks, badges, user_badges, points_log, leaderboards_college, leaderboards_topic, leaderboards_weekly

---

## 🔑 PRIMARY KEY PATTERNS

**All tables use UUID (uuid_generate_v4())**

### Single UUID Primary Key (25 tables)

All tables except the 5 below

### Composite Primary Keys (5 tables)

1. **student_profiles** - user_id
2. **user_streaks** - user_id
3. **leaderboards_college** - college_id, user_id
4. **leaderboards_topic** - topic_id, user_id
5. **leaderboards_weekly** - user_id, week_start

---

## 🔗 KEY FOREIGN RELATIONSHIPS

### User-Centric

- user_id → users (in 14 tables)

### Content Hierarchy

- subject_id → subjects
- topic_id → topics
- subtopic_id → subtopics

### Assessment Chain

- quiz_id → quizzes → quiz_questions → quiz_question_options
- quiz_attempt_id → quiz_attempts → quiz_question_answers

---

## ⏰ TIMESTAMP PATTERNS

**created_at:** All 30 tables ✅
**updated_at:** 29 tables (all except student_profiles)

Special timestamps:

- attempted_at (quiz_attempts)
- submitted_at (exercise_submissions, project_submissions)
- earned_at (user_badges)
- completed_at (user_subtopic_progress, user_subjects)
- started_at (user_subjects)
- last_activity (user_streaks)
- activity_date (user_activity)
- week_start (leaderboards_weekly)

---

## 🎯 KEY FEATURES IN SCHEMA

### Gamification Elements

✅ Streaks tracking (current + longest)
✅ Badge system (definitions + earned)
✅ Points logging with source
✅ Three leaderboard types
✅ Activity tracking

### Progress Tracking

✅ Scroll position persistence
✅ Unlock mechanism
✅ Completion percentages
✅ Multi-level tracking (lesson, subtopic, topic, subject)

### Assessment Variety

✅ Quizzes (MCQ, True/False, Short Answer)
✅ Coding exercises
✅ Long-format projects
✅ Pass/fail thresholds
✅ Point weighting

### Content Flexibility

✅ Multiple content types (markdown, video, external)
✅ Version control
✅ Publication workflow
✅ Reading time estimation

---

## 🚫 MISSING TABLES (Per PRD Analysis)

**High Priority:**

- mentorship_sessions
- mentorship_bookings
- notifications
- notification_preferences
- tracking_events (video/scroll/button)
- ai_conversations
- oauth_tokens

**Medium Priority:**

- analytics_events
- github_integration
- version_control_checks

**Low Priority:**

- mentor_availability
- analytics_aggregates
