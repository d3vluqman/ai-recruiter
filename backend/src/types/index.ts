export interface APIError extends Error {
  statusCode: number;
  code: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  department?: string;
  location?: string;
  status: string;
  createdBy: string;
  organizationId?: string;
  filePath?: string;
  parsedRequirements?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: Date;
}

export interface Resume {
  id: string;
  candidateId: string;
  jobPostingId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  source: "direct" | "portal";
  parsedData?: any;
  status: string;
  uploadedAt: Date;
}

export interface SkillMatch {
  id?: string;
  evaluationId?: string;
  skillName: string;
  required: boolean;
  matched: boolean;
  confidenceScore: number;
  similarityScore?: number;
}

export interface ExperienceMatch {
  totalYears: number;
  relevantYears: number;
  requiredYears?: number;
  experienceScore: number;
  relevantPositions: string[];
}

export interface EducationMatch {
  degreeMatch: boolean;
  fieldMatch: boolean;
  educationScore: number;
  matchedDegrees: string[];
}

export interface Evaluation {
  id: string;
  resumeId: string;
  jobPostingId: string;
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  evaluationDetails: {
    skillMatches: SkillMatch[];
    experienceMatch: ExperienceMatch;
    educationMatch: EducationMatch;
    gapAnalysis: string[];
    recommendations: string[];
    evaluationSummary?: string;
  };
  status: string;
  evaluatedAt: Date;
}

export interface EvaluationRequest {
  resumeId: string;
  jobPostingId: string;
  weights?: {
    skills: number;
    experience: number;
    education: number;
  };
}

export interface BatchEvaluationRequest {
  jobPostingId: string;
  resumeIds?: string[];
  weights?: {
    skills: number;
    experience: number;
    education: number;
  };
}

export interface BatchEvaluationResult {
  jobId: string;
  totalCandidates: number;
  processedCandidates: number;
  failedCandidates: number;
  processingTimeSeconds: number;
  evaluations: Evaluation[];
}

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
  createdAt: Date;
}

export interface ShortlistCandidate {
  id: string;
  shortlistId: string;
  candidateId: string;
  evaluationId: string;
  selectedManually: boolean;
  candidate?: Candidate;
  evaluation?: Evaluation;
}

export interface EmailCommunication {
  id: string;
  shortlistId: string;
  candidateId: string;
  emailType: "shortlist_notification" | "interview_invitation" | "rejection";
  subject: string;
  body: string;
  sentAt?: Date;
  deliveryStatus: "pending" | "sent" | "failed" | "bounced";
  errorMessage?: string;
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

export interface EmailTemplate {
  type: "shortlist_notification" | "interview_invitation" | "rejection";
  subject: string;
  body: string;
  variables: string[];
}

export interface SendEmailRequest {
  shortlistId: string;
  emailTemplate: EmailTemplate;
  candidateIds?: string[];
}
