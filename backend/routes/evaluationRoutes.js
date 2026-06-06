const express = require("express");
const router = express.Router();

const {
  runEvaluation,
  getEvaluationResults,
  getLatestEvaluationByAssignment,
  getAvailableEvaluators,
} = require("../controllers/evaluation.controller");

// 🚀 Run evaluation
router.post("/run", runEvaluation);

// 📋 Get available evaluators
router.get("/evaluators", getAvailableEvaluators);

// 📊 Get latest evaluation by assignment
router.get("/by-assignment/:assignmentId", getLatestEvaluationByAssignment);

// 📊 Get results by evaluationId
router.get("/:id", getEvaluationResults);

module.exports = router;