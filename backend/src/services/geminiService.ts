import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../utils/logger";

interface ParsedResume {
  personal_info: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
  skills: string[];
  experience: Array<{
    job_title?: string;
    company?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    duration_months?: number;
    description?: string;
    responsibilities: string[];
    technologies: string[];
  }>;
  education: Array<{
    degree?: string;
    field_of_study?: string;
    institution?: string;
    graduation_year?: number;
    gpa?: number;
  }>;
  certifications: string[];
  languages: string[];
  summary?: string;
  total_experience_years?: number;
}

interface ParsedJobDescription {
  title?: string;
  company?: string;
  location?: string;
  department?: string;
  employment_type?: string;
  experience_level?: string;
  required_skills: string[];
  preferred_skills: string[];
  required_experience_years?: number;
  required_education: string[];
  certifications: string[];
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  salary_range?: string;
  description?: string;
}

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });
  }

  async parseResume(resumeText: string): Promise<ParsedResume> {
    try {
      const prompt = `
Analyze this resume text and extract structured information. Return ONLY a valid JSON object with the following structure:

{
  "personal_info": {
    "name": "Full name",
    "email": "email@example.com",
    "phone": "phone number",
    "location": "city, state/country",
    "linkedin": "linkedin profile URL",
    "github": "github profile URL"
  },
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "job_title": "Job Title",
      "company": "Company Name",
      "location": "City, State",
      "start_date": "Month Year",
      "end_date": "Month Year or Present",
      "duration_months": 24,
      "description": "Brief job description",
      "responsibilities": ["responsibility1", "responsibility2"],
      "technologies": ["tech1", "tech2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "field_of_study": "Field of Study",
      "institution": "Institution Name",
      "graduation_year": 2023,
      "gpa": 3.8
    }
  ],
  "certifications": ["cert1", "cert2"],
  "languages": ["English", "Spanish"],
  "summary": "Professional summary",
  "total_experience_years": 5.5
}

Instructions:
- Extract ALL skills mentioned (technical, programming languages, frameworks, tools, soft skills)
- For experience, calculate duration_months accurately from dates
- Include ALL responsibilities and technologies for each role
- For education, extract degree, field, institution, and year
- Calculate total_experience_years as sum of all work experience
- If information is not available, use null or empty array
- Return ONLY the JSON object, no additional text

Resume text:
${resumeText}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in Gemini response");
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      logger.info("Successfully parsed resume with Gemini");

      return parsedData;
    } catch (error) {
      logger.error("Gemini resume parsing error:", error);
      throw new Error(
        `Failed to parse resume with Gemini: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async parseJobDescription(jobText: string): Promise<ParsedJobDescription> {
    try {
      // Debug logging for job description text
      logger.info("DEBUG: Job description text being parsed by Gemini:", {
        text_length: jobText.length,
        first_200_chars: jobText.substring(0, 200),
        contains_experience: jobText.toLowerCase().includes("experience"),
        contains_years: jobText.toLowerCase().includes("year"),
        contains_degree: jobText.toLowerCase().includes("degree"),
        contains_bachelor: jobText.toLowerCase().includes("bachelor"),
      });

      const prompt = `
Analyze this job description and extract structured requirements. Return ONLY a valid JSON object with the following structure:

{
  "title": "Job Title",
  "company": "Company Name",
  "location": "Location or Remote",
  "department": "Department",
  "employment_type": "full-time/part-time/contract",
  "experience_level": "entry/mid/senior/executive",
  "required_skills": ["skill1", "skill2", "skill3"],
  "preferred_skills": ["skill1", "skill2"],
  "required_experience_years": 3,
  "required_education": ["Bachelor's degree in Computer Science"],
  "certifications": ["cert1", "cert2"],
  "responsibilities": ["responsibility1", "responsibility2"],
  "qualifications": ["qualification1", "qualification2"],
  "benefits": ["benefit1", "benefit2"],
  "salary_range": "$80,000 - $120,000",
  "description": "Brief job description"
}

Instructions:
- Distinguish between REQUIRED skills (must-have) and PREFERRED skills (nice-to-have)
- Extract specific years of experience required
- Include ALL technical skills, programming languages, frameworks, tools
- List all responsibilities and qualifications
- If salary is mentioned, extract the range
- If information is not available, use null or empty array
- Return ONLY the JSON object, no additional text

Job description:
${jobText}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in Gemini response");
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      logger.info("Successfully parsed job description with Gemini");

      // Debug logging for job requirements
      logger.info("DEBUG: Gemini parsed job requirements:", {
        required_experience_years: parsedData.required_experience_years,
        required_education: parsedData.required_education,
        required_skills_count: parsedData.required_skills?.length || 0,
        preferred_skills_count: parsedData.preferred_skills?.length || 0,
      });

      return parsedData;
    } catch (error) {
      logger.error("Gemini job description parsing error:", error);
      throw new Error(
        `Failed to parse job description with Gemini: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.model.generateContent(
        'Say "OK" if you can respond.'
      );
      const response = await result.response;
      const text = response.text();
      return text.toLowerCase().includes("ok");
    } catch (error) {
      logger.error("Gemini health check failed:", error);
      return false;
    }
  }
}

export const geminiService = new GeminiService();
