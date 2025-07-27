import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { logger } from "../utils/logger";
import { getWebSocketService } from "../services/websocketService";

export interface UploadProgress {
  uploadId: string;
  filename: string;
  totalSize: number;
  uploadedSize: number;
  progress: number;
  status: "uploading" | "completed" | "failed";
  startTime: Date;
  endTime?: Date;
  error?: string;
}

class UploadProgressTracker {
  private uploads: Map<string, UploadProgress> = new Map();

  generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  startUpload(uploadId: string, filename: string, totalSize: number): void {
    const progress: UploadProgress = {
      uploadId,
      filename,
      totalSize,
      uploadedSize: 0,
      progress: 0,
      status: "uploading",
      startTime: new Date(),
    };

    this.uploads.set(uploadId, progress);
    this.broadcastProgress(progress);
  }

  updateProgress(uploadId: string, uploadedSize: number): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    upload.uploadedSize = uploadedSize;
    upload.progress = Math.round((uploadedSize / upload.totalSize) * 100);

    this.uploads.set(uploadId, upload);
    this.broadcastProgress(upload);
  }

  completeUpload(uploadId: string): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    upload.status = "completed";
    upload.progress = 100;
    upload.endTime = new Date();

    this.uploads.set(uploadId, upload);
    this.broadcastProgress(upload);

    // Clean up after 5 minutes
    setTimeout(() => {
      this.uploads.delete(uploadId);
    }, 5 * 60 * 1000);
  }

  failUpload(uploadId: string, error: string): void {
    const upload = this.uploads.get(uploadId);
    if (!upload) return;

    upload.status = "failed";
    upload.error = error;
    upload.endTime = new Date();

    this.uploads.set(uploadId, upload);
    this.broadcastProgress(upload);

    // Clean up after 5 minutes
    setTimeout(() => {
      this.uploads.delete(uploadId);
    }, 5 * 60 * 1000);
  }

  getUpload(uploadId: string): UploadProgress | undefined {
    return this.uploads.get(uploadId);
  }

  getAllUploads(): UploadProgress[] {
    return Array.from(this.uploads.values());
  }

  private broadcastProgress(progress: UploadProgress): void {
    try {
      const websocketService = getWebSocketService();
      websocketService.sendUploadProgress(progress);
    } catch (error) {
      logger.error("Failed to broadcast upload progress:", error);
    }
  }
}

export const uploadProgressTracker = new UploadProgressTracker();

// Middleware to track upload progress
export const trackUploadProgress = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const uploadId = uploadProgressTracker.generateUploadId();
  (req as any).uploadId = uploadId;

  // Add upload ID to response headers
  res.setHeader("X-Upload-ID", uploadId);

  next();
};

// Custom multer storage with progress tracking
export const createProgressStorage = (destination: string) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      const uploadId = (req as any).uploadId;
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substr(2, 9);
      const filename = `${
        file.fieldname
      }-${timestamp}-${randomString}.${file.originalname.split(".").pop()}`;

      // Start tracking the upload
      const contentLength = parseInt(req.headers["content-length"] || "0");
      uploadProgressTracker.startUpload(
        uploadId,
        file.originalname,
        contentLength
      );

      cb(null, filename);
    },
  });
};

// Middleware to handle chunked uploads
export const handleChunkedUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const chunkNumber = parseInt(req.headers["x-chunk-number"] as string);
  const totalChunks = parseInt(req.headers["x-total-chunks"] as string);
  const chunkSize = parseInt(req.headers["x-chunk-size"] as string);
  const totalSize = parseInt(req.headers["x-total-size"] as string);
  const filename = req.headers["x-filename"] as string;
  const uploadId =
    (req.headers["x-upload-id"] as string) ||
    uploadProgressTracker.generateUploadId();

  if (chunkNumber && totalChunks && filename) {
    // This is a chunked upload
    (req as any).chunkedUpload = {
      chunkNumber,
      totalChunks,
      chunkSize,
      totalSize,
      filename,
      uploadId,
    };

    // Start tracking if this is the first chunk
    if (chunkNumber === 1) {
      uploadProgressTracker.startUpload(uploadId, filename, totalSize);
    }

    // Update progress
    const uploadedSize =
      (chunkNumber - 1) * chunkSize +
      (req.headers["content-length"]
        ? parseInt(req.headers["content-length"])
        : 0);
    uploadProgressTracker.updateProgress(uploadId, uploadedSize);
  }

  next();
};

// Middleware to complete chunked upload
export const completeChunkedUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const chunkedUpload = (req as any).chunkedUpload;

  if (
    chunkedUpload &&
    chunkedUpload.chunkNumber === chunkedUpload.totalChunks
  ) {
    // This is the last chunk, mark upload as complete
    uploadProgressTracker.completeUpload(chunkedUpload.uploadId);
  }

  next();
};

// Error handler for upload failures
export const handleUploadError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const uploadId =
    (req as any).uploadId || (req as any).chunkedUpload?.uploadId;

  if (uploadId) {
    uploadProgressTracker.failUpload(
      uploadId,
      error.message || "Upload failed"
    );
  }

  logger.error("Upload error:", error);
  res.status(500).json({
    error: "Upload failed",
    message: error.message,
    uploadId,
  });
};

// Route to get upload status
export const getUploadStatus = (req: Request, res: Response) => {
  const { uploadId } = req.params;
  const upload = uploadProgressTracker.getUpload(uploadId);

  if (!upload) {
    return res.status(404).json({
      error: "Upload not found",
    });
  }

  res.json(upload);
};

// Route to get all uploads (for admin/debugging)
export const getAllUploads = (req: Request, res: Response) => {
  const uploads = uploadProgressTracker.getAllUploads();
  res.json(uploads);
};
