import request from "supertest";
import { evaluationService } from "../services/evaluationService";
import { resumeService } from "../services/resumeService";
import { jobPostingService } from "../services/jobPostingService";
import { supabaseAdmin } from "../config/supabase";

// Mock the services
jest.mock("../services/resumeService");
jest.mock("../services/jobPostingService");
jest.mock("../config/supabase");
jest.mock("axios");

const mockResumeService = resumeService as jest.Mocked<typeof resumeService>;
const mockJobPostingService = jobPostingService as jest.Mocked<
  typeof jobPostingService
>;
const mockSupabaseAdmin = supabaseAdmin as any;

describe("EvaluationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase admin
    mockSupabaseAdmin.from = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: "eval-1",
              resume_id: "resume-1",
              job_posting_id: "job-1",
              overall_score: 85.5,
              skill_score: 80.0,
              experience_score: 90.0,
              education_score: 85.0,
              evaluation_details: {
                skillMatches: [],
                experienceMatch: {},
                educationMatch: {},
                gapAnalysis: [],
                recommendations: [],
              },
              status: "completed",
              evaluated_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: "eval-1",
                resume_id: "resume-1",
                job_posting_id: "job-1",
                overall_score: 85.5,
                skill_score: 80.0,
                experience_score: 90.0,
                education_score: 85.0,
                evaluation_details: {},
                status: "completed",
                evaluated_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
          single: jest.fn().mockResolvedValue({
            data: {
              id: "eval-1",
              resume_id: "resume-1",
              job_posting_id: "job-1",
              overall_score: 85.5,
              skill_score: 80.0,
              experience_score: 90.0,
              education_score: 85.0,
              evaluation_details: {},
              status: "completed",
              evaluated_at: new Date().toISOString(),
            },
            error: null,
          }),
          order: jest.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  describe("createEvaluation", () => {
    it("should create evaluation successfully", async () => {
      // Mock resume and job posting
      const mockResume = {
        id: "resume-1",
        candidateId: "candidate-1",
        jobPostingId: "job-1",
        filePath: "/path/to/resume.pdf",
        fileName: "resume.pdf",
        fileSize: 1024,
        source: "direct" as const,
        parsedData: {
          skills: ["Python", "JavaScript"],
          experience: [],
          education: [],
        },
        status: "processed",
        uploadedAt: new Date(),
      };

      const mockJobPosting = {
        id: "job-1",
        title: "Software Engineer",
        description: "Looking for a software engineer",
        requirements: ["Python", "JavaScript"],
        status: "active",
        createdBy: "user-1",
        parsedRequirements: {
          required_skills: ["Python", "JavaScript"],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockResumeService.getResumeById.mockResolvedValue(mockResume);
      mockJobPostingService.getJobPostingById.mockResolvedValue(mockJobPosting);

      // Mock axios for ML service call
      const axios = require("axios");
      axios.post.mockResolvedValue({
        data: {
          overall_score: 85.5,
          skill_score: 80.0,
          experience_score: 90.0,
          education_score: 85.0,
          skill_matches: [
            {
              skill_name: "Python",
              required: true,
              matched: true,
              confidence_score: 0.95,
            },
          ],
          experience_match: {
            total_years: 3,
            relevant_years: 2.5,
            experience_score: 0.9,
            relevant_positions: ["Software Engineer"],
          },
          education_match: {
            degree_match: true,
            field_match: true,
            education_score: 0.85,
            matched_degrees: ["Bachelor's CS"],
          },
          gap_analysis: ["No significant gaps"],
          recommendations: ["Strong Python skills"],
          evaluation_summary: "Excellent match",
        },
      });

      const evaluation = await evaluationService.createEvaluation({
        resumeId: "resume-1",
        jobPostingId: "job-1",
      });

      expect(evaluation).toBeDefined();
      expect(evaluation.id).toBe("eval-1");
      expect(evaluation.overallScore).toBe(85.5);
      expect(mockResumeService.getResumeById).toHaveBeenCalledWith("resume-1");
      expect(mockJobPostingService.getJobPostingById).toHaveBeenCalledWith(
        "job-1"
      );
    });

    it("should throw error when resume not found", async () => {
      mockResumeService.getResumeById.mockResolvedValue(null);

      await expect(
        evaluationService.createEvaluation({
          resumeId: "nonexistent",
          jobPostingId: "job-1",
        })
      ).rejects.toThrow("Resume not found");
    });

    it("should throw error when job posting not found", async () => {
      const mockResume = {
        id: "resume-1",
        candidateId: "candidate-1",
        jobPostingId: "job-1",
        filePath: "/path/to/resume.pdf",
        fileName: "resume.pdf",
        fileSize: 1024,
        source: "direct" as const,
        parsedData: {},
        status: "processed",
        uploadedAt: new Date(),
      };

      mockResumeService.getResumeById.mockResolvedValue(mockResume);
      mockJobPostingService.getJobPostingById.mockResolvedValue(null);

      await expect(
        evaluationService.createEvaluation({
          resumeId: "resume-1",
          jobPostingId: "nonexistent",
        })
      ).rejects.toThrow("Job posting not found");
    });
  });

  describe("getEvaluationById", () => {
    it("should return evaluation when found", async () => {
      const evaluation = await evaluationService.getEvaluationById("eval-1");

      expect(evaluation).toBeDefined();
      expect(evaluation?.id).toBe("eval-1");
    });

    it("should return null when evaluation not found", async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" },
            }),
          }),
        }),
      });

      const evaluation = await evaluationService.getEvaluationById(
        "nonexistent"
      );
      expect(evaluation).toBeNull();
    });
  });

  describe("batchEvaluate", () => {
    it("should perform batch evaluation successfully", async () => {
      const mockJobPosting = {
        id: "job-1",
        title: "Software Engineer",
        description: "Looking for a software engineer",
        requirements: ["Python", "JavaScript"],
        status: "active",
        createdBy: "user-1",
        parsedRequirements: {
          required_skills: ["Python", "JavaScript"],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResumes = [
        {
          id: "resume-1",
          candidateId: "candidate-1",
          jobPostingId: "job-1",
          filePath: "/path/to/resume1.pdf",
          fileName: "resume1.pdf",
          fileSize: 1024,
          source: "direct" as const,
          parsedData: { skills: ["Python"] },
          status: "processed",
          uploadedAt: new Date(),
          candidate: {
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
          },
        },
      ];

      mockJobPostingService.getJobPostingById.mockResolvedValue(mockJobPosting);
      mockResumeService.getResumesByJobPosting.mockResolvedValue(mockResumes);

      // Mock that no existing evaluations exist
      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: "eval-1",
                resume_id: "resume-1",
                job_posting_id: "job-1",
                overall_score: 75.0,
                skill_score: 70.0,
                experience_score: 80.0,
                education_score: 75.0,
                evaluation_details: {},
                status: "completed",
                evaluated_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock ML service batch response
      const axios = require("axios");
      axios.post.mockResolvedValue({
        data: {
          evaluations: [
            {
              overall_score: 75.0,
              skill_score: 70.0,
              experience_score: 80.0,
              education_score: 75.0,
              skill_matches: [],
              experience_match: {},
              education_match: {},
              gap_analysis: [],
              recommendations: [],
            },
          ],
        },
      });

      const result = await evaluationService.batchEvaluate({
        jobPostingId: "job-1",
      });

      expect(result).toBeDefined();
      expect(result.jobId).toBe("job-1");
      expect(result.totalCandidates).toBe(1);
      expect(result.processedCandidates).toBe(1);
      expect(result.failedCandidates).toBe(0);
    });

    it("should handle batch evaluation with specific resume IDs", async () => {
      const mockJobPosting = {
        id: "job-1",
        title: "Software Engineer",
        description: "Looking for a software engineer",
        requirements: ["Python"],
        status: "active",
        createdBy: "user-1",
        parsedRequirements: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResume = {
        id: "resume-1",
        candidateId: "candidate-1",
        jobPostingId: "job-1",
        filePath: "/path/to/resume.pdf",
        fileName: "resume.pdf",
        fileSize: 1024,
        source: "direct" as const,
        parsedData: {},
        status: "processed",
        uploadedAt: new Date(),
      };

      mockJobPostingService.getJobPostingById.mockResolvedValue(mockJobPosting);
      mockResumeService.getResumeById.mockResolvedValue(mockResume);

      const result = await evaluationService.batchEvaluate({
        jobPostingId: "job-1",
        resumeIds: ["resume-1"],
      });

      expect(result).toBeDefined();
      expect(mockResumeService.getResumeById).toHaveBeenCalledWith("resume-1");
    });
  });

  describe("deleteEvaluation", () => {
    it("should delete evaluation successfully", async () => {
      await evaluationService.deleteEvaluation("eval-1");

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("skill_matches");
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("evaluations");
    });
  });

  describe("getEvaluationsByJobPosting", () => {
    it("should return evaluations for job posting", async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: "eval-1",
                  resume_id: "resume-1",
                  job_posting_id: "job-1",
                  overall_score: 85.5,
                  skill_score: 80.0,
                  experience_score: 90.0,
                  education_score: 85.0,
                  evaluation_details: {},
                  status: "completed",
                  evaluated_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
          }),
        }),
      });

      const evaluations = await evaluationService.getEvaluationsByJobPosting(
        "job-1"
      );

      expect(evaluations).toHaveLength(1);
      expect(evaluations.evaluations[0].id).toBe("eval-1");
    });
  });

  describe("getEvaluationByResumeAndJob", () => {
    it("should return evaluation for specific resume and job", async () => {
      const evaluation = await evaluationService.getEvaluationByResumeAndJob(
        "resume-1",
        "job-1"
      );

      expect(evaluation).toBeDefined();
      expect(evaluation?.resumeId).toBe("resume-1");
      expect(evaluation?.jobPostingId).toBe("job-1");
    });
  });
});

describe("Evaluation API Endpoints", () => {
  // These would be integration tests with the actual Express app
  // For now, we'll focus on unit tests for the service layer

  it("should be tested with integration tests", () => {
    // Placeholder for integration tests
    expect(true).toBe(true);
  });
});
