import request from "supertest";
import { app } from "../index";
import { supabase } from "../config/supabase";

describe("Shortlist API", () => {
  let authToken: string;
  let userId: string;
  let jobPostingId: string;
  let candidateId: string;
  let evaluationId: string;
  let shortlistId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: "test-shortlist@example.com",
      password: "testpassword123",
    });

    if (authError) throw authError;

    authToken = authData.session?.access_token || "";
    userId = authData.user?.id || "";

    // Create test job posting
    const { data: jobData, error: jobError } = await supabase
      .from("job_postings")
      .insert({
        title: "Test Job for Shortlist",
        description: "Test job description",
        requirements: ["JavaScript", "React"],
        created_by: userId,
      })
      .select()
      .single();

    if (jobError) throw jobError;
    jobPostingId = jobData.id;

    // Create test candidate
    const { data: candidateData, error: candidateError } = await supabase
      .from("candidates")
      .insert({
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
      })
      .select()
      .single();

    if (candidateError) throw candidateError;
    candidateId = candidateData.id;

    // Create test evaluation
    const { data: evaluationData, error: evaluationError } = await supabase
      .from("evaluations")
      .insert({
        resume_id: "test-resume-id",
        job_posting_id: jobPostingId,
        overall_score: 85.5,
        skill_score: 80.0,
        experience_score: 90.0,
        education_score: 85.0,
        evaluation_details: {
          skillMatches: [
            {
              skillName: "JavaScript",
              matched: true,
              required: true,
              confidenceScore: 0.9,
            },
          ],
          experienceMatch: {
            totalYears: 5,
            relevantYears: 3,
            experienceScore: 90,
          },
          educationMatch: {
            degreeMatch: true,
            fieldMatch: true,
            educationScore: 85,
          },
        },
      })
      .select()
      .single();

    if (evaluationError) throw evaluationError;
    evaluationId = evaluationData.id;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from("shortlists").delete().eq("created_by", userId);
    await supabase
      .from("evaluations")
      .delete()
      .eq("job_posting_id", jobPostingId);
    await supabase.from("candidates").delete().eq("id", candidateId);
    await supabase.from("job_postings").delete().eq("id", jobPostingId);
    await supabase.auth.admin.deleteUser(userId);
  });

  describe("POST /api/shortlists", () => {
    it("should create a shortlist with automatic selection", async () => {
      const shortlistData = {
        jobPostingId,
        selectionCriteria: {
          topCandidateCount: 5,
          minimumScore: 70,
          manualSelection: false,
        },
      };

      const response = await request(app)
        .post("/api/shortlists")
        .set("Authorization", `Bearer ${authToken}`)
        .send(shortlistData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.jobPostingId).toBe(jobPostingId);
      expect(response.body.data.status).toBe("draft");

      shortlistId = response.body.data.id;
    });

    it("should create a shortlist with manual selection", async () => {
      const shortlistData = {
        jobPostingId,
        selectionCriteria: {
          manualSelection: true,
        },
        manualCandidateIds: [candidateId],
      };

      const response = await request(app)
        .post("/api/shortlists")
        .set("Authorization", `Bearer ${authToken}`)
        .send(shortlistData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.candidateCount).toBe(1);
    });

    it("should return 400 for missing job posting ID", async () => {
      const shortlistData = {
        selectionCriteria: {
          topCandidateCount: 5,
        },
      };

      const response = await request(app)
        .post("/api/shortlists")
        .set("Authorization", `Bearer ${authToken}`)
        .send(shortlistData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("MISSING_JOB_ID");
    });

    it("should return 401 for unauthenticated request", async () => {
      const shortlistData = {
        jobPostingId,
        selectionCriteria: {
          topCandidateCount: 5,
        },
      };

      await request(app)
        .post("/api/shortlists")
        .send(shortlistData)
        .expect(401);
    });
  });

  describe("GET /api/shortlists/job/:jobId", () => {
    it("should get shortlists for a job", async () => {
      const response = await request(app)
        .get(`/api/shortlists/job/${jobPostingId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should return 400 for missing job ID", async () => {
      const response = await request(app)
        .get("/api/shortlists/job/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe("GET /api/shortlists/:shortlistId", () => {
    it("should get a specific shortlist", async () => {
      const response = await request(app)
        .get(`/api/shortlists/${shortlistId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(shortlistId);
    });

    it("should return 404 for non-existent shortlist", async () => {
      const response = await request(app)
        .get("/api/shortlists/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/shortlists/:shortlistId/candidates", () => {
    it("should get candidates for a shortlist", async () => {
      const response = await request(app)
        .get(`/api/shortlists/${shortlistId}/candidates`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("PATCH /api/shortlists/:shortlistId/status", () => {
    it("should update shortlist status", async () => {
      const response = await request(app)
        .patch(`/api/shortlists/${shortlistId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "finalized" })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should return 400 for invalid status", async () => {
      const response = await request(app)
        .patch(`/api/shortlists/${shortlistId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "invalid-status" })
        .expect(400);

      expect(response.body.error.code).toBe("INVALID_STATUS");
    });
  });

  describe("POST /api/shortlists/:shortlistId/candidates", () => {
    it("should add a candidate to shortlist", async () => {
      const response = await request(app)
        .post(`/api/shortlists/${shortlistId}/candidates`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          candidateId,
          evaluationId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should return 400 for missing candidate ID", async () => {
      const response = await request(app)
        .post(`/api/shortlists/${shortlistId}/candidates`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          evaluationId,
        })
        .expect(400);

      expect(response.body.error.code).toBe("MISSING_CANDIDATE_ID");
    });
  });

  describe("DELETE /api/shortlists/:shortlistId/candidates/:candidateId", () => {
    it("should remove a candidate from shortlist", async () => {
      const response = await request(app)
        .delete(`/api/shortlists/${shortlistId}/candidates/${candidateId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("GET /api/shortlists/templates/all", () => {
    it("should get all email templates", async () => {
      const response = await request(app)
        .get("/api/shortlists/templates/all")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/shortlists/templates/:type", () => {
    it("should get a specific email template", async () => {
      const response = await request(app)
        .get("/api/shortlists/templates/shortlist_notification")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe("shortlist_notification");
      expect(response.body.data).toHaveProperty("subject");
      expect(response.body.data).toHaveProperty("body");
      expect(response.body.data).toHaveProperty("variables");
    });

    it("should return 404 for non-existent template", async () => {
      const response = await request(app)
        .get("/api/shortlists/templates/non-existent")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe("TEMPLATE_NOT_FOUND");
    });
  });

  describe("POST /api/shortlists/:shortlistId/emails", () => {
    beforeEach(async () => {
      // Ensure shortlist is finalized for email sending
      await request(app)
        .patch(`/api/shortlists/${shortlistId}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "finalized" });
    });

    it("should send shortlist emails", async () => {
      const emailRequest = {
        shortlistId,
        emailTemplate: {
          type: "shortlist_notification",
          subject: "Test Subject",
          body: "Test email body",
          variables: ["candidateName", "jobTitle"],
        },
      };

      const response = await request(app)
        .post(`/api/shortlists/${shortlistId}/emails`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(emailRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should return 400 for missing email template", async () => {
      const emailRequest = {
        shortlistId,
      };

      const response = await request(app)
        .post(`/api/shortlists/${shortlistId}/emails`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(emailRequest)
        .expect(400);

      expect(response.body.error.code).toBe("MISSING_EMAIL_TEMPLATE");
    });
  });

  describe("GET /api/shortlists/:shortlistId/emails", () => {
    it("should get email communications for a shortlist", async () => {
      const response = await request(app)
        .get(`/api/shortlists/${shortlistId}/emails`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
