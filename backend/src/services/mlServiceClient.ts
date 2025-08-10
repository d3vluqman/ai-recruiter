import axios, { AxiosInstance, AxiosResponse } from "axios";
import { logger } from "../utils/logger";
import { Resume, JobPosting } from "../types";
import { geminiService } from "./geminiService";

export interface MLServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface MLResumeData {
  personal_info: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  skills: string[];
  experience: Array<{
    job_title?: string;
    company?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    duration_months?: number;
    description?: string;
    responsibilities: string[];
    technologies: string[];
  }>;
  education: Array<{
    degree?: string;
    field_of_study?: string;
    institution?: string;
    graduation_year?: number;
    gpa?: number;
  }>;
  certifications: string[];
  languages: string[];
  summary?: string;
  total_experience_years?: number;
}

export interface MLJobRequirements {
  title?: string;
  company?: string;
  location?: string;
  department?: string;
  employment_type?: string;
  experience_level?: string;
  required_skills: string[];
  preferred_skills: string[];
  required_experience_years?: number;
  required_education: string[];
  certifications: string[];
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  salary_range?: string;
  description?: string;
}

export interface MLEvaluationResult {
  candidate_id?: string;
  job_id?: string;
  overall_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  skill_matches: Array<{
    skill_name: string;
    required: boolean;
    matched: boolean;
    confidence_score: number;
    similarity_score?: number;
  }>;
  experience_match: {
    total_years: number;
    relevant_years: number;
    required_years?: number;
    experience_score: number;
    relevant_positions: string[];
  };
  education_match: {
    degree_match: boolean;
    field_match: boolean;
    education_score: number;
    matched_degrees: string[];
  };
  gap_analysis: string[];
  recommendations: string[];
  evaluation_summary?: string;
}

export interface MLBatchEvaluationRequest {
  job_requirements: MLJobRequirements;
  candidates: Array<{
    candidate_id?: string;
    job_id?: string;
    resume_data: MLResumeData;
  }>;
  weights?: {
    skills: number;
    experience: number;
    education: number;
  };
}

export interface MLBatchEvaluationResult {
  job_id?: string;
  evaluations: MLEvaluationResult[];
  total_candidates: number;
  processed_candidates: number;
  failed_candidates: number;
  processing_time_seconds: number;
}

export class MLServiceClient {
  private client: AxiosInstance;
  private config: MLServiceConfig;

  constructor(config?: Partial<MLServiceConfig>) {
    this.config = {
      baseUrl: process.env.ML_SERVICE_URL || "http://localhost:8001",
      timeout: parseInt(process.env.ML_SERVICE_TIMEOUT || "30000"),
      retryAttempts: parseInt(process.env.ML_SERVICE_RETRY_ATTEMPTS || "3"),
      retryDelay: parseInt(process.env.ML_SERVICE_RETRY_DELAY || "1000"),
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info(
          `ML Service Request: ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      (error) => {
        logger.error("ML Service Request Error:", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.info(
          `ML Service Response: ${response.status} ${response.config.url}`
        );
        return response;
      },
      (error) => {
        logger.error("ML Service Response Error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get("/health");
      return response.status === 200 && response.data.status === "healthy";
    } catch (error) {
      logger.error("ML Service health check failed:", error);
      return false;
    }
  }

  async parseResumeFile(file: Buffer, filename: string): Promise<MLResumeData> {
    try {
      const formData = new FormData();
      const blob = new Blob([file], { type: "application/octet-stream" });
      formData.append("file", blob, filename);

      const response = await this.retryRequest(() =>
        this.client.post("/parse/resume", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
      );

      return response.data;
    } catch (error) {
      logger.error("Failed to parse resume file:", error);
      throw new Error(
        `Resume parsing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async parseResumeText(text: string): Promise<MLResumeData> {
    try {
      const response = await this.retryRequest(() =>
        this.client.post("/parse/text/resume", { text })
      );

      return response.data;
    } catch (error) {
      logger.error("Failed to parse resume text:", error);
      throw new Error(
        `Resume text parsing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // NEW: Hybrid method using Gemini for parsing
  async parseResumeTextWithGemini(text: string): Promise<MLResumeData> {
    try {
      logger.info("Using Gemini for resume parsing");
      const parsedData = await geminiService.parseResume(text);

      // Convert Gemini response to ML service format
      return {
        personal_info: parsedData.personal_info,
        skills: parsedData.skills || [],
        experience: parsedData.experience || [],
        education: parsedData.education || [],
        certifications: parsedData.certifications || [],
        languages: parsedData.languages || [],
        summary: parsedData.summary,
        total_experience_years: parsedData.total_experience_years,
      };
    } catch (error) {
      logger.error("Failed to parse resume with Gemini:", error);
      // Fallback to original ML service
      logger.info("Falling back to original ML service for resume parsing");
      return this.parseResumeText(text);
    }
  }

  async parseJobDescriptionFile(
    file: Buffer,
    filename: string
  ): Promise<MLJobRequirements> {
    try {
      const formData = new FormData();
      const blob = new Blob([file], { type: "application/octet-stream" });
      formData.append("file", blob, filename);

      const response = await this.retryRequest(() =>
        this.client.post("/parse/job-description", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
      );

      return response.data;
    } catch (error) {
      logger.error("Failed to parse job description file:", error);
      throw new Error(
        `Job description parsing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async parseJobDescriptionText(text: string): Promise<MLJobRequirements> {
    try {
      const response = await this.retryRequest(() =>
        this.client.post("/parse/text/job-description", { text })
      );

      return response.data;
    } catch (error) {
      logger.error("Failed to parse job description text:", error);
      throw new Error(
        `Job description text parsing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // NEW: Hybrid method using Gemini for job description parsing
  async parseJobDescriptionTextWithGemini(
    text: string
  ): Promise<MLJobRequirements> {
    try {
      logger.info("Using Gemini for job description parsing");
      const parsedData = await geminiService.parseJobDescription(text);

      // Convert Gemini response to ML service format
      return {
        title: parsedData.title,
        company: parsedData.company,
        location: parsedData.location,
        department: parsedData.department,
        employment_type: parsedData.employment_type,
        experience_level: parsedData.experience_level,
        required_skills: parsedData.required_skills || [],
        preferred_skills: parsedData.preferred_skills || [],
        required_experience_years: parsedData.required_experience_years,
        required_education: parsedData.required_education || [],
        certifications: parsedData.certifications || [],
        responsibilities: parsedData.responsibilities || [],
        qualifications: parsedData.qualifications || [],
        benefits: parsedData.benefits || [],
        salary_range: parsedData.salary_range,
        description: parsedData.description,
      };
    } catch (error) {
      logger.error("Failed to parse job description with Gemini:", error);
      // Fallback to original ML service
      logger.info(
        "Falling back to original ML service for job description parsing"
      );
      return this.parseJobDescriptionText(text);
    }
  }

  async evaluateCandidate(
    resumeData: MLResumeData,
    jobRequirements: MLJobRequirements,
    weights?: { skills: number; experience: number; education: number }
  ): Promise<MLEvaluationResult> {
    try {
      // Debug logging for job requirements
      logger.info("DEBUG: Job requirements being sent to ML service:", {
        required_experience_years: jobRequirements.required_experience_years,
        required_education: jobRequirements.required_education,
        required_skills_count: jobRequirements.required_skills?.length || 0,
        preferred_skills_count: jobRequirements.preferred_skills?.length || 0,
      });

      const response = await this.retryRequest(() =>
        this.client.post("/evaluate/candidate", {
          resume_data: resumeData,
          job_requirements: jobRequirements,
          weights,
        })
      );

      return response.data;
    } catch (error) {
      logger.error("Failed to evaluate candidate:", error);
      throw new Error(
        `Candidate evaluation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async batchEvaluateCandidates(
    request: MLBatchEvaluationRequest
  ): Promise<MLBatchEvaluationResult> {
    try {
      const response = await this.retryRequest(() =>
        this.client.post("/evaluate/batch", request)
      );

      return response.data;
    } catch (error) {
      logger.error("Failed to batch evaluate candidates:", error);
      throw new Error(
        `Batch evaluation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    attempt: number = 1
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt >= this.config.retryAttempts) {
        throw error;
      }

      logger.warn(
        `ML Service request failed (attempt ${attempt}/${this.config.retryAttempts}), retrying...`
      );

      // Wait before retrying with exponential backoff
      const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.retryRequest(requestFn, attempt + 1);
    }
  }

  // Helper methods to convert between internal types and ML service types
  static convertResumeToMLFormat(resume: Resume): MLResumeData {
    const parsedData = resume.parsedData || {};

    return {
      personal_info: {
        name: parsedData.personal_info?.name,
        email: parsedData.personal_info?.email,
        phone: parsedData.personal_info?.phone,
        location: parsedData.personal_info?.location,
        linkedin: parsedData.personal_info?.linkedin,
        github: parsedData.personal_info?.github,
        website: parsedData.personal_info?.website,
      },
      skills: parsedData.skills || [],
      experience: parsedData.experience || [],
      education: parsedData.education || [],
      certifications: parsedData.certifications || [],
      languages: parsedData.languages || [],
      summary: parsedData.summary,
      total_experience_years: parsedData.total_experience_years,
    };
  }

  static convertJobPostingToMLFormat(
    jobPosting: JobPosting
  ): MLJobRequirements {
    const parsedRequirements = jobPosting.parsedRequirements || {};

    return {
      title: jobPosting.title,
      company: parsedRequirements.company,
      location: jobPosting.location,
      department: jobPosting.department,
      employment_type: parsedRequirements.employment_type,
      experience_level: parsedRequirements.experience_level,
      required_skills:
        parsedRequirements.required_skills || jobPosting.requirements || [],
      preferred_skills: parsedRequirements.preferred_skills || [],
      required_experience_years: parsedRequirements.required_experience_years,
      required_education: parsedRequirements.required_education || [],
      certifications: parsedRequirements.certifications || [],
      responsibilities: parsedRequirements.responsibilities || [],
      qualifications: parsedRequirements.qualifications || [],
      benefits: parsedRequirements.benefits || [],
      salary_range: parsedRequirements.salary_range,
      description: jobPosting.description,
    };
  }
}

export const mlServiceClient = new MLServiceClient();
