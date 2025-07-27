import { supabase } from "../config/supabase";
import {
  Shortlist,
  ShortlistCandidate,
  CreateShortlistRequest,
  Evaluation,
  Candidate,
} from "../types";
import { APIError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

export class ShortlistService {
  async createShortlist(
    request: CreateShortlistRequest,
    userId: string
  ): Promise<Shortlist> {
    try {
      // Validate job posting exists
      const { data: jobPosting, error: jobError } = await supabase
        .from("job_postings")
        .select("id")
        .eq("id", request.jobPostingId)
        .single();

      if (jobError || !jobPosting) {
        throw new APIError("Job posting not found", 404, "JOB_NOT_FOUND");
      }

      // Create shortlist
      const { data: shortlist, error: shortlistError } = await supabase
        .from("shortlists")
        .insert({
          job_posting_id: request.jobPostingId,
          created_by: userId,
          selection_criteria: request.selectionCriteria,
          candidate_count: 0,
          status: "draft",
        })
        .select()
        .single();

      if (shortlistError) {
        logger.error("Error creating shortlist:", shortlistError);
        throw new APIError(
          "Failed to create shortlist",
          500,
          "SHORTLIST_CREATE_ERROR"
        );
      }

      // Select candidates based on criteria
      let selectedCandidates: string[] = [];

      if (
        request.selectionCriteria.manualSelection &&
        request.manualCandidateIds
      ) {
        selectedCandidates = request.manualCandidateIds;
      } else {
        selectedCandidates = await this.selectCandidatesAutomatically(
          request.jobPostingId,
          request.selectionCriteria
        );
      }

      // Add candidates to shortlist
      if (selectedCandidates.length > 0) {
        await this.addCandidatesToShortlist(
          shortlist.id,
          selectedCandidates,
          request.selectionCriteria.manualSelection || false
        );
      }

      // Update candidate count
      await supabase
        .from("shortlists")
        .update({ candidate_count: selectedCandidates.length })
        .eq("id", shortlist.id);

      return this.mapShortlistFromDB(shortlist);
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in createShortlist:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  async getShortlistsByJob(jobPostingId: string): Promise<Shortlist[]> {
    try {
      const { data, error } = await supabase
        .from("shortlists")
        .select("*")
        .eq("job_posting_id", jobPostingId)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error fetching shortlists:", error);
        throw new APIError(
          "Failed to fetch shortlists",
          500,
          "SHORTLIST_FETCH_ERROR"
        );
      }

      return data.map(this.mapShortlistFromDB);
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in getShortlistsByJob:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  async getShortlistById(shortlistId: string): Promise<Shortlist | null> {
    try {
      const { data, error } = await supabase
        .from("shortlists")
        .select("*")
        .eq("id", shortlistId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        logger.error("Error fetching shortlist:", error);
        throw new APIError(
          "Failed to fetch shortlist",
          500,
          "SHORTLIST_FETCH_ERROR"
        );
      }

      return this.mapShortlistFromDB(data);
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in getShortlistById:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  async getShortlistCandidates(
    shortlistId: string
  ): Promise<ShortlistCandidate[]> {
    try {
      const { data, error } = await supabase
        .from("shortlist_candidates")
        .select(
          `
          *,
          candidates (*),
          evaluations (*)
        `
        )
        .eq("shortlist_id", shortlistId);

      if (error) {
        logger.error("Error fetching shortlist candidates:", error);
        throw new APIError(
          "Failed to fetch shortlist candidates",
          500,
          "SHORTLIST_CANDIDATES_FETCH_ERROR"
        );
      }

      return data.map(this.mapShortlistCandidateFromDB);
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in getShortlistCandidates:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  async updateShortlistStatus(
    shortlistId: string,
    status: "draft" | "finalized" | "sent"
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("shortlists")
        .update({ status })
        .eq("id", shortlistId);

      if (error) {
        logger.error("Error updating shortlist status:", error);
        throw new APIError(
          "Failed to update shortlist status",
          500,
          "SHORTLIST_UPDATE_ERROR"
        );
      }
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in updateShortlistStatus:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  async addCandidateToShortlist(
    shortlistId: string,
    candidateId: string,
    evaluationId: string,
    manual: boolean = true
  ): Promise<void> {
    try {
      const { error } = await supabase.from("shortlist_candidates").insert({
        shortlist_id: shortlistId,
        candidate_id: candidateId,
        evaluation_id: evaluationId,
        selected_manually: manual,
      });

      if (error) {
        logger.error("Error adding candidate to shortlist:", error);
        throw new APIError(
          "Failed to add candidate to shortlist",
          500,
          "SHORTLIST_ADD_CANDIDATE_ERROR"
        );
      }

      // Update candidate count
      await this.updateCandidateCount(shortlistId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in addCandidateToShortlist:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  async removeCandidateFromShortlist(
    shortlistId: string,
    candidateId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("shortlist_candidates")
        .delete()
        .eq("shortlist_id", shortlistId)
        .eq("candidate_id", candidateId);

      if (error) {
        logger.error("Error removing candidate from shortlist:", error);
        throw new APIError(
          "Failed to remove candidate from shortlist",
          500,
          "SHORTLIST_REMOVE_CANDIDATE_ERROR"
        );
      }

      // Update candidate count
      await this.updateCandidateCount(shortlistId);
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in removeCandidateFromShortlist:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  private async selectCandidatesAutomatically(
    jobPostingId: string,
    criteria: CreateShortlistRequest["selectionCriteria"]
  ): Promise<string[]> {
    try {
      let query = supabase
        .from("evaluations")
        .select(
          `
          id,
          resume_id,
          overall_score,
          resumes!inner (
            candidate_id,
            candidates!inner (id)
          )
        `
        )
        .eq("job_posting_id", jobPostingId)
        .eq("status", "completed")
        .order("overall_score", { ascending: false });

      // Apply minimum score filter
      if (criteria.minimumScore) {
        query = query.gte("overall_score", criteria.minimumScore);
      }

      const { data: evaluations, error } = await query;

      if (error) {
        logger.error("Error selecting candidates automatically:", error);
        throw new APIError(
          "Failed to select candidates",
          500,
          "CANDIDATE_SELECTION_ERROR"
        );
      }

      let selectedCandidates = evaluations || [];

      // Apply top candidate count limit
      if (criteria.topCandidateCount && criteria.topCandidateCount > 0) {
        selectedCandidates = selectedCandidates.slice(
          0,
          criteria.topCandidateCount
        );
      }

      // Filter by required skills if specified
      if (criteria.requiredSkills && criteria.requiredSkills.length > 0) {
        selectedCandidates = await this.filterByRequiredSkills(
          selectedCandidates,
          criteria.requiredSkills
        );
      }

      return selectedCandidates.map(
        (evaluation: any) => evaluation.resumes.candidate_id
      );
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in selectCandidatesAutomatically:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  private async filterByRequiredSkills(
    evaluations: any[],
    requiredSkills: string[]
  ): Promise<any[]> {
    const filtered = [];

    for (const evaluation of evaluations) {
      const { data: skillMatches, error } = await supabase
        .from("skill_matches")
        .select("skill_name, matched")
        .eq("evaluation_id", evaluation.id)
        .in("skill_name", requiredSkills);

      if (error) {
        logger.error("Error filtering by required skills:", error);
        continue;
      }

      const matchedRequiredSkills =
        skillMatches?.filter((sm) => sm.matched) || [];
      const matchPercentage =
        matchedRequiredSkills.length / requiredSkills.length;

      // Include candidate if they match at least 70% of required skills
      if (matchPercentage >= 0.7) {
        filtered.push(evaluation);
      }
    }

    return filtered;
  }

  private async addCandidatesToShortlist(
    shortlistId: string,
    candidateIds: string[],
    manual: boolean
  ): Promise<void> {
    try {
      // Get evaluation IDs for candidates
      const { data: evaluations, error } = await supabase
        .from("evaluations")
        .select("id, resumes!inner(candidate_id)")
        .in("resumes.candidate_id", candidateIds);

      if (error) {
        logger.error("Error fetching evaluations for candidates:", error);
        throw new APIError(
          "Failed to fetch candidate evaluations",
          500,
          "EVALUATION_FETCH_ERROR"
        );
      }

      const candidateEvaluations =
        evaluations?.map((evaluation) => ({
          shortlist_id: shortlistId,
          candidate_id: (evaluation.resumes as any).candidate_id,
          evaluation_id: evaluation.id,
          selected_manually: manual,
        })) || [];

      if (candidateEvaluations.length > 0) {
        const { error: insertError } = await supabase
          .from("shortlist_candidates")
          .insert(candidateEvaluations);

        if (insertError) {
          logger.error("Error inserting shortlist candidates:", insertError);
          throw new APIError(
            "Failed to add candidates to shortlist",
            500,
            "SHORTLIST_INSERT_ERROR"
          );
        }
      }
    } catch (error) {
      if (error instanceof APIError) throw error;
      logger.error("Error in addCandidatesToShortlist:", error);
      throw new APIError("Internal server error", 500, "INTERNAL_ERROR");
    }
  }

  private async updateCandidateCount(shortlistId: string): Promise<void> {
    const { data, error } = await supabase
      .from("shortlist_candidates")
      .select("id")
      .eq("shortlist_id", shortlistId);

    if (!error && data) {
      await supabase
        .from("shortlists")
        .update({ candidate_count: data.length })
        .eq("id", shortlistId);
    }
  }

  private mapShortlistFromDB(data: any): Shortlist {
    return {
      id: data.id,
      jobPostingId: data.job_posting_id,
      createdBy: data.created_by,
      selectionCriteria: data.selection_criteria || {},
      candidateCount: data.candidate_count || 0,
      status: data.status,
      createdAt: new Date(data.created_at),
    };
  }

  private mapShortlistCandidateFromDB(data: any): ShortlistCandidate {
    return {
      id: data.id,
      shortlistId: data.shortlist_id,
      candidateId: data.candidate_id,
      evaluationId: data.evaluation_id,
      selectedManually: data.selected_manually,
      candidate: data.candidates
        ? {
            id: data.candidates.id,
            firstName: data.candidates.first_name,
            lastName: data.candidates.last_name,
            email: data.candidates.email,
            phone: data.candidates.phone,
            createdAt: new Date(data.candidates.created_at),
          }
        : undefined,
      evaluation: data.evaluations
        ? {
            id: data.evaluations.id,
            resumeId: data.evaluations.resume_id,
            jobPostingId: data.evaluations.job_posting_id,
            overallScore: data.evaluations.overall_score,
            skillScore: data.evaluations.skill_score,
            experienceScore: data.evaluations.experience_score,
            educationScore: data.evaluations.education_score,
            evaluationDetails: data.evaluations.evaluation_details || {},
            status: data.evaluations.status,
            evaluatedAt: new Date(data.evaluations.evaluated_at),
          }
        : undefined,
    };
  }
}

export const shortlistService = new ShortlistService();
