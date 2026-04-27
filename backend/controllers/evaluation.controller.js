const pool = require("../config/pg");
const axios = require("axios");
const { notify } = require('../services/notificationService');

const EVALUATOR_APIS = {
  JS: "https://js-evaluator-r80h.onrender.com/evaluate-batch-by-links",
//   REACT: "https://react-evaluator.onrender.com/evaluate-batch-by-links",
//   AI: "https://ai-evaluator.onrender.com/evaluate-batch-by-links",
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

    //  Get assignment (for evaluator + testcases)
    const assignmentRes = await client.query(
      `SELECT id, evaluator_type, test_cases, rubric
       FROM assignments
       WHERE id = $1`,
      [assignmentId]
    );

    const assignment = assignmentRes.rows[0];

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    //  Get submissions + student names
    const submissionsRes = await client.query(
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

    const submissions = submissionsRes.rows;

    if (!submissions.length) {
      throw new Error("No submissions found");
    }

    //  Create evaluation
    const evalRes = await client.query(
      `INSERT INTO evaluations 
       (assignment_id, evaluator_type, status, total_submissions)
       VALUES ($1, $2, 'running', $3)
       RETURNING *`,
      [
        assignmentId,
        assignment.evaluator_type || "JS",
        submissions.length,
      ]
    );

    const evaluation = evalRes.rows[0];
    
    const evaluatorType = assignment.evaluator_type;
    //validation
    if (evaluatorType === "JS" && !assignment.test_cases) {
      throw new Error("Test cases missing");
    }
    if (evaluatorType === "REACT" && !assignment.rubric) {
      throw new Error("Rubric missing");
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

        default:
          throw new Error(`Unsupported evaluator type: ${type}`);
      }
    };

    //creating a  payload
    const payload = getPayload(evaluatorType, submissions, assignment);
    console.log("this is payload", payload)
    
    // Call external evaluator api
    const evaluatorUrl = EVALUATOR_APIS[evaluatorType] || "JS";
    console.log("this is evaluationUrl", evaluatorUrl)

    if (!evaluatorUrl) {
      throw new Error(`No evaluator found for type: ${evaluatorType}`);
    }
    //api call
    const response = await axios.post( evaluatorUrl, payload );
    console.log("this is response", response);

    const { results, csvUrl } = response.data;
    console.log("these are results", results)

    //  Save results
    for (const r of results) {
      const matched = submissions.find(
        (s) => s.student_name === r.student
      );

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

    // 7️⃣ Update evaluation
    await client.query(
      `UPDATE evaluations
       SET status = 'completed',
           csv_url = $1,
           evaluated_submissions = $2
       WHERE id = $3`,
      [csvUrl, results.length, evaluation.id]
    );

    await client.query("COMMIT");

    // Notify each evaluated student of their result
    for (const r of results) {
      const matched = submissions.find((s) => s.student_name === r.student);
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
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.log("Evaluation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};


exports.getEvaluationResults = async (req, res) => {
  try {
    const { id } = req.params;

    const evalRes = await pool.query(
      `SELECT * FROM evaluations WHERE id = $1`,
      [id]
    );

    const resultsRes = await pool.query(
      `SELECT * FROM evaluation_results WHERE evaluation_id = $1`,
      [id]
    );

    res.json({
      success: true,
      evaluation: evalRes.rows[0],
      results: resultsRes.rows,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};