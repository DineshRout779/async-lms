const express = require("express");
const router = express.Router();

const {
  runEvaluation,
  getEvaluationResults,
  getLatestEvaluationByAssignment,
  getAvailableEvaluators,
  syncEvaluationStatus,
} = require("../controllers/evaluation.controller");
const verifyToken = require("../middlewares/verfiyToken");
const isAdminOrFacilitator = require("../middlewares/isAdminOrFacilitator");

router.use(verifyToken, isAdminOrFacilitator);

// 🚀 Run evaluation
router.post("/run", runEvaluation);

// 📋 Get available evaluators
router.get("/evaluators", getAvailableEvaluators);

// 📊 Get latest evaluation by assignment
router.get("/by-assignment/:assignmentId", getLatestEvaluationByAssignment);

// 🔄 Sync evaluation status
router.get("/sync/:id", syncEvaluationStatus);

// 📊 Get results by evaluationId
router.get("/:id", getEvaluationResults);

module.exports = router;
