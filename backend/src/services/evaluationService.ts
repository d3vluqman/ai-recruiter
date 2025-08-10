import { supabase } from "../config/supabase";
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
import { mlServiceClient, MLServiceClient } from "./mlServiceClient";
import { jobQueue } from "./jobQueue";
import { mlServiceFallbackHandler } from "../middleware/mlServiceFallback";
import { cacheService } from "./cacheService";

export class EvaluationService {
  constructor() {
    // Set up job queue event handlers
    this.setupJobQueueHandlers();
  }

  private setupJobQueueHandlers(): void {
    // Handle evaluation jobs
    jobQueue.on("processJob", async (job, resolve, reject) => {
      try {
        if (job.type === "single_evaluation") {
          const result = await this.processSingleEvaluationJob(job.data);
          resolve(result);
        } else if (job.type === "batch_evaluation") {
          const result = await this.processBatchEvaluationJob(job.data);
          resolve(result);
        } else {
          reject(new Error(`Unknown job type: ${job.type}`));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  async createEvaluationAsync(
    evaluationData: EvaluationRequest
  ): Promise<string> {
    // Add job to queue for async processing
    const jobId = await jobQueue.addJob("single_evaluation", evaluationData);
    logger.info(
      `Evaluation job ${jobId} queued for resume ${evaluationData.resumeId}`
    );
    return jobId;
  }

  async batchEvaluateAsync(request: BatchEvaluationRequest): Promise<string> {
    // Add job to queue for async processing
    const jobId = await jobQueue.addJob("batch_evaluation", request);
    logger.info(
      `Batch evaluation job ${jobId} queued for job posting ${request.jobPostingId}`
    );
    return jobId;
  }

  async getEvaluationJobStatus(jobId: string): Promise<any> {
    const job = jobQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
      result: job.result,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
    };
  }

  async checkMLServiceHealth(): Promise<boolean> {
    try {
      return await mlServiceClient.healthCheck();
    } catch (error) {
      logger.error("ML service health check failed:", error);
      return false;
    }
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
      const { data, error } = await supabase
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

      const evaluation = await this.mapDatabaseToEvaluation(data);

      // Store skill matches separately
      if (mlResult.skill_matches && mlResult.skill_matches.length > 0) {
        await this.storeSkillMatches(evaluation.id, mlResult.skill_matches);
      }

      // Invalidate related cache entries
      await this.invalidateEvaluationCache(
        evaluationData.jobPostingId,
        evaluation.id
      );

      return evaluation;
    } catch (error) {
      logger.error("EvaluationService.createEvaluation error:", error);
      throw error;
    }
  }

  async getEvaluationById(id: string): Promise<Evaluation | null> {
    try {
      // Try to get from cache first
      const cacheKey = `evaluation:${id}`;
      const cachedEvaluation = await cacheService.get<Evaluation>(cacheKey);

      if (cachedEvaluation) {
        logger.debug(`Cache hit for evaluation ${id}`);
        return cachedEvaluation;
      }

      const { data, error } = await supabase
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

      const evaluation = await this.mapDatabaseToEvaluation(data);

      // Cache the result for 1 hour
      await cacheService.set(cacheKey, evaluation, { ttl: 3600 });

      return evaluation;
    } catch (error) {
      logger.error("EvaluationService.getEvaluationById error:", error);
      throw error;
    }
  }

  async getEvaluationsByJobPosting(
    jobPostingId: string,
    options?: { page?: number; limit?: number; useCache?: boolean }
  ): Promise<{ evaluations: Evaluation[]; total: number; hasMore: boolean }> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 50;
      const useCache = options?.useCache !== false;
      const offset = (page - 1) * limit;

      // Try cache first if enabled
      const cacheKey = `evaluations:job:${jobPostingId}:page:${page}:limit:${limit}`;
      if (useCache) {
        const cached = await cacheService.get<{
          evaluations: Evaluation[];
          total: number;
          hasMore: boolean;
        }>(cacheKey);
        if (cached) {
          logger.debug(
            `Cache hit for evaluations job ${jobPostingId} page ${page}`
          );
          return cached;
        }
      }

      // Get total count
      const { count, error: countError } = await supabase
        .from("evaluations")
        .select("*", { count: "exact", head: true })
        .eq("job_posting_id", jobPostingId);

      if (countError) {
        logger.error("Error counting evaluations:", countError);
        throw new Error(`Failed to count evaluations: ${countError.message}`);
      }

      const total = count || 0;

      // Get paginated data
      const { data, error } = await supabase
        .from("evaluations")
        .select("*")
        .eq("job_posting_id", jobPostingId)
        .order("overall_score", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error("Error fetching evaluations by job posting:", error);
        throw new Error(`Failed to fetch evaluations: ${error.message}`);
      }

      const evaluations = await Promise.all(
        data.map((d) => this.mapDatabaseToEvaluation(d))
      );
      const hasMore = offset + limit < total;

      const result = { evaluations, total, hasMore };

      // Cache the result for 30 minutes
      if (useCache) {
        await cacheService.set(cacheKey, result, { ttl: 1800 });
      }

      return result;
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
      const { data, error } = await supabase
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

      return await this.mapDatabaseToEvaluation(data);
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
      const { data: resumesData, error: resumesError } = await supabase
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
      const { data: evaluationsData, error: evaluationsError } = await supabase
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
      const candidates = await Promise.all(
        resumesData.map(async (resume: any) => {
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
              ? await this.mapDatabaseToEvaluation(evaluation)
              : undefined,
          };
        })
      );

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
      await supabase.from("skill_matches").delete().eq("evaluation_id", id);

      // Delete evaluation
      const { error } = await supabase
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

  private async processSingleEvaluationJob(
    evaluationData: EvaluationRequest
  ): Promise<Evaluation> {
    return await this.createEvaluation(evaluationData);
  }

  private async processBatchEvaluationJob(
    request: BatchEvaluationRequest
  ): Promise<BatchEvaluationResult> {
    return await this.batchEvaluate(request);
  }

  private async callMLEvaluationService(
    resume: Resume,
    jobPosting: JobPosting,
    weights?: { skills: number; experience: number; education: number }
  ): Promise<any> {
    try {
      // NEW: Use hybrid approach with Gemini parsing
      const resumeData = await this.parseResumeWithGemini(resume);
      const jobRequirements = await this.parseJobPostingWithGemini(jobPosting);

      // Check if ML service is healthy for evaluation (not parsing)
      const isHealthy = await mlServiceFallbackHandler.checkServiceHealth();

      if (!isHealthy && mlServiceFallbackHandler.shouldUseFallback()) {
        logger.warn(
          "ML service unavailable, using fallback evaluation with Gemini-parsed data"
        );
        return mlServiceFallbackHandler.generateFallbackEvaluation(
          resumeData,
          jobRequirements
        );
      }

      // Use ML service for evaluation with Gemini-parsed data
      const result = await mlServiceClient.evaluateCandidate(
        resumeData,
        jobRequirements,
        weights
      );

      return result;
    } catch (error) {
      logger.error("Hybrid evaluation call failed:", error);

      // Fallback to original method if Gemini fails
      logger.warn("Falling back to original parsing and evaluation");
      return this.callOriginalMLEvaluationService(resume, jobPosting, weights);
    }
  }

  // Keep original method as fallback
  private async callOriginalMLEvaluationService(
    resume: Resume,
    jobPosting: JobPosting,
    weights?: { skills: number; experience: number; education: number }
  ): Promise<any> {
    try {
      // Check if ML service is healthy
      const isHealthy = await mlServiceFallbackHandler.checkServiceHealth();

      if (!isHealthy && mlServiceFallbackHandler.shouldUseFallback()) {
        logger.warn("ML service unavailable, using fallback evaluation");
        const resumeData = MLServiceClient.convertResumeToMLFormat(resume);
        const jobRequirements =
          MLServiceClient.convertJobPostingToMLFormat(jobPosting);
        return mlServiceFallbackHandler.generateFallbackEvaluation(
          resumeData,
          jobRequirements
        );
      }

      const resumeData = MLServiceClient.convertResumeToMLFormat(resume);
      const jobRequirements =
        MLServiceClient.convertJobPostingToMLFormat(jobPosting);

      const result = await mlServiceClient.evaluateCandidate(
        resumeData,
        jobRequirements,
        weights
      );

      return result;
    } catch (error) {
      logger.error("Original ML service evaluation call failed:", error);

      // Try fallback if enabled
      if (mlServiceFallbackHandler.shouldUseFallback()) {
        logger.warn("Using fallback evaluation due to ML service error");
        const resumeData = MLServiceClient.convertResumeToMLFormat(resume);
        const jobRequirements =
          MLServiceClient.convertJobPostingToMLFormat(jobPosting);
        return mlServiceFallbackHandler.generateFallbackEvaluation(
          resumeData,
          jobRequirements
        );
      }

      throw new Error("Failed to evaluate candidate using ML service");
    }
  }

  // NEW: Parse resume using Gemini
  private async parseResumeWithGemini(resume: Resume): Promise<any> {
    try {
      // DEBUG: Log what's actually in the resume data
      logger.info(
        `DEBUG: Resume ID ${resume.id}, parsedData keys: ${Object.keys(
          resume.parsedData || {}
        ).join(", ")}`
      );
      if (resume.parsedData) {
        logger.info(
          `DEBUG: parsedData.text length: ${
            resume.parsedData.text?.length || 0
          }`
        );
        logger.info(
          `DEBUG: parsedData.extractedText length: ${
            resume.parsedData.extractedText?.length || 0
          }`
        );
        logger.info(
          `DEBUG: parsedData.summary length: ${
            resume.parsedData.summary?.length || 0
          }`
        );
        logger.info(
          `DEBUG: parsedData structure: ${JSON.stringify(
            resume.parsedData,
            null,
            2
          ).substring(0, 500)}...`
        );
      }

      // Get the raw text from the resume - check different possible sources
      let resumeText = "";

      if (resume.parsedData?.text) {
        resumeText = resume.parsedData.text;
      } else if (resume.parsedData?.extractedText) {
        resumeText = resume.parsedData.extractedText;
      } else if (resume.parsedData?.summary) {
        resumeText = resume.parsedData.summary;
      } else if (resume.parsedData) {
        // Try to reconstruct text from parsed data
        const parts = [];
        if (resume.parsedData.personal_info?.name)
          parts.push(resume.parsedData.personal_info.name);
        if (resume.parsedData.personal_info?.email)
          parts.push(resume.parsedData.personal_info.email);
        if (resume.parsedData.skills?.length)
          parts.push("Skills: " + resume.parsedData.skills.join(", "));
        if (resume.parsedData.experience?.length) {
          parts.push("Experience:");
          resume.parsedData.experience.forEach((exp: any) => {
            if (exp.job_title && exp.company) {
              parts.push(`${exp.job_title} at ${exp.company}`);
            }
          });
        }
        resumeText = parts.join("\n");
      }

      logger.info(`DEBUG: Final resumeText length: ${resumeText.length}`);
      logger.info(
        `DEBUG: First 200 chars of resumeText: "${resumeText.substring(
          0,
          200
        )}"`
      );

      // If no text available from parsed data, try to extract directly from file
      if (!resumeText || resumeText.length < 50) {
        logger.info(
          `No parsed text available, attempting to extract directly from file: ${resume.filePath}`
        );
        try {
          const { documentParser } = await import("../utils/documentParser");
          resumeText = await documentParser.extractText(resume.filePath);
          logger.info(
            `Successfully extracted ${resumeText.length} characters from file`
          );
        } catch (fileError) {
          logger.error(
            `Failed to extract text from file ${resume.filePath}:`,
            fileError
          );
          logger.warn("Falling back to existing parsed data");
          return MLServiceClient.convertResumeToMLFormat(resume);
        }
      }

      if (!resumeText || resumeText.length < 50) {
        logger.warn(
          `Still insufficient resume text available (${resumeText.length} chars), falling back to existing parsed data`
        );
        return MLServiceClient.convertResumeToMLFormat(resume);
      }

      logger.info(
        `Using Gemini to parse resume text (${resumeText.length} characters)`
      );

      // Use Gemini to parse the resume text
      const geminiParsedData = await mlServiceClient.parseResumeTextWithGemini(
        resumeText
      );

      logger.info("Successfully parsed resume with Gemini");
      return geminiParsedData;
    } catch (error) {
      logger.error("Failed to parse resume with Gemini:", error);
      // Fallback to existing parsed data
      return MLServiceClient.convertResumeToMLFormat(resume);
    }
  }

  // NEW: Parse job posting using Gemini
  private async parseJobPostingWithGemini(
    jobPosting: JobPosting
  ): Promise<any> {
    try {
      // Get the raw text from the job posting, combining description and requirements
      let jobText = jobPosting.description || "";

      // Add requirements if they exist
      if (jobPosting.requirements && jobPosting.requirements.length > 0) {
        jobText += "\n\nRequirements:\n" + jobPosting.requirements.join("\n");
      }

      if (!jobText.trim()) {
        logger.warn(
          "No job description or requirements text available, falling back to existing parsed data"
        );
        return MLServiceClient.convertJobPostingToMLFormat(jobPosting);
      }

      // Debug logging for complete job text
      logger.info("DEBUG: Complete job text being sent to Gemini:", {
        description_length: jobPosting.description?.length || 0,
        requirements_count: jobPosting.requirements?.length || 0,
        total_text_length: jobText.length,
        contains_experience: jobText.toLowerCase().includes("experience"),
        contains_years: jobText.toLowerCase().includes("year"),
        contains_degree: jobText.toLowerCase().includes("degree"),
      });

      // Use Gemini to parse the job description
      const geminiParsedData =
        await mlServiceClient.parseJobDescriptionTextWithGemini(jobText);

      logger.info("Successfully parsed job posting with Gemini");
      return geminiParsedData;
    } catch (error) {
      logger.error("Failed to parse job posting with Gemini:", error);
      // Fallback to existing parsed data
      return MLServiceClient.convertJobPostingToMLFormat(jobPosting);
    }
  }

  private async callMLBatchEvaluationService(
    candidatesData: any[],
    jobPosting: JobPosting,
    weights?: { skills: number; experience: number; education: number }
  ): Promise<any> {
    try {
      // Check if ML service is healthy
      const isHealthy = await mlServiceFallbackHandler.checkServiceHealth();

      if (!isHealthy && mlServiceFallbackHandler.shouldUseFallback()) {
        logger.warn("ML service unavailable, using fallback batch evaluation");
        const jobRequirements =
          MLServiceClient.convertJobPostingToMLFormat(jobPosting);
        return mlServiceFallbackHandler.generateFallbackBatchEvaluation(
          candidatesData,
          jobRequirements
        );
      }

      const jobRequirements =
        MLServiceClient.convertJobPostingToMLFormat(jobPosting);

      const batchRequest = {
        job_requirements: jobRequirements,
        candidates: candidatesData.map((candidate) => ({
          candidate_id: candidate.candidate_id,
          job_id: candidate.job_id,
          resume_data: MLServiceClient.convertResumeToMLFormat({
            parsedData: candidate.resume_data,
          } as Resume),
        })),
        weights,
      };

      const result = await mlServiceClient.batchEvaluateCandidates(
        batchRequest
      );
      return result;
    } catch (error) {
      logger.error("ML service batch evaluation call failed:", error);

      // Try fallback if enabled
      if (mlServiceFallbackHandler.shouldUseFallback()) {
        logger.warn("Using fallback batch evaluation due to ML service error");
        const jobRequirements =
          MLServiceClient.convertJobPostingToMLFormat(jobPosting);
        return mlServiceFallbackHandler.generateFallbackBatchEvaluation(
          candidatesData,
          jobRequirements
        );
      }

      throw new Error("Failed to perform batch evaluation using ML service");
    }
  }

  private async storeEvaluationResult(
    resumeId: string,
    jobPostingId: string,
    mlResult: any
  ): Promise<Evaluation> {
    try {
      const { data, error } = await supabase
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

      const evaluation = await this.mapDatabaseToEvaluation(data);

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

      const { error } = await supabase
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

  private async invalidateEvaluationCache(
    jobPostingId: string,
    evaluationId: string
  ): Promise<void> {
    try {
      // Invalidate specific evaluation cache
      await cacheService.del(`evaluation:${evaluationId}`);

      // Invalidate job posting evaluations cache (all pages)
      await cacheService.invalidatePattern(`evaluations:job:${jobPostingId}:*`);

      // Invalidate candidates with evaluations cache
      await cacheService.del(`candidates:job:${jobPostingId}`);

      logger.debug(
        `Cache invalidated for evaluation ${evaluationId} and job ${jobPostingId}`
      );
    } catch (error) {
      logger.error("Error invalidating evaluation cache:", error);
    }
  }

  private async mapDatabaseToEvaluation(data: any): Promise<Evaluation> {
    // Load skill matches from separate table
    const { data: skillMatchesData, error: skillMatchesError } = await supabase
      .from("skill_matches")
      .select("*")
      .eq("evaluation_id", data.id);

    if (skillMatchesError) {
      logger.error("Error loading skill matches:", skillMatchesError);
    }

    // Transform skill matches to frontend format
    const skillMatches = (skillMatchesData || []).map((sm: any) => ({
      skillName: sm.skill_name,
      required: sm.required,
      matched: sm.matched,
      confidenceScore: sm.confidence_score || 0,
      similarityScore: sm.similarity_score || sm.confidence_score || 0,
    }));

    const evaluationDetails = data.evaluation_details || {};

    return {
      id: data.id,
      resumeId: data.resume_id,
      jobPostingId: data.job_posting_id,
      overallScore: parseFloat(data.overall_score),
      skillScore: parseFloat(data.skill_score),
      experienceScore: parseFloat(data.experience_score),
      educationScore: parseFloat(data.education_score),
      evaluationDetails: {
        skillMatches, // Use loaded skill matches instead of empty array
        experienceMatch: evaluationDetails.experienceMatch || {
          totalYears: 0,
          relevantYears: 0,
          experienceScore: 0,
          relevantPositions: [],
        },
        educationMatch: evaluationDetails.educationMatch || {
          degreeMatch: false,
          fieldMatch: false,
          educationScore: 0,
          matchedDegrees: [],
        },
        gapAnalysis: evaluationDetails.gapAnalysis || [],
        recommendations: evaluationDetails.recommendations || [],
        evaluationSummary: evaluationDetails.evaluationSummary,
      },
      status: data.status,
      evaluatedAt: new Date(data.evaluated_at),
    };
  }
}

export const evaluationService = new EvaluationService();
