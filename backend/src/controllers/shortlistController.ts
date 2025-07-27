import { Request, Response, NextFunction } from "express";
import { shortlistService } from "../services/shortlistService";
import { emailService } from "../services/emailService";
import { CreateShortlistRequest, SendEmailRequest } from "../types";
import { APIError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

export class ShortlistController {
  async createShortlist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(
          new APIError("User not authenticated", 401, "UNAUTHORIZED")
        );
      }

      const request: CreateShortlistRequest = req.body;

      // Validate request
      if (!request.jobPostingId) {
        return next(
          new APIError("Job posting ID is required", 400, "MISSING_JOB_ID")
        );
      }

      if (!request.selectionCriteria) {
        return next(
          new APIError(
            "Selection criteria is required",
            400,
            "MISSING_CRITERIA"
          )
        );
      }

      const shortlist = await shortlistService.createShortlist(request, userId);

      res.status(201).json({
        success: true,
        data: shortlist,
      });
    } catch (error) {
      next(error);
    }
  }

  async getShortlistsByJob(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return next(new APIError("Job ID is required", 400, "MISSING_JOB_ID"));
      }

      const shortlists = await shortlistService.getShortlistsByJob(jobId);

      res.json({
        success: true,
        data: shortlists,
      });
    } catch (error) {
      next(error);
    }
  }

  async getShortlistById(req: Request, res: Response, next: NextFunction) {
    try {
      const { shortlistId } = req.params;

      if (!shortlistId) {
        return next(
          new APIError("Shortlist ID is required", 400, "MISSING_SHORTLIST_ID")
        );
      }

      const shortlist = await shortlistService.getShortlistById(shortlistId);

      if (!shortlist) {
        return next(
          new APIError("Shortlist not found", 404, "SHORTLIST_NOT_FOUND")
        );
      }

      res.json({
        success: true,
        data: shortlist,
      });
    } catch (error) {
      next(error);
    }
  }

  async getShortlistCandidates(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { shortlistId } = req.params;

      if (!shortlistId) {
        return next(
          new APIError("Shortlist ID is required", 400, "MISSING_SHORTLIST_ID")
        );
      }

      const candidates = await shortlistService.getShortlistCandidates(
        shortlistId
      );

      res.json({
        success: true,
        data: candidates,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateShortlistStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { shortlistId } = req.params;
      const { status } = req.body;

      if (!shortlistId) {
        return next(
          new APIError("Shortlist ID is required", 400, "MISSING_SHORTLIST_ID")
        );
      }

      if (!status || !["draft", "finalized", "sent"].includes(status)) {
        return next(
          new APIError("Valid status is required", 400, "INVALID_STATUS")
        );
      }

      await shortlistService.updateShortlistStatus(shortlistId, status);

      res.json({
        success: true,
        message: "Shortlist status updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async addCandidateToShortlist(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { shortlistId } = req.params;
      const { candidateId, evaluationId } = req.body;

      if (!shortlistId) {
        return next(
          new APIError("Shortlist ID is required", 400, "MISSING_SHORTLIST_ID")
        );
      }

      if (!candidateId) {
        return next(
          new APIError("Candidate ID is required", 400, "MISSING_CANDIDATE_ID")
        );
      }

      if (!evaluationId) {
        return next(
          new APIError(
            "Evaluation ID is required",
            400,
            "MISSING_EVALUATION_ID"
          )
        );
      }

      await shortlistService.addCandidateToShortlist(
        shortlistId,
        candidateId,
        evaluationId,
        true
      );

      res.json({
        success: true,
        message: "Candidate added to shortlist successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async removeCandidateFromShortlist(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { shortlistId, candidateId } = req.params;

      if (!shortlistId) {
        return next(
          new APIError("Shortlist ID is required", 400, "MISSING_SHORTLIST_ID")
        );
      }

      if (!candidateId) {
        return next(
          new APIError("Candidate ID is required", 400, "MISSING_CANDIDATE_ID")
        );
      }

      await shortlistService.removeCandidateFromShortlist(
        shortlistId,
        candidateId
      );

      res.json({
        success: true,
        message: "Candidate removed from shortlist successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async sendShortlistEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return next(
          new APIError("User not authenticated", 401, "UNAUTHORIZED")
        );
      }

      const request: SendEmailRequest = req.body;

      // Validate request
      if (!request.shortlistId) {
        return next(
          new APIError("Shortlist ID is required", 400, "MISSING_SHORTLIST_ID")
        );
      }

      if (!request.emailTemplate) {
        return next(
          new APIError(
            "Email template is required",
            400,
            "MISSING_EMAIL_TEMPLATE"
          )
        );
      }

      const emailCommunications = await emailService.sendShortlistEmails(
        request,
        userId
      );

      res.json({
        success: true,
        data: emailCommunications,
        message: `Emails sent to ${emailCommunications.length} candidates`,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmailCommunications(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { shortlistId } = req.params;

      if (!shortlistId) {
        return next(
          new APIError("Shortlist ID is required", 400, "MISSING_SHORTLIST_ID")
        );
      }

      const emailCommunications = await emailService.getEmailCommunications(
        shortlistId
      );

      res.json({
        success: true,
        data: emailCommunications,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmailTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const templates = await emailService.getEmailTemplates();

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmailTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.params;

      if (!type) {
        return next(
          new APIError(
            "Template type is required",
            400,
            "MISSING_TEMPLATE_TYPE"
          )
        );
      }

      const template = await emailService.getEmailTemplate(type);

      if (!template) {
        return next(
          new APIError("Email template not found", 404, "TEMPLATE_NOT_FOUND")
        );
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEmailTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.params;
      const templateUpdate = req.body;

      if (!type) {
        return next(
          new APIError(
            "Template type is required",
            400,
            "MISSING_TEMPLATE_TYPE"
          )
        );
      }

      const updatedTemplate = await emailService.updateEmailTemplate(
        type,
        templateUpdate
      );

      res.json({
        success: true,
        data: updatedTemplate,
        message: "Email template updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

export const shortlistController = new ShortlistController();
