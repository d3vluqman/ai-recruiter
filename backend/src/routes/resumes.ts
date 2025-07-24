import { Router } from "express";
import { resumeController, upload } from "../controllers/resumeController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Public routes (for applicant portal)
router.post("/upload", upload.single("resume"), resumeController.uploadResume);

// Protected routes (for recruiters)
router.get("/", authenticateToken, resumeController.getAllResumes);
router.get(
  "/job/:jobPostingId",
  authenticateToken,
  resumeController.getResumesByJobPosting
);
router.get("/:id", authenticateToken, resumeController.getResumeById);
router.get("/:id/download", authenticateToken, resumeController.downloadResume);
router.put(
  "/:id/status",
  authenticateToken,
  resumeController.updateResumeStatus
);
router.post("/:id/process", authenticateToken, resumeController.processResume);
router.post(
  "/batch-process",
  authenticateToken,
  resumeController.batchProcessResumes
);
router.delete("/:id", authenticateToken, resumeController.deleteResume);

export default router;
