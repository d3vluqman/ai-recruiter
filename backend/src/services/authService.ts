import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { supabase, supabaseAdmin } from "../config/supabase";
import { logger } from "../utils/logger";
import { User } from "../types";

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
  private readonly JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "7d";

  /**
   * Register a new user
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const { email, password, firstName, lastName, organizationId } = userData;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (existingUser) {
        throw new Error("User already exists with this email");
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user in database
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          organization_id: organizationId || null,
          role: "recruiter",
        })
        .select(
          `
          id,
          email,
          first_name,
          last_name,
          role,
          organization_id,
          created_at,
          updated_at
        `
        )
        .single();

      if (error) {
        logger.error("Error creating user:", error);
        throw new Error("Failed to create user");
      }

      const user: User = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        organizationId: newUser.organization_id,
        createdAt: new Date(newUser.created_at),
        updatedAt: new Date(newUser.updated_at),
      };

      // Generate JWT token
      const token = this.generateToken(user);

      logger.info(`User registered successfully: ${email}`);
      return { user, token };
    } catch (error) {
      logger.error("Registration error:", error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;

      // Get user from database
      const { data: userData, error } = await supabase
        .from("users")
        .select(
          `
          id,
          email,
          password_hash,
          first_name,
          last_name,
          role,
          organization_id,
          created_at,
          updated_at
        `
        )
        .eq("email", email)
        .single();

      if (error || !userData) {
        throw new Error("Invalid email or password");
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        password,
        userData.password_hash
      );
      if (!isValidPassword) {
        throw new Error("Invalid email or password");
      }

      const user: User = {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role,
        organizationId: userData.organization_id,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      };

      // Generate JWT token
      const token = this.generateToken(user);

      logger.info(`User logged in successfully: ${email}`);
      return { user, token };
    } catch (error) {
      logger.error("Login error:", error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select(
          `
          id,
          email,
          first_name,
          last_name,
          role,
          organization_id,
          created_at,
          updated_at
        `
        )
        .eq("id", userId)
        .single();

      if (error || !userData) {
        return null;
      }

      return {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role,
        organizationId: userData.organization_id,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
      };
    } catch (error) {
      logger.error("Error getting user by ID:", error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<Pick<User, "firstName" | "lastName" | "organizationId">>
  ): Promise<User> {
    try {
      const updateData: any = {};

      if (updates.firstName) updateData.first_name = updates.firstName;
      if (updates.lastName) updateData.last_name = updates.lastName;
      if (updates.organizationId !== undefined)
        updateData.organization_id = updates.organizationId;

      const { data: updatedUser, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select(
          `
          id,
          email,
          first_name,
          last_name,
          role,
          organization_id,
          created_at,
          updated_at
        `
        )
        .single();

      if (error || !updatedUser) {
        throw new Error("Failed to update user profile");
      }

      logger.info(`User profile updated: ${userId}`);
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        organizationId: updatedUser.organization_id,
        createdAt: new Date(updatedUser.created_at),
        updatedAt: new Date(updatedUser.updated_at),
      };
    } catch (error) {
      logger.error("Error updating user profile:", error);
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }
}

export const authService = new AuthService();
