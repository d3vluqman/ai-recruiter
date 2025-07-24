import { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService";
import { logger } from "../utils/logger";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: {
          message: "Access token required",
          code: "MISSING_TOKEN",
        },
      });
      return;
    }

    // Verify token
    const decoded = authService.verifyToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    res.status(403).json({
      error: {
        message: "Invalid or expired token",
        code: "INVALID_TOKEN",
      },
    });
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 */
export const requireRole = (roles: string[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
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

      // Get user details to check role
      const user = await authService.getUserById(req.user.userId);
      if (!user) {
        res.status(403).json({
          error: {
            message: "User not found",
            code: "USER_NOT_FOUND",
          },
        });
        return;
      }

      if (!roles.includes(user.role)) {
        res.status(403).json({
          error: {
            message: "Insufficient permissions",
            code: "INSUFFICIENT_PERMISSIONS",
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error("Authorization error:", error);
      res.status(500).json({
        error: {
          message: "Authorization check failed",
          code: "AUTHORIZATION_ERROR",
        },
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Adds user info to request if token is present, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // Token is invalid, but we don't fail the request
        logger.warn("Invalid token in optional auth:", error);
      }
    }

    next();
  } catch (error) {
    logger.error("Optional auth error:", error);
    next(); // Continue without authentication
  }
};
