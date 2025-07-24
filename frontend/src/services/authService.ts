import { apiBaseUrl } from "../config/supabase";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Organization,
} from "../types/auth";

class AuthService {
  private baseUrl = `${apiBaseUrl}/api`;

  /**
   * Register a new user
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Registration failed");
    }

    return data.data;
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Login failed");
    }

    return data.data;
  }

  /**
   * Get current user profile
   */
  async getProfile(token: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to get profile");
    }

    return data.data.user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    token: string,
    updates: Partial<Pick<User, "firstName" | "lastName" | "organizationId">>
  ): Promise<User> {
    const response = await fetch(`${this.baseUrl}/auth/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to update profile");
    }

    return data.data.user;
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || "Logout failed");
    }
  }

  /**
   * Get all organizations
   */
  async getOrganizations(token: string): Promise<Organization[]> {
    const response = await fetch(`${this.baseUrl}/organizations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to get organizations");
    }

    return data.data.organizations;
  }

  /**
   * Create organization
   */
  async createOrganization(
    token: string,
    orgData: { name: string; domain?: string; settings?: any }
  ): Promise<Organization> {
    const response = await fetch(`${this.baseUrl}/organizations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orgData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to create organization");
    }

    return data.data.organization;
  }
}

export const authService = new AuthService();
