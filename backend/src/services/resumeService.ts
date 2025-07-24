import { supabaseAdmin, supabase } from "../config/supabase";
import { Resume } from "../types";
import { logger } from "../utils/logger";
import { documentParser } from "../utils/documentParser";
import path from "path";
import fs from "fs/promises";

export interface CreateResumeData {
  candidateId: string;
  jobPostingId: string;
  fileName: string;
  fileSize: number;
  source: "direct" | "portal";
  filePath: string;
}

export interface ResumeWithCandidate extends Resume {
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export class ResumeService {
  async createResume(resumeData: CreateResumeData): Promise<Resume> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("resumes")
        .insert({
          candidate_id: resumeData.candidateId,
          job_posting_id: resumeData.jobPostingId,
          file_path: resumeData.filePath,
          file_name: resumeData.fileName,
          file_size: resumeData.fileSize,
          source: resumeData.source,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        logger.error("Error creating resume:", error);
        throw new Error(`Failed to create resume: ${error.message}`);
      }

      return this.mapDatabaseToResume(data);
    } catch (error) {
      logger.error("ResumeService.createResume error:", error);
      throw error;
    }
  }

  async getResumeById(id: string): Promise<Resume | null> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("resumes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        logger.error("Error fetching resume:", error);
        throw new Error(`Failed to fetch resume: ${error.message}`);
      }

      return this.mapDatabaseToResume(data);
    } catch (error) {
      logger.error("ResumeService.getResumeById error:", error);
      throw error;
    }
  }

  async getResumesByJobPosting(
    jobPostingId: string
  ): Promise<ResumeWithCandidate[]> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("resumes")
        .select(
          `
          *,
          candidates (
            first_name,
            last_name,
            email,
            phone
          )
        `
        )
        .eq("job_posting_id", jobPostingId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        logger.error("Error fetching resumes by job posting:", error);
        throw new Error(`Failed to fetch resumes: ${error.message}`);
      }

      return data.map((item) => this.mapDatabaseToResumeWithCandidate(item));
    } catch (error) {
      logger.error("ResumeService.getResumesByJobPosting error:", error);
      throw error;
    }
  }

  async getResumesByCandidate(candidateId: string): Promise<Resume[]> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("resumes")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        logger.error("Error fetching resumes by candidate:", error);
        throw new Error(`Failed to fetch resumes: ${error.message}`);
      }

      return data.map((item) => this.mapDatabaseToResume(item));
    } catch (error) {
      logger.error("ResumeService.getResumesByCandidate error:", error);
      throw error;
    }
  }

  async updateResumeStatus(id: string, status: string): Promise<Resume> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("resumes")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating resume status:", error);
        throw new Error(`Failed to update resume status: ${error.message}`);
      }

      return this.mapDatabaseToResume(data);
    } catch (error) {
      logger.error("ResumeService.updateResumeStatus error:", error);
      throw error;
    }
  }

  async updateParsedData(id: string, parsedData: any): Promise<Resume> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("resumes")
        .update({
          parsed_data: parsedData,
          status: "processed",
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating resume parsed data:", error);
        throw new Error(
          `Failed to update resume parsed data: ${error.message}`
        );
      }

      return this.mapDatabaseToResume(data);
    } catch (error) {
      logger.error("ResumeService.updateParsedData error:", error);
      throw error;
    }
  }

  async deleteResume(id: string): Promise<void> {
    try {
      // First get the resume to get file path
      const resume = await this.getResumeById(id);
      if (!resume) {
        throw new Error("Resume not found");
      }

      // Delete the file from storage
      try {
        await fs.unlink(resume.filePath);
      } catch (fileError) {
        logger.warn("Could not delete resume file:", fileError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database
      const { error } = await supabaseAdmin!
        .from("resumes")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("Error deleting resume:", error);
        throw new Error(`Failed to delete resume: ${error.message}`);
      }
    } catch (error) {
      logger.error("ResumeService.deleteResume error:", error);
      throw error;
    }
  }

  async getAllResumes(): Promise<ResumeWithCandidate[]> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("resumes")
        .select(
          `
          *,
          candidates (
            first_name,
            last_name,
            email,
            phone
          )
        `
        )
        .order("uploaded_at", { ascending: false });

      if (error) {
        logger.error("Error fetching all resumes:", error);
        throw new Error(`Failed to fetch resumes: ${error.message}`);
      }

      return data.map((item) => this.mapDatabaseToResumeWithCandidate(item));
    } catch (error) {
      logger.error("ResumeService.getAllResumes error:", error);
      throw error;
    }
  }

  async processResumeDocument(id: string): Promise<Resume> {
    try {
      const resume = await this.getResumeById(id);
      if (!resume) {
        throw new Error("Resume not found");
      }

      // Update status to processing
      await this.updateResumeStatus(id, "processing");

      try {
        // Parse the document
        const parsedData = await documentParser.processResumeFile(
          resume.filePath
        );

        // Update with parsed data
        const updatedResume = await this.updateParsedData(id, parsedData);

        logger.info(`Successfully processed resume: ${id}`);
        return updatedResume;
      } catch (parseError) {
        // Update status to failed if parsing fails
        await this.updateResumeStatus(id, "failed");
        throw parseError;
      }
    } catch (error) {
      logger.error("ResumeService.processResumeDocument error:", error);
      throw error;
    }
  }

  async batchProcessResumes(
    jobPostingId?: string
  ): Promise<{ processed: number; failed: number }> {
    try {
      const resumes = jobPostingId
        ? await this.getResumesByJobPosting(jobPostingId)
        : await this.getAllResumes();

      const pendingResumes = resumes.filter((r) => r.status === "pending");

      let processed = 0;
      let failed = 0;

      for (const resume of pendingResumes) {
        try {
          await this.processResumeDocument(resume.id);
          processed++;
        } catch (error) {
          logger.error(`Failed to process resume ${resume.id}:`, error);
          failed++;
        }
      }

      logger.info(
        `Batch processing completed: ${processed} processed, ${failed} failed`
      );
      return { processed, failed };
    } catch (error) {
      logger.error("ResumeService.batchProcessResumes error:", error);
      throw error;
    }
  }

  private mapDatabaseToResume(data: any): Resume {
    return {
      id: data.id,
      candidateId: data.candidate_id,
      jobPostingId: data.job_posting_id,
      filePath: data.file_path,
      fileName: data.file_name,
      fileSize: data.file_size,
      source: data.source,
      parsedData: data.parsed_data,
      status: data.status,
      uploadedAt: new Date(data.uploaded_at),
    };
  }

  private mapDatabaseToResumeWithCandidate(data: any): ResumeWithCandidate {
    return {
      ...this.mapDatabaseToResume(data),
      candidate: {
        firstName: data.candidates.first_name,
        lastName: data.candidates.last_name,
        email: data.candidates.email,
        phone: data.candidates.phone,
      },
    };
  }
}

export const resumeService = new ResumeService();
