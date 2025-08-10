import { supabase } from "../config/supabase";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001") + "/api";

export interface Shortlist {
  id: string;
  jobPostingId: string;
  createdBy: string;
  selectionCriteria: {
    topCandidateCount?: number;
    minimumScore?: number;
    manualSelection?: boolean;
    requiredSkills?: string[];
  };
  candidateCount: number;
  status: "draft" | "finalized" | "sent";
  createdAt: string;
}

export interface ShortlistCandidate {
  id: string;
  shortlistId: string;
  candidateId: string;
  evaluationId: string;
  selectedManually: boolean;
  candidate?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  evaluation?: {
    id: string;
    overallScore: number;
    skillScore: number;
    experienceScore: number;
    educationScore: number;
    evaluationDetails: any;
  };
}

export interface EmailCommunication {
  id: string;
  shortlistId: string;
  candidateId: string;
  emailType: "shortlist_notification" | "interview_invitation" | "rejection";
  subject: string;
  body: string;
  sentAt?: string;
  deliveryStatus: "pending" | "sent" | "failed" | "bounced";
  errorMessage?: string;
}

export interface EmailTemplate {
  type: "shortlist_notification" | "interview_invitation" | "rejection";
  subject: string;
  body: string;
  variables: string[];
}

export interface CreateShortlistRequest {
  jobPostingId: string;
  selectionCriteria: {
    topCandidateCount?: number;
    minimumScore?: number;
    manualSelection?: boolean;
    requiredSkills?: string[];
  };
  manualCandidateIds?: string[];
}

export interface SendEmailRequest {
  shortlistId: string;
  emailTemplate: EmailTemplate;
  candidateIds?: string[];
}

class ShortlistService {
  private async getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    };
  }

  async createShortlist(request: CreateShortlistRequest): Promise<Shortlist> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/shortlists`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create shortlist");
    }

    const result = await response.json();
    return result.data;
  }

  async getShortlistsByJob(jobId: string): Promise<Shortlist[]> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/shortlists/job/${jobId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch shortlists");
    }

    const result = await response.json();
    return result.data;
  }

  async getShortlistById(shortlistId: string): Promise<Shortlist> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/shortlists/${shortlistId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch shortlist");
    }

    const result = await response.json();
    return result.data;
  }

  async getShortlistCandidates(
    shortlistId: string
  ): Promise<ShortlistCandidate[]> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/shortlists/${shortlistId}/candidates`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch shortlist candidates");
    }

    const result = await response.json();
    return result.data;
  }

  async updateShortlistStatus(
    shortlistId: string,
    status: "draft" | "finalized" | "sent"
  ): Promise<void> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/shortlists/${shortlistId}/status`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update shortlist status");
    }
  }

  async addCandidateToShortlist(
    shortlistId: string,
    candidateId: string,
    evaluationId: string
  ): Promise<void> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/shortlists/${shortlistId}/candidates`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ candidateId, evaluationId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add candidate to shortlist");
    }
  }

  async removeCandidateFromShortlist(
    shortlistId: string,
    candidateId: string
  ): Promise<void> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/shortlists/${shortlistId}/candidates/${candidateId}`,
      {
        method: "DELETE",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Failed to remove candidate from shortlist"
      );
    }
  }

  async sendShortlistEmails(
    request: SendEmailRequest
  ): Promise<EmailCommunication[]> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/shortlists/${request.shortlistId}/emails`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send emails");
    }

    const result = await response.json();
    return result.data;
  }

  async getEmailCommunications(
    shortlistId: string
  ): Promise<EmailCommunication[]> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/shortlists/${shortlistId}/emails`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch email communications");
    }

    const result = await response.json();
    return result.data;
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/shortlists/templates/all`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch email templates");
    }

    const result = await response.json();
    return result.data;
  }

  async getEmailTemplate(type: string): Promise<EmailTemplate> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/shortlists/templates/${type}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch email template");
    }

    const result = await response.json();
    return result.data;
  }

  async updateEmailTemplate(
    type: string,
    template: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(
      `${API_BASE_URL}/shortlists/templates/${type}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(template),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update email template");
    }

    const result = await response.json();
    return result.data;
  }
}

export const shortlistService = new ShortlistService();
