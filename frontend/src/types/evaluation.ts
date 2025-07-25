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

export interface EvaluationDetails {
  skillMatches: SkillMatch[];
  experienceMatch: ExperienceMatch;
  educationMatch: EducationMatch;
  gapAnalysis: string[];
  recommendations: string[];
  evaluationSummary?: string;
}

export interface Evaluation {
  id: string;
  resumeId: string;
  jobPostingId: string;
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  evaluationDetails: EvaluationDetails;
  status: string;
  evaluatedAt: Date;
}

export interface CandidateWithEvaluation {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resume: {
    id: string;
    fileName: string;
    uploadedAt: Date;
    source: "direct" | "portal";
  };
  evaluation?: Evaluation;
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
