import pytest
from unittest.mock import Mock, patch
from services.evaluation_engine import EvaluationEngine
from models.schemas import (
    ResumeData,
    JobRequirements,
    PersonalInfo,
    Experience,
    Education,
    EvaluationResult,
    SkillMatch,
    ExperienceMatch,
    EducationMatch,
)


class TestEvaluationEngine:
    def setup_method(self):
        """Set up test fixtures"""
        self.engine = EvaluationEngine()

        # Sample resume data
        self.sample_resume = ResumeData(
            personal_info=PersonalInfo(
                name="John Doe", email="john@example.com", phone="123-456-7890"
            ),
            skills=["Python", "JavaScript", "React", "SQL", "Docker"],
            experience=[
                Experience(
                    job_title="Software Engineer",
                    company="Tech Corp",
                    duration_months=24,
                    description="Developed web applications",
                    responsibilities=["Built React apps", "Wrote Python APIs"],
                    technologies=["Python", "React", "PostgreSQL"],
                ),
                Experience(
                    job_title="Junior Developer",
                    company="StartupCo",
                    duration_months=12,
                    description="Frontend development",
                    responsibilities=["Created UI components"],
                    technologies=["JavaScript", "HTML", "CSS"],
                ),
            ],
            education=[
                Education(
                    degree="Bachelor of Science",
                    field_of_study="Computer Science",
                    institution="University of Tech",
                    graduation_year=2020,
                )
            ],
            total_experience_years=3.0,
        )

        # Sample job requirements
        self.sample_job = JobRequirements(
            title="Senior Software Engineer",
            required_skills=["Python", "React", "SQL"],
            preferred_skills=["Docker", "AWS"],
            required_experience_years=2,
            required_education=["Bachelor's degree in Computer Science"],
            description="Looking for a senior software engineer",
        )

    def test_evaluate_candidate_success(self):
        """Test successful candidate evaluation"""
        result = self.engine.evaluate_candidate(self.sample_resume, self.sample_job)

        assert isinstance(result, EvaluationResult)
        assert 0 <= result.overall_score <= 100
        assert 0 <= result.skill_score <= 100
        assert 0 <= result.experience_score <= 100
        assert 0 <= result.education_score <= 100
        assert len(result.skill_matches) > 0
        assert result.experience_match is not None
        assert result.education_match is not None
        assert len(result.gap_analysis) > 0
        assert len(result.recommendations) > 0

    def test_evaluate_skills_perfect_match(self):
        """Test skill evaluation with perfect match"""
        candidate_skills = ["Python", "React", "SQL", "Docker", "AWS"]

        skill_matches, skill_score = self.engine._evaluate_skills(
            candidate_skills, self.sample_job
        )

        assert skill_score > 80  # Should be high score for good match
        assert len(skill_matches) == 5  # All job skills should be evaluated

        # Check that required skills are matched
        required_matches = [sm for sm in skill_matches if sm.required]
        assert all(sm.matched for sm in required_matches)

    def test_evaluate_skills_partial_match(self):
        """Test skill evaluation with partial match"""
        candidate_skills = ["Python", "Java"]  # Missing React and SQL

        skill_matches, skill_score = self.engine._evaluate_skills(
            candidate_skills, self.sample_job
        )

        assert skill_score < 80  # Should be lower score for partial match

        # Check that some required skills are missing
        required_matches = [sm for sm in skill_matches if sm.required]
        missing_required = [sm for sm in required_matches if not sm.matched]
        assert len(missing_required) > 0

    def test_evaluate_skills_no_requirements(self):
        """Test skill evaluation when no skills are required"""
        job_no_skills = JobRequirements(title="Test Job")

        skill_matches, skill_score = self.engine._evaluate_skills(
            ["Python", "Java"], job_no_skills
        )

        assert skill_score == 100.0  # Perfect score when no skills required
        assert len(skill_matches) == 0

    def test_evaluate_experience_sufficient(self):
        """Test experience evaluation with sufficient experience"""
        experience_match, experience_score = self.engine._evaluate_experience(
            self.sample_resume.experience,
            self.sample_resume.total_experience_years,
            self.sample_job,
        )

        assert experience_score >= 50  # Should meet minimum requirements
        assert experience_match.total_years == 3.0
        assert experience_match.required_years == 2
        assert len(experience_match.relevant_positions) > 0

    def test_evaluate_experience_insufficient(self):
        """Test experience evaluation with insufficient experience"""
        job_high_exp = JobRequirements(
            title="Senior Role", required_experience_years=10
        )

        experience_match, experience_score = self.engine._evaluate_experience(
            self.sample_resume.experience,
            self.sample_resume.total_experience_years,
            job_high_exp,
        )

        assert experience_score < 100  # Should be penalized for insufficient experience
        assert experience_match.relevant_years < experience_match.required_years

    def test_evaluate_education_match(self):
        """Test education evaluation with matching degree"""
        education_match, education_score = self.engine._evaluate_education(
            self.sample_resume.education, self.sample_job
        )

        assert education_score > 50  # Should get points for relevant education
        assert education_match.degree_match or education_match.field_match

    def test_evaluate_education_no_requirements(self):
        """Test education evaluation when no education is required"""
        job_no_edu = JobRequirements(title="Test Job")

        education_match, education_score = self.engine._evaluate_education(
            self.sample_resume.education, job_no_edu
        )

        assert education_score == 100.0  # Perfect score when no education required

    def test_skill_similarity_exact_match(self):
        """Test skill similarity calculation for exact matches"""
        similarity = self.engine._calculate_skill_similarity("python", "python")
        assert similarity == 1.0

    def test_skill_similarity_synonym_match(self):
        """Test skill similarity calculation for synonyms"""
        similarity = self.engine._calculate_skill_similarity("javascript", "js")
        assert similarity > 0.9  # Should recognize synonyms

    def test_skill_similarity_substring_match(self):
        """Test skill similarity calculation for substring matches"""
        similarity = self.engine._calculate_skill_similarity("react", "reactjs")
        assert similarity > 0.8  # Should recognize substrings

    def test_normalize_skill(self):
        """Test skill normalization"""
        normalized = self.engine._normalize_skill("  Python 3.9  ")
        assert normalized == "python 39"

        normalized = self.engine._normalize_skill("Node.js")
        assert normalized == "nodejs"

    def test_is_relevant_experience(self):
        """Test relevant experience detection"""
        relevant_exp = Experience(
            job_title="Software Engineer",
            responsibilities=["Python development", "API design"],
            technologies=["Python", "React"],
        )

        is_relevant = self.engine._is_relevant_experience(relevant_exp, self.sample_job)
        assert is_relevant

    def test_education_level_hierarchy(self):
        """Test education level hierarchy"""
        assert self.engine._get_education_level("PhD in Computer Science") == 5
        assert self.engine._get_education_level("Master's Degree") == 4
        assert self.engine._get_education_level("Bachelor's Degree") == 3
        assert self.engine._get_education_level("Associate Degree") == 2

    def test_matches_education_level(self):
        """Test education level matching"""
        assert self.engine._matches_education_level(
            "Master's", "Bachelor's"
        )  # Higher meets lower
        assert not self.engine._matches_education_level(
            "Bachelor's", "Master's"
        )  # Lower doesn't meet higher

    def test_generate_gap_analysis(self):
        """Test gap analysis generation"""
        skill_matches = [
            SkillMatch(
                skill_name="Python", required=True, matched=True, confidence_score=0.9
            ),
            SkillMatch(
                skill_name="Java", required=True, matched=False, confidence_score=0.0
            ),
        ]

        experience_match = ExperienceMatch(
            total_years=1.0,
            relevant_years=1.0,
            required_years=3,
            experience_score=0.5,
            relevant_positions=["Junior Dev"],
        )

        education_match = EducationMatch(
            degree_match=True,
            field_match=True,
            education_score=1.0,
            matched_degrees=["Bachelor's"],
        )

        gaps = self.engine._generate_gap_analysis(
            skill_matches, experience_match, education_match, self.sample_job
        )

        assert len(gaps) > 0
        assert any("Java" in gap for gap in gaps)  # Should mention missing Java skill
        assert any(
            "experience" in gap.lower() for gap in gaps
        )  # Should mention experience gap

    def test_generate_recommendations(self):
        """Test recommendations generation"""
        skill_matches = [
            SkillMatch(
                skill_name="Python", required=True, matched=True, confidence_score=0.95
            ),
        ]

        experience_match = ExperienceMatch(
            total_years=3.0,
            relevant_years=2.5,
            experience_score=0.8,
            relevant_positions=["Software Engineer"],
        )

        education_match = EducationMatch(
            degree_match=True,
            field_match=True,
            education_score=1.0,
            matched_degrees=["Bachelor's CS"],
        )

        recommendations = self.engine._generate_recommendations(
            skill_matches, experience_match, education_match
        )

        assert len(recommendations) > 0
        assert any(
            "Python" in rec for rec in recommendations
        )  # Should mention strong skills

    def test_generate_evaluation_summary(self):
        """Test evaluation summary generation"""
        summary = self.engine._generate_evaluation_summary(85, 80, 90, 85)
        assert "excellent" in summary.lower() or "highly recommended" in summary.lower()

        summary = self.engine._generate_evaluation_summary(65, 60, 70, 65)
        assert "good" in summary.lower() or "recommended" in summary.lower()

        summary = self.engine._generate_evaluation_summary(45, 40, 50, 45)
        assert "moderate" in summary.lower()

        summary = self.engine._generate_evaluation_summary(25, 20, 30, 25)
        assert "limited" in summary.lower()

    def test_evaluate_candidate_with_custom_weights(self):
        """Test candidate evaluation with custom weights"""
        custom_weights = {"skills": 0.6, "experience": 0.3, "education": 0.1}

        result = self.engine.evaluate_candidate(
            self.sample_resume, self.sample_job, custom_weights
        )

        assert isinstance(result, EvaluationResult)
        assert 0 <= result.overall_score <= 100

    def test_evaluate_candidate_error_handling(self):
        """Test error handling in candidate evaluation"""
        # Test with invalid resume data
        invalid_resume = ResumeData()  # Empty resume

        result = self.engine.evaluate_candidate(invalid_resume, self.sample_job)

        # Should return low score for empty resume
        assert result.overall_score >= 0
        assert result.overall_score < 50  # Should be low score for empty resume

    def test_batch_evaluation_data_structure(self):
        """Test that evaluation results have correct structure for batch processing"""
        result = self.engine.evaluate_candidate(self.sample_resume, self.sample_job)

        # Verify all required fields are present
        assert hasattr(result, "overall_score")
        assert hasattr(result, "skill_score")
        assert hasattr(result, "experience_score")
        assert hasattr(result, "education_score")
        assert hasattr(result, "skill_matches")
        assert hasattr(result, "experience_match")
        assert hasattr(result, "education_match")
        assert hasattr(result, "gap_analysis")
        assert hasattr(result, "recommendations")

        # Verify skill matches structure
        for skill_match in result.skill_matches:
            assert hasattr(skill_match, "skill_name")
            assert hasattr(skill_match, "required")
            assert hasattr(skill_match, "matched")
            assert hasattr(skill_match, "confidence_score")


if __name__ == "__main__":
    pytest.main([__file__])
