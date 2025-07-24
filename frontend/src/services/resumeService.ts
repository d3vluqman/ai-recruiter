import type {
  ResumeUploadData,
  ResumeUploadResponse,
  ResumeWithCandidate,
  Resume,
} from "../types/resume";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export class ResumeService {
  async uploadResume(data: ResumeUploadData): Promise<ResumeUploadResponse> {
    const formData = new FormData();
    formData.append("resume", data.resume);
    formData.append("jobPostingId", data.jobPostingId);
    formData.append("candidateFirstName", data.candidateFirstName);
    formData.append("candidateLastName", data.candidateLastName);
    formData.append("candidateEmail", data.candidateEmail);
    if (data.candidatePhone) {
      formData.append("candidatePhone", data.candidatePhone);
    }
    formData.append("source", data.source || "portal");

    const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to upload resume");
    }

    return response.json();
  }

  async getResumesByJobPosting(
    jobPostingId: string,
    token: string
  ): Promise<ResumeWithCandidate[]> {
    const response = await fetch(
      `${API_BASE_URL}/resumes/job/${jobPostingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch resumes");
    }

    const result = await response.json();
    return result.data;
  }

  async getAllResumes(token: string): Promise<ResumeWithCandidate[]> {
    const response = await fetch(`${API_BASE_URL}/resumes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch resumes");
    }

    const result = await response.json();
    return result.data;
  }

  async getResumeById(id: string, token: string): Promise<Resume> {
    const response = await fetch(`${API_BASE_URL}/resumes/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch resume");
    }

    const result = await response.json();
    return result.data;
  }

  async downloadResume(id: string, token: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/resumes/${id}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to download resume");
    }

    return response.blob();
  }

  async deleteResume(id: string, token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/resumes/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to delete resume");
    }
  }

  async updateResumeStatus(
    id: string,
    status: string,
    token: string
  ): Promise<Resume> {
    const response = await fetch(`${API_BASE_URL}/resumes/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to update resume status"
      );
    }

    const result = await response.json();
    return result.data;
  }
}

export const resumeService = new ResumeService();
