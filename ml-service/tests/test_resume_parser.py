import pytest
from unittest.mock import Mock, patch
from services.resume_parser import ResumeParser
from models.schemas import ResumeData, PersonalInfo, Education, Experience


class TestResumeParser:

    def setup_method(self):
        """Set up test fixtures"""
        self.parser = ResumeParser()

    def test_init(self):
        """Test ResumeParser initialization"""
        assert self.parser is not None
        assert hasattr(self.parser, "skill_patterns")
        assert hasattr(self.parser, "education_patterns")

    def test_preprocess_text(self):
        """Test text preprocessing"""
        messy_text = "ThisIsCamelCase   with   extra   spaces\n\n\nand123numbers"
        cleaned = self.parser._preprocess_text(messy_text)

        assert "This Is Camel Case" in cleaned
        assert "and 123 numbers" in cleaned
        assert "   " not in cleaned

    def test_preprocess_text_empty(self):
        """Test preprocessing empty text"""
        assert self.parser._preprocess_text("") == ""
        assert self.parser._preprocess_text(None) == ""

    def test_extract_personal_info_email(self):
        """Test email extraction"""
        text = "Contact me at john.doe@example.com for more information"
        personal_info = self.parser._extract_personal_info(text)

        assert personal_info.email == "john.doe@example.com"

    def test_extract_personal_info_phone(self):
        """Test phone number extraction"""
        text = "Call me at (555) 123-4567 or email me"
        personal_info = self.parser._extract_personal_info(text)

        assert "555" in personal_info.phone
        assert "123" in personal_info.phone
        assert "4567" in personal_info.phone

    def test_extract_personal_info_linkedin(self):
        """Test LinkedIn URL extraction"""
        text = "Find me on LinkedIn: linkedin.com/in/johndoe"
        personal_info = self.parser._extract_personal_info(text)

        assert personal_info.linkedin == "linkedin.com/in/johndoe"

    def test_extract_personal_info_github(self):
        """Test GitHub URL extraction"""
        text = "Check out my code: github.com/johndoe"
        personal_info = self.parser._extract_personal_info(text)

        assert personal_info.github == "github.com/johndoe"

    @patch("spacy.load")
    def test_extract_name_with_spacy(self, mock_spacy_load):
        """Test name extraction using spaCy"""
        # Mock spaCy model and entities
        mock_ent = Mock()
        mock_ent.label_ = "PERSON"
        mock_ent.text = "John Doe"

        mock_doc = Mock()
        mock_doc.ents = [mock_ent]

        mock_nlp = Mock()
        mock_nlp.return_value = mock_doc
        mock_spacy_load.return_value = mock_nlp

        # Create new parser instance to use mocked spaCy
        parser = ResumeParser()
        parser.nlp = mock_nlp

        text = "John Doe\nSoftware Engineer"
        name = parser._extract_name(text)

        assert name == "John Doe"

    def test_extract_name_fallback(self):
        """Test name extraction fallback method"""
        text = "John Smith\nSoftware Engineer\nExperience: 5 years"
        name = self.parser._extract_name(text)

        # Should extract first line with two words
        assert name == "John Smith"

    def test_extract_skills_from_patterns(self):
        """Test skill extraction using predefined patterns"""
        text = (
            "I have experience with Python, JavaScript, React, and AWS cloud services"
        )
        skills = self.parser._extract_skills(text)

        assert "Python" in skills
        assert "JavaScript" in skills
        assert "React" in skills
        assert "AWS" in skills

    def test_extract_skills_from_section(self):
        """Test skill extraction from dedicated skills section"""
        text = """
        Experience: 5 years
        
        Skills:
        • Python, Java, C++
        • React, Angular, Vue.js
        • MySQL, PostgreSQL
        
        Education: Bachelor's Degree
        """
        skills = self.parser._extract_skills(text)

        assert "Python" in skills
        assert "React" in skills
        assert "MySQL" in skills

    def test_extract_experience_basic(self):
        """Test basic experience extraction"""
        text = """
        Experience:
        Software Engineer at Google
        January 2020 - Present
        • Developed web applications
        • Led team of 5 developers
        """
        experiences = self.parser._extract_experience(text)

        assert len(experiences) >= 1
        exp = experiences[0]
        assert exp.job_title == "Software Engineer"
        assert exp.company == "Google"

    def test_extract_experience_multiple_jobs(self):
        """Test extraction of multiple work experiences"""
        text = """
        Work Experience:
        Senior Developer at Microsoft
        2021 - Present
        
        Junior Developer at Apple
        2019 - 2021
        """
        experiences = self.parser._extract_experience(text)

        assert len(experiences) >= 2
        # Check that both companies are extracted
        companies = [exp.company for exp in experiences]
        assert "Microsoft" in companies or "Apple" in companies

    def test_parse_experience_block(self):
        """Test parsing individual experience block"""
        block = """
        Senior Software Engineer at TechCorp
        March 2020 - Present
        • Developed microservices architecture
        • Mentored junior developers
        • Improved system performance by 40%
        """

        experience = self.parser._parse_experience_block(block)

        assert experience.job_title == "Senior Software Engineer"
        assert experience.company == "TechCorp"
        assert "microservices" in experience.description

    def test_extract_education_basic(self):
        """Test basic education extraction"""
        text = """
        Education:
        Bachelor of Science in Computer Science
        University of California, Berkeley
        Graduated: 2018
        """
        educations = self.parser._extract_education(text)

        assert len(educations) >= 1
        edu = educations[0]
        assert "Bachelor" in edu.degree
        assert "Berkeley" in edu.institution
        assert edu.graduation_year == 2018

    def test_parse_education_block(self):
        """Test parsing individual education block"""
        block = """
        Master of Science in Computer Science
        from Stanford University
        2020
        """

        education = self.parser._parse_education_block(block)

        assert "Master" in education.degree
        assert "Stanford University" in education.institution
        assert education.graduation_year == 2020

    def test_extract_certifications(self):
        """Test certification extraction"""
        text = """
        Certifications:
        • AWS Certified Solutions Architect
        • Google Cloud Professional
        • Certified Kubernetes Administrator
        """
        certifications = self.parser._extract_certifications(text)

        assert len(certifications) >= 3
        assert any("AWS" in cert for cert in certifications)
        assert any("Google Cloud" in cert for cert in certifications)

    def test_extract_languages(self):
        """Test language extraction"""
        text = """
        Languages:
        English (Native), Spanish (Fluent), French (Conversational)
        """
        languages = self.parser._extract_languages(text)

        assert "English" in languages
        assert "Spanish" in languages
        assert "French" in languages

    def test_extract_summary(self):
        """Test summary extraction"""
        text = """
        Summary:
        Experienced software engineer with 8+ years of experience in full-stack development.
        Passionate about creating scalable web applications and leading development teams.
        
        Experience:
        Senior Developer at TechCorp
        """
        summary = self.parser._extract_summary(text)

        assert summary is not None
        assert "software engineer" in summary.lower()
        assert "8+ years" in summary

    def test_extract_section(self):
        """Test generic section extraction"""
        text = """
        Personal Info:
        John Doe, Software Engineer
        
        Skills:
        Python, JavaScript, React
        
        Experience:
        5 years in web development
        """

        skills_section = self.parser._extract_section(text, ["skills"])
        assert "Python, JavaScript, React" in skills_section

        experience_section = self.parser._extract_section(text, ["experience"])
        assert "5 years in web development" in experience_section

    def test_calculate_total_experience(self):
        """Test total experience calculation"""
        experiences = [
            Experience(duration_months=24),  # 2 years
            Experience(duration_months=36),  # 3 years
        ]

        total = self.parser._calculate_total_experience(experiences)
        assert total == 5.0  # 60 months = 5 years

    def test_calculate_total_experience_no_duration(self):
        """Test total experience calculation with no duration info"""
        experiences = [
            Experience(start_date="Jan 2020", end_date="Dec 2021"),
            Experience(start_date="Jan 2022", end_date="Present"),
        ]

        total = self.parser._calculate_total_experience(experiences)
        assert total == 2.0  # Default 1 year per job = 2 years

    def test_calculate_total_experience_empty(self):
        """Test total experience calculation with empty list"""
        total = self.parser._calculate_total_experience([])
        assert total is None

    def test_extract_dates_from_text(self):
        """Test date extraction from text"""
        text = "January 2020 - December 2022"
        date_info = self.parser._extract_dates_from_text(text)

        assert date_info is not None
        assert date_info["start_date"] == "January 2020"
        assert date_info["end_date"] == "December 2022"

    def test_extract_dates_numeric_format(self):
        """Test date extraction with numeric format"""
        text = "01/2020 - 12/2022"
        date_info = self.parser._extract_dates_from_text(text)

        assert date_info is not None
        assert date_info["start_date"] == "01/2020"
        assert date_info["end_date"] == "12/2022"

    def test_parse_resume_complete(self):
        """Test complete resume parsing"""
        resume_text = """
        John Doe
        john.doe@email.com | (555) 123-4567
        linkedin.com/in/johndoe
        
        Summary:
        Experienced software engineer with 5+ years in web development.
        
        Skills:
        Python, JavaScript, React, AWS, MySQL
        
        Experience:
        Senior Developer at TechCorp
        January 2020 - Present
        • Built scalable web applications
        • Led team of 3 developers
        
        Education:
        Bachelor of Science in Computer Science
        University of Technology, 2018
        
        Certifications:
        AWS Certified Developer
        """

        result = self.parser.parse_resume(resume_text)

        assert isinstance(result, ResumeData)
        assert result.personal_info.name == "John Doe"
        assert result.personal_info.email == "john.doe@email.com"
        assert "Python" in result.skills
        assert len(result.experience) >= 1
        assert len(result.education) >= 1
        assert len(result.certifications) >= 1

    def test_parse_resume_error_handling(self):
        """Test resume parsing with error conditions"""
        # Test with empty text
        result = self.parser.parse_resume("")
        assert isinstance(result, ResumeData)

        # Test with None
        result = self.parser.parse_resume(None)
        assert isinstance(result, ResumeData)

    def test_load_skill_patterns(self):
        """Test skill patterns loading"""
        patterns = self.parser._load_skill_patterns()

        assert "programming" in patterns
        assert "web" in patterns
        assert "database" in patterns
        assert "Python" in patterns["programming"]
        assert "React" in patterns["web"]
