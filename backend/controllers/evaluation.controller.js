const serverError = require('../utils/serverError');
const pool = require("../config/pg");
const axios = require("axios");
const { notify } = require('../services/notificationService');
const { presignS3Url } = require('../utils/s3');

const EVALUATOR_APIS = {
  JS: "https://js-evaluator-r80h.onrender.com/evaluate-batch-by-links",
  REACT: "https://react-evaluator.onrender.com/evaluate-batch-by-links",
  AI: "https://ai-evaluator.onrender.com/evaluate-batch-by-links",
  // PYTHON: "https://python-evaluator.onrender.com/evaluate-batch-by-links", // Placeholder
  // JAVA: "https://java-evaluator.onrender.com/evaluate-batch-by-links", // Placeholder
};
exports.runEvaluation = async (req, res) => {
  const client = await pool.connect();

  try {
    const { assignmentId } = req.body;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: "Assignment ID required",
      });
    }

    await client.query("BEGIN");

    // 1. Try fetching from curriculum assignments first
    let assignmentRes = await client.query(
      `SELECT id, title, evaluator_type, test_cases, rubric, 'unit' as type
       FROM assignments
       WHERE id = $1`,
      [assignmentId]
    );

    let assignment = assignmentRes.rows[0];
    let isCollegeAssignment = false;

    // 2. If not found, try facilitator-created college assignments
    if (!assignment) {
      assignmentRes = await client.query(
        `SELECT id, title, NULL as evaluator_type, NULL as test_cases, NULL as rubric, 'college' as type
         FROM college_assignments
         WHERE id = $1`,
        [assignmentId]
      );
      assignment = assignmentRes.rows[0];
      isCollegeAssignment = true;
    }

    if (!assignment) {
      throw new Error("Assignment not found");
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
        [assignmentId]
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
        [assignmentId]
      );
    }

    const submissions = submissionsRes.rows;

    if (!submissions.length) {
      throw new Error("No submissions found to evaluate");
    }

    // Default to 'AI' if no specific evaluator is set — used for both the
    // stored record and the actual dispatch so they can never disagree.
    const evaluatorType = assignment.evaluator_type || "AI";

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
      [
        assignmentId,
        evaluatorType,
        submissions.length,
      ]
    );

    const evaluation = evalRes.rows[0];

    //validation
    if (evaluatorType === "JS" && !assignment.test_cases) {
      throw new Error("Test cases missing for JS evaluator");
    }
    if (evaluatorType === "REACT" && !assignment.rubric) {
      throw new Error("Rubric missing for REACT evaluator");
    }

    // evaluator payload
    const getPayload = (type, submissions, assignment) => {
      const baseSubmissions = submissions.map((s) => ({
        submissionId: s.submission_id,
        student: s.student_name,
        submissionLink: s.submission_link,
      }));

      switch (type) {
        case "JS":
          return {
            submissions: baseSubmissions,
            testCases: assignment.test_cases, // ✅ JSON
          };

        case "REACT":
          return {
            submissions: baseSubmissions,
            rubric: assignment.rubric, // ✅ JSON
          };

        case "AI":
          return {
            submissions: baseSubmissions,
            assignmentTitle: assignment.title,
            rubric: assignment.rubric || "Standard grading based on correctness and code quality",
          };

        default:
          throw new Error(`Unsupported evaluator type: ${type}`);
      }
    };

    //creating a  payload
    const payload = getPayload(evaluatorType, submissions, assignment);
    console.log("this is payload", payload)

    // Call external evaluator api
    const evaluatorUrl = EVALUATOR_APIS[evaluatorType];
    console.log("Using evaluator:", evaluatorType, "at", evaluatorUrl);

    let results = [];
    let csvUrl = null;
    let isMock = false;

    try {
      // 5. Attempt Real Evaluation
      const response = await axios.post(evaluatorUrl, payload);
      results = response.data.results;
      csvUrl = response.data.csvUrl;
      console.log("Evaluation successful via API");
    } catch (apiError) {
      console.warn("Evaluator API failed or suspended. Using Mock Evaluation.", apiError.message);
      isMock = true;

      // 6. Mock Fallback (Simulates AI Evaluation for testing) — clearly flagged
      // as simulated via isMock/status so callers never mistake it for a real grade.
      results = submissions.map((s) => {
        const score = Math.floor(Math.random() * (98 - 80 + 1) + 80);
        let feedback = "";
        if (score >= 95) feedback = `Flawless submission for "${assignment.title}". Best practices were strictly followed. (Automated Simulation — evaluator service unavailable)`;
        else if (score >= 90) feedback = `Excellent submission for "${assignment.title}". The logic is sound. (Automated Simulation — evaluator service unavailable)`;
        else if (score >= 85) feedback = `Great effort on "${assignment.title}". Minor optimizations are possible. (Automated Simulation — evaluator service unavailable)`;
        else feedback = `Good attempt at "${assignment.title}". Ensure edge cases are handled correctly next time. (Automated Simulation — evaluator service unavailable)`;

        return {
          submissionId: s.submission_id,
          student: s.student_name,
          marks: score,
          feedback: feedback,
        };
      });
      csvUrl = null;
    }

    console.log("Processing results:", results.length);

    //  Save results — match by submissionId (echoed back or set by the mock
    // fallback) first, falling back to student-name match only for real
    // evaluator responses that don't echo it back.
    for (const r of results) {
      const matched =
        submissions.find((s) => s.submission_id === r.submissionId) ||
        submissions.find((s) => s.student_name === r.student);

      await client.query(
        `INSERT INTO evaluation_results
         (evaluation_id, submission_id, student_id, student_name, marks, feedback)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          evaluation.id,
          matched?.submission_id,
          matched?.user_id,
          r.student,
          r.marks,
          r.feedback,
        ]
      );
    }

    // 7️⃣ Update evaluation — status is 'completed_mock' (not 'completed') when the
    // external evaluator was unreachable, so mock runs are distinguishable at a glance.
    await client.query(
      `UPDATE evaluations
       SET status = $1,
           csv_url = $2,
           evaluated_submissions = $3
       WHERE id = $4`,
      [isMock ? 'completed_mock' : 'completed', csvUrl, results.length, evaluation.id]
    );

    await client.query("COMMIT");

    // Notify each evaluated student of their result
    for (const r of results) {
      const matched =
        submissions.find((s) => s.submission_id === r.submissionId) ||
        submissions.find((s) => s.student_name === r.student);
      if (matched?.user_id) {
        notify({
          userId: matched.user_id,
          type: 'assignment_graded',
          title: 'Assignment Graded',
          body: `Your submission has been evaluated. Score: ${r.marks}${r.feedback ? ` — ${r.feedback}` : ''}`,
          link: '/dashboard/student/assignments',
        });
      }
    }

    return res.json({
      success: true,
      evaluationId: evaluation.id,
      isMock,
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.log("Evaluation Error:", error);

    return serverError(res, error);
  } finally {
    client.release();
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
      return res.status(404).json({ success: false, message: 'No evaluation found for this assignment' });
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
      [id]
    );

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
       WHERE r.evaluation_id = $1`,
      [id]
    );

    const results = await Promise.all(
      resultsRes.rows.map(async (row) => ({
        ...row,
        submission_link: await presignS3Url(row.submission_link),
        submission_file_url: await presignS3Url(row.submission_file_url)
      }))
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
      name: `${key === 'REACT' ? 'React' : key} Evaluator`
    }));
    res.json({ success: true, data: evaluators });
  } catch (error) {
    serverError(res, error);
  }
};
