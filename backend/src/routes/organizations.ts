import { Router } from "express";
import {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
} from "../controllers/organizationController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

// All organization routes require authentication
router.use(authenticateToken);

// Organization management routes
router.post("/", requireRole(["admin", "recruiter"]), createOrganization);
router.get("/", getOrganizations);
router.get("/:id", getOrganizationById);
router.put("/:id", requireRole(["admin", "recruiter"]), updateOrganization);

export default router;
