import { Request, Response, NextFunction } from "express";
import {
  jobPostingService,
  CreateJobPostingData,
  UpdateJobPostingData,
} from "../services/jobPostingService";
import { logger } from "../utils/logger";
import { documentParser } from "../utils/documentParser";

// Validation helpers
const validateJobPostingData = (data: any): string[] => {
  const errors: string[] = [];

  if (
    !data.title ||
    typeof data.title !== "string" ||
    data.title.trim().length === 0
  ) {
    errors.push("Title is required and must be a non-empty string");
  }

  if (
    !data.description ||
    typeof data.description !== "string" ||
    data.description.trim().length === 0
  ) {
    errors.push("Description is required and must be a non-empty string");
  }

  // Handle requirements validation for both array and JSON string (FormData)
  if (data.requirements) {
    if (Array.isArray(data.requirements)) {
      // Already an array, validation passes
    } else if (typeof data.requirements === "string") {
      // Try to parse JSON string from FormData
      try {
        const parsed = JSON.parse(data.requirements);
        if (!Array.isArray(parsed)) {
          errors.push("Requirements must be an array");
        }
      } catch (e) {
        // If it's not valid JSON, treat as single requirement (still valid)
      }
    } else {
      errors.push("Requirements must be an array");
    }
  }

  if (data.department && typeof data.department !== "string") {
    errors.push("Department must be a string");
  }

  if (data.location && typeof data.location !== "string") {
    errors.push("Location must be a string");
  }

  return errors;
};

export const createJobPosting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validationErrors = validateJobPostingData(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        error: {
          message: "Validation failed",
          details: validationErrors,
        },
      });
      return;
    }

    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({
        error: {
          message: "User not authenticated",
        },
      });
      return;
    }

    // Handle file upload and parsing
    let filePath: string | undefined;
    let parsedRequirements: any = {};
    let extractedRequirements: string[] = [];

    // Handle requirements - could be array (JSON) or string (form data)
    if (req.body.requirements) {
      if (Array.isArray(req.body.requirements)) {
        extractedRequirements = req.body.requirements;
      } else if (typeof req.body.requirements === "string") {
        try {
          extractedRequirements = JSON.parse(req.body.requirements);
        } catch (e) {
          extractedRequirements = [req.body.requirements];
        }
      }
    }

    if (req.file) {
      filePath = req.file.path;
      logger.info(`Job description file uploaded: ${filePath}`);

      try {
        // Extract text from the uploaded file
        const extractedText = await documentParser.extractText(filePath);

        // Parse the job description to extract structured information
        const parsedJobDescription =
          documentParser.parseJobDescription(extractedText);

        // Use parsed requirements if no manual requirements provided
        if (
          extractedRequirements.length === 0 &&
          parsedJobDescription.requirements.length > 0
        ) {
          extractedRequirements = parsedJobDescription.requirements;
        }

        // Store all parsed information
        parsedRequirements = {
          extractedText,
          skills: parsedJobDescription.skills,
          qualifications: parsedJobDescription.qualifications,
          responsibilities: parsedJobDescription.responsibilities,
          requirements: parsedJobDescription.requirements,
        };

        logger.info(
          `Parsed job description: ${parsedJobDescription.requirements.length} requirements, ${parsedJobDescription.skills.length} skills`
        );
      } catch (parseError) {
        logger.warn("Failed to parse job description file:", parseError);
        // Continue without parsed data
      }
    }

    const jobPostingData: CreateJobPostingData = {
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      requirements: extractedRequirements,
      department: req.body.department?.trim(),
      location: req.body.location?.trim(),
      createdBy: userId,
      organizationId: (req as any).user?.organizationId,
      filePath: filePath,
      parsedRequirements: req.body.parsedRequirements
        ? JSON.parse(req.body.parsedRequirements)
        : parsedRequirements,
    };

    const jobPosting = await jobPostingService.createJobPosting(jobPostingData);

    res.status(201).json({
      message: "Job posting created successfully",
      data: jobPosting,
    });
  } catch (error) {
    logger.error("Error in createJobPosting:", error);
    next(error);
  }
};

export const getJobPostings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      status: req.query.status as string,
      department: req.query.department as string,
      location: req.query.location as string,
      organizationId: req.query.organizationId as string,
      createdBy: req.query.createdBy as string,
      search: req.query.search as string,
    };

    // Remove undefined values
    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters];
      }
    });

    const jobPostings = await jobPostingService.getJobPostings(filters);

    res.json({
      message: "Job postings retrieved successfully",
      data: jobPostings,
      count: jobPostings.length,
    });
  } catch (error) {
    logger.error("Error in getJobPostings:", error);
    next(error);
  }
};

export const getJobPostingById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        error: {
          message: "Job posting ID is required",
        },
      });
      return;
    }

    const jobPosting = await jobPostingService.getJobPostingById(id);

    if (!jobPosting) {
      res.status(404).json({
        error: {
          message: "Job posting not found",
        },
      });
      return;
    }

    res.json({
      message: "Job posting retrieved successfully",
      data: jobPosting,
    });
  } catch (error) {
    logger.error("Error in getJobPostingById:", error);
    next(error);
  }
};

export const updateJobPosting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        error: {
          message: "Job posting ID is required",
        },
      });
      return;
    }

    // Check if job posting exists
    const existingJobPosting = await jobPostingService.getJobPostingById(id);
    if (!existingJobPosting) {
      res.status(404).json({
        error: {
          message: "Job posting not found",
        },
      });
      return;
    }

    // Validate only provided fields
    const updateData: UpdateJobPostingData = {};

    if (req.body.title !== undefined) {
      if (
        typeof req.body.title !== "string" ||
        req.body.title.trim().length === 0
      ) {
        res.status(400).json({
          error: {
            message: "Title must be a non-empty string",
          },
        });
        return;
      }
      updateData.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      if (
        typeof req.body.description !== "string" ||
        req.body.description.trim().length === 0
      ) {
        res.status(400).json({
          error: {
            message: "Description must be a non-empty string",
          },
        });
        return;
      }
      updateData.description = req.body.description.trim();
    }

    if (req.body.requirements !== undefined) {
      let parsedRequirements: string[] = [];

      if (Array.isArray(req.body.requirements)) {
        parsedRequirements = req.body.requirements;
      } else if (typeof req.body.requirements === "string") {
        try {
          parsedRequirements = JSON.parse(req.body.requirements);
          if (!Array.isArray(parsedRequirements)) {
            res.status(400).json({
              error: {
                message: "Requirements must be an array",
              },
            });
            return;
          }
        } catch (e) {
          // If it's not valid JSON, treat as single requirement
          parsedRequirements = [req.body.requirements];
        }
      } else {
        res.status(400).json({
          error: {
            message: "Requirements must be an array",
          },
        });
        return;
      }

      updateData.requirements = parsedRequirements;
    }

    if (req.body.department !== undefined) {
      updateData.department = req.body.department?.trim();
    }

    if (req.body.location !== undefined) {
      updateData.location = req.body.location?.trim();
    }

    if (req.body.status !== undefined) {
      if (
        !["active", "inactive", "draft", "closed"].includes(req.body.status)
      ) {
        res.status(400).json({
          error: {
            message: "Status must be one of: active, inactive, draft, closed",
          },
        });
        return;
      }
      updateData.status = req.body.status;
    }

    // Handle file upload
    if (req.file) {
      updateData.filePath = req.file.path;
      logger.info(`Job description file updated: ${req.file.path}`);
    } else if (req.body.filePath !== undefined) {
      updateData.filePath = req.body.filePath;
    }

    if (req.body.parsedRequirements !== undefined) {
      updateData.parsedRequirements = req.body.parsedRequirements;
    }

    const updatedJobPosting = await jobPostingService.updateJobPosting(
      id,
      updateData
    );

    res.json({
      message: "Job posting updated successfully",
      data: updatedJobPosting,
    });
  } catch (error) {
    logger.error("Error in updateJobPosting:", error);
    next(error);
  }
};

export const deleteJobPosting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        error: {
          message: "Job posting ID is required",
        },
      });
      return;
    }

    // Check if job posting exists
    const existingJobPosting = await jobPostingService.getJobPostingById(id);
    if (!existingJobPosting) {
      res.status(404).json({
        error: {
          message: "Job posting not found",
        },
      });
      return;
    }

    await jobPostingService.deleteJobPosting(id);

    res.json({
      message: "Job posting deleted successfully",
    });
  } catch (error) {
    logger.error("Error in deleteJobPosting:", error);
    next(error);
  }
};

export const getMyJobPostings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({
        error: {
          message: "User not authenticated",
        },
      });
      return;
    }

    const jobPostings = await jobPostingService.getJobPostings({
      createdBy: userId,
    });

    res.json({
      message: "User job postings retrieved successfully",
      data: jobPostings,
      count: jobPostings.length,
    });
  } catch (error) {
    logger.error("Error in getMyJobPostings:", error);
    next(error);
  }
};
