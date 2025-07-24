import re
import logging
from typing import List, Dict, Any, Tuple
from difflib import SequenceMatcher
from datetime import datetime
import math

from models.schemas import (
    ResumeData,
    JobRequirements,
    EvaluationResult,
    SkillMatch,
    ExperienceMatch,
    EducationMatch,
    Experience,
    Education,
)

logger = logging.getLogger(__name__)


class EvaluationEngine:
    """
    Core evaluation engine for matching candidates to job requirements
    """

    def __init__(self):
        # Common skill synonyms and variations
        self.skill_synonyms = {
            "javascript": ["js", "node.js", "nodejs", "react", "vue", "angular"],
            "python": ["py", "django", "flask", "fastapi"],
            "java": ["spring", "hibernate", "maven", "gradle"],
            "c#": ["csharp", "dotnet", ".net", "asp.net"],
            "sql": ["mysql", "postgresql", "sqlite", "oracle", "mssql"],
            "aws": ["amazon web services", "ec2", "s3", "lambda"],
            "docker": ["containerization", "containers"],
            "kubernetes": ["k8s", "container orchestration"],
            "machine learning": ["ml", "ai", "artificial intelligence"],
            "data science": ["data analysis", "analytics", "statistics"],
        }

        # Education level hierarchy
        self.education_hierarchy = {
            "phd": 5,
            "doctorate": 5,
            "doctoral": 5,
            "masters": 4,
            "master": 4,
            "mba": 4,
            "bachelor": 3,
            "bachelors": 3,
            "associate": 2,
            "diploma": 1,
            "certificate": 1,
        }

    def evaluate_candidate(
        self,
        resume_data: ResumeData,
        job_requirements: JobRequirements,
        weights: Dict[str, float] = None,
    ) -> EvaluationResult:
        """
        Evaluate a single candidate against job requirements

        Args:
            resume_data: Parsed resume data
            job_requirements: Job requirements
            weights: Scoring weights for different criteria

        Returns:
            EvaluationResult: Complete evaluation result
        """
        if weights is None:
            weights = {"skills": 0.4, "experience": 0.4, "education": 0.2}

        try:
            # Evaluate skills
            skill_matches, skill_score = self._evaluate_skills(
                resume_data.skills, job_requirements
            )

            # Evaluate experience
            experience_match, experience_score = self._evaluate_experience(
                resume_data.experience,
                resume_data.total_experience_years or 0,
                job_requirements,
            )

            # Evaluate education
            education_match, education_score = self._evaluate_education(
                resume_data.education, job_requirements
            )

            # Calculate overall score
            overall_score = (
                skill_score * weights.get("skills", 0.4)
                + experience_score * weights.get("experience", 0.4)
                + education_score * weights.get("education", 0.2)
            )

            # Generate gap analysis and recommendations
            gap_analysis = self._generate_gap_analysis(
                skill_matches, experience_match, education_match, job_requirements
            )
            recommendations = self._generate_recommendations(
                skill_matches, experience_match, education_match
            )

            # Generate evaluation summary
            evaluation_summary = self._generate_evaluation_summary(
                overall_score, skill_score, experience_score, education_score
            )

            return EvaluationResult(
                overall_score=round(overall_score, 2),
                skill_score=round(skill_score, 2),
                experience_score=round(experience_score, 2),
                education_score=round(education_score, 2),
                skill_matches=skill_matches,
                experience_match=experience_match,
                education_match=education_match,
                gap_analysis=gap_analysis,
                recommendations=recommendations,
                evaluation_summary=evaluation_summary,
            )

        except Exception as e:
            logger.error(f"Error evaluating candidate: {str(e)}")
            # Return default low score on error
            return EvaluationResult(
                overall_score=0.0,
                skill_score=0.0,
                experience_score=0.0,
                education_score=0.0,
                gap_analysis=["Evaluation failed due to processing error"],
                recommendations=["Please review candidate manually"],
                evaluation_summary="Automatic evaluation failed",
            )

    def _evaluate_skills(
        self, candidate_skills: List[str], job_requirements: JobRequirements
    ) -> Tuple[List[SkillMatch], float]:
        """
        Evaluate skill matching between candidate and job requirements

        Returns:
            Tuple of (skill_matches, overall_skill_score)
        """
        skill_matches = []
        required_skills = job_requirements.required_skills or []
        preferred_skills = job_requirements.preferred_skills or []
        all_job_skills = required_skills + preferred_skills

        if not all_job_skills:
            return [], 100.0  # No skills required, perfect score

        # Normalize skills for comparison
        normalized_candidate_skills = [
            self._normalize_skill(skill) for skill in candidate_skills
        ]
        normalized_job_skills = [
            self._normalize_skill(skill) for skill in all_job_skills
        ]

        # Match each job skill
        for job_skill in all_job_skills:
            is_required = job_skill in required_skills
            normalized_job_skill = self._normalize_skill(job_skill)

            # Find best match among candidate skills
            best_match = None
            best_similarity = 0.0

            for i, candidate_skill in enumerate(normalized_candidate_skills):
                similarity = self._calculate_skill_similarity(
                    normalized_job_skill, candidate_skill
                )
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = candidate_skills[i]

            # Consider it matched if similarity > 0.7
            is_matched = best_similarity > 0.7
            confidence = best_similarity

            skill_matches.append(
                SkillMatch(
                    skill_name=job_skill,
                    required=is_required,
                    matched=is_matched,
                    confidence_score=confidence,
                    similarity_score=best_similarity,
                )
            )

        # Calculate overall skill score
        if not skill_matches:
            return skill_matches, 0.0

        required_matches = [sm for sm in skill_matches if sm.required]
        preferred_matches = [sm for sm in skill_matches if not sm.required]

        # Required skills weight more heavily
        required_score = 0.0
        if required_matches:
            required_score = (
                sum(sm.confidence_score for sm in required_matches if sm.matched)
                / len(required_matches)
            ) * 100

        preferred_score = 0.0
        if preferred_matches:
            preferred_score = (
                sum(sm.confidence_score for sm in preferred_matches if sm.matched)
                / len(preferred_matches)
            ) * 100

        # Weight: 70% required, 30% preferred
        if required_matches and preferred_matches:
            overall_skill_score = required_score * 0.7 + preferred_score * 0.3
        elif required_matches:
            overall_skill_score = required_score
        else:
            overall_skill_score = preferred_score

        return skill_matches, overall_skill_score

    def _evaluate_experience(
        self,
        experiences: List[Experience],
        total_years: float,
        job_requirements: JobRequirements,
    ) -> Tuple[ExperienceMatch, float]:
        """
        Evaluate experience matching
        """
        required_years = job_requirements.required_experience_years or 0
        relevant_positions = []
        relevant_years = 0.0

        # Calculate relevant experience
        for exp in experiences:
            if self._is_relevant_experience(exp, job_requirements):
                relevant_positions.append(exp.job_title or "Unknown Position")
                if exp.duration_months:
                    relevant_years += exp.duration_months / 12.0

        # If no duration info, estimate from total years
        if relevant_years == 0 and relevant_positions:
            relevant_years = min(total_years, total_years * 0.8)  # Assume 80% relevant

        # Calculate experience score
        if required_years == 0:
            experience_score = 100.0  # No experience required
        else:
            # Score based on how well they meet the requirement
            ratio = relevant_years / required_years
            if ratio >= 1.0:
                experience_score = 100.0
            else:
                # Gradual scoring: 50% base + 50% based on ratio
                experience_score = 50.0 + (ratio * 50.0)

        experience_match = ExperienceMatch(
            total_years=total_years,
            relevant_years=relevant_years,
            required_years=required_years,
            experience_score=experience_score / 100.0,  # Normalize to 0-1
            relevant_positions=relevant_positions,
        )

        return experience_match, experience_score

    def _evaluate_education(
        self, education_list: List[Education], job_requirements: JobRequirements
    ) -> Tuple[EducationMatch, float]:
        """
        Evaluate education matching
        """
        required_education = job_requirements.required_education or []

        if not required_education:
            return (
                EducationMatch(
                    degree_match=True,
                    field_match=True,
                    education_score=1.0,
                    matched_degrees=["No specific education required"],
                ),
                100.0,
            )

        degree_match = False
        field_match = False
        matched_degrees = []

        # Check each candidate's education against requirements
        for edu in education_list:
            if not edu.degree:
                continue

            for req_edu in required_education:
                # Check degree level match
                if self._matches_education_level(edu.degree, req_edu):
                    degree_match = True
                    matched_degrees.append(edu.degree)

                # Check field match
                if edu.field_of_study and self._matches_field_of_study(
                    edu.field_of_study, req_edu
                ):
                    field_match = True

        # Calculate education score
        education_score = 0.0
        if degree_match and field_match:
            education_score = 100.0
        elif degree_match:
            education_score = 70.0
        elif field_match:
            education_score = 50.0
        else:
            education_score = 20.0  # Some education, but not matching

        education_match = EducationMatch(
            degree_match=degree_match,
            field_match=field_match,
            education_score=education_score / 100.0,  # Normalize to 0-1
            matched_degrees=matched_degrees,
        )

        return education_match, education_score

    def _normalize_skill(self, skill: str) -> str:
        """Normalize skill name for comparison"""
        normalized = skill.lower().strip()
        normalized = re.sub(r"[^\w\s]", "", normalized)
        return normalized

    def _calculate_skill_similarity(self, skill1: str, skill2: str) -> float:
        """
        Calculate similarity between two skills using multiple methods
        """
        # Direct match
        if skill1 == skill2:
            return 1.0

        # Check synonyms
        for base_skill, synonyms in self.skill_synonyms.items():
            if skill1 in [base_skill] + synonyms and skill2 in [base_skill] + synonyms:
                return 0.95

        # Substring match
        if skill1 in skill2 or skill2 in skill1:
            return 0.85

        # Sequence similarity
        sequence_similarity = SequenceMatcher(None, skill1, skill2).ratio()

        return sequence_similarity

    def _is_relevant_experience(
        self, experience: Experience, job_requirements: JobRequirements
    ) -> bool:
        """
        Determine if an experience is relevant to the job
        """
        if not experience.job_title:
            return False

        job_title = experience.job_title.lower()
        job_req_title = (job_requirements.title or "").lower()

        # Check if job titles are similar
        if (
            job_req_title
            and self._calculate_skill_similarity(job_title, job_req_title) > 0.6
        ):
            return True

        # Check if responsibilities match job requirements
        responsibilities = " ".join(experience.responsibilities).lower()
        job_description = (job_requirements.description or "").lower()

        if job_description and responsibilities:
            similarity = SequenceMatcher(
                None, responsibilities, job_description
            ).ratio()
            if similarity > 0.3:
                return True

        # Check if technologies match required skills
        exp_technologies = [tech.lower() for tech in experience.technologies]
        required_skills = [
            skill.lower() for skill in job_requirements.required_skills or []
        ]

        if exp_technologies and required_skills:
            matches = sum(
                1
                for tech in exp_technologies
                for skill in required_skills
                if self._calculate_skill_similarity(tech, skill) > 0.7
            )
            if matches > 0:
                return True

        return False

    def _matches_education_level(
        self, candidate_degree: str, required_education: str
    ) -> bool:
        """
        Check if candidate's education level matches requirement
        """
        candidate_level = self._get_education_level(candidate_degree)
        required_level = self._get_education_level(required_education)

        return candidate_level >= required_level

    def _matches_field_of_study(
        self, candidate_field: str, required_education: str
    ) -> bool:
        """
        Check if field of study matches
        """
        candidate_field = candidate_field.lower()
        required_education = required_education.lower()

        # Direct match or substring match
        return (
            candidate_field in required_education
            or required_education in candidate_field
            or SequenceMatcher(None, candidate_field, required_education).ratio() > 0.6
        )

    def _get_education_level(self, education_text: str) -> int:
        """
        Get numeric education level from text
        """
        education_text = education_text.lower()
        for level, value in self.education_hierarchy.items():
            if level in education_text:
                return value
        return 0

    def _generate_gap_analysis(
        self,
        skill_matches: List[SkillMatch],
        experience_match: ExperienceMatch,
        education_match: EducationMatch,
        job_requirements: JobRequirements,
    ) -> List[str]:
        """
        Generate gap analysis based on evaluation results
        """
        gaps = []

        # Skill gaps
        missing_required_skills = [
            sm.skill_name for sm in skill_matches if sm.required and not sm.matched
        ]
        if missing_required_skills:
            gaps.append(
                f"Missing required skills: {', '.join(missing_required_skills)}"
            )

        # Experience gaps
        if (
            experience_match.required_years
            and experience_match.relevant_years < experience_match.required_years
        ):
            gap_years = (
                experience_match.required_years - experience_match.relevant_years
            )
            gaps.append(f"Needs {gap_years:.1f} more years of relevant experience")

        # Education gaps
        if not education_match.degree_match and job_requirements.required_education:
            gaps.append("Education level does not meet requirements")

        if not gaps:
            gaps.append("No significant gaps identified")

        return gaps

    def _generate_recommendations(
        self,
        skill_matches: List[SkillMatch],
        experience_match: ExperienceMatch,
        education_match: EducationMatch,
    ) -> List[str]:
        """
        Generate recommendations based on evaluation
        """
        recommendations = []

        # Skill recommendations
        strong_skills = [
            sm.skill_name
            for sm in skill_matches
            if sm.matched and sm.confidence_score > 0.8
        ]
        if strong_skills:
            recommendations.append(f"Strong skills: {', '.join(strong_skills[:3])}")

        # Experience recommendations
        if experience_match.relevant_years > 0:
            recommendations.append(
                f"Has {experience_match.relevant_years:.1f} years of relevant experience"
            )

        # Education recommendations
        if education_match.degree_match:
            recommendations.append("Education requirements met")

        if not recommendations:
            recommendations.append("Consider for interview to assess potential")

        return recommendations

    def _generate_evaluation_summary(
        self,
        overall_score: float,
        skill_score: float,
        experience_score: float,
        education_score: float,
    ) -> str:
        """
        Generate a summary of the evaluation
        """
        if overall_score >= 80:
            return "Excellent match - highly recommended candidate"
        elif overall_score >= 60:
            return "Good match - recommended for consideration"
        elif overall_score >= 40:
            return "Moderate match - may be suitable with additional assessment"
        else:
            return "Limited match - consider only if candidate pool is small"
