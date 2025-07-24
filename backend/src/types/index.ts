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
  source: 'direct' | 'portal';
  parsedData?: any;
  status: string;
  uploadedAt: Date;
}