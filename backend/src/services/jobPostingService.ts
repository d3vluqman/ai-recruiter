import { supabaseAdmin } from "../config/supabase";
import { JobPosting } from "../types";
import { logger } from "../utils/logger";

export interface CreateJobPostingData {
  title: string;
  description: string;
  requirements: string[];
  department?: string;
  location?: string;
  createdBy: string;
  organizationId?: string;
  filePath?: string;
  parsedRequirements?: any;
}

export interface UpdateJobPostingData {
  title?: string;
  description?: string;
  requirements?: string[];
  department?: string;
  location?: string;
  status?: string;
  filePath?: string;
  parsedRequirements?: any;
}

export interface JobPostingFilters {
  status?: string;
  department?: string;
  location?: string;
  organizationId?: string;
  createdBy?: string;
  search?: string;
}

export class JobPostingService {
  async createJobPosting(data: CreateJobPostingData): Promise<JobPosting> {
    try {
      if (!supabaseAdmin) {
        throw new Error("Supabase admin client not available");
      }

      const { data: jobPosting, error } = await supabaseAdmin
        .from("job_postings")
        .insert({
          title: data.title,
          description: data.description,
          requirements: data.requirements,
          department: data.department,
          location: data.location,
          created_by: data.createdBy,
          organization_id: data.organizationId,
          file_path: data.filePath,
          parsed_requirements: data.parsedRequirements || {},
        })
        .select()
        .single();

      if (error) {
        logger.error("Error creating job posting:", error);
        throw new Error(`Failed to create job posting: ${error.message}`);
      }

      return this.mapDbToJobPosting(jobPosting);
    } catch (error) {
      logger.error("JobPostingService.createJobPosting error:", error);
      throw error;
    }
  }

  async getJobPostingById(id: string): Promise<JobPosting | null> {
    try {
      if (!supabaseAdmin) {
        throw new Error("Supabase admin client not available");
      }

      const { data: jobPosting, error } = await supabaseAdmin
        .from("job_postings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        logger.error("Error fetching job posting:", error);
        throw new Error(`Failed to fetch job posting: ${error.message}`);
      }

      return this.mapDbToJobPosting(jobPosting);
    } catch (error) {
      logger.error("JobPostingService.getJobPostingById error:", error);
      throw error;
    }
  }

  async getJobPostings(filters: JobPostingFilters = {}): Promise<JobPosting[]> {
    try {
      if (!supabaseAdmin) {
        throw new Error("Supabase admin client not available");
      }

      let query = supabaseAdmin.from("job_postings").select("*");

      // Apply filters
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.department) {
        query = query.eq("department", filters.department);
      }
      if (filters.location) {
        query = query.eq("location", filters.location);
      }
      if (filters.organizationId) {
        query = query.eq("organization_id", filters.organizationId);
      }
      if (filters.createdBy) {
        query = query.eq("created_by", filters.createdBy);
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      // Order by created_at descending
      query = query.order("created_at", { ascending: false });

      const { data: jobPostings, error } = await query;

      if (error) {
        logger.error("Error fetching job postings:", error);
        throw new Error(`Failed to fetch job postings: ${error.message}`);
      }

      return jobPostings.map(this.mapDbToJobPosting);
    } catch (error) {
      logger.error("JobPostingService.getJobPostings error:", error);
      throw error;
    }
  }

  async updateJobPosting(
    id: string,
    data: UpdateJobPostingData
  ): Promise<JobPosting> {
    try {
      if (!supabaseAdmin) {
        throw new Error("Supabase admin client not available");
      }

      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.requirements !== undefined)
        updateData.requirements = data.requirements;
      if (data.department !== undefined)
        updateData.department = data.department;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.filePath !== undefined) updateData.file_path = data.filePath;
      if (data.parsedRequirements !== undefined) {
        updateData.parsed_requirements = data.parsedRequirements;
      }

      const { data: jobPosting, error } = await supabaseAdmin
        .from("job_postings")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating job posting:", error);
        throw new Error(`Failed to update job posting: ${error.message}`);
      }

      return this.mapDbToJobPosting(jobPosting);
    } catch (error) {
      logger.error("JobPostingService.updateJobPosting error:", error);
      throw error;
    }
  }

  async deleteJobPosting(id: string): Promise<void> {
    try {
      if (!supabaseAdmin) {
        throw new Error("Supabase admin client not available");
      }

      const { error } = await supabaseAdmin
        .from("job_postings")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("Error deleting job posting:", error);
        throw new Error(`Failed to delete job posting: ${error.message}`);
      }
    } catch (error) {
      logger.error("JobPostingService.deleteJobPosting error:", error);
      throw error;
    }
  }

  async getJobPostingsByOrganization(
    organizationId: string
  ): Promise<JobPosting[]> {
    return this.getJobPostings({ organizationId });
  }

  async getActiveJobPostings(): Promise<JobPosting[]> {
    return this.getJobPostings({ status: "active" });
  }

  private mapDbToJobPosting(dbRecord: any): JobPosting {
    return {
      id: dbRecord.id,
      title: dbRecord.title,
      description: dbRecord.description,
      requirements: dbRecord.requirements || [],
      department: dbRecord.department,
      location: dbRecord.location,
      status: dbRecord.status,
      createdBy: dbRecord.created_by,
      organizationId: dbRecord.organization_id,
      filePath: dbRecord.file_path,
      parsedRequirements: dbRecord.parsed_requirements,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
    };
  }
}

export const jobPostingService = new JobPostingService();
