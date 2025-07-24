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
from models.schemas import ResumeData, JobRequirements, ParsedDocument

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
