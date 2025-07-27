import { logger } from "../utils/logger";
import { supabase } from "../config/supabase";
import { cacheService } from "./cacheService";
import { mlServiceClient } from "./mlServiceClient";
import { jobQueue } from "./jobQueue";
import { metricsService } from "./metricsService";

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  duration: number;
  details?: any;
  error?: string;
}

export interface SystemHealthStatus {
  overall: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  components: {
    database: HealthCheckResult;
    cache: HealthCheckResult;
    mlService: HealthCheckResult;
    jobQueue: HealthCheckResult;
    fileSystem: HealthCheckResult;
    memory: HealthCheckResult;
    eventLoop: HealthCheckResult;
  };
  metrics: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    activeConnections: number;
  };
}

class HealthCheckService {
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> =
    new Map();
  private lastHealthCheck: SystemHealthStatus | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.registerDefaultHealthChecks();
  }

  private registerDefaultHealthChecks() {
    // Database health check
    this.healthChecks.set("database", async () => {
      const startTime = Date.now();
      try {
        const { data, error } = await supabase
          .from("job_postings")
          .select("id")
          .limit(1);

        const duration = Date.now() - startTime;

        if (error) {
          return {
            status: "unhealthy",
            timestamp: new Date(),
            duration,
            error: error.message,
            details: { error: error.code },
          };
        }

        const status = duration > 1000 ? "degraded" : "healthy";
        return {
          status,
          timestamp: new Date(),
          duration,
          details: {
            queryTime: duration,
            connected: true,
          },
        };
      } catch (error) {
        return {
          status: "unhealthy",
          timestamp: new Date(),
          duration: Date.now() - startTime,
          error:
            error instanceof Error ? error.message : "Unknown database error",
        };
      }
    });

    // Cache health check
    this.healthChecks.set("cache", async () => {
      const startTime = Date.now();
      try {
        const testKey = "health-check-test";
        const testValue = { timestamp: Date.now() };

        // Test set operation
        const setResult = await cacheService.set(testKey, testValue, {
          ttl: 60,
        });
        if (!setResult) {
          throw new Error("Cache set operation failed");
        }

        // Test get operation
        const getValue = await cacheService.get(testKey);
        if (!getValue) {
          throw new Error("Cache get operation failed");
        }

        // Test delete operation
        await cacheService.del(testKey);

        const duration = Date.now() - startTime;
        const status = duration > 100 ? "degraded" : "healthy";

        return {
          status,
          timestamp: new Date(),
          duration,
          details: {
            connected: cacheService.isHealthy(),
            operationTime: duration,
          },
        };
      } catch (error) {
        return {
          status: "unhealthy",
          timestamp: new Date(),
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : "Unknown cache error",
          details: {
            connected: cacheService.isHealthy(),
          },
        };
      }
    });

    // ML Service health check
    this.healthChecks.set("mlService", async () => {
      const startTime = Date.now();
      try {
        const isHealthy = await mlServiceClient.healthCheck();
        const duration = Date.now() - startTime;

        const status = isHealthy
          ? duration > 2000
            ? "degraded"
            : "healthy"
          : "unhealthy";

        return {
          status,
          timestamp: new Date(),
          duration,
          details: {
            connected: isHealthy,
            responseTime: duration,
          },
        };
      } catch (error) {
        return {
          status: "unhealthy",
          timestamp: new Date(),
          duration: Date.now() - startTime,
          error:
            error instanceof Error ? error.message : "Unknown ML service error",
        };
      }
    });

    // Job Queue health check
    this.healthChecks.set("jobQueue", async () => {
      const startTime = Date.now();
      try {
        const stats = jobQueue.getQueueStats();
        const duration = Date.now() - startTime;

        // Consider degraded if too many failed jobs or queue is too large
        const failureRate = stats.total > 0 ? stats.failed / stats.total : 0;
        const isOverloaded = stats.pending > 1000;
        const hasHighFailureRate = failureRate > 0.1; // 10% failure rate

        let status: "healthy" | "degraded" | "unhealthy" = "healthy";
        if (hasHighFailureRate) {
          status = "unhealthy";
        } else if (isOverloaded) {
          status = "degraded";
        }

        return {
          status,
          timestamp: new Date(),
          duration,
          details: {
            ...stats,
            failureRate: Math.round(failureRate * 100) / 100,
            isOverloaded,
          },
        };
      } catch (error) {
        return {
          status: "unhealthy",
          timestamp: new Date(),
          duration: Date.now() - startTime,
          error:
            error instanceof Error ? error.message : "Unknown job queue error",
        };
      }
    });

    // File System health check
    this.healthChecks.set("fileSystem", async () => {
      const startTime = Date.now();
      try {
        const fs = require("fs").promises;
        const path = require("path");
        const os = require("os");

        // Check if we can write to temp directory
        const testFile = path.join(
          os.tmpdir(),
          `health-check-${Date.now()}.tmp`
        );
        const testData = "health check test";

        await fs.writeFile(testFile, testData);
        const readData = await fs.readFile(testFile, "utf8");
        await fs.unlink(testFile);

        if (readData !== testData) {
          throw new Error("File system read/write mismatch");
        }

        const duration = Date.now() - startTime;
        const status = duration > 500 ? "degraded" : "healthy";

        return {
          status,
          timestamp: new Date(),
          duration,
          details: {
            writeTime: duration,
            tempDir: os.tmpdir(),
          },
        };
      } catch (error) {
        return {
          status: "unhealthy",
          timestamp: new Date(),
          duration: Date.now() - startTime,
          error:
            error instanceof Error
              ? error.message
              : "Unknown file system error",
        };
      }
    });

    // Memory health check
    this.healthChecks.set("memory", async () => {
      const startTime = Date.now();
      try {
        const memUsage = process.memoryUsage();
        const duration = Date.now() - startTime;

        // Check memory usage thresholds
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const rssMB = memUsage.rss / 1024 / 1024;

        const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

        let status: "healthy" | "degraded" | "unhealthy" = "healthy";
        if (heapUsagePercent > 90 || rssMB > 1024) {
          // 90% heap usage or 1GB RSS
          status = "unhealthy";
        } else if (heapUsagePercent > 75 || rssMB > 512) {
          // 75% heap usage or 512MB RSS
          status = "degraded";
        }

        return {
          status,
          timestamp: new Date(),
          duration,
          details: {
            heapUsed: Math.round(heapUsedMB * 100) / 100,
            heapTotal: Math.round(heapTotalMB * 100) / 100,
            rss: Math.round(rssMB * 100) / 100,
            external: Math.round((memUsage.external / 1024 / 1024) * 100) / 100,
            heapUsagePercent: Math.round(heapUsagePercent * 100) / 100,
          },
        };
      } catch (error) {
        return {
          status: "unhealthy",
          timestamp: new Date(),
          duration: Date.now() - startTime,
          error:
            error instanceof Error ? error.message : "Unknown memory error",
        };
      }
    });

    // Event Loop health check
    this.healthChecks.set("eventLoop", async () => {
      const startTime = Date.now();
      return new Promise<HealthCheckResult>((resolve) => {
        const checkStart = process.hrtime.bigint();

        setImmediate(() => {
          const lag = Number(process.hrtime.bigint() - checkStart) / 1000000; // Convert to ms
          const duration = Date.now() - startTime;

          let status: "healthy" | "degraded" | "unhealthy" = "healthy";
          if (lag > 100) {
            // 100ms lag
            status = "unhealthy";
          } else if (lag > 50) {
            // 50ms lag
            status = "degraded";
          }

          resolve({
            status,
            timestamp: new Date(),
            duration,
            details: {
              lag: Math.round(lag * 100) / 100,
              threshold: {
                degraded: 50,
                unhealthy: 100,
              },
            },
          });
        });
      });
    });
  }

  // Run all health checks
  async runHealthChecks(): Promise<SystemHealthStatus> {
    const startTime = Date.now();
    const components: any = {};

    // Run all health checks in parallel
    const healthCheckPromises = Array.from(this.healthChecks.entries()).map(
      async ([name, check]) => {
        try {
          const result = await Promise.race([
            check(),
            new Promise<HealthCheckResult>((_, reject) =>
              setTimeout(() => reject(new Error("Health check timeout")), 10000)
            ),
          ]);
          return [name, result];
        } catch (error) {
          return [
            name,
            {
              status: "unhealthy" as const,
              timestamp: new Date(),
              duration: Date.now() - startTime,
              error:
                error instanceof Error ? error.message : "Health check failed",
            },
          ];
        }
      }
    );

    const results = await Promise.all(healthCheckPromises);
    results.forEach((result) => {
      const [name, healthResult] = result as [string, HealthCheckResult];
      components[name] = healthResult;
    });

    // Determine overall health status
    const statuses = Object.values(components).map((c: any) => c.status);
    let overall: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (statuses.includes("unhealthy")) {
      overall = "unhealthy";
    } else if (statuses.includes("degraded")) {
      overall = "degraded";
    }

    // Collect system metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    const systemHealth: SystemHealthStatus = {
      overall,
      timestamp: new Date(),
      components,
      metrics: {
        uptime,
        memoryUsage,
        cpuUsage,
        activeConnections: 0, // This would be populated by server connection tracking
      },
    };

    this.lastHealthCheck = systemHealth;

    // Record metrics
    metricsService.setGauge(
      "health.overall",
      overall === "healthy" ? 1 : overall === "degraded" ? 0.5 : 0
    );
    metricsService.recordHistogram(
      "health.check.duration",
      Date.now() - startTime
    );

    // Log health status
    if (overall !== "healthy") {
      logger.warn("System health check completed", {
        overall,
        components: Object.keys(components).filter(
          (k) => components[k].status !== "healthy"
        ),
      });
    } else {
      logger.debug("System health check completed", { overall });
    }

    return systemHealth;
  }

  // Get last health check result
  getLastHealthCheck(): SystemHealthStatus | null {
    return this.lastHealthCheck;
  }

  // Start periodic health checks
  startPeriodicHealthChecks(intervalMs: number = 30000) {
    if (this.isRunning) {
      logger.warn("Periodic health checks already running");
      return;
    }

    this.isRunning = true;
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.runHealthChecks();
      } catch (error) {
        logger.error("Periodic health check failed", error);
      }
    }, intervalMs);

    logger.info(`Periodic health checks started (interval: ${intervalMs}ms)`);
  }

  // Stop periodic health checks
  stopPeriodicHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.isRunning = false;
      logger.info("Periodic health checks stopped");
    }
  }
}

export const healthCheckService = new HealthCheckService();
