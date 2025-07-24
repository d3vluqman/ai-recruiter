import { Request, Response, NextFunction } from "express";
import { resumeService } from "../services/resumeService";
import { candidateService } from "../services/candidateService";
import { logger } from "../utils/logger";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "resumes");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, "");
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${ext}`);
  },
});

// File filter for resume uploads
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  const allowedExtensions = [".pdf", ".doc", ".docx", ".txt"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    allowedTypes.includes(file.mimetype) &&
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed."
      )
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export class ResumeController {
  async uploadResume(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: {
            message: "No file uploaded",
            code: "NO_FILE",
          },
        });
      }

      const {
        jobPostingId,
        candidateFirstName,
        candidateLastName,
        candidateEmail,
        candidatePhone,
        source = "direct",
      } = req.body;

      // Validate required fields
      if (
        !jobPostingId ||
        !candidateFirstName ||
        !candidateLastName ||
        !candidateEmail
      ) {
        // Clean up uploaded file if validation fails
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          error: {
            message:
              "Missing required fields: jobPostingId, candidateFirstName, candidateLastName, candidateEmail",
            code: "MISSING_FIELDS",
          },
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(candidateEmail)) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          error: {
            message: "Invalid email format",
            code: "INVALID_EMAIL",
          },
        });
      }

      // Find or create candidate
      const candidate = await candidateService.findOrCreateCandidate({
        firstName: candidateFirstName,
        lastName: candidateLastName,
        email: candidateEmail,
        phone: candidatePhone,
      });

      // Create resume record
      const resume = await resumeService.createResume({
        candidateId: candidate.id,
        jobPostingId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        source: source as "direct" | "portal",
        filePath: req.file.path,
      });

      logger.info(`Resume uploaded successfully: ${resume.id}`);

      res.status(201).json({
        message: "Resume uploaded successfully",
        data: {
          resumeId: resume.id,
          candidateId: candidate.id,
          fileName: resume.fileName,
          status: resume.status,
        },
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      next(error);
    }
  }

  async getResumesByJobPosting(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { jobPostingId } = req.params;

      if (!jobPostingId) {
        return res.status(400).json({
          error: {
            message: "Job posting ID is required",
            code: "MISSING_JOB_POSTING_ID",
          },
        });
      }

      const resumes = await resumeService.getResumesByJobPosting(jobPostingId);

      res.json({
        data: resumes,
        count: resumes.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getResumeById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const resume = await resumeService.getResumeById(id);

      if (!resume) {
        return res.status(404).json({
          error: {
            message: "Resume not found",
            code: "RESUME_NOT_FOUND",
          },
        });
      }

      res.json({ data: resume });
    } catch (error) {
      next(error);
    }
  }

  async getAllResumes(req: Request, res: Response, next: NextFunction) {
    try {
      const resumes = await resumeService.getAllResumes();

      res.json({
        data: resumes,
        count: resumes.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteResume(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      await resumeService.deleteResume(id);

      res.json({
        message: "Resume deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadResume(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const resume = await resumeService.getResumeById(id);

      if (!resume) {
        return res.status(404).json({
          error: {
            message: "Resume not found",
            code: "RESUME_NOT_FOUND",
          },
        });
      }

      // Check if file exists
      try {
        await fs.access(resume.filePath);
      } catch {
        return res.status(404).json({
          error: {
            message: "Resume file not found on disk",
            code: "FILE_NOT_FOUND",
          },
        });
      }

      // Set appropriate headers
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${resume.fileName}"`
      );
      res.setHeader("Content-Type", "application/octet-stream");

      // Send file
      res.sendFile(path.resolve(resume.filePath));
    } catch (error) {
      next(error);
    }
  }

  async updateResumeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          error: {
            message: "Status is required",
            code: "MISSING_STATUS",
          },
        });
      }

      const validStatuses = ["pending", "processing", "processed", "failed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: {
            message: `Invalid status. Must be one of: ${validStatuses.join(
              ", "
            )}`,
            code: "INVALID_STATUS",
          },
        });
      }

      const resume = await resumeService.updateResumeStatus(id, status);

      res.json({
        message: "Resume status updated successfully",
        data: resume,
      });
    } catch (error) {
      next(error);
    }
  }

  async processResume(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const resume = await resumeService.processResumeDocument(id);

      res.json({
        message: "Resume processed successfully",
        data: resume,
      });
    } catch (error) {
      next(error);
    }
  }

  async batchProcessResumes(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobPostingId } = req.query;

      const result = await resumeService.batchProcessResumes(
        jobPostingId as string | undefined
      );

      res.json({
        message: "Batch processing completed",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const resumeController = new ResumeController();
