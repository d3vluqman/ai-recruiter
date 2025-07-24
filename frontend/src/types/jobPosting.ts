export interface JobPosting {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  department?: string;
  location?: string;
  status: "active" | "inactive" | "draft" | "closed";
  createdBy: string;
  organizationId?: string;
  filePath?: string;
  parsedRequirements?: {
    extractedText?: string;
    skills?: string[];
    qualifications?: string[];
    responsibilities?: string[];
    requirements?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPostingData {
  title: string;
  description: string;
  requirements: string[];
  department?: string;
  location?: string;
  jobDescriptionFile?: File;
}

export interface UpdateJobPostingData {
  title?: string;
  description?: string;
  requirements?: string[];
  department?: string;
  location?: string;
  status?: "active" | "inactive" | "draft" | "closed";
  jobDescriptionFile?: File;
}

export interface JobPostingFilters {
  status?: string;
  department?: string;
  location?: string;
  search?: string;
}
