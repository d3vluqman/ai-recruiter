import { Request, Response, NextFunction } from "express";
import { healthCheckService } from "../services/healthCheckService";
import { metricsService } from "../services/metricsService";
import { cacheService } from "../services/cacheService";
import { logger } from "../utils/logger";
import { jobQueue } from "../services/jobQueue";

export class MonitoringController {
  // Health check endpoint
  async getHealthStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const healthStatus = await healthCheckService.runHealthChecks();

      // Set appropriate HTTP status based on health
      let httpStatus = 200;
      if (healthStatus.overall === "degraded") {
        httpStatus = 200; // Still operational
      } else if (healthStatus.overall === "unhealthy") {
        httpStatus = 503; // Service unavailable
      }

      res.status(httpStatus).json({
        success: healthStatus.overall !== "unhealthy",
        status: healthStatus.overall,
        timestamp: healthStatus.timestamp,
        components: healthStatus.components,
        metrics: healthStatus.metrics,
      });
    } catch (error) {
      logger.error("Health check endpoint error", error);
      res.status(500).json({
        success: false,
        status: "unhealthy",
        error: "Health check failed",
        timestamp: new Date(),
      });
    }
  }

  // Simple health check for load balancers
  async getSimpleHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const lastHealthCheck = healthCheckService.getLastHealthCheck();

      if (!lastHealthCheck) {
        // Run a quick health check if none exists
        const healthStatus = await healthCheckService.runHealthChecks();
        const httpStatus = healthStatus.overall === "unhealthy" ? 503 : 200;
        return res.status(httpStatus).json({ status: healthStatus.overall });
      }

      // Check if last health check is recent (within 2 minutes)
      const isRecent =
        Date.now() - lastHealthCheck.timestamp.getTime() < 2 * 60 * 1000;

      if (!isRecent) {
        // Health check is stale, run a new one
        const healthStatus = await healthCheckService.runHealthChecks();
        const httpStatus = healthStatus.overall === "unhealthy" ? 503 : 200;
        return res.status(httpStatus).json({ status: healthStatus.overall });
      }

      const httpStatus = lastHealthCheck.overall === "unhealthy" ? 503 : 200;
      res.status(httpStatus).json({ status: lastHealthCheck.overall });
    } catch (error) {
      logger.error("Simple health check error", error);
      res.status(503).json({ status: "unhealthy" });
    }
  }

  // Get application metrics
  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = metricsService.getAllMetrics();
      const cacheStats = await cacheService.getStats();
      const queueStats = jobQueue.getQueueStats();

      res.json({
        success: true,
        timestamp: new Date(),
        metrics: {
          application: metrics,
          cache: cacheStats,
          jobQueue: queueStats,
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            version: process.version,
            platform: process.platform,
            arch: process.arch,
          },
        },
      });
    } catch (error) {
      logger.error("Metrics endpoint error", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve metrics",
        timestamp: new Date(),
      });
    }
  }

  // Get specific metric
  async getMetric(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, name } = req.params;
      const tags = req.query.tags
        ? JSON.parse(req.query.tags as string)
        : undefined;

      let result: any = null;

      // For now, just return a simple response since we don't have individual metric getters
      // In a full implementation, you'd add methods to metricsService to get individual metrics

      res.json({
        success: true,
        type,
        name,
        tags,
        value: result,
        message: "Individual metric retrieval not implemented yet",
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Get metric endpoint error", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve metric",
        timestamp: new Date(),
      });
    }
  }

  // Get system information
  async getSystemInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const os = require("os");
      const packageJson = require("../../package.json");

      const systemInfo = {
        application: {
          name: packageJson.name || "candidate-evaluation-system",
          version: packageJson.version || "1.0.0",
          description:
            packageJson.description || "AI-powered candidate evaluation system",
          uptime: process.uptime(),
          startTime: new Date(Date.now() - process.uptime() * 1000),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || "development",
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
          cpus: os.cpus().length,
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          loadAverage: os.loadavg(),
          uptime: os.uptime(),
        },
        process: {
          pid: process.pid,
          ppid: process.ppid,
          uid: process.getuid ? process.getuid() : null,
          gid: process.getgid ? process.getgid() : null,
          cwd: process.cwd(),
          execPath: process.execPath,
          argv: process.argv,
        },
      };

      res.json({
        success: true,
        timestamp: new Date(),
        ...systemInfo,
      });
    } catch (error) {
      logger.error("System info endpoint error", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve system information",
        timestamp: new Date(),
      });
    }
  }

  // Get logs (with pagination and filtering)
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const level = (req.query.level as string) || "info";
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const offset = parseInt(req.query.offset as string) || 0;
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : null;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : null;

      // This is a simplified implementation
      // In a production system, you'd want to use a proper log aggregation service
      const fs = require("fs").promises;
      const path = require("path");

      const logFile = path.join(process.cwd(), "logs", "app.log");

      try {
        const logContent = await fs.readFile(logFile, "utf8");
        const logLines = logContent
          .split("\n")
          .filter((line: string) => line.trim());

        // Parse and filter logs
        let logs = logLines
          .map((line: string) => {
            try {
              // Simple log parsing - in production you'd want more sophisticated parsing
              const match = line.match(/\[(.*?)\] (.*?): (.*)/);
              if (match) {
                return {
                  timestamp: match[1],
                  level: match[2],
                  message: match[3],
                };
              }
              return null;
            } catch {
              return null;
            }
          })
          .filter((log: any) => log !== null)
          .reverse(); // Most recent first

        // Apply filters
        if (level !== "debug") {
          const levelPriority: Record<string, number> = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
          };
          const targetPriority = levelPriority[level] || 2;
          logs = logs.filter(
            (log: any) =>
              (levelPriority[log.level.toLowerCase()] || 3) <= targetPriority
          );
        }

        if (startDate) {
          logs = logs.filter(
            (log: any) => new Date(log.timestamp) >= startDate
          );
        }

        if (endDate) {
          logs = logs.filter((log: any) => new Date(log.timestamp) <= endDate);
        }

        // Apply pagination
        const total = logs.length;
        const paginatedLogs = logs.slice(offset, offset + limit);

        res.json({
          success: true,
          logs: paginatedLogs,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
          filters: {
            level,
            startDate,
            endDate,
          },
          timestamp: new Date(),
        });
      } catch (fileError) {
        res.json({
          success: true,
          logs: [],
          pagination: { total: 0, limit, offset, hasMore: false },
          message: "Log file not found or empty",
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error("Get logs endpoint error", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve logs",
        timestamp: new Date(),
      });
    }
  }

  // Clear cache (admin operation)
  async clearCache(req: Request, res: Response, next: NextFunction) {
    try {
      const pattern = req.query.pattern as string;

      let clearedCount = 0;
      if (pattern) {
        clearedCount = await cacheService.invalidatePattern(pattern);
      } else {
        const success = await cacheService.flush();
        clearedCount = success ? -1 : 0; // -1 indicates full flush
      }

      logger.info("Cache cleared", {
        pattern,
        clearedCount,
        userId: (req as any).user?.userId,
      });

      res.json({
        success: true,
        message: pattern
          ? `Cleared ${clearedCount} cache entries matching pattern`
          : "Cache flushed completely",
        clearedCount,
        pattern,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Clear cache endpoint error", error);
      res.status(500).json({
        success: false,
        error: "Failed to clear cache",
        timestamp: new Date(),
      });
    }
  }

  // Get job queue status
  async getJobQueueStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = jobQueue.getQueueStats();
      const recentJobs = jobQueue
        .getJobsByStatus("processing")
        .concat(jobQueue.getJobsByStatus("failed"))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10);

      res.json({
        success: true,
        stats,
        recentJobs: recentJobs.map((job) => ({
          id: job.id,
          type: job.type,
          status: job.status,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          error: job.error,
          retryCount: job.retryCount,
        })),
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Job queue status endpoint error", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve job queue status",
        timestamp: new Date(),
      });
    }
  }
}

export const monitoringController = new MonitoringController();
