import { io, Socket } from "socket.io-client";

export interface JobStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  type: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: any;
  progress?: number;
  retryCount?: number;
  maxRetries?: number;
}

export interface EvaluationProgress {
  jobId: string;
  jobPostingId?: string;
  currentCandidate?: number;
  totalCandidates?: number;
  candidateName?: string;
  progress?: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  processingCapacity: number;
  currentlyProcessing: number;
}

export interface MLServiceStatus {
  healthy: boolean;
  message?: string;
  timestamp: string;
}

export interface Notification {
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
}

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const serverUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

    this.socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);

      if (reason === "io server disconnect") {
        // Server initiated disconnect, don't reconnect
        return;
      }

      // Auto-reconnect with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, delay);
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });
  }

  // Job subscription methods
  subscribeToJob(jobId: string, callback: (status: JobStatus) => void): void {
    if (!this.socket) return;

    this.socket.emit("subscribe-job", jobId);
    this.socket.on("job-status", callback);
  }

  unsubscribeFromJob(jobId: string): void {
    if (!this.socket) return;

    this.socket.emit("unsubscribe-job", jobId);
    this.socket.off("job-status");
  }

  // Evaluation subscription methods
  subscribeToEvaluations(
    jobPostingId: string,
    callbacks: {
      onStarted?: (data: any) => void;
      onProgress?: (progress: EvaluationProgress) => void;
      onCompleted?: (data: any) => void;
      onFailed?: (data: any) => void;
    }
  ): void {
    if (!this.socket) return;

    this.socket.emit("subscribe-evaluation", jobPostingId);

    if (callbacks.onStarted) {
      this.socket.on("evaluation-started", callbacks.onStarted);
    }
    if (callbacks.onProgress) {
      this.socket.on("evaluation-progress", callbacks.onProgress);
    }
    if (callbacks.onCompleted) {
      this.socket.on("evaluation-completed", callbacks.onCompleted);
    }
    if (callbacks.onFailed) {
      this.socket.on("evaluation-failed", callbacks.onFailed);
    }
  }

  unsubscribeFromEvaluations(jobPostingId: string): void {
    if (!this.socket) return;

    this.socket.emit("unsubscribe-evaluation", jobPostingId);
    this.socket.off("evaluation-started");
    this.socket.off("evaluation-progress");
    this.socket.off("evaluation-completed");
    this.socket.off("evaluation-failed");
  }

  // Queue stats subscription
  subscribeToQueueStats(callback: (stats: QueueStats) => void): void {
    if (!this.socket) return;

    this.socket.on("queue-stats", callback);
  }

  unsubscribeFromQueueStats(): void {
    if (!this.socket) return;

    this.socket.off("queue-stats");
  }

  // ML service status subscription
  subscribeToMLServiceStatus(
    callback: (status: MLServiceStatus) => void
  ): void {
    if (!this.socket) return;

    this.socket.on("ml-service-status", callback);
  }

  unsubscribeFromMLServiceStatus(): void {
    if (!this.socket) return;

    this.socket.off("ml-service-status");
  }

  // Notifications subscription
  subscribeToNotifications(
    callback: (notification: Notification) => void
  ): void {
    if (!this.socket) return;

    this.socket.on("notification", callback);
  }

  unsubscribeFromNotifications(): void {
    if (!this.socket) return;

    this.socket.off("notification");
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
