const express = require("express");
const router = express.Router();

const {
  runEvaluation,
  getEvaluationResults,
} = require("../controllers/evaluation.controller");

// 🚀 Run evaluation
router.post("/run", runEvaluation);

// 📊 Get results by evaluationId
router.get("/:id", getEvaluationResults);

module.exports = router;