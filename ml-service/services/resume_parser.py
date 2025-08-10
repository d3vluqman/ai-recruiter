import re
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import spacy
from models.schemas import ResumeData, PersonalInfo, Education, Experience

logger = logging.getLogger(__name__)


class ResumeParser:
    """Service for parsing resume text and extracting structured information"""

    def __init__(self):
        # Load spaCy model (using small English model for efficiency)
        try:
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("Successfully loaded spaCy model 'en_core_web_sm'")
        except OSError:
            logger.error("spaCy model 'en_core_web_sm' not found. Install with: python -m spacy download en_core_web_sm")
            logger.warning("Using blank model - NLP features will be limited")
            self.nlp = spacy.blank("en")

        # Common skill keywords and patterns
        self.skill_patterns = self._load_skill_patterns()
        self.education_patterns = self._load_education_patterns()
        self.experience_patterns = self._load_experience_patterns()

    def parse_resume(self, text: str) -> ResumeData:
        """
        Parse resume text and extract structured information

        Args:
            text: Raw resume text

        Returns:
            ResumeData: Structured resume information
        """
        try:
            # Clean and preprocess text
            cleaned_text = self._preprocess_text(text)

            # Extract different sections
            personal_info = self._extract_personal_info(cleaned_text)
            skills = self._extract_skills(cleaned_text)
            experience = self._extract_experience(cleaned_text)
            education = self._extract_education(cleaned_text)
            certifications = self._extract_certifications(cleaned_text)
            languages = self._extract_languages(cleaned_text)
            summary = self._extract_summary(cleaned_text)

            # Calculate total experience
            total_experience = self._calculate_total_experience(experience)

            return ResumeData(
                personal_info=personal_info,
                skills=skills,
                experience=experience,
                education=education,
                certifications=certifications,
                languages=languages,
                summary=summary,
                total_experience_years=total_experience,
            )

        except Exception as e:
            logger.error(f"Resume parsing error: {str(e)}")
            # Return minimal structure on error
            return ResumeData()

    def _preprocess_text(self, text: str) -> str:
        """Clean and normalize text for better parsing"""
        if not text:
            return ""

        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)

        # Fix common formatting issues
        text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)  # Add space between camelCase
        text = re.sub(
            r"(\d+)([A-Za-z])", r"\1 \2", text
        )  # Add space between numbers and letters

        return text.strip()

    def _extract_personal_info(self, text: str) -> PersonalInfo:
        """Extract personal information from resume text"""
        personal_info = PersonalInfo()

        # Extract email
        email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
        email_matches = re.findall(email_pattern, text)
        if email_matches:
            personal_info.email = email_matches[0]

        # Extract phone number
        phone_pattern = (
            r"(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})"
        )
        phone_matches = re.findall(phone_pattern, text)
        if phone_matches:
            phone_parts = phone_matches[0]
            personal_info.phone = "".join(phone_parts).strip()

        # Extract LinkedIn
        linkedin_pattern = r"linkedin\.com/in/[\w\-]+"
        linkedin_matches = re.findall(linkedin_pattern, text, re.IGNORECASE)
        if linkedin_matches:
            personal_info.linkedin = linkedin_matches[0]

        # Extract GitHub
        github_pattern = r"github\.com/[\w\-]+"
        github_matches = re.findall(github_pattern, text, re.IGNORECASE)
        if github_matches:
            personal_info.github = github_matches[0]

        # Extract name (heuristic approach)
        name = self._extract_name(text)
        if name:
            personal_info.name = name

        # Extract location
        location = self._extract_location(text)
        if location:
            personal_info.location = location

        return personal_info

    def _extract_name(self, text: str) -> Optional[str]:
        """Extract candidate name using NLP and patterns"""
        try:
            # Use spaCy to find person entities
            doc = self.nlp(text[:500])  # Check first 500 characters

            for ent in doc.ents:
                if ent.label_ == "PERSON" and len(ent.text.split()) >= 2:
                    return ent.text.strip()

            # Fallback: Look for name patterns at the beginning
            lines = text.split("\n")[:5]  # Check first 5 lines
            for line in lines:
                line = line.strip()
                if len(line.split()) == 2 and line.replace(" ", "").isalpha():
                    return line

        except Exception as e:
            logger.warning(f"Name extraction error: {str(e)}")

        return None

    def _extract_location(self, text: str) -> Optional[str]:
        """Extract location information"""
        try:
            # Look for common location patterns
            location_patterns = [
                r"([A-Z][a-z]+,\s*[A-Z]{2})",  # City, State
                r"([A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z]{2})",  # City Name, State
                r"([A-Z][a-z]+,\s*[A-Z][a-z]+)",  # City, Country
            ]

            for pattern in location_patterns:
                matches = re.findall(pattern, text)
                if matches:
                    return matches[0]

            # Use spaCy to find location entities
            doc = self.nlp(text[:1000])
            for ent in doc.ents:
                if ent.label_ in ["GPE", "LOC"]:  # Geopolitical entity or location
                    return ent.text.strip()

        except Exception as e:
            logger.warning(f"Location extraction error: {str(e)}")

        return None

    def _extract_skills(self, text: str) -> List[str]:
        """Extract technical and soft skills"""
        skills = set()
        text_lower = text.lower()

        # Technical skills patterns
        for skill_category, skill_list in self.skill_patterns.items():
            for skill in skill_list:
                if skill.lower() in text_lower:
                    skills.add(skill)

        # Look for skills sections
        skills_section = self._extract_section(
            text, ["skills", "technical skills", "technologies"]
        )
        if skills_section:
            # Extract comma-separated skills
            skill_items = re.split(r"[,\n•\-]", skills_section)
            for item in skill_items:
                item = item.strip()
                if item and len(item) < 50:  # Reasonable skill name length
                    skills.add(item)

        return list(skills)

    def _extract_experience(self, text: str) -> List[Experience]:
        """Extract work experience information"""
        experiences = []

        # Look for experience section
        exp_section = self._extract_section(
            text,
            ["experience", "work experience", "employment", "professional experience"],
        )

        if exp_section:
            # Split by common job separators
            job_blocks = re.split(r"\n(?=[A-Z][^a-z]*(?:at|@|\|))", exp_section)

            for block in job_blocks:
                if len(block.strip()) < 20:  # Skip very short blocks
                    continue

                experience = self._parse_experience_block(block)
                if experience.job_title or experience.company:
                    experiences.append(experience)

        return experiences

    def _parse_experience_block(self, block: str) -> Experience:
        """Parse individual experience block"""
        experience = Experience()

        lines = [line.strip() for line in block.split("\n") if line.strip()]

        if lines:
            # First line usually contains job title and company
            first_line = lines[0]

            # Extract job title and company
            if " at " in first_line:
                parts = first_line.split(" at ", 1)
                experience.job_title = parts[0].strip()
                experience.company = parts[1].strip()
            elif " | " in first_line:
                parts = first_line.split(" | ", 1)
                experience.job_title = parts[0].strip()
                experience.company = parts[1].strip()
            else:
                experience.job_title = first_line

            # Extract dates
            date_info = self._extract_dates_from_text(block)
            if date_info:
                experience.start_date = date_info.get("start_date")
                experience.end_date = date_info.get("end_date")
                experience.duration_months = date_info.get("duration_months")

            # Extract description and responsibilities
            description_lines = lines[1:] if len(lines) > 1 else []
            if description_lines:
                experience.description = "\n".join(description_lines)
                experience.responsibilities = [
                    line
                    for line in description_lines
                    if line.startswith("•") or line.startswith("-")
                ]

        return experience

    def _extract_education(self, text: str) -> List[Education]:
        """Extract education information"""
        educations = []

        # Look for education section
        edu_section = self._extract_section(
            text, ["education", "academic background", "qualifications"]
        )

        if edu_section:
            # Split by degree patterns
            degree_blocks = re.split(r"\n(?=[A-Z][^a-z]*(?:in|of|from))", edu_section)

            for block in degree_blocks:
                if len(block.strip()) < 10:
                    continue

                education = self._parse_education_block(block)
                if education.degree or education.institution:
                    educations.append(education)

        return educations

    def _parse_education_block(self, block: str) -> Education:
        """Parse individual education block"""
        education = Education()

        # Extract degree
        degree_patterns = [
            r"(Bachelor[\'s]?\s+(?:of\s+)?(?:Science|Arts|Engineering)?)",
            r"(Master[\'s]?\s+(?:of\s+)?(?:Science|Arts|Engineering)?)",
            r"(PhD|Ph\.D\.?)",
            r"(Associate[\'s]?\s+(?:of\s+)?(?:Science|Arts)?)",
            r"(B\.?[AS]\.?|M\.?[AS]\.?|Ph\.?D\.?)",
        ]

        for pattern in degree_patterns:
            match = re.search(pattern, block, re.IGNORECASE)
            if match:
                education.degree = match.group(1)
                break

        # Extract institution
        institution_pattern = (
            r"(?:from|at)\s+([A-Z][^,\n]+(?:University|College|Institute|School))"
        )
        institution_match = re.search(institution_pattern, block, re.IGNORECASE)
        if institution_match:
            education.institution = institution_match.group(1).strip()

        # Extract graduation year
        year_pattern = r"\b(19|20)\d{2}\b"
        year_matches = re.findall(year_pattern, block)
        if year_matches:
            education.graduation_year = int(year_matches[-1])  # Take the latest year

        return education

    def _extract_certifications(self, text: str) -> List[str]:
        """Extract certifications"""
        certifications = []

        # Look for certifications section
        cert_section = self._extract_section(
            text, ["certifications", "certificates", "licenses"]
        )

        if cert_section:
            # Split by common separators
            cert_items = re.split(r"[,\n•\-]", cert_section)
            for item in cert_items:
                item = item.strip()
                if item and len(item) < 100:
                    certifications.append(item)

        return certifications

    def _extract_languages(self, text: str) -> List[str]:
        """Extract language skills"""
        languages = []

        # Look for languages section
        lang_section = self._extract_section(text, ["languages", "language skills"])

        if lang_section:
            # Common languages
            common_languages = [
                "English",
                "Spanish",
                "French",
                "German",
                "Italian",
                "Portuguese",
                "Chinese",
                "Japanese",
                "Korean",
                "Arabic",
                "Russian",
                "Hindi",
            ]

            for lang in common_languages:
                if lang.lower() in lang_section.lower():
                    languages.append(lang)

        return languages

    def _extract_summary(self, text: str) -> Optional[str]:
        """Extract professional summary or objective"""
        summary_section = self._extract_section(
            text, ["summary", "objective", "profile", "about"]
        )

        if summary_section and len(summary_section) > 50:
            return summary_section[:500]  # Limit summary length

        return None

    def _extract_section(self, text: str, section_names: List[str]) -> Optional[str]:
        """Extract content from a specific section"""
        for section_name in section_names:
            pattern = rf"{section_name}[:\s]*\n(.*?)(?=\n[A-Z][A-Z\s]*:|\n\n[A-Z]|$)"
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1).strip()

        return None

    def _extract_dates_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract date ranges from text"""
        # Common date patterns
        date_patterns = [
            r"(\w+\s+\d{4})\s*[-–]\s*(\w+\s+\d{4})",  # Jan 2020 - Dec 2022
            r"(\d{1,2}/\d{4})\s*[-–]\s*(\d{1,2}/\d{4})",  # 01/2020 - 12/2022
            r"(\d{4})\s*[-–]\s*(\d{4})",  # 2020 - 2022
        ]

        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                return {
                    "start_date": match.group(1),
                    "end_date": match.group(2),
                    "duration_months": None,  # Could calculate if needed
                }

        return None

    def _calculate_total_experience(
        self, experiences: List[Experience]
    ) -> Optional[float]:
        """Calculate total years of experience"""
        if not experiences:
            return None

        total_months = 0
        for exp in experiences:
            if exp.duration_months:
                total_months += exp.duration_months
            elif exp.start_date and exp.end_date:
                # Simple calculation - could be improved
                total_months += 12  # Default to 1 year per job

        return round(total_months / 12, 1) if total_months > 0 else None

    def _load_skill_patterns(self) -> Dict[str, List[str]]:
        """Load common skill patterns for matching"""
        return {
            "programming": [
                "Python",
                "Java",
                "JavaScript",
                "TypeScript",
                "C++",
                "C#",
                "Go",
                "Rust",
                "PHP",
                "Ruby",
                "Swift",
                "Kotlin",
                "Scala",
                "R",
                "MATLAB",
            ],
            "web": [
                "React",
                "Angular",
                "Vue.js",
                "Node.js",
                "Express",
                "Django",
                "Flask",
                "Spring",
                "Laravel",
                "HTML",
                "CSS",
                "SASS",
                "Bootstrap",
            ],
            "database": [
                "SQL",
                "MySQL",
                "PostgreSQL",
                "MongoDB",
                "Redis",
                "Elasticsearch",
                "Oracle",
                "SQLite",
                "Cassandra",
                "DynamoDB",
            ],
            "cloud": [
                "AWS",
                "Azure",
                "Google Cloud",
                "Docker",
                "Kubernetes",
                "Terraform",
                "Jenkins",
                "GitLab CI",
                "GitHub Actions",
            ],
            "data": [
                "Machine Learning",
                "Data Science",
                "Pandas",
                "NumPy",
                "TensorFlow",
                "PyTorch",
                "Scikit-learn",
                "Tableau",
                "Power BI",
            ],
        }

    def _load_education_patterns(self) -> List[str]:
        """Load education degree patterns"""
        return [
            "Bachelor",
            "Master",
            "PhD",
            "Associate",
            "Doctorate",
            "B.S.",
            "B.A.",
            "M.S.",
            "M.A.",
            "Ph.D.",
        ]

    def _load_experience_patterns(self) -> List[str]:
        """Load experience-related patterns"""
        return [
            "Software Engineer",
            "Developer",
            "Analyst",
            "Manager",
            "Director",
            "Consultant",
            "Specialist",
            "Coordinator",
            "Lead",
            "Senior",
        ]
