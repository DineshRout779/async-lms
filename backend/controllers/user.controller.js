const pool = require('../config/pg');
const bcrypt = require('bcrypt');
const { logAction } = require('../utils/auditLogger');
const { calculateSubjectProgress } = require('../utils/progress');

// @desc    Get subjects for a specific student
exports.getUserSubjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        s.id, 
        s.name, 
        s.slug, 
        s.description, 
        s.level, 
        -- Count total subtopics for this subject
        (SELECT COUNT(st.id) 
         FROM public.subtopics st 
         JOIN public.units u ON st.unit_id = u.id
         JOIN public.topics t ON u.topic_id = t.id 
         WHERE t.subject_id = s.id) as total_lessons,
        -- Calculate progress using user_subtopic_progress table 
        COALESCE(
          (SELECT (COUNT(usp.id)::float / NULLIF((
            SELECT COUNT(st2.id) 
            FROM public.subtopics st2 
            JOIN public.units u2 ON st2.unit_id = u2.id
            JOIN public.topics t2 ON u2.topic_id = t2.id 
            WHERE t2.subject_id = s.id
          ), 0) * 100)
           FROM public.user_subtopic_progress usp
           JOIN public.subtopics st3 ON usp.subtopic_id = st3.id
           JOIN public.units u3 ON st3.unit_id = u3.id
           JOIN public.topics t3 ON u3.topic_id = t3.id
           WHERE usp.user_id = $1 
             AND t3.subject_id = s.id 
             AND usp.is_completed = true -- Using the boolean from your schema 
          ), 0
        ) as progress_percent
      FROM public.subjects s
      INNER JOIN public.user_subjects us ON s.id = us.subject_id 
      WHERE us.user_id = $1 AND s.is_published = true AND s.is_deleted = false
      ORDER BY us.started_at DESC;
    `;

    const { rows } = await pool.query(query, [userId]);
    const enrichedRows = await Promise.all(
      rows.map(async (row) => {
        const { percent } = await calculateSubjectProgress(userId, row.id);
        return {
          ...row,
          progress_percent: percent,
        };
      })
    );
    res.json({ success: true, data: enrichedRows });
  } catch (err) {
    console.error('Error fetching student subjects:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get authenticated user's profile (all roles)
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
         u.id, u.full_name, u.email, LOWER(r.role_key) AS role, u.created_at,
         sp.degree, sp.year, sp.current_academic_year,
         COALESCE(c.id, fc_c.id) AS college_id,
         COALESCE(c.name, fc_c.name) AS college_name,
         COALESCE((SELECT SUM(points) FROM public.points_log WHERE user_id = u.id), 0)::integer AS total_points,
         COALESCE(us.current_streak, 0) AS current_streak,
         COALESCE(us.longest_streak, 0) AS longest_streak,
         (SELECT COUNT(*) FROM public.user_badges WHERE user_id = u.id)::integer AS badge_count
       FROM public.users u
       LEFT JOIN public.roles r ON r.id = u.role_id
       LEFT JOIN public.student_profiles sp ON sp.user_id = u.id
       LEFT JOIN public.colleges c ON c.id = sp.college_id
       LEFT JOIN public.facilitator_colleges fc ON fc.facilitator_id = u.id
       LEFT JOIN public.colleges fc_c ON fc_c.id = fc.college_id
       LEFT JOIN public.user_streaks us ON us.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id, u.full_name, u.email, r.role_key, u.created_at,
         sp.degree, sp.year, sp.current_academic_year, c.id, c.name, fc_c.id, fc_c.name,
         us.current_streak, us.longest_streak`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('getUserProfile error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get authenticated user's earned badges
exports.getUserBadges = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT b.id, b.title AS name, b.description, ub.earned_at AS awarded_at
       FROM public.user_badges ub
       JOIN public.badges b ON b.id = ub.badge_id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [userId],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getUserBadges error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get recent points activity for the authenticated user
exports.getUserActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const result = await pool.query(
      `SELECT source, points, created_at, COUNT(*) OVER ()::integer as total_count
       FROM public.points_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset],
    );

    const totalCount = result.rows[0]?.total_count ?? 0;
    const data = result.rows.map(({ total_count, ...row }) => row);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      },
    });
  } catch (err) {
    console.error('getUserActivity error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Change authenticated user's password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Both current and new password are required',
        });
    }

    if (new_password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'New password must be at least 6 characters',
        });
    }

    const { rows } = await pool.query(
      `SELECT password_hash FROM public.users WHERE id = $1`,
      [userId],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) {
      return res
        .status(400)
        .json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query(
      `UPDATE public.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newHash, userId],
    );

    logAction({ req, action: 'UPDATE', entityType: 'user', entityId: userId, details: { field: 'password' } });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('changePassword error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all users (Admin only) - Enhanced with College Name
exports.getAllUsers = async (req, res) => {
  try {
    const query = `
      SELECT
        u.id,
        u.full_name,
        u.email,
        LOWER(r.role_key) AS role,
        u.is_verified,
        sp.degree,
        sp.year,
        sp.college_id,
        u.created_at,
        c.name as college_name,
        c.short_code as college_short_name,
        COALESCE(student_meta.enrolled_courses, 0) as enrolled_courses,
        COALESCE(student_meta.completed_subtopics, 0) as completed_subtopics,
        COALESCE(student_meta.total_subtopics, 0) as total_subtopics,
        CASE
          WHEN COALESCE(student_meta.total_subtopics, 0) = 0 THEN 0
          ELSE ROUND(
            (student_meta.completed_subtopics::numeric / student_meta.total_subtopics) * 100
          )::int
        END as progress_percent,
        COALESCE(facilitator_meta.college_ids, '{}'::uuid[]) as facilitator_college_ids,
        COALESCE(facilitator_meta.college_names, '{}'::text[]) as facilitator_college_names
      FROM public.users u
      LEFT JOIN public.roles r ON r.id = u.role_id
      LEFT JOIN public.student_profiles sp ON u.id = sp.user_id
      LEFT JOIN public.colleges c ON sp.college_id = c.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT us.subject_id)::int as enrolled_courses,
          COUNT(DISTINCT st.id) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM public.user_lesson_progress ulp
              INNER JOIN public.lesson_content lc ON lc.id = ulp.lesson_content_id
              WHERE ulp.user_id = u.id
                AND lc.subtopic_id = st.id
                AND ulp.is_completed = true
                AND lc.is_deleted = false
            )
          )::int as completed_subtopics,
          COUNT(DISTINCT st.id)::int as total_subtopics
        FROM public.user_subjects us
        LEFT JOIN public.topics t ON t.subject_id = us.subject_id AND t.is_deleted = false
        LEFT JOIN public.units un ON un.topic_id = t.id AND un.is_deleted = false
        LEFT JOIN public.subtopics st ON st.unit_id = un.id AND st.is_deleted = false
        WHERE us.user_id = u.id
      ) as student_meta ON r.role_key = 'STUDENT'
      LEFT JOIN LATERAL (
        SELECT
          ARRAY_AGG(fc.college_id ORDER BY c2.name) as college_ids,
          ARRAY_AGG(c2.name ORDER BY c2.name) as college_names
        FROM public.facilitator_colleges fc
        INNER JOIN public.colleges c2 ON c2.id = fc.college_id
        WHERE fc.facilitator_id = u.id
      ) as facilitator_meta ON r.role_key = 'FACILITATOR'
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT 1000
    `;
    const result = await pool.query(query);
    const enrichedRows = await Promise.all(
      result.rows.map(async (row) => {
        if (row.role !== 'student') {
          return row;
        }
        const enrolledRes = await pool.query(
          'SELECT subject_id FROM user_subjects WHERE user_id = $1',
          [row.id]
        );
        if (enrolledRes.rows.length === 0) {
          return { ...row, completed_subtopics: 0, total_subtopics: 0, progress_percent: 0 };
        }
        let totalItems = 0;
        let completedItems = 0;
        for (const s of enrolledRes.rows) {
          const { total, completed } = await calculateSubjectProgress(row.id, s.subject_id);
          totalItems += total;
          completedItems += completed;
        }
        const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        return {
          ...row,
          completed_subtopics: completedItems,
          total_subtopics: totalItems,
          progress_percent: percent,
        };
      })
    );
    res.json(enrichedRows);
  } catch (err) {
    console.error('Get All Users Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single user by ID (Admin only)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params; // Must be a valid UUID string
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, LOWER(r.role_key) AS role, u.is_verified, u.onboarding_step, u.created_at,
              sp.college_id, sp.degree, sp.year,
              c.name as college_name
       FROM public.users u
       LEFT JOIN public.roles r ON r.id = u.role_id
       LEFT JOIN public.student_profiles sp ON u.id = sp.user_id
       LEFT JOIN public.colleges c ON sp.college_id = c.id
       WHERE u.id = $1`,
      [id],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get User Error:', err.message);
    res
      .status(500)
      .json({ message: 'Server error (check if ID is valid UUID)' });
  }
};

// @desc    Update user profile details (Admin only)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, degree, year, college_id } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update User (Identity)
      const userUpdateQuery = `
        WITH updated AS (
          UPDATE public.users
          SET full_name = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, full_name, email, role_id, updated_at
        )
        SELECT updated.id, updated.full_name, updated.email,
               LOWER(r.role_key) AS role, updated.updated_at
        FROM updated
        LEFT JOIN public.roles r ON r.id = updated.role_id
      `;
      const userResult = await client.query(userUpdateQuery, [full_name, id]);

      if (userResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }

      const user = userResult.rows[0];

      // 2. Update Student Profile if applicable
      if (user.role === 'student') {
        const profileUpdateQuery = `
          INSERT INTO public.student_profiles (user_id, degree, year, college_id)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id) DO UPDATE
          SET degree = COALESCE(EXCLUDED.degree, public.student_profiles.degree),
              year = COALESCE(EXCLUDED.year, public.student_profiles.year),
              college_id = COALESCE(EXCLUDED.college_id, public.student_profiles.college_id)
        `;
        await client.query(profileUpdateQuery, [
          id,
          degree || null,
          year || null,
          college_id || null,
        ]);
      }

      await client.query('COMMIT');
      logAction({ req, action: 'UPDATE', entityType: 'user', entityId: id, details: { full_name, degree, year, college_id } });
      res.json(user);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Update User Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change user role (Admin only)
exports.changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const roleRes = await pool.query(
      'SELECT id FROM public.roles WHERE role_key = $1',
      [(role || '').toUpperCase()],
    );

    if (!roleRes.rowCount) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const result = await pool.query(
      `UPDATE public.users
       SET role_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, updated_at`,
      [roleRes.rows[0].id, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    logAction({ req, action: 'UPDATE', entityType: 'user', entityId: id, details: { new_role: role } });
    res.json({
      message: 'Role updated successfully',
      user: { ...result.rows[0], role: (role || '').toLowerCase() },
    });
  } catch (err) {
    console.error('Change Role Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * SOFT DELETE USER (Move to Recycle Bin)
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
        
    const result = await pool.query(
      `UPDATE users SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2 RETURNING id`,
      [adminId, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ success: true, message: 'User moved to recycle bin' });
  } catch (err) {
    console.error('Delete User Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * RESTORE USER
 */
exports.restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
        
    const result = await pool.query(
      `UPDATE users SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found in recycle bin' });
    }
    res.json({ success: true, message: 'User restored successfully' });
  } catch (err) {
    console.error('Restore User Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PERMANENT DELETE USER
 */
exports.permanentDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
        
    // Ensure user is actually in the bin before hard deleting
    const check = await pool.query(`SELECT id FROM users WHERE id = $1 AND deleted_at IS NOT NULL`, [id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ message: 'User must be in recycle bin to be permanently deleted' });
    }
    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ success: true, message: 'User permanently deleted' });
  } catch (err) {
    console.error('Permanent Delete Error:', err.message);
    res.status(500).json({ message: 'Server error. This user may have active dependencies.' });
  }
};

/**
 * GET RECYCLE BIN (Admin)
 */
exports.getRecycleBin = async (req, res) => {
  try {
    // Admin sees all deleted users
    const query = `
      SELECT u.id, u.full_name, u.email, r.role_key as role, u.deleted_at, db.full_name AS deleted_by_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN users db ON db.id = u.deleted_by
      WHERE u.deleted_at IS NOT NULL
      ORDER BY u.deleted_at DESC
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Get Bin Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
