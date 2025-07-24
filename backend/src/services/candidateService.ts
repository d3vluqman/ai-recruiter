import { supabaseAdmin } from "../config/supabase";
import { Candidate } from "../types";
import { logger } from "../utils/logger";

export class CandidateService {
  async createCandidate(
    candidateData: Omit<Candidate, "id" | "createdAt">
  ): Promise<Candidate> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("candidates")
        .insert({
          first_name: candidateData.firstName,
          last_name: candidateData.lastName,
          email: candidateData.email,
          phone: candidateData.phone,
        })
        .select()
        .single();

      if (error) {
        logger.error("Error creating candidate:", error);
        throw new Error(`Failed to create candidate: ${error.message}`);
      }

      return this.mapDatabaseToCandidate(data);
    } catch (error) {
      logger.error("CandidateService.createCandidate error:", error);
      throw error;
    }
  }

  async getCandidateById(id: string): Promise<Candidate | null> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("candidates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        logger.error("Error fetching candidate:", error);
        throw new Error(`Failed to fetch candidate: ${error.message}`);
      }

      return this.mapDatabaseToCandidate(data);
    } catch (error) {
      logger.error("CandidateService.getCandidateById error:", error);
      throw error;
    }
  }

  async getCandidateByEmail(email: string): Promise<Candidate | null> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("candidates")
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        logger.error("Error fetching candidate by email:", error);
        throw new Error(`Failed to fetch candidate: ${error.message}`);
      }

      return this.mapDatabaseToCandidate(data);
    } catch (error) {
      logger.error("CandidateService.getCandidateByEmail error:", error);
      throw error;
    }
  }

  async findOrCreateCandidate(
    candidateData: Omit<Candidate, "id" | "createdAt">
  ): Promise<Candidate> {
    try {
      // First try to find existing candidate by email
      const existingCandidate = await this.getCandidateByEmail(
        candidateData.email
      );

      if (existingCandidate) {
        // Update candidate info if needed
        const { data, error } = await supabaseAdmin!
          .from("candidates")
          .update({
            first_name: candidateData.firstName,
            last_name: candidateData.lastName,
            phone: candidateData.phone,
          })
          .eq("id", existingCandidate.id)
          .select()
          .single();

        if (error) {
          logger.error("Error updating candidate:", error);
          throw new Error(`Failed to update candidate: ${error.message}`);
        }

        return this.mapDatabaseToCandidate(data);
      }

      // Create new candidate if not found
      return await this.createCandidate(candidateData);
    } catch (error) {
      logger.error("CandidateService.findOrCreateCandidate error:", error);
      throw error;
    }
  }

  async getAllCandidates(): Promise<Candidate[]> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error fetching candidates:", error);
        throw new Error(`Failed to fetch candidates: ${error.message}`);
      }

      return data.map(this.mapDatabaseToCandidate);
    } catch (error) {
      logger.error("CandidateService.getAllCandidates error:", error);
      throw error;
    }
  }

  private mapDatabaseToCandidate(data: any): Candidate {
    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone,
      createdAt: new Date(data.created_at),
    };
  }
}

export const candidateService = new CandidateService();
