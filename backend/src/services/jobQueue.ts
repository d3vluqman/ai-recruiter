import { EventEmitter } from "events";
import { logger } from "../utils/logger";

export interface Job {
  id: string;
  type: string;
  data: any;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  retryCount: number;
  maxRetries: number;
}

export interface JobQueueOptions {
  maxConcurrency: number;
  maxRetries: number;
  retryDelay: number;
}

export class JobQueue extends EventEmitter {
  private jobs: Map<string, Job> = new Map();
  private processingJobs: Set<string> = new Set();
  private options: JobQueueOptions;
  private isProcessing = false;

  constructor(options?: Partial<JobQueueOptions>) {
    super();
    this.options = {
      maxConcurrency: 5,
      maxRetries: 3,
      retryDelay: 5000,
      ...options,
    };
  }

  async addJob(
    type: string,
    data: any,
    options?: { maxRetries?: number }
  ): Promise<string> {
    const jobId = this.generateJobId();
    const job: Job = {
      id: jobId,
      type,
      data,
      status: "pending",
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: options?.maxRetries || this.options.maxRetries,
    };

    this.jobs.set(jobId, job);
    logger.info(`Job ${jobId} added to queue (type: ${type})`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    this.emit("jobAdded", job);
    return jobId;
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  getJobsByType(type: string): Job[] {
    return Array.from(this.jobs.values()).filter((job) => job.type === type);
  }

  getJobsByStatus(status: Job["status"]): Job[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.status === status
    );
  }

  async removeJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    // Don't remove jobs that are currently processing
    if (job.status === "processing") {
      return false;
    }

    this.jobs.delete(jobId);
    logger.info(`Job ${jobId} removed from queue`);
    return true;
  }

  async clearCompletedJobs(): Promise<number> {
    const completedJobs = Array.from(this.jobs.entries()).filter(
      ([_, job]) => job.status === "completed" || job.status === "failed"
    );

    for (const [jobId] of completedJobs) {
      this.jobs.delete(jobId);
    }

    logger.info(`Cleared ${completedJobs.length} completed jobs`);
    return completedJobs.length;
  }

  getQueueStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === "pending").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      processingCapacity: this.options.maxConcurrency,
      currentlyProcessing: this.processingJobs.size,
    };
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    logger.info("Job queue processing started");

    while (this.isProcessing) {
      try {
        await this.processNextJobs();

        // Wait a bit before checking for more jobs
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Stop processing if no more jobs
        const pendingJobs = this.getJobsByStatus("pending");
        if (pendingJobs.length === 0 && this.processingJobs.size === 0) {
          this.isProcessing = false;
          logger.info("Job queue processing stopped - no more jobs");
        }
      } catch (error) {
        logger.error("Error in job queue processing:", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async processNextJobs(): Promise<void> {
    const availableSlots =
      this.options.maxConcurrency - this.processingJobs.size;
    if (availableSlots <= 0) {
      return;
    }

    const pendingJobs = this.getJobsByStatus("pending")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, availableSlots);

    const processingPromises = pendingJobs.map((job) => this.processJob(job));
    await Promise.allSettled(processingPromises);
  }

  private async processJob(job: Job): Promise<void> {
    try {
      this.processingJobs.add(job.id);
      job.status = "processing";
      job.startedAt = new Date();

      logger.info(`Processing job ${job.id} (type: ${job.type})`);
      this.emit("jobStarted", job);

      // Emit job processing event for listeners to handle
      const result = await new Promise((resolve, reject) => {
        this.emit("processJob", job, resolve, reject);
      });

      job.status = "completed";
      job.completedAt = new Date();
      job.result = result;

      logger.info(`Job ${job.id} completed successfully`);
      this.emit("jobCompleted", job);
    } catch (error) {
      logger.error(`Job ${job.id} failed:`, error);

      job.retryCount++;
      if (job.retryCount < job.maxRetries) {
        job.status = "pending";
        job.error = error instanceof Error ? error.message : "Unknown error";

        logger.info(
          `Job ${job.id} will be retried (attempt ${job.retryCount + 1}/${
            job.maxRetries
          })`
        );
        this.emit("jobRetry", job);

        // Add delay before retry
        setTimeout(() => {
          // Job will be picked up in next processing cycle
        }, this.options.retryDelay);
      } else {
        job.status = "failed";
        job.completedAt = new Date();
        job.error = error instanceof Error ? error.message : "Unknown error";

        logger.error(
          `Job ${job.id} failed permanently after ${job.retryCount} retries`
        );
        this.emit("jobFailed", job);
      }
    } finally {
      this.processingJobs.delete(job.id);
    }
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  stop(): void {
    this.isProcessing = false;
    logger.info("Job queue processing stopped");
  }
}

// Singleton instance
export const jobQueue = new JobQueue();
