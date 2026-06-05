const serverError = require('../utils/serverError');
const pool = require("../config/pg");

exports.getAnalytics = async (req, res) => {
  try {
    const { college, domain, batch } = req.query;

    let filters = [];
    let values = [];
    let idx = 1;

    if (college) {
      filters.push(`s.college_id = $${idx++}`);
      values.push(college);
    }

    if (batch) {
      filters.push(`s.batch_id = $${idx++}`);
      values.push(batch);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // 1. PERFORMANCE TREND (by assignment)
    const trendQuery = `
      SELECT ca.title,
            AVG(er.marks) as avg_marks
      FROM evaluation_results er
      JOIN assignment_submissions sub ON sub.id = er.submission_id
      JOIN college_assignments ca ON ca.id = sub.assignment_id
      JOIN student_profiles s ON s.user_id = er.student_id
      ${whereClause}
      GROUP BY ca.title
      ORDER BY ca.title;
    `;

    // 2. COMPLETION
    const completionQuery = `
      SELECT 
  ca.title,
  COUNT(sub.id) as completed,
  COUNT(*) - COUNT(sub.id) as pending
FROM college_assignments ca
LEFT JOIN assignment_submissions sub 
  ON sub.assignment_id = ca.id
GROUP BY ca.title;
    `;

    // 3. DOMAIN PERFORMANCE (using course as domain)
    const domainQuery = `
      SELECT ca.course as domain, AVG(er.marks) as avg_marks
      FROM evaluation_results er
      JOIN assignment_submissions sub ON sub.id = er.submission_id
      JOIN college_assignments ca ON ca.id = sub.assignment_id
      JOIN student_profiles s ON s.user_id = er.student_id
      ${whereClause}
      GROUP BY ca.course;
    `;

    const batchDomainQuery = `
SELECT 
  c.name as batch,
  ca.course as domain,
  AVG(er.marks) as avg_marks
FROM evaluation_results er
JOIN assignment_submissions sub ON sub.id = er.submission_id
JOIN college_assignments ca ON ca.id = sub.assignment_id
JOIN student_profiles s ON s.user_id = er.student_id
JOIN colleges c ON c.id = s.college_id
GROUP BY c.name, ca.course
ORDER BY c.name;
`;

const growthQuery = `
SELECT 
  c.name as batch,
  DATE_TRUNC('month', er.created_at) as month,
  AVG(er.marks) as avg_marks
FROM evaluation_results er
JOIN student_profiles s ON s.user_id = er.student_id
JOIN colleges c ON c.id = s.college_id
GROUP BY c.name, month
ORDER BY month;
`;

    // 4. SCORE DISTRIBUTION
    const scoreDistQuery = `
      SELECT
        COUNT(*) FILTER (WHERE marks BETWEEN 0 AND 20) as "0-20",
        COUNT(*) FILTER (WHERE marks BETWEEN 21 AND 40) as "21-40",
        COUNT(*) FILTER (WHERE marks BETWEEN 41 AND 60) as "41-60",
        COUNT(*) FILTER (WHERE marks BETWEEN 61 AND 80) as "61-80",
        COUNT(*) FILTER (WHERE marks BETWEEN 81 AND 100) as "81-100"
      FROM evaluation_results er
      JOIN student_profiles s ON s.user_id = er.student_id
      ${whereClause};
    `;

    const [trend, completion, domainPerf, scoreDist, batchDomain, growth] = await Promise.all([
      pool.query(trendQuery, values),
      pool.query(completionQuery),
      pool.query(domainQuery, values),
      pool.query(scoreDistQuery, values),
      pool.query(batchDomainQuery),
      pool.query(growthQuery),
    ]);

    res.json({
      success: true,
      data: {
        trend: trend.rows,
        completion: completion.rows,
        domainPerformance: domainPerf.rows,
        scoreDistribution: scoreDist.rows[0],
        batchDomainComparison: batchDomain.rows,
        batchGrowth: growth.rows,
      },
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    serverError(res, err);
  }
};