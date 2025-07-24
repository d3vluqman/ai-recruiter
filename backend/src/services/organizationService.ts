import { supabase } from "../config/supabase";
import { logger } from "../utils/logger";

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  settings: any;
  createdAt: Date;
}

export interface CreateOrganizationRequest {
  name: string;
  domain?: string;
  settings?: any;
}

export class OrganizationService {
  /**
   * Create a new organization
   */
  async createOrganization(
    data: CreateOrganizationRequest
  ): Promise<Organization> {
    try {
      const { name, domain, settings = {} } = data;

      const { data: newOrg, error } = await supabase
        .from("organizations")
        .insert({
          name,
          domain,
          settings,
        })
        .select("*")
        .single();

      if (error) {
        logger.error("Error creating organization:", error);
        throw new Error("Failed to create organization");
      }

      return {
        id: newOrg.id,
        name: newOrg.name,
        domain: newOrg.domain,
        settings: newOrg.settings,
        createdAt: new Date(newOrg.created_at),
      };
    } catch (error) {
      logger.error("Organization creation error:", error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(orgId: string): Promise<Organization | null> {
    try {
      const { data: orgData, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

      if (error || !orgData) {
        return null;
      }

      return {
        id: orgData.id,
        name: orgData.name,
        domain: orgData.domain,
        settings: orgData.settings,
        createdAt: new Date(orgData.created_at),
      };
    } catch (error) {
      logger.error("Error getting organization by ID:", error);
      return null;
    }
  }

  /**
   * Get all organizations
   */
  async getAllOrganizations(): Promise<Organization[]> {
    try {
      const { data: orgsData, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name");

      if (error) {
        logger.error("Error getting organizations:", error);
        throw new Error("Failed to retrieve organizations");
      }

      return orgsData.map((org) => ({
        id: org.id,
        name: org.name,
        domain: org.domain,
        settings: org.settings,
        createdAt: new Date(org.created_at),
      }));
    } catch (error) {
      logger.error("Error getting all organizations:", error);
      throw error;
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(
    orgId: string,
    updates: Partial<CreateOrganizationRequest>
  ): Promise<Organization> {
    try {
      const updateData: any = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.domain !== undefined) updateData.domain = updates.domain;
      if (updates.settings !== undefined)
        updateData.settings = updates.settings;

      const { data: updatedOrg, error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", orgId)
        .select("*")
        .single();

      if (error || !updatedOrg) {
        throw new Error("Failed to update organization");
      }

      logger.info(`Organization updated: ${orgId}`);
      return {
        id: updatedOrg.id,
        name: updatedOrg.name,
        domain: updatedOrg.domain,
        settings: updatedOrg.settings,
        createdAt: new Date(updatedOrg.created_at),
      };
    } catch (error) {
      logger.error("Error updating organization:", error);
      throw error;
    }
  }
}

export const organizationService = new OrganizationService();
