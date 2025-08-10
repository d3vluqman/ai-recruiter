import type {
  JobPosting,
  CreateJobPostingData,
  UpdateJobPostingData,
  JobPostingFilters,
} from "../types/jobPosting";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001") + "/api";

class JobPostingService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem("auth_token");
    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  }

  async createJobPosting(data: CreateJobPostingData): Promise<JobPosting> {
    const formData = new FormData();

    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("requirements", JSON.stringify(data.requirements));

    if (data.department) {
      formData.append("department", data.department);
    }

    if (data.location) {
      formData.append("location", data.location);
    }

    if (data.jobDescriptionFile) {
      formData.append("jobDescriptionFile", data.jobDescriptionFile);
    }

    const response = await fetch(`${API_BASE_URL}/job-postings`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to create job posting");
    }

    const result = await response.json();
    return result.data;
  }

  async getJobPostings(filters?: JobPostingFilters): Promise<JobPosting[]> {
    const params = new URLSearchParams();

    if (filters?.status) params.append("status", filters.status);
    if (filters?.department) params.append("department", filters.department);
    if (filters?.location) params.append("location", filters.location);
    if (filters?.search) params.append("search", filters.search);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/job-postings${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await fetch(url, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch job postings");
    }

    const result = await response.json();
    return result.data;
  }

  async getJobPostingById(id: string): Promise<JobPosting> {
    const response = await fetch(`${API_BASE_URL}/job-postings/${id}`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch job posting");
    }

    const result = await response.json();
    return result.data;
  }

  async updateJobPosting(
    id: string,
    data: UpdateJobPostingData
  ): Promise<JobPosting> {
    const formData = new FormData();

    if (data.title !== undefined) {
      formData.append("title", data.title);
    }

    if (data.description !== undefined) {
      formData.append("description", data.description);
    }

    if (data.requirements !== undefined) {
      formData.append("requirements", JSON.stringify(data.requirements));
    }

    if (data.department !== undefined) {
      formData.append("department", data.department);
    }

    if (data.location !== undefined) {
      formData.append("location", data.location);
    }

    if (data.status !== undefined) {
      formData.append("status", data.status);
    }

    if (data.jobDescriptionFile) {
      formData.append("jobDescriptionFile", data.jobDescriptionFile);
    }

    const response = await fetch(`${API_BASE_URL}/job-postings/${id}`, {
      method: "PUT",
      headers: await this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to update job posting");
    }

    const result = await response.json();
    return result.data;
  }

  async deleteJobPosting(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/job-postings/${id}`, {
      method: "DELETE",
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to delete job posting");
    }
  }

  async getMyJobPostings(): Promise<JobPosting[]> {
    const response = await fetch(`${API_BASE_URL}/job-postings/my`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error?.message || "Failed to fetch my job postings"
      );
    }

    const result = await response.json();
    return result.data;
  }
}

export const jobPostingService = new JobPostingService();
