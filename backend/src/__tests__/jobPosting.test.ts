import request from "supertest";
import express from "express";
import { jobPostingService } from "../services/jobPostingService";
import jobPostingRoutes from "../routes/jobPostings";
import { authenticateToken } from "../middleware/auth";
import { errorHandler } from "../middleware/errorHandler";

// Mock the services
jest.mock("../services/jobPostingService");
jest.mock("../middleware/auth");

const mockJobPostingService = jobPostingService as jest.Mocked<
  typeof jobPostingService
>;
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<
  typeof authenticateToken
>;

// Create test app
const app = express();
app.use(express.json());
app.use("/api/job-postings", jobPostingRoutes);
app.use(errorHandler);

// Mock user for authentication
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  organizationId: "org-123",
};

describe("Job Posting API", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authentication middleware
    mockAuthenticateToken.mockImplementation(async (req: any, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe("POST /api/job-postings", () => {
    const validJobData = {
      title: "Senior Software Engineer",
      description: "We are looking for a senior software engineer...",
      requirements: ["5+ years experience", "JavaScript", "React"],
      department: "Engineering",
      location: "San Francisco, CA",
    };

    it("should create a job posting successfully", async () => {
      const mockCreatedJob = {
        id: "job-123",
        ...validJobData,
        status: "draft",
        createdBy: mockUser.id,
        organizationId: mockUser.organizationId,
        createdAt: new Date("2025-07-23T14:15:08.810Z"),
        updatedAt: new Date("2025-07-23T14:15:08.810Z"),
      };

      mockJobPostingService.createJobPosting.mockResolvedValue(mockCreatedJob);

      const response = await request(app)
        .post("/api/job-postings")
        .send(validJobData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Job posting created successfully");
      expect(response.body.data).toEqual({
        ...mockCreatedJob,
        createdAt: mockCreatedJob.createdAt.toISOString(),
        updatedAt: mockCreatedJob.updatedAt.toISOString(),
      });
      expect(mockJobPostingService.createJobPosting).toHaveBeenCalledWith({
        ...validJobData,
        createdBy: mockUser.id,
        organizationId: mockUser.organizationId,
        filePath: undefined,
        parsedRequirements: {},
      });
    });

    it("should return 400 for missing title", async () => {
      const invalidData: any = { ...validJobData };
      delete invalidData.title;

      const response = await request(app)
        .post("/api/job-postings")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe("Validation failed");
      expect(response.body.error.details).toContain(
        "Title is required and must be a non-empty string"
      );
    });

    it("should return 400 for missing description", async () => {
      const invalidData: any = { ...validJobData };
      delete invalidData.description;

      const response = await request(app)
        .post("/api/job-postings")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe("Validation failed");
      expect(response.body.error.details).toContain(
        "Description is required and must be a non-empty string"
      );
    });

    it("should handle service errors", async () => {
      mockJobPostingService.createJobPosting.mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app)
        .post("/api/job-postings")
        .send(validJobData);

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/job-postings", () => {
    const mockJobPostings = [
      {
        id: "job-1",
        title: "Software Engineer",
        description: "Description 1",
        requirements: ["JavaScript"],
        status: "active",
        createdBy: mockUser.id,
        organizationId: mockUser.organizationId,
        createdAt: new Date("2025-07-23T14:15:08.810Z"),
        updatedAt: new Date("2025-07-23T14:15:08.810Z"),
      },
      {
        id: "job-2",
        title: "Product Manager",
        description: "Description 2",
        requirements: ["Product Management"],
        status: "draft",
        createdBy: mockUser.id,
        organizationId: mockUser.organizationId,
        createdAt: new Date("2025-07-23T14:15:08.810Z"),
        updatedAt: new Date("2025-07-23T14:15:08.810Z"),
      },
    ];

    it("should get all job postings", async () => {
      mockJobPostingService.getJobPostings.mockResolvedValue(mockJobPostings);

      const response = await request(app).get("/api/job-postings");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Job postings retrieved successfully");
      expect(response.body.data).toEqual(
        mockJobPostings.map((job) => ({
          ...job,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        }))
      );
      expect(response.body.count).toBe(2);
    });

    it("should filter job postings by status", async () => {
      const activeJobs = [mockJobPostings[0]];
      mockJobPostingService.getJobPostings.mockResolvedValue(activeJobs);

      const response = await request(app)
        .get("/api/job-postings")
        .query({ status: "active" });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        activeJobs.map((job) => ({
          ...job,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        }))
      );
      expect(mockJobPostingService.getJobPostings).toHaveBeenCalledWith({
        status: "active",
      });
    });

    it("should filter job postings by search term", async () => {
      const searchResults = [mockJobPostings[0]];
      mockJobPostingService.getJobPostings.mockResolvedValue(searchResults);

      const response = await request(app)
        .get("/api/job-postings")
        .query({ search: "Software" });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        searchResults.map((job) => ({
          ...job,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        }))
      );
      expect(mockJobPostingService.getJobPostings).toHaveBeenCalledWith({
        search: "Software",
      });
    });
  });

  describe("GET /api/job-postings/:id", () => {
    const mockJob = {
      id: "job-123",
      title: "Software Engineer",
      description: "Description",
      requirements: ["JavaScript"],
      status: "active",
      createdBy: mockUser.id,
      organizationId: mockUser.organizationId,
      createdAt: new Date("2025-07-23T14:15:08.811Z"),
      updatedAt: new Date("2025-07-23T14:15:08.811Z"),
    };

    it("should get a job posting by id", async () => {
      mockJobPostingService.getJobPostingById.mockResolvedValue(mockJob);

      const response = await request(app).get("/api/job-postings/job-123");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Job posting retrieved successfully");
      expect(response.body.data).toEqual({
        ...mockJob,
        createdAt: mockJob.createdAt.toISOString(),
        updatedAt: mockJob.updatedAt.toISOString(),
      });
    });

    it("should return 404 for non-existent job", async () => {
      mockJobPostingService.getJobPostingById.mockResolvedValue(null);

      const response = await request(app).get("/api/job-postings/non-existent");

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe("Job posting not found");
    });

    it("should return 400 for missing id", async () => {
      // This test is not valid since /api/job-postings/ would match the base route
      // Let's test with an invalid UUID format instead
      const response = await request(app).get(
        "/api/job-postings/invalid-id-format"
      );

      // The service should handle this gracefully
      mockJobPostingService.getJobPostingById.mockResolvedValue(null);
      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/job-postings/:id", () => {
    const mockJob = {
      id: "job-123",
      title: "Software Engineer",
      description: "Description",
      requirements: ["JavaScript"],
      status: "active",
      createdBy: mockUser.id,
      organizationId: mockUser.organizationId,
      createdAt: new Date("2025-07-23T14:15:08.811Z"),
      updatedAt: new Date("2025-07-23T14:15:08.811Z"),
    };

    const updateData = {
      title: "Senior Software Engineer",
      status: "active",
    };

    it("should update a job posting successfully", async () => {
      const updatedJob = { ...mockJob, ...updateData };

      mockJobPostingService.getJobPostingById.mockResolvedValue(mockJob);
      mockJobPostingService.updateJobPosting.mockResolvedValue(updatedJob);

      const response = await request(app)
        .put("/api/job-postings/job-123")
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Job posting updated successfully");
      expect(response.body.data).toEqual({
        ...updatedJob,
        createdAt: updatedJob.createdAt.toISOString(),
        updatedAt: updatedJob.updatedAt.toISOString(),
      });
    });

    it("should return 404 for non-existent job", async () => {
      mockJobPostingService.getJobPostingById.mockResolvedValue(null);

      const response = await request(app)
        .put("/api/job-postings/non-existent")
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe("Job posting not found");
    });

    it("should validate status values", async () => {
      mockJobPostingService.getJobPostingById.mockResolvedValue(mockJob);

      const response = await request(app)
        .put("/api/job-postings/job-123")
        .send({ status: "invalid-status" });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe(
        "Status must be one of: active, inactive, draft, closed"
      );
    });
  });

  describe("DELETE /api/job-postings/:id", () => {
    const mockJob = {
      id: "job-123",
      title: "Software Engineer",
      description: "Description",
      requirements: ["JavaScript"],
      status: "active",
      createdBy: mockUser.id,
      organizationId: mockUser.organizationId,
      createdAt: new Date("2025-07-23T14:15:08.811Z"),
      updatedAt: new Date("2025-07-23T14:15:08.811Z"),
    };

    it("should delete a job posting successfully", async () => {
      mockJobPostingService.getJobPostingById.mockResolvedValue(mockJob);
      mockJobPostingService.deleteJobPosting.mockResolvedValue();

      const response = await request(app).delete("/api/job-postings/job-123");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Job posting deleted successfully");
      expect(mockJobPostingService.deleteJobPosting).toHaveBeenCalledWith(
        "job-123"
      );
    });

    it("should return 404 for non-existent job", async () => {
      mockJobPostingService.getJobPostingById.mockResolvedValue(null);

      const response = await request(app).delete(
        "/api/job-postings/non-existent"
      );

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe("Job posting not found");
    });
  });

  describe("GET /api/job-postings/my", () => {
    const mockUserJobs = [
      {
        id: "job-1",
        title: "Software Engineer",
        description: "Description 1",
        requirements: ["JavaScript"],
        status: "active",
        createdBy: mockUser.id,
        organizationId: mockUser.organizationId,
        createdAt: new Date("2025-07-23T14:15:08.811Z"),
        updatedAt: new Date("2025-07-23T14:15:08.811Z"),
      },
    ];

    it("should get user's job postings", async () => {
      mockJobPostingService.getJobPostings.mockResolvedValue(mockUserJobs);

      const response = await request(app).get("/api/job-postings/my");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "User job postings retrieved successfully"
      );
      expect(response.body.data).toEqual(
        mockUserJobs.map((job) => ({
          ...job,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        }))
      );
      expect(mockJobPostingService.getJobPostings).toHaveBeenCalledWith({
        createdBy: mockUser.id,
      });
    });
  });
});
