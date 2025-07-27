import { Router } from "express";
import { monitoringController } from "../controllers/monitoringController";
import { authenticateToken } from "../middleware/auth";
import { httpMetricsMiddleware } from "../services/metricsService";

const router = Router();

// Apply metrics middleware to all monitoring routes
router.use(httpMetricsMiddleware);

// Public health check endpoints (no authentication required)
router.get("/health", monitoringController.getSimpleHealth);
router.get("/health/detailed", monitoringController.getHealthStatus);

// Protected monitoring endpoints (require authentication)
router.use(authenticateToken);

// Metrics endpoints
router.get("/metrics", monitoringController.getMetrics);
router.get("/metrics/:type/:name", monitoringController.getMetric);

// System information
router.get("/system", monitoringController.getSystemInfo);

// Logs endpoint
router.get("/logs", monitoringController.getLogs);

// Cache management
router.delete("/cache", monitoringController.clearCache);

// Job queue status
router.get("/jobs", monitoringController.getJobQueueStatus);

export default router;
