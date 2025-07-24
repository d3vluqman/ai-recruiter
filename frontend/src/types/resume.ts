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

export interface ResumeWithCandidate extends Resume {
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export interface ResumeUploadData {
  jobPostingId: string;
  candidateFirstName: string;
  candidateLastName: string;
  candidateEmail: string;
  candidatePhone?: string;
  source?: "direct" | "portal";
  resume: File;
}

export interface ResumeUploadResponse {
  message: string;
  data: {
    resumeId: string;
    candidateId: string;
    fileName: string;
    status: string;
  };
}
