import fs from "fs/promises";
import path from "path";
import { logger } from "./logger";

export interface ParsedResumeData {
  text: string;
  metadata: {
    fileName: string;
    fileSize: number;
    fileType: string;
    extractedAt: Date;
    wordCount: number;
    hasEmail: boolean;
    hasPhone: boolean;
    estimatedExperienceYears?: number;
  };
  extractedInfo: {
    emails: string[];
    phones: string[];
    skills: string[];
    education: string[];
    experience: string[];
  };
}

export class DocumentParser {
  private readonly emailRegex =
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private readonly phoneRegex =
    /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;

  // Common skills keywords (this would be expanded in a real implementation)
  private readonly skillKeywords = [
    "javascript",
    "typescript",
    "python",
    "java",
    "react",
    "node.js",
    "angular",
    "vue",
    "html",
    "css",
    "sql",
    "mongodb",
    "postgresql",
    "mysql",
    "aws",
    "azure",
    "docker",
    "kubernetes",
    "git",
    "agile",
    "scrum",
    "project management",
    "leadership",
    "communication",
    "problem solving",
    "teamwork",
    "analytical",
    "creative",
    "detail-oriented",
  ];

  async parseResume(filePath: string): Promise<ParsedResumeData> {
    try {
      const fileStats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();

      let text = "";

      // Extract text based on file type
      switch (fileExtension) {
        case ".txt":
          text = await this.parseTxtFile(filePath);
          break;
        case ".pdf":
          text = await this.parsePdfFile(filePath);
          break;
        case ".doc":
        case ".docx":
          text = await this.parseDocFile(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      // Extract information from text
      const extractedInfo = this.extractInformation(text);

      // Calculate metadata
      const wordCount = text
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
      const hasEmail = extractedInfo.emails.length > 0;
      const hasPhone = extractedInfo.phones.length > 0;
      const estimatedExperienceYears = this.estimateExperienceYears(text);

      const parsedData: ParsedResumeData = {
        text,
        metadata: {
          fileName,
          fileSize: fileStats.size,
          fileType: fileExtension,
          extractedAt: new Date(),
          wordCount,
          hasEmail,
          hasPhone,
          estimatedExperienceYears,
        },
        extractedInfo,
      };

      logger.info(`Successfully parsed resume: ${fileName}`);
      return parsedData;
    } catch (error) {
      logger.error(`Error parsing resume ${filePath}:`, error);
      throw error;
    }
  }

  private async parseTxtFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, "utf-8");
  }

  private async parsePdfFile(filePath: string): Promise<string> {
    // For now, return a placeholder. In a real implementation, you would use
    // a library like pdf-parse or pdf2pic to extract text from PDFs
    logger.warn(
      "PDF parsing not fully implemented, returning placeholder text"
    );
    return `[PDF content from ${path.basename(
      filePath
    )} - PDF parsing requires additional libraries]`;
  }

  private async parseDocFile(filePath: string): Promise<string> {
    // For now, return a placeholder. In a real implementation, you would use
    // a library like mammoth or docx-parser to extract text from Word documents
    logger.warn(
      "DOC/DOCX parsing not fully implemented, returning placeholder text"
    );
    return `[Document content from ${path.basename(
      filePath
    )} - DOC/DOCX parsing requires additional libraries]`;
  }

  private extractInformation(text: string): ParsedResumeData["extractedInfo"] {
    const emails = this.extractEmails(text);
    const phones = this.extractPhones(text);
    const skills = this.extractSkills(text);
    const education = this.extractEducation(text);
    const experience = this.extractExperience(text);

    return {
      emails,
      phones,
      skills,
      education,
      experience,
    };
  }

  private extractEmails(text: string): string[] {
    const matches = text.match(this.emailRegex);
    return matches ? [...new Set(matches)] : [];
  }

  private extractPhones(text: string): string[] {
    const matches = text.match(this.phoneRegex);
    return matches ? [...new Set(matches)] : [];
  }

  private extractSkills(text: string): string[] {
    const lowerText = text.toLowerCase();
    const foundSkills: string[] = [];

    this.skillKeywords.forEach((skill) => {
      if (lowerText.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });

    return [...new Set(foundSkills)];
  }

  private extractEducation(text: string): string[] {
    const educationKeywords = [
      "bachelor",
      "master",
      "phd",
      "doctorate",
      "degree",
      "university",
      "college",
      "b.s.",
      "b.a.",
      "m.s.",
      "m.a.",
      "mba",
      "certification",
      "certified",
    ];

    const lines = text.split("\n");
    const educationLines: string[] = [];

    lines.forEach((line) => {
      const lowerLine = line.toLowerCase();
      if (educationKeywords.some((keyword) => lowerLine.includes(keyword))) {
        educationLines.push(line.trim());
      }
    });

    return educationLines.slice(0, 5); // Limit to first 5 education-related lines
  }

  private extractExperience(text: string): string[] {
    const experienceKeywords = [
      "experience",
      "worked",
      "employed",
      "position",
      "role",
      "job",
      "company",
      "responsibilities",
      "achievements",
      "accomplished",
      "managed",
      "led",
      "developed",
    ];

    const lines = text.split("\n");
    const experienceLines: string[] = [];

    lines.forEach((line) => {
      const lowerLine = line.toLowerCase();
      if (
        experienceKeywords.some((keyword) => lowerLine.includes(keyword)) &&
        line.trim().length > 20
      ) {
        experienceLines.push(line.trim());
      }
    });

    return experienceLines.slice(0, 10); // Limit to first 10 experience-related lines
  }

  private estimateExperienceYears(text: string): number | undefined {
    // Look for patterns like "5 years", "3+ years", "2-4 years"
    const yearPatterns = [
      /(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/gi,
      /(\d+)-(\d+)\s*years?\s*(?:of\s*)?(?:experience|exp)/gi,
      /(?:experience|exp).*?(\d+)\+?\s*years?/gi,
    ];

    const years: number[] = [];

    yearPatterns.forEach((pattern) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          years.push(parseInt(match[1]));
        }
        if (match[2]) {
          years.push(parseInt(match[2]));
        }
      }
    });

    if (years.length === 0) {
      return undefined;
    }

    // Return the maximum years found
    return Math.max(...years);
  }

  async processResumeFile(filePath: string): Promise<ParsedResumeData> {
    try {
      return await this.parseResume(filePath);
    } catch (error) {
      logger.error(`Failed to process resume file ${filePath}:`, error);
      throw new Error(
        `Resume processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Methods for job posting processing
  async extractText(filePath: string): Promise<string> {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();

      switch (fileExtension) {
        case ".txt":
          return await this.parseTxtFile(filePath);
        case ".pdf":
          return await this.parsePdfFile(filePath);
        case ".doc":
        case ".docx":
          return await this.parseDocFile(filePath);
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }
    } catch (error) {
      logger.error(`Failed to extract text from ${filePath}:`, error);
      throw error;
    }
  }

  parseJobDescription(text: string): {
    requirements: string[];
    skills: string[];
    qualifications: string[];
    responsibilities: string[];
  } {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const requirements: string[] = [];
    const skills: string[] = [];
    const qualifications: string[] = [];
    const responsibilities: string[] = [];

    // Keywords to identify different sections
    const requirementKeywords = [
      "require",
      "must have",
      "essential",
      "mandatory",
      "needed",
    ];
    const skillKeywords = [
      "skill",
      "proficient",
      "experience with",
      "knowledge of",
    ];
    const qualificationKeywords = [
      "degree",
      "bachelor",
      "master",
      "certification",
      "qualified",
    ];
    const responsibilityKeywords = [
      "responsible",
      "duties",
      "will",
      "manage",
      "lead",
      "develop",
    ];

    lines.forEach((line) => {
      const lowerLine = line.toLowerCase();

      // Check for requirements
      if (requirementKeywords.some((keyword) => lowerLine.includes(keyword))) {
        requirements.push(line);
      }

      // Check for skills
      if (
        skillKeywords.some((keyword) => lowerLine.includes(keyword)) ||
        this.skillKeywords.some((skill) =>
          lowerLine.includes(skill.toLowerCase())
        )
      ) {
        skills.push(line);
      }

      // Check for qualifications
      if (
        qualificationKeywords.some((keyword) => lowerLine.includes(keyword))
      ) {
        qualifications.push(line);
      }

      // Check for responsibilities
      if (
        responsibilityKeywords.some((keyword) => lowerLine.includes(keyword))
      ) {
        responsibilities.push(line);
      }
    });

    // If no specific requirements found, extract bullet points or numbered lists
    if (requirements.length === 0) {
      const bulletPoints = lines.filter(
        (line) => line.match(/^[\s]*[-•*]\s+/) || line.match(/^\d+\.\s+/)
      );
      requirements.push(...bulletPoints.slice(0, 10)); // Limit to first 10
    }

    // Extract skills from the general skill keywords if not found in context
    if (skills.length === 0) {
      const foundSkills = this.extractSkills(text);
      skills.push(...foundSkills);
    }

    return {
      requirements: [...new Set(requirements)].slice(0, 20), // Remove duplicates and limit
      skills: [...new Set(skills)].slice(0, 15),
      qualifications: [...new Set(qualifications)].slice(0, 10),
      responsibilities: [...new Set(responsibilities)].slice(0, 15),
    };
  }
}

export const documentParser = new DocumentParser();
