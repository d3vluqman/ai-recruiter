from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import os
import sys

from services.document_processor import DocumentProcessor
from services.resume_parser import ResumeParser
from services.job_parser import JobDescriptionParser
from services.evaluation_engine import EvaluationEngine
from models.schemas import (
    ResumeData,
    JobRequirements,
    ParsedDocument,
    EvaluationResult,
    BatchEvaluationRequest,
    BatchEvaluationResult,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ML/NLP Document Processing Service",
    description="Microservice for processing resumes and job descriptions",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
document_processor = DocumentProcessor()
resume_parser = ResumeParser()
job_parser = JobDescriptionParser()
evaluation_engine = EvaluationEngine()


@app.get("/")
async def root():
    return {"message": "ML/NLP Document Processing Service", "status": "running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-nlp-processor"}


@app.post("/parse/resume", response_model=ResumeData)
async def parse_resume(file: UploadFile = File(...)):
    """
    Parse a resume file and extract structured information
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith((".pdf", ".doc", ".docx")):
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload PDF, DOC, or DOCX files.",
            )

        # Extract text from document
        text_content = await document_processor.extract_text_from_file(file)

        # Parse resume data
        resume_data = resume_parser.parse_resume(text_content)

        logger.info(f"Successfully parsed resume: {file.filename}")
        return resume_data

    except Exception as e:
        logger.error(f"Error parsing resume {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")


@app.post("/parse/job-description", response_model=JobRequirements)
async def parse_job_description(file: UploadFile = File(...)):
    """
    Parse a job description file and extract requirements
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith((".pdf", ".doc", ".docx", ".txt")):
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload PDF, DOC, DOCX, or TXT files.",
            )

        # Extract text from document
        text_content = await document_processor.extract_text_from_file(file)

        # Parse job requirements
        job_requirements = job_parser.parse_job_description(text_content)

        logger.info(f"Successfully parsed job description: {file.filename}")
        return job_requirements

    except Exception as e:
        logger.error(f"Error parsing job description {file.filename}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to parse job description: {str(e)}"
        )


@app.post("/parse/text/resume", response_model=ResumeData)
async def parse_resume_text(text: str):
    """
    Parse resume from raw text content
    """
    try:
        resume_data = resume_parser.parse_resume(text)
        logger.info("Successfully parsed resume from text")
        return resume_data
    except Exception as e:
        logger.error(f"Error parsing resume text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")


@app.post("/parse/text/job-description", response_model=JobRequirements)
async def parse_job_description_text(text: str):
    """
    Parse job description from raw text content
    """
    try:
        job_requirements = job_parser.parse_job_description(text)
        logger.info("Successfully parsed job description from text")
        return job_requirements
    except Exception as e:
        logger.error(f"Error parsing job description text: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to parse job description: {str(e)}"
        )


@app.post("/evaluate/candidate", response_model=EvaluationResult)
async def evaluate_candidate(
    resume_data: ResumeData,
    job_requirements: JobRequirements,
    weights: Optional[Dict[str, float]] = None,
):
    """
    Evaluate a single candidate against job requirements
    """
    try:
        evaluation_result = evaluation_engine.evaluate_candidate(
            resume_data, job_requirements, weights
        )

        logger.info("Successfully evaluated candidate")
        return evaluation_result

    except Exception as e:
        logger.error(f"Error evaluating candidate: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to evaluate candidate: {str(e)}"
        )


@app.post("/evaluate/batch", response_model=BatchEvaluationResult)
async def batch_evaluate_candidates(request: BatchEvaluationRequest):
    """
    Evaluate multiple candidates against job requirements
    """
    try:
        import time

        start_time = time.time()

        evaluations = []
        processed_count = 0
        failed_count = 0

        for candidate_data in request.candidates:
            try:
                # Extract resume data from candidate
                resume_data = ResumeData(**candidate_data.get("resume_data", {}))

                # Evaluate candidate
                evaluation = evaluation_engine.evaluate_candidate(
                    resume_data, request.job_requirements, request.weights
                )

                # Set candidate and job IDs if provided
                evaluation.candidate_id = candidate_data.get("candidate_id")
                evaluation.job_id = candidate_data.get("job_id")

                evaluations.append(evaluation)
                processed_count += 1

            except Exception as e:
                logger.error(
                    f"Failed to evaluate candidate {candidate_data.get('candidate_id', 'unknown')}: {str(e)}"
                )
                failed_count += 1

        processing_time = time.time() - start_time

        result = BatchEvaluationResult(
            job_id=request.candidates[0].get("job_id") if request.candidates else None,
            evaluations=evaluations,
            total_candidates=len(request.candidates),
            processed_candidates=processed_count,
            failed_candidates=failed_count,
            processing_time_seconds=processing_time,
        )

        logger.info(
            f"Batch evaluation completed: {processed_count} processed, {failed_count} failed"
        )
        return result

    except Exception as e:
        logger.error(f"Error in batch evaluation: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to perform batch evaluation: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
