import request from "supertest";
import express from "express";
import { authService } from "../services/authService";
import authRoutes from "../routes/auth";
import { errorHandler } from "../middleware/errorHandler";

// Create test app
const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(errorHandler);

// Mock the auth service
jest.mock("../services/authService");
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe("Authentication Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    const validRegistrationData = {
      email: "test@example.com",
      password: "password123",
      firstName: "John",
      lastName: "Doe",
    };

    it("should register a new user successfully", async () => {
      const mockUser = {
        id: "123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "recruiter",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.register.mockResolvedValue({
        user: mockUser,
        token: "mock-jwt-token",
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegistrationData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.data.user.email).toBe("test@example.com");
      expect(response.body.data.token).toBe("mock-jwt-token");
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        // missing password, firstName, lastName
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("MISSING_REQUIRED_FIELDS");
    });

    it("should return 400 for invalid email format", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          ...validRegistrationData,
          email: "invalid-email",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("INVALID_EMAIL");
    });

    it("should return 400 for weak password", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          ...validRegistrationData,
          password: "123",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("WEAK_PASSWORD");
    });

    it("should return 409 for existing user", async () => {
      mockAuthService.register.mockRejectedValue(
        new Error("User already exists with this email")
      );

      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegistrationData);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("USER_EXISTS");
    });
  });

  describe("POST /api/auth/login", () => {
    const validLoginData = {
      email: "test@example.com",
      password: "password123",
    };

    it("should login user successfully", async () => {
      const mockUser = {
        id: "123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "recruiter",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        token: "mock-jwt-token",
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.data.user.email).toBe("test@example.com");
      expect(response.body.data.token).toBe("mock-jwt-token");
    });

    it("should return 400 for missing credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        // missing password
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("MISSING_CREDENTIALS");
    });

    it("should return 401 for invalid credentials", async () => {
      mockAuthService.login.mockRejectedValue(
        new Error("Invalid email or password")
      );

      const response = await request(app)
        .post("/api/auth/login")
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("GET /api/auth/profile", () => {
    it("should return user profile for authenticated user", async () => {
      const mockUser = {
        id: "123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "recruiter",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.verifyToken.mockReturnValue({
        userId: "123",
        email: "test@example.com",
      });

      mockAuthService.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer mock-jwt-token");

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe("test@example.com");
    });

    it("should return 401 for missing token", async () => {
      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe("MISSING_TOKEN");
    });

    it("should return 403 for invalid token", async () => {
      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });
  });

  describe("PUT /api/auth/profile", () => {
    it("should update user profile successfully", async () => {
      const mockUser = {
        id: "123",
        email: "test@example.com",
        firstName: "Jane",
        lastName: "Smith",
        role: "recruiter",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.verifyToken.mockReturnValue({
        userId: "123",
        email: "test@example.com",
      });

      mockAuthService.updateProfile.mockResolvedValue(mockUser);

      const response = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", "Bearer mock-jwt-token")
        .send({
          firstName: "Jane",
          lastName: "Smith",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.firstName).toBe("Jane");
      expect(response.body.data.user.lastName).toBe("Smith");
    });

    it("should return 400 for no updates", async () => {
      mockAuthService.verifyToken.mockReturnValue({
        userId: "123",
        email: "test@example.com",
      });

      const response = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", "Bearer mock-jwt-token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("NO_UPDATES");
    });
  });
});
