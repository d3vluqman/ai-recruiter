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


class ParseError(BaseModel):
    """Error response model"""

    error: str
    detail: Optional[str] = None
    file_name: Optional[str] = None
