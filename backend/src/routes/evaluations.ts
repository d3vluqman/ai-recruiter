import { Router } from "express";
import { evaluationController } from "../controllers/evaluationController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create evaluation
router.post("/", evaluationController.createEvaluation);

// Get evaluation by ID
router.get("/:id", evaluationController.getEvaluation);

// Get evaluations by job posting
router.get(
  "/job/:jobPostingId",
  evaluationController.getEvaluationsByJobPosting
);

// Get candidates with evaluations by job posting
router.get(
  "/job/:jobPostingId/candidates",
  evaluationController.getCandidatesWithEvaluations
);

// Get evaluation by resume and job posting
router.get(
  "/resume/:resumeId/job/:jobPostingId",
  evaluationController.getEvaluationByResumeAndJob
);

// Batch evaluate candidates
router.post("/batch", evaluationController.batchEvaluate);

// Async evaluation endpoints
router.post("/async", evaluationController.createEvaluationAsync);
router.post("/batch/async", evaluationController.batchEvaluateAsync);
router.get("/jobs/:jobId/status", evaluationController.getJobStatus);

// ML service health check
router.get("/ml-service/health", evaluationController.checkMLServiceHealth);

// Trigger evaluation for a specific resume
router.post(
  "/resume/:resumeId/evaluate",
  evaluationController.triggerEvaluationForResume
);

// Delete evaluation
router.delete("/:id", evaluationController.deleteEvaluation);

export default router;
