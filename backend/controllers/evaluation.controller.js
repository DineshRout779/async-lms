const serverError = require('../utils/serverError');
const pool = require('../config/pg');
const axios = require('axios');
const { notify } = require('../services/notificationService');
const { presignS3Url } = require('../utils/s3');

const EVALUATOR_APIS = {
  JS: 'JavaScript Evaluator',
  REACT: 'React Evaluator',
  AI: 'AI / Backend Evaluator',
  VISUAL: 'Visual / DOM Evaluator',
  PYTHON: 'Python Evaluator',
  FULLSTACK: 'Fullstack Evaluator',
};

// Render free-tier services can accept the TCP connection right after waking
// but still reject the first request for a few seconds while the app finishes
// booting. A single retry after a short delay absorbs that without needing an
// even longer single timeout.
async function postToEvaluatorWithRetry(url, payload, config) {
  try {
    return await axios.post(url, payload, config);
  } catch (err) {
    const isNetworkFailure = !err.response && err.request;
    if (!isNetworkFailure) throw err;
    console.warn('Evaluator API request failed with no response, retrying once in 5s:', err.message);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return axios.post(url, payload, config);
  }
}
exports.runEvaluation = async (req, res) => {
  const client = await pool.connect();

  try {
    const { assignmentId } = req.body;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: 'Assignment ID required',
      });
    }

    await client.query('BEGIN');

    // 1. Try fetching from curriculum assignments first
    let assignmentRes = await client.query(
      `SELECT id, title, evaluator_type, test_cases, rubric, 'unit' as type
       FROM assignments
       WHERE id = $1`,
      [assignmentId],
    );

    let assignment = assignmentRes.rows[0];
    let isCollegeAssignment = false;

    // 2. If not found, try facilitator-created college assignments
    if (!assignment) {
      assignmentRes = await client.query(
        `SELECT id, title, NULL as evaluator_type, NULL as test_cases, NULL as rubric, 'college' as type
         FROM college_assignments
         WHERE id = $1`,
        [assignmentId],
      );
      assignment = assignmentRes.rows[0];
      isCollegeAssignment = true;
    }

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // 3. Get submissions from the correct table
    let submissionsRes;
    if (isCollegeAssignment) {
      submissionsRes = await client.query(
        `SELECT 
          s.id as submission_id,
          s.submission_link,
          s.student_id as user_id,
          u.full_name as student_name
         FROM college_assignment_submissions s
         JOIN users u ON s.student_id = u.id
         WHERE s.assignment_id = $1`,
        [assignmentId],
      );
    } else {
      submissionsRes = await client.query(
        `SELECT 
          s.id as submission_id,
          s.submission_link,
          s.user_id,
          u.full_name as student_name
         FROM assignment_submissions s
         JOIN users u ON s.user_id = u.id
         WHERE s.assignment_id = $1`,
        [assignmentId],
      );
    }

    const submissions = submissionsRes.rows;

    if (!submissions.length) {
      throw new Error('No submissions found to evaluate');
    }

    // Default to 'AI' if no specific evaluator is set — used for both the
    // stored record and the actual dispatch so they can never disagree.
    // Frontend can now override this using req.body.evaluatorType
    const evaluatorType =
      req.body.evaluatorType || assignment.evaluator_type || 'AI';

    //  Create evaluation
    // college assignments use a separate FK column to avoid violating assignments FK
    const evalRes = await client.query(
      isCollegeAssignment
        ? `INSERT INTO evaluations
           (college_assignment_id, evaluator_type, status, total_submissions)
           VALUES ($1, $2, 'running', $3)
           RETURNING *`
        : `INSERT INTO evaluations
           (assignment_id, evaluator_type, status, total_submissions)
           VALUES ($1, $2, 'running', $3)
           RETURNING *`,
      [assignmentId, evaluatorType, submissions.length],
    );

    const evaluation = evalRes.rows[0];

    //validation
    if (evaluatorType === 'JS' && !assignment.test_cases) {
      throw new Error('Test cases missing for JS evaluator');
    }
    if (evaluatorType === 'REACT' && !assignment.rubric) {
      throw new Error('Rubric missing for REACT evaluator');
    }

    const evaluatorUrl = `${process.env.CENTRAL_EVALUATOR_URL}/evaluate`;
    const evaluatorApiKey = process.env.CENTRAL_EVALUATOR_API_KEY;

    console.log('Evaluator service api & key: ', evaluatorUrl, evaluatorApiKey);

    let isMock = false;
    let jobIdsAndLinks = []; // { jobId, statusUrl, submissionId, studentName, studentId }

    try {
      // Filter out submissions with no link to prevent failing the entire batch
      const validSubmissions = submissions.filter((s) => !!s.submission_link);
      const invalidSubmissions = submissions.filter((s) => !s.submission_link);

      if (invalidSubmissions.length > 0) {
        console.warn(
          `Skipped ${invalidSubmissions.length} submissions due to missing repoUrl.`,
        );
        // Instantly mark them as failed in the DB
        for (const invalid of invalidSubmissions) {
          await client.query(
            `INSERT INTO evaluation_results
             (evaluation_id, submission_id, student_id, student_name, status, marks, feedback)
             VALUES ($1, $2, $3, $4, 'failed', 0, 'No repository URL provided by student.')`,
            [
              evaluation.id,
              invalid.submission_id || invalid.id,
              invalid.user_id || invalid.student_id,
              invalid.student_name,
            ],
          );
        }
      }

      if (validSubmissions.length === 0) {
        throw new Error(
          'No valid submissions with repository links found to evaluate.',
        );
      }

      // Create payloads based on evaluator type capabilities
      // visual and javascript accept arrays. backend and react accept singles.
      if (
        evaluatorType === 'JS' ||
        evaluatorType === 'VISUAL' ||
        evaluatorType === 'javascript' ||
        evaluatorType === 'visual'
      ) {
        const payloadType =
          evaluatorType === 'JS'
            ? 'javascript'
            : evaluatorType === 'VISUAL'
              ? 'visual'
              : evaluatorType;
        const payload = {
          type: payloadType,
          submissions: validSubmissions.map((s) => ({
            submissionId: s.submission_id || s.id,
            repoUrl: s.submission_link,
            studentName: s.student_name,
            studentId: s.user_id || s.student_id,
          })),
          testCases: assignment.test_cases,
          rubricText: assignment.rubric
            ? JSON.stringify(assignment.rubric)
            : 'Standard evaluation',
          expectedUrl: assignment.expected_url || 'https://example.com',
        };

        const response = await postToEvaluatorWithRetry(evaluatorUrl, payload, {
          headers: { 'x-api-key': evaluatorApiKey },
          timeout: 45000, // generous: Render free-tier evaluator service can take ~15-20s to cold-start when idle
        });

        // jobs returns an array
        const jobs = response.data.jobs || [response.data]; // fallback if it returns single job
        jobs.forEach((job, index) => {
          jobIdsAndLinks.push({
            jobId: job.jobId || job.id,
            statusUrl: job.statusUrl,
            submissionId:
              validSubmissions[index].submission_id ||
              validSubmissions[index].id,
            studentName: validSubmissions[index].student_name,
            studentId:
              validSubmissions[index].user_id ||
              validSubmissions[index].student_id,
          });
        });
      } else {
        const typeMap = {
          REACT: 'react',
          PYTHON: 'python',
          FULLSTACK: 'fullstack',
          AI: 'backend',
        };
        const payloadType =
          typeMap[evaluatorType] ||
          typeMap[evaluatorType.toUpperCase()] ||
          'backend';

        let formattedRubric;
        if (assignment.rubric && Array.isArray(assignment.rubric)) {
          formattedRubric = { criteria: assignment.rubric };
        } else if (
          assignment.rubric &&
          assignment.rubric.criteria &&
          Array.isArray(assignment.rubric.criteria)
        ) {
          formattedRubric = assignment.rubric;
        } else {
          formattedRubric = {
            criteria: [{ name: 'Standard Grading', weight: 100 }],
          };
        }
        for (const s of validSubmissions) {
          const payload = {
            type: payloadType,
            submissionId: s.submission_id || s.id,
            repoUrl: s.submission_link,
            rubric: formattedRubric,
          };

          const response = await axios.post(evaluatorUrl, payload, {
            headers: { 'x-api-key': evaluatorApiKey },
            timeout: 45000, // generous: Render free-tier evaluator service can take ~15-20s to cold-start when idle
          });

          jobIdsAndLinks.push({
            jobId: response.data.jobId || response.data.id,
            statusUrl: response.data.statusUrl,
            submissionId: s.submission_id || s.id,
            studentName: s.student_name,
            studentId: s.user_id || s.student_id,
          });
        }
      }

      console.log(`Queued ${jobIdsAndLinks.length} jobs via API`);

      // Save pending jobs in database
      for (const j of jobIdsAndLinks) {
        await client.query(
          `INSERT INTO evaluation_results
           (evaluation_id, submission_id, student_id, student_name, job_id, status, status_url)
           VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
          [
            evaluation.id,
            j.submissionId,
            j.studentId,
            j.studentName,
            j.jobId,
            j.statusUrl,
          ],
        );
      }
    } catch (apiError) {
      if (apiError.response) {
        const errorMsg =
          apiError.response.data?.error || apiError.response.statusText;
        console.error('Evaluator API rejected request:', errorMsg);
        throw new Error(`Evaluator API rejected the request: ${errorMsg}`);
      } else if (apiError.request) {
        console.error('Evaluator API unreachable:', apiError.message);
        throw new Error(
          'Central evaluators API is currently unreachable. Please ensure the evaluator service is running.',
        );
      } else {
        console.error('Evaluator API setup failed:', apiError.message);
        throw new Error(`Evaluator API failed: ${apiError.message}`);
      }
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      evaluationId: evaluation.id,
      isMock,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.log('Evaluation Error:', error);
    // Explicitly return the error message so the frontend doesn't mask it
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

exports.syncEvaluationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the evaluation summary
    const evalRes = await pool.query(
      `SELECT status, total_submissions FROM evaluations WHERE id = $1`,
      [id],
    );

    if (!evalRes.rows.length) {
      return res
        .status(404)
        .json({ success: false, message: 'Evaluation not found' });
    }

    const evaluation = evalRes.rows[0];

    // If it's already marked complete, just return
    if (evaluation.status.startsWith('completed')) {
      return res.json({
        success: true,
        progress: {
          total: evaluation.total_submissions,
          completed: evaluation.total_submissions,
          isFinished: true,
        },
      });
    }

    // Fetch all pending jobs
    const pendingJobsRes = await pool.query(
      `SELECT id, job_id, status_url, submission_id, student_id 
       FROM evaluation_results 
       WHERE evaluation_id = $1 AND status = 'pending'`,
      [id],
    );

    const pendingJobs = pendingJobsRes.rows;
    let newlyCompleted = 0;

    for (const job of pendingJobs) {
      try {
        if (!job.status_url) continue;

        const url = `${process.env.CENTRAL_EVALUATOR_URL}${job.status_url}`;
        const response = await axios.get(url, {
          headers: { 'x-api-key': process.env.CENTRAL_EVALUATOR_API_KEY },
        });

        const jobData = response.data.job || response.data;
        const jobState = jobData.status || jobData.state; // Handles different bullmq status formats

        if (jobState === 'completed' || jobState === 'failed') {
          // Extract marks and feedback (Central evaluator format can vary slightly)
          let marks = 0;
          let feedback = '';

          if (jobState === 'completed' && jobData.result) {
            const resData =
              jobData.result.results ||
              jobData.result.evaluation ||
              jobData.result.result ||
              jobData.result;
            // Handle visual evaluator returning an array
            const finalData = Array.isArray(resData) ? resData[0] : resData;

            marks = finalData?.score ?? finalData?.marks ?? 0;
            if (
              marks !== null &&
              typeof marks === 'object' &&
              marks.score !== undefined
            ) {
              marks = marks.score;
            }
            feedback =
              finalData?.feedback ||
              finalData?.rubricFeedback ||
              finalData?.error ||
              'Evaluation completed successfully.';
            // fallback if feedback is an object
            if (typeof feedback === 'object') {
              feedback = JSON.stringify(feedback);
            }
          } else if (jobState === 'failed') {
            feedback = `Evaluation Failed: ${jobData.failedReason || 'Unknown error'}`;
          }

          // Update result row
          await pool.query(
            `UPDATE evaluation_results 
             SET status = 'completed', marks = $1, feedback = $2
             WHERE id = $3`,
            [marks, feedback, job.id],
          );

          newlyCompleted++;

          // Optionally notify student
          if (job.student_id && jobState === 'completed') {
            notify({
              userId: job.student_id,
              type: 'assignment_graded',
              title: 'Assignment Graded',
              body: `Your submission has been evaluated. Score: ${marks}`,
              link: '/dashboard/student/assignments',
            });
          }
        }
      } catch (err) {
        console.error(
          `Failed to poll status for job ${job.job_id}:`,
          err.message,
        );
      }
    }

    // Check if we are totally finished now
    const completedJobsRes = await pool.query(
      `SELECT COUNT(*) FROM evaluation_results WHERE evaluation_id = $1 AND status = 'completed'`,
      [id],
    );

    const completedCount = parseInt(completedJobsRes.rows[0].count);

    if (completedCount >= evaluation.total_submissions) {
      await pool.query(
        `UPDATE evaluations SET status = 'completed' WHERE id = $1`,
        [id],
      );
    }

    return res.json({
      success: true,
      progress: {
        total: evaluation.total_submissions,
        completed: completedCount,
        isFinished: completedCount >= evaluation.total_submissions,
      },
    });
  } catch (error) {
    console.error('Sync Evaluation Error:', error);
    require('fs').writeFileSync(
      'error_log.txt',
      'Error: ' + error.message + '\nStack: ' + error.stack,
    );
    return serverError(res, error);
  }
};

exports.getLatestEvaluationByAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { rows } = await pool.query(
      `SELECT id FROM evaluations
       WHERE assignment_id = $1 OR college_assignment_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [assignmentId],
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({
          success: false,
          message: 'No evaluation found for this assignment',
        });
    }
    res.json({ success: true, evaluationId: rows[0].id });
  } catch (error) {
    serverError(res, error);
  }
};

exports.getEvaluationResults = async (req, res) => {
  try {
    const { id } = req.params;

    const evalRes = await pool.query(
      `SELECT e.*, COALESCE(a.title, c.title) as assignment_name
       FROM evaluations e
       LEFT JOIN assignments a ON e.assignment_id = a.id
       LEFT JOIN college_assignments c ON e.college_assignment_id = c.id
       WHERE e.id = $1`,
      [id],
    );

    // Facilitators only see results for students in colleges they manage,
    // matching the scoping already applied to submissions_count in the
    // evaluation-filters list (admins see everything, unscoped).
    const isFacilitator = req.user.role !== 'admin';
    const facilitatorCollegeIds = req.user.college_ids || [];
    const values = [id];
    let collegeFilter = '';
    if (isFacilitator) {
      values.push(facilitatorCollegeIds);
      collegeFilter = ' AND col.id = ANY($2)';
    }

    const resultsRes = await pool.query(
      `SELECT r.*,
              COALESCE(s.submission_link, cs.submission_link) as submission_link,
              cs.submission_file_url as submission_file_url,
              sp.expected_graduation_year,
              col.name as college_name,
              col.id as college_id
       FROM evaluation_results r
       JOIN evaluations e ON r.evaluation_id = e.id
       LEFT JOIN assignment_submissions s ON r.submission_id = s.id AND e.assignment_id IS NOT NULL
       LEFT JOIN college_assignment_submissions cs ON r.submission_id = cs.id AND e.college_assignment_id IS NOT NULL
       LEFT JOIN student_profiles sp ON r.student_id = sp.user_id
       LEFT JOIN colleges col ON sp.college_id = col.id
       WHERE r.evaluation_id = $1${collegeFilter}`,
      values,
    );

    const results = await Promise.all(
      resultsRes.rows.map(async (row) => ({
        ...row,
        submission_link: await presignS3Url(row.submission_link),
        submission_file_url: await presignS3Url(row.submission_file_url),
      })),
    );

    res.json({
      success: true,
      evaluation: evalRes.rows[0],
      results: results,
    });
  } catch (error) {
    serverError(res, error);
  }
};

exports.getAvailableEvaluators = (req, res) => {
  try {
    const evaluators = Object.keys(EVALUATOR_APIS).map((key) => ({
      id: key,
      name: EVALUATOR_APIS[key],
    }));
    res.json({ success: true, data: evaluators });
  } catch (error) {
    serverError(res, error);
  }
};
