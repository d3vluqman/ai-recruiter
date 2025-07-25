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

      const evaluations = await evaluationService.getEvaluationsByJobPosting(
        jobPostingId
      );

      res.json(evaluations);
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
      const { resumeId } = req.params;
      const { jobPostingId, weights } = req.body;

      if (!jobPostingId) {
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
}

export const evaluationController = new EvaluationController();
