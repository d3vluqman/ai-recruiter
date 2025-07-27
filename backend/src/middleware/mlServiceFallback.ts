import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { mlServiceClient } from "../services/mlServiceClient";

export interface MLServiceFallbackOptions {
  enableFallback: boolean;
  fallbackScores: {
    overall: number;
    skill: number;
    experience: number;
    education: number;
  };
  fallbackMessage: string;
}

const defaultOptions: MLServiceFallbackOptions = {
  enableFallback: process.env.ML_SERVICE_FALLBACK_ENABLED === "true",
  fallbackScores: {
    overall: 50.0,
    skill: 50.0,
    experience: 50.0,
    education: 50.0,
  },
  fallbackMessage: "ML service unavailable - using fallback evaluation",
};

export class MLServiceFallbackHandler {
  private options: MLServiceFallbackOptions;
  private lastHealthCheck: Date | null = null;
  private isHealthy = true;
  private healthCheckInterval = 30000; // 30 seconds

  constructor(options?: Partial<MLServiceFallbackOptions>) {
    this.options = { ...defaultOptions, ...options };

    // Start periodic health checks
    this.startHealthChecks();
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      try {
        this.isHealthy = await mlServiceClient.healthCheck();
        this.lastHealthCheck = new Date();

        if (!this.isHealthy) {
          logger.warn(
            "ML service health check failed - service may be unavailable"
          );
        }
      } catch (error) {
        this.isHealthy = false;
        this.lastHealthCheck = new Date();
        logger.error("ML service health check error:", error);
      }
    }, this.healthCheckInterval);
  }

  async checkServiceHealth(): Promise<boolean> {
    // If we haven't checked recently, do a fresh check
    if (
      !this.lastHealthCheck ||
      Date.now() - this.lastHealthCheck.getTime() > this.healthCheckInterval
    ) {
      try {
        this.isHealthy = await mlServiceClient.healthCheck();
        this.lastHealthCheck = new Date();
      } catch (error) {
        this.isHealthy = false;
        this.lastHealthCheck = new Date();
        logger.error("ML service health check error:", error);
      }
    }

    return this.isHealthy;
  }

  generateFallbackEvaluation(resumeData: any, jobRequirements: any): any {
    logger.warn(
      "Generating fallback evaluation due to ML service unavailability"
    );

    // Simple fallback logic based on basic matching
    const candidateSkills = resumeData.skills || [];
    const requiredSkills = jobRequirements.required_skills || [];

    // Calculate basic skill match percentage
    const matchedSkills = candidateSkills.filter((skill: string) =>
      requiredSkills.some(
        (reqSkill: string) =>
          skill.toLowerCase().includes(reqSkill.toLowerCase()) ||
          reqSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );

    const skillMatchPercentage =
      requiredSkills.length > 0
        ? (matchedSkills.length / requiredSkills.length) * 100
        : this.options.fallbackScores.skill;

    // Basic experience scoring
    const totalExperience = resumeData.total_experience_years || 0;
    const requiredExperience = jobRequirements.required_experience_years || 0;
    const experienceScore =
      requiredExperience > 0
        ? Math.min((totalExperience / requiredExperience) * 100, 100)
        : this.options.fallbackScores.experience;

    // Basic education scoring
    const hasEducation =
      resumeData.education && resumeData.education.length > 0;
    const educationScore = hasEducation
      ? this.options.fallbackScores.education + 20
      : this.options.fallbackScores.education;

    // Calculate overall score
    const overallScore =
      skillMatchPercentage * 0.4 + experienceScore * 0.4 + educationScore * 0.2;

    return {
      overall_score: Math.round(overallScore * 100) / 100,
      skill_score: Math.round(skillMatchPercentage * 100) / 100,
      experience_score: Math.round(experienceScore * 100) / 100,
      education_score: Math.round(educationScore * 100) / 100,
      skill_matches: matchedSkills.map((skill: string) => ({
        skill_name: skill,
        required: requiredSkills.includes(skill),
        matched: true,
        confidence_score: 0.5, // Low confidence for fallback
      })),
      experience_match: {
        total_years: totalExperience,
        relevant_years: totalExperience * 0.7, // Assume 70% relevant
        experience_score: experienceScore / 100,
        relevant_positions:
          resumeData.experience
            ?.map((exp: any) => exp.job_title)
            .filter(Boolean) || [],
      },
      education_match: {
        degree_match: hasEducation,
        field_match: hasEducation,
        education_score: educationScore / 100,
        matched_degrees:
          resumeData.education?.map((edu: any) => edu.degree).filter(Boolean) ||
          [],
      },
      gap_analysis: [
        "This evaluation was generated using fallback logic due to ML service unavailability",
        "Scores may be less accurate than normal ML-powered evaluations",
      ],
      recommendations: [
        "Manual review recommended due to fallback evaluation",
        this.options.fallbackMessage,
      ],
      evaluation_summary: `Fallback evaluation completed. ML service was unavailable at ${new Date().toISOString()}`,
    };
  }

  generateFallbackBatchEvaluation(
    candidates: any[],
    jobRequirements: any
  ): any {
    logger.warn(
      "Generating fallback batch evaluation due to ML service unavailability"
    );

    const evaluations = candidates.map((candidate) => ({
      candidate_id: candidate.candidate_id,
      job_id: candidate.job_id,
      ...this.generateFallbackEvaluation(
        candidate.resume_data,
        jobRequirements
      ),
    }));

    return {
      job_id: candidates[0]?.job_id,
      evaluations,
      total_candidates: candidates.length,
      processed_candidates: candidates.length,
      failed_candidates: 0,
      processing_time_seconds: 1.0, // Fallback is fast
    };
  }

  shouldUseFallback(): boolean {
    return this.options.enableFallback && !this.isHealthy;
  }

  getHealthStatus(): {
    healthy: boolean;
    lastCheck: Date | null;
    fallbackEnabled: boolean;
  } {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastHealthCheck,
      fallbackEnabled: this.options.enableFallback,
    };
  }
}

// Middleware to handle ML service fallback
export const mlServiceFallbackMiddleware = (
  fallbackHandler: MLServiceFallbackHandler
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Add fallback handler to request for use in controllers
    (req as any).mlFallbackHandler = fallbackHandler;
    next();
  };
};

// Singleton instance
export const mlServiceFallbackHandler = new MLServiceFallbackHandler();
