import { Request, Response } from "express";
import {
  organizationService,
  CreateOrganizationRequest,
} from "../services/organizationService";
import { logger } from "../utils/logger";

/**
 * Create a new organization
 */
export const createOrganization = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, domain, settings }: CreateOrganizationRequest = req.body;

    // Validate required fields
    if (!name) {
      res.status(400).json({
        error: {
          message: "Organization name is required",
          code: "MISSING_REQUIRED_FIELDS",
        },
      });
      return;
    }

    const organization = await organizationService.createOrganization({
      name,
      domain,
      settings,
    });

    res.status(201).json({
      message: "Organization created successfully",
      data: { organization },
    });
  } catch (error) {
    logger.error("Create organization controller error:", error);
    res.status(500).json({
      error: {
        message: "Failed to create organization",
        code: "ORGANIZATION_CREATION_ERROR",
      },
    });
  }
};

/**
 * Get all organizations
 */
export const getOrganizations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const organizations = await organizationService.getAllOrganizations();

    res.json({
      message: "Organizations retrieved successfully",
      data: { organizations },
    });
  } catch (error) {
    logger.error("Get organizations controller error:", error);
    res.status(500).json({
      error: {
        message: "Failed to retrieve organizations",
        code: "ORGANIZATIONS_RETRIEVAL_ERROR",
      },
    });
  }
};

/**
 * Get organization by ID
 */
export const getOrganizationById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const organization = await organizationService.getOrganizationById(id);
    if (!organization) {
      res.status(404).json({
        error: {
          message: "Organization not found",
          code: "ORGANIZATION_NOT_FOUND",
        },
      });
      return;
    }

    res.json({
      message: "Organization retrieved successfully",
      data: { organization },
    });
  } catch (error) {
    logger.error("Get organization by ID controller error:", error);
    res.status(500).json({
      error: {
        message: "Failed to retrieve organization",
        code: "ORGANIZATION_RETRIEVAL_ERROR",
      },
    });
  }
};

/**
 * Update organization
 */
export const updateOrganization = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, domain, settings } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (domain !== undefined) updates.domain = domain;
    if (settings !== undefined) updates.settings = settings;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        error: {
          message: "No valid fields to update",
          code: "NO_UPDATES",
        },
      });
      return;
    }

    const organization = await organizationService.updateOrganization(
      id,
      updates
    );

    res.json({
      message: "Organization updated successfully",
      data: { organization },
    });
  } catch (error) {
    logger.error("Update organization controller error:", error);
    res.status(500).json({
      error: {
        message: "Failed to update organization",
        code: "ORGANIZATION_UPDATE_ERROR",
      },
    });
  }
};
