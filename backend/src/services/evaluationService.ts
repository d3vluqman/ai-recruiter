import { supabaseAdmin } from "../config/supabase";
import {
  Evaluation,
  EvaluationRequest,
  BatchEvaluationRequest,
  BatchEvaluationResult,
  SkillMatch,
  Resume,
  JobPosting,
} from "../types";
import { logger } from "../utils/logger";
import { resumeService } from "./resumeService";
import { jobPostingService } from "./jobPostingService";
import axios from "axios";

export class EvaluationService {
  private mlServiceUrl: string;

  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8001";
  }

  async createEvaluation(
    evaluationData: EvaluationRequest
  ): Promise<Evaluation> {
    try {
      // Get resume and job posting data
      const resume = await resumeService.getResumeById(evaluationData.resumeId);
      const jobPosting = await jobPostingService.getJobPostingById(
        evaluationData.jobPostingId
      );

      if (!resume) {
        throw new Error("Resume not found");
      }
      if (!jobPosting) {
        throw new Error("Job posting not found");
      }

      // Call ML service for evaluation
      const mlResult = await this.callMLEvaluationService(
        resume,
        jobPosting,
        evaluationData.weights
      );

      // Store evaluation in database
      const { data, error } = await supabaseAdmin!
        .from("evaluations")
        .insert({
          resume_id: evaluationData.resumeId,
          job_posting_id: evaluationData.jobPostingId,
          overall_score: mlResult.overall_score,
          skill_score: mlResult.skill_score,
          experience_score: mlResult.experience_score,
          education_score: mlResult.education_score,
          evaluation_details: {
            skillMatches: mlResult.skill_matches,
            experienceMatch: mlResult.experience_match,
            educationMatch: mlResult.education_match,
            gapAnalysis: mlResult.gap_analysis,
            recommendations: mlResult.recommendations,
            evaluationSummary: mlResult.evaluation_summary,
          },
          status: "completed",
        })
        .select()
        .single();

      if (error) {
        logger.error("Error creating evaluation:", error);
        throw new Error(`Failed to create evaluation: ${error.message}`);
      }

      const evaluation = this.mapDatabaseToEvaluation(data);

      // Store skill matches separately
      if (mlResult.skill_matches && mlResult.skill_matches.length > 0) {
        await this.storeSkillMatches(evaluation.id, mlResult.skill_matches);
      }

      return evaluation;
    } catch (error) {
      logger.error("EvaluationService.createEvaluation error:", error);
      throw error;
    }
  }

  async getEvaluationById(id: string): Promise<Evaluation | null> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("evaluations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        logger.error("Error fetching evaluation:", error);
        throw new Error(`Failed to fetch evaluation: ${error.message}`);
      }

      return this.mapDatabaseToEvaluation(data);
    } catch (error) {
      logger.error("EvaluationService.getEvaluationById error:", error);
      throw error;
    }
  }

  async getEvaluationsByJobPosting(
    jobPostingId: string
  ): Promise<Evaluation[]> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("evaluations")
        .select("*")
        .eq("job_posting_id", jobPostingId)
        .order("overall_score", { ascending: false });

      if (error) {
        logger.error("Error fetching evaluations by job posting:", error);
        throw new Error(`Failed to fetch evaluations: ${error.message}`);
      }

      return data.map(this.mapDatabaseToEvaluation);
    } catch (error) {
      logger.error(
        "EvaluationService.getEvaluationsByJobPosting error:",
        error
      );
      throw error;
    }
  }

  async getEvaluationByResumeAndJob(
    resumeId: string,
    jobPostingId: string
  ): Promise<Evaluation | null> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("evaluations")
        .select("*")
        .eq("resume_id", resumeId)
        .eq("job_posting_id", jobPostingId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        logger.error("Error fetching evaluation by resume and job:", error);
        throw new Error(`Failed to fetch evaluation: ${error.message}`);
      }

      return this.mapDatabaseToEvaluation(data);
    } catch (error) {
      logger.error(
        "EvaluationService.getEvaluationByResumeAndJob error:",
        error
      );
      throw error;
    }
  }

  async batchEvaluate(
    request: BatchEvaluationRequest
  ): Promise<BatchEvaluationResult> {
    try {
      const startTime = Date.now();

      // Get job posting
      const jobPosting = await jobPostingService.getJobPostingById(
        request.jobPostingId
      );
      if (!jobPosting) {
        throw new Error("Job posting not found");
      }

      // Get resumes to evaluate
      let resumes: Resume[];
      if (request.resumeIds && request.resumeIds.length > 0) {
        // Evaluate specific resumes
        resumes = [];
        for (const resumeId of request.resumeIds) {
          const resume = await resumeService.getResumeById(resumeId);
          if (resume) {
            resumes.push(resume);
          }
        }
      } else {
        // Evaluate all resumes for the job posting
        const resumesWithCandidate = await resumeService.getResumesByJobPosting(
          request.jobPostingId
        );
        resumes = resumesWithCandidate.map((r) => ({
          id: r.id,
          candidateId: r.candidateId,
          jobPostingId: r.jobPostingId,
          filePath: r.filePath,
          fileName: r.fileName,
          fileSize: r.fileSize,
          source: r.source,
          parsedData: r.parsedData,
          status: r.status,
          uploadedAt: r.uploadedAt,
        }));
      }

      // Filter out resumes that already have evaluations
      const resumesToEvaluate = [];
      for (const resume of resumes) {
        const existingEvaluation = await this.getEvaluationByResumeAndJob(
          resume.id,
          request.jobPostingId
        );
        if (!existingEvaluation) {
          resumesToEvaluate.push(resume);
        }
      }

      // Prepare batch request for ML service
      const candidatesData = resumesToEvaluate.map((resume) => ({
        candidate_id: resume.candidateId,
        job_id: request.jobPostingId,
        resume_data: resume.parsedData || {},
      }));

      let evaluations: Evaluation[] = [];
      let processedCount = 0;
      let failedCount = 0;

      if (candidatesData.length > 0) {
        try {
          // Call ML service for batch evaluation
          const mlBatchResult = await this.callMLBatchEvaluationService(
            candidatesData,
            jobPosting,
            request.weights
          );

          // Store evaluations in database
          for (let i = 0; i < mlBatchResult.evaluations.length; i++) {
            const mlEvaluation = mlBatchResult.evaluations[i];
            const resume = resumesToEvaluate[i];

            try {
              const evaluation = await this.storeEvaluationResult(
                resume.id,
                request.jobPostingId,
                mlEvaluation
              );
              evaluations.push(evaluation);
              processedCount++;
            } catch (error) {
              logger.error(
                `Failed to store evaluation for resume ${resume.id}:`,
                error
              );
              failedCount++;
            }
          }
        } catch (error) {
          logger.error("Batch ML evaluation failed:", error);
          failedCount = candidatesData.length;
        }
      }

      const processingTime = (Date.now() - startTime) / 1000;

      return {
        jobId: request.jobPostingId,
        totalCandidates: resumes.length,
        processedCandidates: processedCount,
        failedCandidates: failedCount,
        processingTimeSeconds: processingTime,
        evaluations,
      };
    } catch (error) {
      logger.error("EvaluationService.batchEvaluate error:", error);
      throw error;
    }
  }

  async getCandidatesWithEvaluations(jobPostingId: string): Promise<any[]> {
    try {
      // Get all resumes for the job posting with candidate information
      const { data: resumesData, error: resumesError } = await supabaseAdmin!
        .from("resumes")
        .select(
          `
          id,
          candidate_id,
          file_name,
          uploaded_at,
          source,
          candidates (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `
        )
        .eq("job_posting_id", jobPostingId);

      if (resumesError) {
        logger.error("Error fetching resumes with candidates:", resumesError);
        throw new Error(`Failed to fetch resumes: ${resumesError.message}`);
      }

      // Get all evaluations for the job posting
      const { data: evaluationsData, error: evaluationsError } =
        await supabaseAdmin!
          .from("evaluations")
          .select("*")
          .eq("job_posting_id", jobPostingId);

      if (evaluationsError) {
        logger.error("Error fetching evaluations:", evaluationsError);
        throw new Error(
          `Failed to fetch evaluations: ${evaluationsError.message}`
        );
      }

      // Combine the data
      const candidates = resumesData.map((resume: any) => {
        const evaluation = evaluationsData.find(
          (evalData: any) => evalData.resume_id === resume.id
        );

        return {
          id: resume.candidates.id,
          firstName: resume.candidates.first_name,
          lastName: resume.candidates.last_name,
          email: resume.candidates.email,
          phone: resume.candidates.phone,
          resume: {
            id: resume.id,
            fileName: resume.file_name,
            uploadedAt: new Date(resume.uploaded_at),
            source: resume.source,
          },
          evaluation: evaluation
            ? this.mapDatabaseToEvaluation(evaluation)
            : undefined,
        };
      });

      return candidates;
    } catch (error) {
      logger.error(
        "EvaluationService.getCandidatesWithEvaluations error:",
        error
      );
      throw error;
    }
  }

  async deleteEvaluation(id: string): Promise<void> {
    try {
      // Delete skill matches first
      await supabaseAdmin!
        .from("skill_matches")
        .delete()
        .eq("evaluation_id", id);

      // Delete evaluation
      const { error } = await supabaseAdmin!
        .from("evaluations")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("Error deleting evaluation:", error);
        throw new Error(`Failed to delete evaluation: ${error.message}`);
      }
    } catch (error) {
      logger.error("EvaluationService.deleteEvaluation error:", error);
      throw error;
    }
  }

  private async callMLEvaluationService(
    resume: Resume,
    jobPosting: JobPosting,
    weights?: { skills: number; experience: number; education: number }
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.mlServiceUrl}/evaluate/candidate`,
        {
          resume_data: resume.parsedData || {},
          job_requirements: jobPosting.parsedRequirements || {
            title: jobPosting.title,
            description: jobPosting.description,
            required_skills: jobPosting.requirements || [],
          },
          weights,
        }
      );

      return response.data;
    } catch (error) {
      logger.error("ML service evaluation call failed:", error);
      throw new Error("Failed to evaluate candidate using ML service");
    }
  }

  private async callMLBatchEvaluationService(
    candidatesData: any[],
    jobPosting: JobPosting,
    weights?: { skills: number; experience: number; education: number }
  ): Promise<any> {
    try {
      const response = await axios.post(`${this.mlServiceUrl}/evaluate/batch`, {
        job_requirements: jobPosting.parsedRequirements || {
          title: jobPosting.title,
          description: jobPosting.description,
          required_skills: jobPosting.requirements || [],
        },
        candidates: candidatesData,
        weights,
      });

      return response.data;
    } catch (error) {
      logger.error("ML service batch evaluation call failed:", error);
      throw new Error("Failed to perform batch evaluation using ML service");
    }
  }

  private async storeEvaluationResult(
    resumeId: string,
    jobPostingId: string,
    mlResult: any
  ): Promise<Evaluation> {
    try {
      const { data, error } = await supabaseAdmin!
        .from("evaluations")
        .insert({
          resume_id: resumeId,
          job_posting_id: jobPostingId,
          overall_score: mlResult.overall_score,
          skill_score: mlResult.skill_score,
          experience_score: mlResult.experience_score,
          education_score: mlResult.education_score,
          evaluation_details: {
            skillMatches: mlResult.skill_matches,
            experienceMatch: mlResult.experience_match,
            educationMatch: mlResult.education_match,
            gapAnalysis: mlResult.gap_analysis,
            recommendations: mlResult.recommendations,
            evaluationSummary: mlResult.evaluation_summary,
          },
          status: "completed",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store evaluation: ${error.message}`);
      }

      const evaluation = this.mapDatabaseToEvaluation(data);

      // Store skill matches
      if (mlResult.skill_matches && mlResult.skill_matches.length > 0) {
        await this.storeSkillMatches(evaluation.id, mlResult.skill_matches);
      }

      return evaluation;
    } catch (error) {
      logger.error("Error storing evaluation result:", error);
      throw error;
    }
  }

  private async storeSkillMatches(
    evaluationId: string,
    skillMatches: any[]
  ): Promise<void> {
    try {
      const skillMatchData = skillMatches.map((sm) => ({
        evaluation_id: evaluationId,
        skill_name: sm.skill_name,
        required: sm.required,
        matched: sm.matched,
        confidence_score: sm.confidence_score,
      }));

      const { error } = await supabaseAdmin!
        .from("skill_matches")
        .insert(skillMatchData);

      if (error) {
        logger.error("Error storing skill matches:", error);
        // Don't throw here as evaluation is already stored
      }
    } catch (error) {
      logger.error("Error in storeSkillMatches:", error);
    }
  }

  private mapDatabaseToEvaluation(data: any): Evaluation {
    return {
      id: data.id,
      resumeId: data.resume_id,
      jobPostingId: data.job_posting_id,
      overallScore: parseFloat(data.overall_score),
      skillScore: parseFloat(data.skill_score),
      experienceScore: parseFloat(data.experience_score),
      educationScore: parseFloat(data.education_score),
      evaluationDetails: data.evaluation_details || {
        skillMatches: [],
        experienceMatch: {
          totalYears: 0,
          relevantYears: 0,
          experienceScore: 0,
          relevantPositions: [],
        },
        educationMatch: {
          degreeMatch: false,
          fieldMatch: false,
          educationScore: 0,
          matchedDegrees: [],
        },
        gapAnalysis: [],
        recommendations: [],
      },
      status: data.status,
      evaluatedAt: new Date(data.evaluated_at),
    };
  }
}

export const evaluationService = new EvaluationService();
