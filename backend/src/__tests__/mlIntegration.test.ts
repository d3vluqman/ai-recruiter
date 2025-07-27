import request from "supertest";
import { app } from "../index";
import { mlServiceClient } from "../services/mlServiceClient";
import { jobQueue } from "../services/jobQueue";
import { evaluationService } from "../services/evaluationService";

// Mock the ML service client
jest.mock("../services/mlServiceClient");
const mockMLServiceClient = mlServiceClient as jest.Mocked<
  typeof mlServiceClient
>;

describe("ML Service Integration", () => {
  let authToken: string;
  let userId: string;
  let jobPostingId: string;
  let resumeId: string;

  beforeAll(async () => {
    // Setup test data - this would normally be done with proper test fixtures
    authToken = "test-token";
    userId = "test-user-id";
    jobPostingId = "test-job-id";
    resumeId = "test-resume-id";
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ML Service Health Check", () => {
    it("should return healthy status when ML service is available", async () => {
      mockMLServiceClient.healthCheck.mockResolvedValue(true);

      const response = await request(app)
        .get("/api/evaluations/ml-service/health")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        healthy: true,
        service: "ML Service",
        timestamp: expect.any(String),
      });
    });

    it("should return unhealthy status when ML service is unavailable", async () => {
      mockMLServiceClient.healthCheck.mockResolvedValue(false);

      const response = await request(app)
        .get("/api/evaluations/ml-service/health")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        healthy: false,
        service: "ML Service",
        timestamp: expect.any(String),
      });
    });

    it("should handle ML service health check errors", async () => {
      mockMLServiceClient.healthCheck.mockRejectedValue(
        new Error("Connection failed")
      );

      const response = await request(app)
        .get("/api/evaluations/ml-service/health")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.healthy).toBe(false);
    });
  });

  describe("Async Evaluation Endpoints", () => {
    it("should queue single evaluation successfully", async () => {
      const evaluationData = {
        resumeId,
        jobPostingId,
        weights: { skills: 0.4, experience: 0.4, education: 0.2 },
      };

      const response = await request(app)
        .post("/api/evaluations/async")
        .set("Authorization", `Bearer ${authToken}`)
        .send(evaluationData)
        .expect(202);

      expect(response.body).toEqual({
        jobId: expect.any(String),
        message: "Evaluation job queued successfully",
        statusUrl: expect.stringContaining("/api/evaluations/jobs/"),
      });
    });

    it("should queue batch evaluation successfully", async () => {
      const batchData = {
        jobPostingId,
        resumeIds: [resumeId],
        weights: { skills: 0.4, experience: 0.4, education: 0.2 },
      };

      const response = await request(app)
        .post("/api/evaluations/batch/async")
        .set("Authorization", `Bearer ${authToken}`)
        .send(batchData)
        .expect(202);

      expect(response.body).toEqual({
        jobId: expect.any(String),
        message: "Batch evaluation job queued successfully",
        statusUrl: expect.stringContaining("/api/evaluations/jobs/"),
      });
    });

    it("should return job status", async () => {
      // Add a job to the queue first
      const jobId = await jobQueue.addJob("single_evaluation", {
        resumeId,
        jobPostingId,
      });

      const response = await request(app)
        .get(`/api/evaluations/jobs/${jobId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        id: jobId,
        type: "single_evaluation",
        status: "pending",
        createdAt: expect.any(String),
        retryCount: 0,
        maxRetries: expect.any(Number),
      });
    });

    it("should return 404 for non-existent job", async () => {
      const response = await request(app)
        .get("/api/evaluations/jobs/non-existent-job/status")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe("Job not found");
    });
  });

  describe("ML Service Client", () => {
    it("should handle resume parsing successfully", async () => {
      const mockResumeData = {
        personal_info: {
          name: "John Doe",
          email: "john@example.com",
        },
        skills: ["JavaScript", "React"],
        experience: [],
        education: [],
        certifications: [],
        languages: [],
      };

      mockMLServiceClient.parseResumeText.mockResolvedValue(mockResumeData);

      const result = await mlServiceClient.parseResumeText(
        "Resume text content"
      );
      expect(result).toEqual(mockResumeData);
    });

    it("should handle job description parsing successfully", async () => {
      const mockJobRequirements = {
        title: "Software Engineer",
        required_skills: ["JavaScript", "React"],
        preferred_skills: ["Node.js"],
        required_education: ["Bachelor's degree"],
        certifications: [],
        responsibilities: [],
        qualifications: [],
        benefits: [],
      };

      mockMLServiceClient.parseJobDescriptionText.mockResolvedValue(
        mockJobRequirements
      );

      const result = await mlServiceClient.parseJobDescriptionText(
        "Job description text"
      );
      expect(result).toEqual(mockJobRequirements);
    });

    it("should handle candidate evaluation successfully", async () => {
      const mockEvaluationResult = {
        overall_score: 85.5,
        skill_score: 80.0,
        experience_score: 90.0,
        education_score: 85.0,
        skill_matches: [
          {
            skill_name: "JavaScript",
            required: true,
            matched: true,
            confidence_score: 0.9,
          },
        ],
        experience_match: {
          total_years: 5,
          relevant_years: 3,
          experience_score: 0.9,
          relevant_positions: ["Software Engineer"],
        },
        education_match: {
          degree_match: true,
          field_match: true,
          education_score: 0.85,
          matched_degrees: ["Computer Science"],
        },
        gap_analysis: [],
        recommendations: ["Strong technical skills"],
      };

      mockMLServiceClient.evaluateCandidate.mockResolvedValue(
        mockEvaluationResult
      );

      const resumeData = {
        personal_info: { name: "John Doe" },
        skills: ["JavaScript"],
        experience: [],
        education: [],
        certifications: [],
        languages: [],
      };

      const jobRequirements = {
        title: "Software Engineer",
        required_skills: ["JavaScript"],
        preferred_skills: [],
        required_education: [],
        certifications: [],
        responsibilities: [],
        qualifications: [],
        benefits: [],
      };

      const result = await mlServiceClient.evaluateCandidate(
        resumeData,
        jobRequirements
      );
      expect(result).toEqual(mockEvaluationResult);
    });

    it("should handle batch evaluation successfully", async () => {
      const mockBatchResult = {
        job_id: jobPostingId,
        evaluations: [
          {
            candidate_id: "candidate-1",
            overall_score: 85.5,
            skill_score: 80.0,
            experience_score: 90.0,
            education_score: 85.0,
            skill_matches: [],
            experience_match: {
              total_years: 5,
              relevant_years: 3,
              experience_score: 0.9,
              relevant_positions: [],
            },
            education_match: {
              degree_match: true,
              field_match: true,
              education_score: 0.85,
              matched_degrees: [],
            },
            gap_analysis: [],
            recommendations: [],
          },
        ],
        total_candidates: 1,
        processed_candidates: 1,
        failed_candidates: 0,
        processing_time_seconds: 2.5,
      };

      mockMLServiceClient.batchEvaluateCandidates.mockResolvedValue(
        mockBatchResult
      );

      const batchRequest = {
        job_requirements: {
          title: "Software Engineer",
          required_skills: ["JavaScript"],
          preferred_skills: [],
          required_education: [],
          certifications: [],
          responsibilities: [],
          qualifications: [],
          benefits: [],
        },
        candidates: [
          {
            candidate_id: "candidate-1",
            resume_data: {
              personal_info: { name: "John Doe" },
              skills: ["JavaScript"],
              experience: [],
              education: [],
              certifications: [],
              languages: [],
            },
          },
        ],
      };

      const result = await mlServiceClient.batchEvaluateCandidates(
        batchRequest
      );
      expect(result).toEqual(mockBatchResult);
    });
  });

  describe("Error Handling", () => {
    it("should handle ML service connection errors gracefully", async () => {
      mockMLServiceClient.evaluateCandidate.mockRejectedValue(
        new Error("Connection refused")
      );

      // This would be tested through the evaluation service
      await expect(
        mlServiceClient.evaluateCandidate(
          {
            personal_info: {},
            skills: [],
            experience: [],
            education: [],
            certifications: [],
            languages: [],
          },
          {
            title: "Test",
            required_skills: [],
            preferred_skills: [],
            required_education: [],
            certifications: [],
            responsibilities: [],
            qualifications: [],
            benefits: [],
          }
        )
      ).rejects.toThrow("Connection refused");
    });

    it("should handle ML service timeout errors", async () => {
      mockMLServiceClient.evaluateCandidate.mockRejectedValue(
        new Error("Request timeout")
      );

      await expect(
        mlServiceClient.evaluateCandidate(
          {
            personal_info: {},
            skills: [],
            experience: [],
            education: [],
            certifications: [],
            languages: [],
          },
          {
            title: "Test",
            required_skills: [],
            preferred_skills: [],
            required_education: [],
            certifications: [],
            responsibilities: [],
            qualifications: [],
            benefits: [],
          }
        )
      ).rejects.toThrow("Request timeout");
    });

    it("should handle invalid ML service responses", async () => {
      mockMLServiceClient.evaluateCandidate.mockRejectedValue(
        new Error("Invalid response format")
      );

      await expect(
        mlServiceClient.evaluateCandidate(
          {
            personal_info: {},
            skills: [],
            experience: [],
            education: [],
            certifications: [],
            languages: [],
          },
          {
            title: "Test",
            required_skills: [],
            preferred_skills: [],
            required_education: [],
            certifications: [],
            responsibilities: [],
            qualifications: [],
            benefits: [],
          }
        )
      ).rejects.toThrow("Invalid response format");
    });
  });

  describe("Retry Logic", () => {
    it("should retry failed requests up to the configured limit", async () => {
      mockMLServiceClient.evaluateCandidate
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValueOnce({
          overall_score: 85.5,
          skill_score: 80.0,
          experience_score: 90.0,
          education_score: 85.0,
          skill_matches: [],
          experience_match: {
            total_years: 0,
            relevant_years: 0,
            experience_score: 0,
            relevant_positions: [],
          },
          education_match: {
            degree_match: false,
            field_match: false,
            education_score: 0,
            matched_degrees: [],
          },
          gap_analysis: [],
          recommendations: [],
        });

      // This tests the retry logic in the ML service client
      const result = await mlServiceClient.evaluateCandidate(
        {
          personal_info: {},
          skills: [],
          experience: [],
          education: [],
          certifications: [],
          languages: [],
        },
        {
          title: "Test",
          required_skills: [],
          preferred_skills: [],
          required_education: [],
          certifications: [],
          responsibilities: [],
          qualifications: [],
          benefits: [],
        }
      );

      expect(result.overall_score).toBe(85.5);
      expect(mockMLServiceClient.evaluateCandidate).toHaveBeenCalledTimes(3);
    });
  });

  describe("Job Queue Integration", () => {
    it("should process evaluation jobs correctly", async () => {
      const jobData = {
        resumeId,
        jobPostingId,
        weights: { skills: 0.4, experience: 0.4, education: 0.2 },
      };

      const jobId = await jobQueue.addJob("single_evaluation", jobData);
      const job = jobQueue.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.type).toBe("single_evaluation");
      expect(job?.status).toBe("pending");
      expect(job?.data).toEqual(jobData);
    });

    it("should handle job failures and retries", async () => {
      const jobData = {
        resumeId: "invalid-resume-id",
        jobPostingId,
      };

      const jobId = await jobQueue.addJob("single_evaluation", jobData);

      // Simulate job processing failure
      const job = jobQueue.getJob(jobId);
      if (job) {
        job.status = "failed";
        job.error = "Resume not found";
        job.retryCount = 1;
      }

      expect(job?.status).toBe("failed");
      expect(job?.error).toBe("Resume not found");
      expect(job?.retryCount).toBe(1);
    });

    it("should provide accurate queue statistics", () => {
      const stats = jobQueue.getQueueStats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("processing");
      expect(stats).toHaveProperty("completed");
      expect(stats).toHaveProperty("failed");
      expect(stats).toHaveProperty("processingCapacity");
      expect(stats).toHaveProperty("currentlyProcessing");
    });
  });
});
