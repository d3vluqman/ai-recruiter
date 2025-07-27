import { Router } from "express";
import { shortlistController } from "../controllers/shortlistController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Shortlist management routes
router.post("/", shortlistController.createShortlist);
router.get("/job/:jobId", shortlistController.getShortlistsByJob);
router.get("/:shortlistId", shortlistController.getShortlistById);
router.get(
  "/:shortlistId/candidates",
  shortlistController.getShortlistCandidates
);
router.patch("/:shortlistId/status", shortlistController.updateShortlistStatus);
router.post(
  "/:shortlistId/candidates",
  shortlistController.addCandidateToShortlist
);
router.delete(
  "/:shortlistId/candidates/:candidateId",
  shortlistController.removeCandidateFromShortlist
);

// Email communication routes
router.post("/:shortlistId/emails", shortlistController.sendShortlistEmails);
router.get("/:shortlistId/emails", shortlistController.getEmailCommunications);

// Email template routes
router.get("/templates/all", shortlistController.getEmailTemplates);
router.get("/templates/:type", shortlistController.getEmailTemplate);
router.put("/templates/:type", shortlistController.updateEmailTemplate);

export default router;
