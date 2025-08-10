import { Request, Response } from "express";
import { evaluationService } from "../services/evaluationService";
import { logger } from "../utils/logger";

export class EvaluationController {
  async createEvaluation(req: Request, res: Response) {
    try {
      const { resumeId, jobPostingId, weights } = req.body;

      if (!resumeId || !jobPostingId) {
        return res.status(400).json({
          error: "Resume ID and Job Posting ID are required",
        });
      }

      const evaluation = await evaluationService.createEvaluation({
        resumeId,
        jobPostingId,
        weights,
      });

      res.status(201).json(evaluation);
    } catch (error) {
      logger.error("EvaluationController.createEvaluation error:", error);
      res.status(500).json({
        error: "Failed to create evaluation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getEvaluation(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const evaluation = await evaluationService.getEvaluationById(id);

      if (!evaluation) {
        return res.status(404).json({
          error: "Evaluation not found",
        });
      }

      res.json(evaluation);
    } catch (error) {
      logger.error("EvaluationController.getEvaluation error:", error);
      res.status(500).json({
        error: "Failed to fetch evaluation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getEvaluationsByJobPosting(req: Request, res: Response) {
    try {
      const { jobPostingId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page
      const useCache = req.query.cache !== "false";

      const result = await evaluationService.getEvaluationsByJobPosting(
        jobPostingId,
        { page, limit, useCache }
      );

      res.json({
        success: true,
        data: result.evaluations,
        pagination: {
          page,
          limit,
          total: result.total,
          hasMore: result.hasMore,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      logger.error(
        "EvaluationController.getEvaluationsByJobPosting error:",
        error
      );
      res.status(500).json({
        error: "Failed to fetch evaluations",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getEvaluationByResumeAndJob(req: Request, res: Response) {
    try {
      const { resumeId, jobPostingId } = req.params;

      const evaluation = await evaluationService.getEvaluationByResumeAndJob(
        resumeId,
        jobPostingId
      );

      if (!evaluation) {
        return res.status(404).json({
          error: "Evaluation not found",
        });
      }

      res.json(evaluation);
    } catch (error) {
      logger.error(
        "EvaluationController.getEvaluationByResumeAndJob error:",
        error
      );
      res.status(500).json({
        error: "Failed to fetch evaluation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async batchEvaluate(req: Request, res: Response) {
    try {
      const { jobPostingId, resumeIds, weights } = req.body;

      if (!jobPostingId) {
        return res.status(400).json({
          error: "Job Posting ID is required",
        });
      }

      const result = await evaluationService.batchEvaluate({
        jobPostingId,
        resumeIds,
        weights,
      });

      res.json(result);
    } catch (error) {
      logger.error("EvaluationController.batchEvaluate error:", error);
      res.status(500).json({
        error: "Failed to perform batch evaluation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async deleteEvaluation(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await evaluationService.deleteEvaluation(id);

      res.status(204).send();
    } catch (error) {
      logger.error("EvaluationController.deleteEvaluation error:", error);
      res.status(500).json({
        error: "Failed to delete evaluation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getCandidatesWithEvaluations(req: Request, res: Response) {
    try {
      const { jobPostingId } = req.params;

      const candidates = await evaluationService.getCandidatesWithEvaluations(
        jobPostingId
      );

      res.json(candidates);
    } catch (error) {
      logger.error(
        "EvaluationController.getCandidatesWithEvaluations error:",
        error
      );
      res.status(500).json({
        error: "Failed to fetch candidates with evaluations",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async triggerEvaluationForResume(req: Request, res: Response) {
    try {
      const { id: resumeId } = req.params;
      const { jobPostingId, weights } = req.body;

      // Debug logging
      logger.info("triggerEvaluationForResume called", {
        resumeId,
        jobPostingId,
        jobPostingIdType: typeof jobPostingId,
        requestBody: req.body,
      });

      if (!jobPostingId || jobPostingId === "undefined") {
        return res.status(400).json({
          error: "Job Posting ID is required",
        });
      }

      // Check if evaluation already exists
      const existingEvaluation =
        await evaluationService.getEvaluationByResumeAndJob(
          resumeId,
          jobPostingId
        );

      if (existingEvaluation) {
        return res.json(existingEvaluation);
      }

      // Create new evaluation
      const evaluation = await evaluationService.createEvaluation({
        resumeId,
        jobPostingId,
        weights,
      });

      res.status(201).json(evaluation);
    } catch (error) {
      logger.error(
        "EvaluationController.triggerEvaluationForResume error:",
        error
      );
      res.status(500).json({
        error: "Failed to trigger evaluation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async createEvaluationAsync(req: Request, res: Response) {
    try {
      const { resumeId, jobPostingId, weights } = req.body;

      if (!resumeId || !jobPostingId) {
        return res.status(400).json({
          error: "Resume ID and Job Posting ID are required",
        });
      }

      const jobId = await evaluationService.createEvaluationAsync({
        resumeId,
        jobPostingId,
        weights,
      });

      res.status(202).json({
        jobId,
        message: "Evaluation job queued successfully",
        statusUrl: `/api/evaluations/jobs/${jobId}/status`,
      });
    } catch (error) {
      logger.error("EvaluationController.createEvaluationAsync error:", error);
      res.status(500).json({
        error: "Failed to queue evaluation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async batchEvaluateAsync(req: Request, res: Response) {
    try {
      const { jobPostingId, resumeIds, weights } = req.body;

      if (!jobPostingId) {
        return res.status(400).json({
          error: "Job Posting ID is required",
        });
      }

      const jobId = await evaluationService.batchEvaluateAsync({
        jobPostingId,
        resumeIds,
        weights,
      });

      res.status(202).json({
        jobId,
        message: "Batch evaluation job queued successfully",
        statusUrl: `/api/evaluations/jobs/${jobId}/status`,
      });
    } catch (error) {
      logger.error("EvaluationController.batchEvaluateAsync error:", error);
      res.status(500).json({
        error: "Failed to queue batch evaluation",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async getJobStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;

      const jobStatus = await evaluationService.getEvaluationJobStatus(jobId);

      if (!jobStatus) {
        return res.status(404).json({
          error: "Job not found",
        });
      }

      res.json(jobStatus);
    } catch (error) {
      logger.error("EvaluationController.getJobStatus error:", error);
      res.status(500).json({
        error: "Failed to fetch job status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async checkMLServiceHealth(req: Request, res: Response) {
    try {
      const isHealthy = await evaluationService.checkMLServiceHealth();

      res.json({
        healthy: isHealthy,
        service: "ML Service",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("EvaluationController.checkMLServiceHealth error:", error);
      res.status(500).json({
        error: "Failed to check ML service health",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  async reEvaluateExisting(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Get the existing evaluation
      const existingEvaluation = await evaluationService.getEvaluationById(id);
      if (!existingEvaluation) {
        return res.status(404).json({
          error: "Evaluation not found",
        });
      }

      logger.info(`Re-evaluating existing evaluation ${id}`);

      // Create a new evaluation with the same resume and job posting
      const newEvaluation = await evaluationService.createEvaluation({
        resumeId: existingEvaluation.resumeId,
        jobPostingId: existingEvaluation.jobPostingId,
        weights: undefined, // Use default weights
      });

      // Delete the old evaluation
      await evaluationService.deleteEvaluation(id);

      logger.info(
        `Successfully re-evaluated evaluation ${id} -> ${newEvaluation.id}`
      );

      res.json({
        message: "Evaluation re-run successfully",
        oldEvaluationId: id,
        newEvaluationId: newEvaluation.id,
        evaluation: newEvaluation,
      });
    } catch (error) {
      logger.error("EvaluationController.reEvaluateExisting error:", error);
      res.status(500).json({
        error: "Failed to re-evaluate",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export const evaluationController = new EvaluationController();
