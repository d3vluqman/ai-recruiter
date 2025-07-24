import pytest
from unittest.mock import Mock, patch
from services.job_parser import JobDescriptionParser
from models.schemas import JobRequirements


class TestJobDescriptionParser:

    def setup_method(self):
        """Set up test fixtures"""
        self.parser = JobDescriptionParser()

    def test_init(self):
        """Test JobDescriptionParser initialization"""
        assert self.parser is not None
        assert hasattr(self.parser, "skill_keywords")
        assert hasattr(self.parser, "experience_keywords")

    def test_preprocess_text(self):
        """Test text preprocessing"""
        messy_text = "SoftwareEngineer   position   with   extra   spaces"
        cleaned = self.parser._preprocess_text(messy_text)

        assert "Software Engineer" in cleaned
        assert "   " not in cleaned

    def test_extract_job_title_with_keywords(self):
        """Test job title extraction with common keywords"""
        text = """
        Senior Software Engineer
        We are looking for an experienced developer
        """
        title = self.parser._extract_job_title(text)

        assert title == "Senior Software Engineer"

    def test_extract_job_title_fallback(self):
        """Test job title extraction fallback method"""
        text = """
        Product Manager Position
        Join our amazing team
        """
        title = self.parser._extract_job_title(text)

        assert "Product Manager" in title

    @patch("spacy.load")
    def test_extract_company_name_with_spacy(self, mock_spacy_load):
        """Test company name extraction using spaCy"""
        # Mock spaCy model and entities
        mock_ent = Mock()
        mock_ent.label_ = "ORG"
        mock_ent.text = "TechCorp Inc"

        mock_doc = Mock()
        mock_doc.ents = [mock_ent]

        mock_nlp = Mock()
        mock_nlp.return_value = mock_doc
        mock_spacy_load.return_value = mock_nlp

        # Create new parser instance to use mocked spaCy
        parser = JobDescriptionParser()
        parser.nlp = mock_nlp

        text = "Join TechCorp Inc as a Software Engineer"
        company = parser._extract_company_name(text)

        assert company == "TechCorp Inc"

    def test_extract_company_name_patterns(self):
        """Test company name extraction using patterns"""
        text = "Join Google as a Senior Developer"
        company = self.parser._extract_company_name(text)

        assert company == "Google"

    def test_extract_location_patterns(self):
        """Test location extraction"""
        text = "Location: San Francisco, CA"
        location = self.parser._extract_location(text)

        assert location == "San Francisco, CA"

    def test_extract_location_remote(self):
        """Test remote location extraction"""
        text = "This is a remote position with flexible hours"
        location = self.parser._extract_location(text)

        assert location == "Remote"

    def test_extract_department(self):
        """Test department extraction"""
        text = "Department: Engineering Team"
        department = self.parser._extract_department(text)

        assert "Engineering" in department

    def test_extract_employment_type_full_time(self):
        """Test full-time employment type extraction"""
        text = "This is a full-time position with benefits"
        emp_type = self.parser._extract_employment_type(text)

        assert emp_type == "full-time"

    def test_extract_employment_type_contract(self):
        """Test contract employment type extraction"""
        text = "We are hiring a contract developer for 6 months"
        emp_type = self.parser._extract_employment_type(text)

        assert emp_type == "contract"

    def test_extract_experience_level_senior(self):
        """Test senior experience level extraction"""
        text = "Looking for a senior developer with 5+ years experience"
        level = self.parser._extract_experience_level(text)

        assert level == "senior"

    def test_extract_experience_level_entry(self):
        """Test entry level extraction"""
        text = "Great opportunity for entry level developers"
        level = self.parser._extract_experience_level(text)

        assert level == "entry"

    def test_extract_required_skills(self):
        """Test required skills extraction"""
        text = """
        Required Skills:
        • Python programming
        • React development
        • AWS cloud services
        • SQL databases
        """
        skills = self.parser._extract_required_skills(text)

        assert "Python" in skills
        assert "React" in skills
        assert "AWS" in skills

    def test_extract_preferred_skills(self):
        """Test preferred skills extraction"""
        text = """
        Nice to have:
        • Docker experience
        • Kubernetes knowledge
        • Machine Learning background
        """
        skills = self.parser._extract_preferred_skills(text)

        assert len(skills) > 0
        # Should extract some skills from the nice-to-have section

    def test_extract_skills_from_text(self):
        """Test skill extraction from general text"""
        text = "Experience with Python, JavaScript, React, and AWS is required"
        skills = self.parser._extract_skills_from_text(text)

        assert "Python" in skills
        assert "JavaScript" in skills
        assert "React" in skills
        assert "AWS" in skills

    def test_extract_experience_years(self):
        """Test experience years extraction"""
        text = "Minimum 5 years of experience required"
        years = self.parser._extract_experience_years(text)

        assert years == 5

    def test_extract_experience_years_plus(self):
        """Test experience years extraction with plus sign"""
        text = "3+ years experience in software development"
        years = self.parser._extract_experience_years(text)

        assert years == 3

    def test_extract_experience_years_range(self):
        """Test experience years extraction from range"""
        text = "2-5 years experience preferred"
        years = self.parser._extract_experience_years(text)

        assert years == 2  # Should extract the minimum

    def test_extract_education_requirements(self):
        """Test education requirements extraction"""
        text = """
        Education:
        • Bachelor's degree in Computer Science
        • Master's degree preferred
        • PhD in related field is a plus
        """
        education = self.parser._extract_education_requirements(text)

        assert len(education) >= 1
        assert any("Bachelor" in req for req in education)

    def test_extract_certifications(self):
        """Test certifications extraction"""
        text = """
        Certifications:
        • AWS Certified Solutions Architect
        • PMP certification preferred
        • CISSP is a plus
        """
        certifications = self.parser._extract_certifications(text)

        assert len(certifications) >= 1
        assert any("AWS" in cert for cert in certifications)

    def test_extract_responsibilities(self):
        """Test responsibilities extraction"""
        text = """
        Responsibilities:
        • Design and develop web applications
        • Collaborate with cross-functional teams
        • Mentor junior developers
        • Participate in code reviews
        """
        responsibilities = self.parser._extract_responsibilities(text)

        assert len(responsibilities) >= 3
        assert any("develop" in resp.lower() for resp in responsibilities)
        assert any("collaborate" in resp.lower() for resp in responsibilities)

    def test_extract_qualifications(self):
        """Test qualifications extraction"""
        text = """
        Qualifications:
        • Strong programming skills in Python
        • Experience with web frameworks
        • Excellent communication skills
        """
        qualifications = self.parser._extract_qualifications(text)

        assert len(qualifications) >= 2
        assert any("programming" in qual.lower() for qual in qualifications)

    def test_extract_benefits(self):
        """Test benefits extraction"""
        text = """
        Benefits:
        We offer competitive salary, health insurance, dental coverage,
        401k matching, flexible work arrangements, and gym membership.
        """
        benefits = self.parser._extract_benefits(text)

        assert len(benefits) >= 3
        assert "Health Insurance" in benefits
        assert "401K" in benefits
        assert "Flexible" in benefits

    def test_extract_salary_range_standard(self):
        """Test salary range extraction"""
        text = "Salary range: $80,000 - $120,000 per year"
        salary = self.parser._extract_salary_range(text)

        assert salary == "$80,000 - $120,000"

    def test_extract_salary_range_k_format(self):
        """Test salary range extraction with k format"""
        text = "Compensation: $80k - $120k annually"
        salary = self.parser._extract_salary_range(text)

        assert "$80k - $120k" in salary

    def test_extract_section(self):
        """Test generic section extraction"""
        text = """
        Job Description:
        We are looking for a talented developer
        
        Requirements:
        • 3+ years experience
        • Python skills
        
        Benefits:
        Great compensation package
        """

        requirements_section = self.parser._extract_section(text, ["requirements"])
        assert "3+ years experience" in requirements_section
        assert "Python skills" in requirements_section

        benefits_section = self.parser._extract_section(text, ["benefits"])
        assert "compensation package" in benefits_section

    def test_parse_job_description_complete(self):
        """Test complete job description parsing"""
        job_text = """
        Senior Software Engineer
        TechCorp Inc
        
        Location: San Francisco, CA
        Department: Engineering
        Employment Type: Full-time
        
        We are seeking a senior software engineer with 5+ years of experience.
        
        Required Skills:
        • Python, JavaScript, React
        • AWS cloud services
        • SQL databases
        
        Preferred Skills:
        • Docker and Kubernetes
        • Machine Learning experience
        
        Responsibilities:
        • Design and develop scalable web applications
        • Lead technical discussions and code reviews
        • Mentor junior team members
        
        Qualifications:
        • Bachelor's degree in Computer Science
        • 5+ years of software development experience
        • Strong problem-solving skills
        
        Benefits:
        • Competitive salary ($120,000 - $160,000)
        • Health insurance and dental coverage
        • 401k matching and stock options
        • Flexible work arrangements
        """

        result = self.parser.parse_job_description(job_text)

        assert isinstance(result, JobRequirements)
        assert result.title == "Senior Software Engineer"
        assert result.company == "TechCorp Inc"
        assert result.location == "San Francisco, CA"
        assert result.employment_type == "full-time"
        assert result.required_experience_years == 5
        assert "Python" in result.required_skills
        assert "JavaScript" in result.required_skills
        assert len(result.responsibilities) >= 2
        assert len(result.qualifications) >= 2
        assert len(result.benefits) >= 3

    def test_parse_job_description_minimal(self):
        """Test job description parsing with minimal information"""
        job_text = "Software Developer position available"

        result = self.parser.parse_job_description(job_text)

        assert isinstance(result, JobRequirements)
        assert result.description == job_text

    def test_parse_job_description_error_handling(self):
        """Test job description parsing with error conditions"""
        # Test with empty text
        result = self.parser.parse_job_description("")
        assert isinstance(result, JobRequirements)

        # Test with None
        result = self.parser.parse_job_description(None)
        assert isinstance(result, JobRequirements)

    def test_load_skill_keywords(self):
        """Test skill keywords loading"""
        keywords = self.parser._load_skill_keywords()

        assert "programming" in keywords
        assert "web" in keywords
        assert "database" in keywords
        assert "cloud" in keywords
        assert "Python" in keywords["programming"]
        assert "React" in keywords["web"]
        assert "AWS" in keywords["cloud"]

    def test_load_experience_keywords(self):
        """Test experience keywords loading"""
        keywords = self.parser._load_experience_keywords()

        assert "experience" in keywords
        assert "years" in keywords
        assert "expertise" in keywords

    def test_load_education_keywords(self):
        """Test education keywords loading"""
        keywords = self.parser._load_education_keywords()

        assert "degree" in keywords
        assert "bachelor" in keywords
        assert "master" in keywords
        assert "university" in keywords

    def test_load_responsibility_keywords(self):
        """Test responsibility keywords loading"""
        keywords = self.parser._load_responsibility_keywords()

        assert "develop" in keywords
        assert "design" in keywords
        assert "implement" in keywords
        assert "manage" in keywords
