import { Request, Response } from "express";
import {
  authService,
  RegisterRequest,
  LoginRequest,
} from "../services/authService";
import { logger } from "../utils/logger";

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      organizationId,
    }: RegisterRequest = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        error: {
          message: "Email, password, first name, and last name are required",
          code: "MISSING_REQUIRED_FIELDS",
        },
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: {
          message: "Invalid email format",
          code: "INVALID_EMAIL",
        },
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        error: {
          message: "Password must be at least 8 characters long",
          code: "WEAK_PASSWORD",
        },
      });
      return;
    }

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      organizationId,
    });

    res.status(201).json({
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Registration controller error:", error);

    if (error instanceof Error) {
      if (error.message === "User already exists with this email") {
        res.status(409).json({
          error: {
            message: error.message,
            code: "USER_EXISTS",
          },
        });
        return;
      }
    }

    res.status(500).json({
      error: {
        message: "Registration failed",
        code: "REGISTRATION_ERROR",
      },
    });
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: {
          message: "Email and password are required",
          code: "MISSING_CREDENTIALS",
        },
      });
      return;
    }

    const result = await authService.login({ email, password });

    res.json({
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    logger.error("Login controller error:", error);

    if (
      error instanceof Error &&
      error.message === "Invalid email or password"
    ) {
      res.status(401).json({
        error: {
          message: error.message,
          code: "INVALID_CREDENTIALS",
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        message: "Login failed",
        code: "LOGIN_ERROR",
      },
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        },
      });
      return;
    }

    const user = await authService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({
        error: {
          message: "User not found",
          code: "USER_NOT_FOUND",
        },
      });
      return;
    }

    res.json({
      message: "Profile retrieved successfully",
      data: { user },
    });
  } catch (error) {
    logger.error("Get profile controller error:", error);
    res.status(500).json({
      error: {
        message: "Failed to retrieve profile",
        code: "PROFILE_ERROR",
      },
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          message: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        },
      });
      return;
    }

    const { firstName, lastName, organizationId } = req.body;
    const updates: any = {};

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (organizationId !== undefined) updates.organizationId = organizationId;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        error: {
          message: "No valid fields to update",
          code: "NO_UPDATES",
        },
      });
      return;
    }

    const updatedUser = await authService.updateProfile(
      req.user.userId,
      updates
    );

    res.json({
      message: "Profile updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    logger.error("Update profile controller error:", error);
    res.status(500).json({
      error: {
        message: "Failed to update profile",
        code: "UPDATE_ERROR",
      },
    });
  }
};

/**
 * Logout user (client-side token removal)
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  // Since we're using stateless JWT tokens, logout is handled client-side
  // This endpoint exists for consistency and potential future token blacklisting
  res.json({
    message: "Logout successful",
  });
};
