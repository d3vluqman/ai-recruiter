import dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { testConnection } from "./config/supabase";
import { initializeWebSocketService } from "./services/websocketService";
import { healthCheckService } from "./services/healthCheckService";
import { httpMetricsMiddleware } from "./services/metricsService";

export const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
          ],
    credentials: true,
  })
);

// Request logging
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// HTTP metrics middleware (before routes)
app.use(httpMetricsMiddleware);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Import routes
import authRoutes from "./routes/auth";
import organizationRoutes from "./routes/organizations";
import jobPostingRoutes from "./routes/jobPostings";
import resumeRoutes from "./routes/resumes";
import evaluationRoutes from "./routes/evaluations";
import shortlistRoutes from "./routes/shortlists";
import monitoringRoutes from "./routes/monitoring";

// API routes
app.get("/api", (req, res) => {
  res.json({
    message: "Candidate Evaluation System API",
    version: "1.0.0",
    status: "running",
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Organization routes
app.use("/api/organizations", organizationRoutes);

// Job posting routes
app.use("/api/job-postings", jobPostingRoutes);

// Resume routes
app.use("/api/resumes", resumeRoutes);

// Evaluation routes
app.use("/api/evaluations", evaluationRoutes);

// Shortlist routes
app.use("/api/shortlists", shortlistRoutes);

// Monitoring routes
app.use("/api/monitoring", monitoringRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn("Database connection failed, but starting server anyway");
    }

    // Initialize WebSocket service
    const websocketService = initializeWebSocketService(server);
    logger.info("WebSocket service initialized");

    // Initialize monitoring services
    healthCheckService.startPeriodicHealthChecks(30000); // Every 30 seconds
    logger.info("Health check service initialized");

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(
        `Monitoring endpoints: http://localhost:${PORT}/api/monitoring/health`
      );
      logger.info(`WebSocket server ready for connections`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

startServer();
