import re
import logging
from typing import List, Optional, Dict, Any
import spacy
from models.schemas import JobRequirements

logger = logging.getLogger(__name__)


class JobDescriptionParser:
    """Service for parsing job descriptions and extracting requirements"""

    def __init__(self):
        # Load spaCy model
        try:
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("Successfully loaded spaCy model 'en_core_web_sm'")
        except OSError:
            logger.error(
                "spaCy model 'en_core_web_sm' not found. Install with: python -m spacy download en_core_web_sm"
            )
            logger.warning("Using blank model - NLP features will be limited")
            self.nlp = spacy.blank("en")

        # Load patterns and keywords
        self.skill_keywords = self._load_skill_keywords()
        self.experience_keywords = self._load_experience_keywords()
        self.education_keywords = self._load_education_keywords()
        self.responsibility_keywords = self._load_responsibility_keywords()

    def parse_job_description(self, text: str) -> JobRequirements:
        """
        Parse job description text and extract structured requirements

        Args:
            text: Raw job description text

        Returns:
            JobRequirements: Structured job requirements
        """
        try:
            # Clean and preprocess text
            cleaned_text = self._preprocess_text(text)

            # Extract different components
            title = self._extract_job_title(cleaned_text)
            company = self._extract_company_name(cleaned_text)
            location = self._extract_location(cleaned_text)
            department = self._extract_department(cleaned_text)
            employment_type = self._extract_employment_type(cleaned_text)
            experience_level = self._extract_experience_level(cleaned_text)

            required_skills = self._extract_required_skills(cleaned_text)
            preferred_skills = self._extract_preferred_skills(cleaned_text)
            required_experience_years = self._extract_experience_years(cleaned_text)
            required_education = self._extract_education_requirements(cleaned_text)
            certifications = self._extract_certifications(cleaned_text)

            responsibilities = self._extract_responsibilities(cleaned_text)
            qualifications = self._extract_qualifications(cleaned_text)
            benefits = self._extract_benefits(cleaned_text)
            salary_range = self._extract_salary_range(cleaned_text)

            return JobRequirements(
                title=title,
                company=company,
                location=location,
                department=department,
                employment_type=employment_type,
                experience_level=experience_level,
                required_skills=required_skills,
                preferred_skills=preferred_skills,
                required_experience_years=required_experience_years,
                required_education=required_education,
                certifications=certifications,
                responsibilities=responsibilities,
                qualifications=qualifications,
                benefits=benefits,
                salary_range=salary_range,
                description=cleaned_text[
                    :1000
                ],  # Store first 1000 chars as description
            )

        except Exception as e:
            logger.error(f"Job description parsing error: {str(e)}")
            # Return minimal structure on error
            return JobRequirements(description=text[:1000] if text else "")

    def _preprocess_text(self, text: str) -> str:
        """Clean and normalize text for better parsing"""
        if not text:
            return ""

        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)

        # Fix common formatting issues
        text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)

        return text.strip()

    def _extract_job_title(self, text: str) -> Optional[str]:
        """Extract job title from job description"""
        # Look for common job title patterns at the beginning
        lines = text.split("\n")[:5]  # Check first 5 lines

        for line in lines:
            line = line.strip()
            if len(line) > 5 and len(line) < 100:
                # Check if line contains job title keywords
                job_keywords = [
                    "engineer",
                    "developer",
                    "analyst",
                    "manager",
                    "director",
                    "specialist",
                    "consultant",
                    "coordinator",
                    "lead",
                    "senior",
                    "junior",
                    "associate",
                    "principal",
                    "architect",
                    "designer",
                ]

                if any(keyword in line.lower() for keyword in job_keywords):
                    return line

        # Fallback: use first non-empty line if it's reasonable length
        for line in lines:
            line = line.strip()
            if 10 <= len(line) <= 80:
                return line

        return None

    def _extract_company_name(self, text: str) -> Optional[str]:
        """Extract company name using NLP and patterns"""
        try:
            # Use spaCy to find organization entities
            doc = self.nlp(text[:500])  # Check first 500 characters

            for ent in doc.ents:
                if ent.label_ == "ORG" and len(ent.text.split()) <= 4:
                    return ent.text.strip()

            # Look for "at Company" or "Company is" patterns
            company_patterns = [
                r"at\s+([A-Z][A-Za-z\s&]+?)(?:\s+is|\s+seeks|\s+looking|\.|,)",
                r"([A-Z][A-Za-z\s&]+?)\s+is\s+(?:seeking|looking|hiring)",
                r"join\s+([A-Z][A-Za-z\s&]+?)(?:\s+as|\s+team|\.|,)",
            ]

            for pattern in company_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    company = match.group(1).strip()
                    if len(company) < 50:  # Reasonable company name length
                        return company

        except Exception as e:
            logger.warning(f"Company name extraction error: {str(e)}")

        return None

    def _extract_location(self, text: str) -> Optional[str]:
        """Extract job location"""
        try:
            # Look for location patterns
            location_patterns = [
                r"location[:\s]+([A-Z][a-z]+(?:,\s*[A-Z]{2})?)",
                r"based\s+in\s+([A-Z][a-z]+(?:,\s*[A-Z]{2})?)",
                r"([A-Z][a-z]+,\s*[A-Z]{2})",  # City, State
                r"remote",
                r"work\s+from\s+home",
            ]

            for pattern in location_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    if pattern.endswith("remote") or "home" in pattern:
                        return "Remote"
                    return match.group(1).strip()

            # Use spaCy to find location entities
            doc = self.nlp(text[:1000])
            for ent in doc.ents:
                if ent.label_ in ["GPE", "LOC"]:
                    return ent.text.strip()

        except Exception as e:
            logger.warning(f"Location extraction error: {str(e)}")

        return None

    def _extract_department(self, text: str) -> Optional[str]:
        """Extract department information"""
        department_patterns = [
            r"department[:\s]+([A-Z][A-Za-z\s]+)",
            r"team[:\s]+([A-Z][A-Za-z\s]+)",
            r"division[:\s]+([A-Z][A-Za-z\s]+)",
        ]

        for pattern in department_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                dept = match.group(1).strip()
                if len(dept) < 50:
                    return dept

        return None

    def _extract_employment_type(self, text: str) -> Optional[str]:
        """Extract employment type (full-time, part-time, contract, etc.)"""
        employment_types = {
            "full-time": ["full-time", "full time", "fulltime"],
            "part-time": ["part-time", "part time", "parttime"],
            "contract": ["contract", "contractor", "freelance"],
            "temporary": ["temporary", "temp", "interim"],
            "internship": ["intern", "internship", "co-op"],
        }

        text_lower = text.lower()
        for emp_type, keywords in employment_types.items():
            if any(keyword in text_lower for keyword in keywords):
                return emp_type

        return None

    def _extract_experience_level(self, text: str) -> Optional[str]:
        """Extract experience level"""
        experience_levels = {
            "entry": ["entry", "junior", "graduate", "new grad"],
            "mid": ["mid", "intermediate", "2-5 years", "3-5 years"],
            "senior": ["senior", "lead", "principal", "5+ years", "7+ years"],
            "executive": ["director", "vp", "executive", "head of"],
        }

        text_lower = text.lower()
        for level, keywords in experience_levels.items():
            if any(keyword in text_lower for keyword in keywords):
                return level

        return None

    def _extract_required_skills(self, text: str) -> List[str]:
        """Extract required technical skills"""
        skills = set()

        # Look for required skills section
        required_section = self._extract_section(
            text, ["required skills", "requirements", "must have", "essential skills"]
        )

        if required_section:
            skills.update(self._extract_skills_from_text(required_section))

        # Also check general text for skill keywords
        skills.update(self._extract_skills_from_text(text))

        return list(skills)[:20]  # Limit to top 20 skills

    def _extract_preferred_skills(self, text: str) -> List[str]:
        """Extract preferred/nice-to-have skills"""
        skills = set()

        # Look for preferred skills section
        preferred_section = self._extract_section(
            text,
            ["preferred skills", "nice to have", "bonus", "plus", "additional skills"],
        )

        if preferred_section:
            skills.update(self._extract_skills_from_text(preferred_section))

        return list(skills)[:15]  # Limit to top 15 preferred skills

    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from text using keyword matching"""
        skills = set()
        text_lower = text.lower()

        # Check against known skill keywords
        for category, skill_list in self.skill_keywords.items():
            for skill in skill_list:
                if skill.lower() in text_lower:
                    skills.add(skill)

        return list(skills)

    def _extract_experience_years(self, text: str) -> Optional[int]:
        """Extract required years of experience"""
        # Look for experience year patterns
        year_patterns = [
            r"(\d+)\+?\s*years?\s+(?:of\s+)?experience",
            r"minimum\s+(\d+)\s+years?",
            r"at\s+least\s+(\d+)\s+years?",
            r"(\d+)-\d+\s+years?\s+experience",
        ]

        for pattern in year_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                years = int(match.group(1))
                if 0 <= years <= 20:  # Reasonable range
                    return years

        return None

    def _extract_education_requirements(self, text: str) -> List[str]:
        """Extract education requirements"""
        education = []

        # Look for education section
        edu_section = self._extract_section(
            text, ["education", "qualifications", "degree", "academic"]
        )

        if edu_section:
            # Look for degree patterns
            degree_patterns = [
                r"(Bachelor[\'s]?\s+(?:degree\s+)?(?:in\s+)?[A-Za-z\s]+)",
                r"(Master[\'s]?\s+(?:degree\s+)?(?:in\s+)?[A-Za-z\s]+)",
                r"(PhD|Ph\.D\.?\s+(?:in\s+)?[A-Za-z\s]+)",
                r"(Associate[\'s]?\s+(?:degree\s+)?(?:in\s+)?[A-Za-z\s]+)",
            ]

            for pattern in degree_patterns:
                matches = re.findall(pattern, edu_section, re.IGNORECASE)
                education.extend([match.strip() for match in matches])

        return education[:5]  # Limit to 5 education requirements

    def _extract_certifications(self, text: str) -> List[str]:
        """Extract required certifications"""
        certifications = []

        # Look for certifications section
        cert_section = self._extract_section(
            text, ["certifications", "certificates", "licenses"]
        )

        if cert_section:
            # Common certification patterns
            cert_patterns = [
                r"([A-Z]{2,}\s+certified)",
                r"([A-Z][A-Za-z\s]+\s+certification)",
                r"(PMP|CISSP|CISA|AWS|Azure|Google Cloud)",
            ]

            for pattern in cert_patterns:
                matches = re.findall(pattern, cert_section, re.IGNORECASE)
                certifications.extend([match.strip() for match in matches])

        return certifications[:10]  # Limit to 10 certifications

    def _extract_responsibilities(self, text: str) -> List[str]:
        """Extract job responsibilities"""
        responsibilities = []

        # Look for responsibilities section
        resp_section = self._extract_section(
            text, ["responsibilities", "duties", "role", "what you will do"]
        )

        if resp_section:
            # Split by bullet points or line breaks
            items = re.split(r"[•\-\*]\s*|\n", resp_section)
            for item in items:
                item = item.strip()
                if (
                    len(item) > 20 and len(item) < 200
                ):  # Reasonable responsibility length
                    responsibilities.append(item)

        return responsibilities[:10]  # Limit to 10 responsibilities

    def _extract_qualifications(self, text: str) -> List[str]:
        """Extract qualifications"""
        qualifications = []

        # Look for qualifications section
        qual_section = self._extract_section(
            text, ["qualifications", "requirements", "what we are looking for"]
        )

        if qual_section:
            # Split by bullet points or line breaks
            items = re.split(r"[•\-\*]\s*|\n", qual_section)
            for item in items:
                item = item.strip()
                if len(item) > 15 and len(item) < 150:
                    qualifications.append(item)

        return qualifications[:10]  # Limit to 10 qualifications

    def _extract_benefits(self, text: str) -> List[str]:
        """Extract benefits and perks"""
        benefits = []

        # Look for benefits section
        benefits_section = self._extract_section(
            text, ["benefits", "perks", "what we offer", "compensation"]
        )

        if benefits_section:
            # Common benefits keywords
            benefit_keywords = [
                "health insurance",
                "dental",
                "vision",
                "401k",
                "retirement",
                "vacation",
                "pto",
                "flexible",
                "remote",
                "stock options",
                "bonus",
                "gym",
                "learning",
                "training",
            ]

            for keyword in benefit_keywords:
                if keyword in benefits_section.lower():
                    benefits.append(keyword.title())

        return benefits[:8]  # Limit to 8 benefits

    def _extract_salary_range(self, text: str) -> Optional[str]:
        """Extract salary range information"""
        # Look for salary patterns
        salary_patterns = [
            r"\$(\d{2,3}),?(\d{3})\s*-\s*\$(\d{2,3}),?(\d{3})",  # $80,000 - $120,000
            r"\$(\d{2,3})k\s*-\s*\$(\d{2,3})k",  # $80k - $120k
            r"(\d{2,3}),?(\d{3})\s*-\s*(\d{2,3}),?(\d{3})",  # 80,000 - 120,000
        ]

        for pattern in salary_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)

        return None

    def _extract_section(self, text: str, section_names: List[str]) -> Optional[str]:
        """Extract content from a specific section"""
        for section_name in section_names:
            # Try different section header patterns
            patterns = [
                rf"{section_name}[:\s]*\n(.*?)(?=\n[A-Z][A-Z\s]*:|\n\n[A-Z]|$)",
                rf"{section_name}[:\s]*(.*?)(?=\n[A-Z][A-Z\s]*:|\n\n|$)",
            ]

            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
                if match:
                    content = match.group(1).strip()
                    if len(content) > 20:  # Ensure meaningful content
                        return content

        return None

    def _load_skill_keywords(self) -> Dict[str, List[str]]:
        """Load skill keywords for matching"""
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
                "Perl",
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
                "jQuery",
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
                "Neo4j",
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
                "CircleCI",
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
                "Apache Spark",
            ],
            "mobile": [
                "iOS",
                "Android",
                "React Native",
                "Flutter",
                "Xamarin",
                "Swift",
                "Kotlin",
            ],
            "tools": [
                "Git",
                "Jira",
                "Confluence",
                "Slack",
                "Figma",
                "Adobe",
                "Photoshop",
            ],
        }

    def _load_experience_keywords(self) -> List[str]:
        """Load experience-related keywords"""
        return [
            "experience",
            "years",
            "background",
            "expertise",
            "knowledge",
            "proficiency",
            "familiarity",
            "understanding",
        ]

    def _load_education_keywords(self) -> List[str]:
        """Load education-related keywords"""
        return [
            "degree",
            "bachelor",
            "master",
            "phd",
            "doctorate",
            "associate",
            "education",
            "university",
            "college",
            "graduate",
        ]

    def _load_responsibility_keywords(self) -> List[str]:
        """Load responsibility-related keywords"""
        return [
            "develop",
            "design",
            "implement",
            "maintain",
            "manage",
            "lead",
            "collaborate",
            "work with",
            "responsible for",
            "ensure",
        ]
