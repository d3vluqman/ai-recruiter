import type {
  Evaluation,
  EvaluationRequest,
  BatchEvaluationRequest,
  BatchEvaluationResult,
  CandidateWithEvaluation,
} from "../types/evaluation";

export interface AsyncEvaluationResponse {
  jobId: string;
  message: string;
  statusUrl: string;
}

export interface JobStatus {
  id: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: any;
  retryCount: number;
  maxRetries: number;
}

export interface MLServiceHealth {
  healthy: boolean;
  service: string;
  timestamp: string;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001") + "/api";

export class EvaluationService {
  async createEvaluation(
    data: EvaluationRequest,
    token: string
  ): Promise<Evaluation> {
    const response = await fetch(`${API_BASE_URL}/evaluations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to create evaluation"
      );
    }

    return response.json();
  }

  async getEvaluationById(id: string, token: string): Promise<Evaluation> {
    const response = await fetch(`${API_BASE_URL}/evaluations/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch evaluation");
    }

    return response.json();
  }

  async getEvaluationsByJobPosting(
    jobPostingId: string,
    token: string
  ): Promise<Evaluation[]> {
    const response = await fetch(
      `${API_BASE_URL}/evaluations/job/${jobPostingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to fetch evaluations"
      );
    }

    return response.json();
  }

  async getCandidatesWithEvaluations(
    jobPostingId: string,
    token: string
  ): Promise<CandidateWithEvaluation[]> {
    const response = await fetch(
      `${API_BASE_URL}/evaluations/job/${jobPostingId}/candidates`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message ||
          "Failed to fetch candidates with evaluations"
      );
    }

    return response.json();
  }

  async batchEvaluate(
    data: BatchEvaluationRequest,
    token: string
  ): Promise<BatchEvaluationResult> {
    const response = await fetch(`${API_BASE_URL}/evaluations/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to perform batch evaluation"
      );
    }

    return response.json();
  }

  async triggerEvaluationForResume(
    resumeId: string,
    jobPostingId: string,
    token: string,
    weights?: { skills: number; experience: number; education: number }
  ): Promise<Evaluation> {
    const response = await fetch(
      `${API_BASE_URL}/resumes/${resumeId}/evaluate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobPostingId, weights }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to trigger evaluation"
      );
    }

    return response.json();
  }

  async deleteEvaluation(id: string, token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/evaluations/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to delete evaluation"
      );
    }
  }

  // Async evaluation methods
  async createEvaluationAsync(
    data: EvaluationRequest,
    token: string
  ): Promise<AsyncEvaluationResponse> {
    const response = await fetch(`${API_BASE_URL}/evaluations/async`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to queue evaluation");
    }

    return response.json();
  }

  async batchEvaluateAsync(
    data: BatchEvaluationRequest,
    token: string
  ): Promise<AsyncEvaluationResponse> {
    const response = await fetch(`${API_BASE_URL}/evaluations/batch/async`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to queue batch evaluation"
      );
    }

    return response.json();
  }

  async getJobStatus(jobId: string, token: string): Promise<JobStatus> {
    const response = await fetch(
      `${API_BASE_URL}/evaluations/jobs/${jobId}/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch job status");
    }

    return response.json();
  }

  async checkMLServiceHealth(token: string): Promise<MLServiceHealth> {
    const response = await fetch(
      `${API_BASE_URL}/evaluations/ml-service/health`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to check ML service health"
      );
    }

    return response.json();
  }
  async reEvaluateExisting(
    evaluationId: string,
    token: string
  ): Promise<{
    message: string;
    oldEvaluationId: string;
    newEvaluationId: string;
    evaluation: Evaluation;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/evaluations/re-evaluate/${evaluationId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to re-evaluate candidate");
    }

    return response.json();
  }
}

export const evaluationService = new EvaluationService();
