from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime


class PersonalInfo(BaseModel):
    """Personal information extracted from resume"""

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None


class Education(BaseModel):
    """Education information"""

    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    institution: Optional[str] = None
    graduation_year: Optional[int] = None
    gpa: Optional[float] = None

    @validator("graduation_year")
    def validate_graduation_year(cls, v):
        if v is not None and (v < 1950 or v > datetime.now().year + 10):
            return None
        return v


class Experience(BaseModel):
    """Work experience information"""

    job_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_months: Optional[int] = None
    description: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)


class ResumeData(BaseModel):
    """Complete resume data structure"""

    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    skills: List[str] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
    total_experience_years: Optional[float] = None

    @validator("skills", "certifications", "languages")
    def clean_list_items(cls, v):
        """Remove empty strings and duplicates from lists"""
        if v:
            cleaned = [item.strip() for item in v if item and item.strip()]
            return list(
                dict.fromkeys(cleaned)
            )  # Remove duplicates while preserving order
        return []


class JobRequirements(BaseModel):
    """Job description requirements structure"""

    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    department: Optional[str] = None
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    required_experience_years: Optional[int] = None
    required_education: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    responsibilities: List[str] = Field(default_factory=list)
    qualifications: List[str] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    salary_range: Optional[str] = None
    description: Optional[str] = None

    @validator(
        "required_skills",
        "preferred_skills",
        "required_education",
        "certifications",
        "responsibilities",
        "qualifications",
        "benefits",
    )
    def clean_list_items(cls, v):
        """Remove empty strings and duplicates from lists"""
        if v:
            cleaned = [item.strip() for item in v if item and item.strip()]
            return list(
                dict.fromkeys(cleaned)
            )  # Remove duplicates while preserving order
        return []


class ParsedDocument(BaseModel):
    """Generic parsed document structure"""

    text_content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    processing_status: str = "success"
    error_message: Optional[str] = None


class SkillMatch(BaseModel):
    """Individual skill match result"""

    skill_name: str
    required: bool
    matched: bool
    confidence_score: float = Field(ge=0.0, le=1.0)
    similarity_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class ExperienceMatch(BaseModel):
    """Experience matching result"""

    total_years: float
    relevant_years: float
    required_years: Optional[int] = None
    experience_score: float = Field(ge=0.0, le=1.0)
    relevant_positions: List[str] = Field(default_factory=list)


class EducationMatch(BaseModel):
    """Education matching result"""

    degree_match: bool
    field_match: bool
    education_score: float = Field(ge=0.0, le=1.0)
    matched_degrees: List[str] = Field(default_factory=list)


class EvaluationResult(BaseModel):
    """Complete evaluation result for a candidate"""

    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    overall_score: float = Field(ge=0.0, le=100.0)
    skill_score: float = Field(ge=0.0, le=100.0)
    experience_score: float = Field(ge=0.0, le=100.0)
    education_score: float = Field(ge=0.0, le=100.0)
    skill_matches: List[SkillMatch] = Field(default_factory=list)
    experience_match: ExperienceMatch = Field(default_factory=ExperienceMatch)
    education_match: EducationMatch = Field(default_factory=EducationMatch)
    gap_analysis: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    evaluation_summary: Optional[str] = None


class BatchEvaluationRequest(BaseModel):
    """Request for batch evaluation of multiple candidates"""

    job_requirements: JobRequirements
    candidates: List[Dict[str, Any]]  # List of candidate data with resume info
    weights: Optional[Dict[str, float]] = Field(
        default_factory=lambda: {"skills": 0.4, "experience": 0.4, "education": 0.2}
    )


class BatchEvaluationResult(BaseModel):
    """Result of batch evaluation"""

    job_id: Optional[str] = None
    evaluations: List[EvaluationResult] = Field(default_factory=list)
    total_candidates: int
    processed_candidates: int
    failed_candidates: int
    processing_time_seconds: float


class ParseError(BaseModel):
    """Error response model"""

    error: str
    detail: Optional[str] = None
    file_name: Optional[str] = None
