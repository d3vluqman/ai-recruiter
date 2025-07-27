import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { logger } from "../utils/logger";
import { jobQueue } from "./jobQueue";

export class WebSocketService {
  private io: SocketIOServer;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? process.env.FRONTEND_URL
            : [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
              ],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupEventHandlers();
    this.setupJobQueueListeners();
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join job-specific rooms for updates
      socket.on("subscribe-job", (jobId: string) => {
        socket.join(`job-${jobId}`);
        logger.info(`Client ${socket.id} subscribed to job ${jobId}`);
      });

      // Leave job-specific rooms
      socket.on("unsubscribe-job", (jobId: string) => {
        socket.leave(`job-${jobId}`);
        logger.info(`Client ${socket.id} unsubscribed from job ${jobId}`);
      });

      // Join evaluation-specific rooms
      socket.on("subscribe-evaluation", (jobPostingId: string) => {
        socket.join(`evaluation-${jobPostingId}`);
        logger.info(
          `Client ${socket.id} subscribed to evaluations for job ${jobPostingId}`
        );
      });

      // Leave evaluation-specific rooms
      socket.on("unsubscribe-evaluation", (jobPostingId: string) => {
        socket.leave(`evaluation-${jobPostingId}`);
        logger.info(
          `Client ${socket.id} unsubscribed from evaluations for job ${jobPostingId}`
        );
      });

      // Send current queue stats on connection
      socket.emit("queue-stats", jobQueue.getQueueStats());

      socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private setupJobQueueListeners(): void {
    // Job added to queue
    jobQueue.on("jobAdded", (job) => {
      this.io.to(`job-${job.id}`).emit("job-status", {
        jobId: job.id,
        status: job.status,
        type: job.type,
        createdAt: job.createdAt,
      });

      // Broadcast queue stats update
      this.io.emit("queue-stats", jobQueue.getQueueStats());
    });

    // Job started processing
    jobQueue.on("jobStarted", (job) => {
      this.io.to(`job-${job.id}`).emit("job-status", {
        jobId: job.id,
        status: job.status,
        type: job.type,
        startedAt: job.startedAt,
        progress: 0,
      });

      // If it's an evaluation job, notify evaluation subscribers
      if (job.type === "single_evaluation" || job.type === "batch_evaluation") {
        const jobPostingId = job.data.jobPostingId;
        this.io.to(`evaluation-${jobPostingId}`).emit("evaluation-started", {
          jobId: job.id,
          jobPostingId,
          type: job.type,
        });
      }

      this.io.emit("queue-stats", jobQueue.getQueueStats());
    });

    // Job completed successfully
    jobQueue.on("jobCompleted", (job) => {
      this.io.to(`job-${job.id}`).emit("job-status", {
        jobId: job.id,
        status: job.status,
        type: job.type,
        completedAt: job.completedAt,
        result: job.result,
        progress: 100,
      });

      // If it's an evaluation job, notify evaluation subscribers
      if (job.type === "single_evaluation" || job.type === "batch_evaluation") {
        const jobPostingId = job.data.jobPostingId;
        this.io.to(`evaluation-${jobPostingId}`).emit("evaluation-completed", {
          jobId: job.id,
          jobPostingId,
          type: job.type,
          result: job.result,
        });
      }

      this.io.emit("queue-stats", jobQueue.getQueueStats());
    });

    // Job failed
    jobQueue.on("jobFailed", (job) => {
      this.io.to(`job-${job.id}`).emit("job-status", {
        jobId: job.id,
        status: job.status,
        type: job.type,
        completedAt: job.completedAt,
        error: job.error,
        retryCount: job.retryCount,
      });

      // If it's an evaluation job, notify evaluation subscribers
      if (job.type === "single_evaluation" || job.type === "batch_evaluation") {
        const jobPostingId = job.data.jobPostingId;
        this.io.to(`evaluation-${jobPostingId}`).emit("evaluation-failed", {
          jobId: job.id,
          jobPostingId,
          type: job.type,
          error: job.error,
        });
      }

      this.io.emit("queue-stats", jobQueue.getQueueStats());
    });

    // Job retry
    jobQueue.on("jobRetry", (job) => {
      this.io.to(`job-${job.id}`).emit("job-status", {
        jobId: job.id,
        status: job.status,
        type: job.type,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
      });

      this.io.emit("queue-stats", jobQueue.getQueueStats());
    });
  }

  // Method to send custom evaluation progress updates
  sendEvaluationProgress(
    jobId: string,
    jobPostingId: string,
    progress: {
      currentCandidate?: number;
      totalCandidates?: number;
      candidateName?: string;
      progress?: number;
    }
  ): void {
    this.io.to(`job-${jobId}`).emit("evaluation-progress", {
      jobId,
      ...progress,
    });

    this.io.to(`evaluation-${jobPostingId}`).emit("evaluation-progress", {
      jobId,
      jobPostingId,
      ...progress,
    });
  }

  // Method to send ML service status updates
  sendMLServiceStatus(status: { healthy: boolean; message?: string }): void {
    this.io.emit("ml-service-status", {
      ...status,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to send upload progress updates
  sendUploadProgress(progress: {
    uploadId: string;
    filename: string;
    totalSize: number;
    uploadedSize: number;
    progress: number;
    status: "uploading" | "completed" | "failed";
    error?: string;
  }): void {
    this.io.to(`upload-${progress.uploadId}`).emit("upload-progress", {
      ...progress,
      timestamp: new Date().toISOString(),
    });

    // Also broadcast to general upload listeners
    this.io.emit("upload-status", {
      ...progress,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to send general notifications
  sendNotification(
    userId: string,
    notification: {
      type: "info" | "success" | "warning" | "error";
      title: string;
      message: string;
    }
  ): void {
    this.io.to(`user-${userId}`).emit("notification", {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  // Get room information
  getRoomInfo(roomName: string): number {
    const room = this.io.sockets.adapter.rooms.get(roomName);
    return room ? room.size : 0;
  }
}

let websocketService: WebSocketService;

export const initializeWebSocketService = (
  server: HTTPServer
): WebSocketService => {
  websocketService = new WebSocketService(server);
  return websocketService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!websocketService) {
    throw new Error("WebSocket service not initialized");
  }
  return websocketService;
};
