# ML/NLP Document Processing Service

A FastAPI-based microservice for processing resumes and job descriptions using machine learning and natural language processing techniques.

## Features

- **Document Text Extraction**: Supports PDF, DOC, DOCX, and TXT files
- **Resume Parsing**: Extracts personal information, skills, experience, education, and certifications
- **Job Description Parsing**: Identifies requirements, qualifications, responsibilities, and benefits
- **Structured Data Output**: Returns well-formatted JSON responses with validated data models
- **Error Handling**: Comprehensive error handling with meaningful error messages
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation

## Installation

1. Create and activate a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. (Optional) Install spaCy English model for better NLP performance:

```bash
python -m spacy download en_core_web_sm
```

## Usage

### Starting the Service

```bash
# Using the startup script
./start.sh

# Or manually
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

The service will be available at:

- API: http://localhost:8001
- Documentation: http://localhost:8001/docs
- Health Check: http://localhost:8001/health

### API Endpoints

#### Resume Processing

**POST /parse/resume**

- Upload a resume file (PDF, DOC, DOCX)
- Returns structured resume data including personal info, skills, experience, education

**POST /parse/text/resume**

- Parse resume from raw text content
- Returns the same structured data as file upload

#### Job Description Processing

**POST /parse/job-description**

- Upload a job description file (PDF, DOC, DOCX, TXT)
- Returns structured job requirements including skills, qualifications, responsibilities

**POST /parse/text/job-description**

- Parse job description from raw text content
- Returns the same structured data as file upload

### Example Usage

```python
import requests

# Parse resume from file
with open('resume.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8001/parse/resume',
        files={'file': f}
    )
    resume_data = response.json()

# Parse job description from text
response = requests.post(
    'http://localhost:8001/parse/text/job-description',
    json={'text': 'Software Engineer position requiring Python and React skills...'}
)
job_requirements = response.json()
```

## Data Models

### Resume Data Structure

```json
{
  "personal_info": {
    "name": "John Doe",
    "email": "john.doe@email.com",
    "phone": "(555) 123-4567",
    "location": "San Francisco, CA",
    "linkedin": "linkedin.com/in/johndoe",
    "github": "github.com/johndoe"
  },
  "skills": ["Python", "JavaScript", "React", "AWS"],
  "experience": [
    {
      "job_title": "Senior Developer",
      "company": "TechCorp",
      "start_date": "January 2020",
      "end_date": "Present",
      "description": "Built scalable web applications...",
      "responsibilities": ["Developed features", "Led team"]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "field_of_study": "Computer Science",
      "institution": "University of Technology",
      "graduation_year": 2018
    }
  ],
  "certifications": ["AWS Certified Developer"],
  "total_experience_years": 5.2
}
```

### Job Requirements Structure

```json
{
  "title": "Senior Software Engineer",
  "company": "TechCorp Inc",
  "location": "San Francisco, CA",
  "employment_type": "full-time",
  "experience_level": "senior",
  "required_skills": ["Python", "JavaScript", "React"],
  "preferred_skills": ["Docker", "Kubernetes"],
  "required_experience_years": 5,
  "required_education": ["Bachelor's degree in Computer Science"],
  "responsibilities": [
    "Design and develop web applications",
    "Lead technical discussions"
  ],
  "qualifications": [
    "5+ years of software development experience",
    "Strong problem-solving skills"
  ],
  "benefits": ["Health Insurance", "401K", "Flexible"],
  "salary_range": "$120,000 - $160,000"
}
```

## Testing

Run the test suite:

```bash
source venv/bin/activate
python -m pytest tests/ -v
```

Run specific test categories:

```bash
# Document processor tests
python -m pytest tests/test_document_processor.py -v

# Resume parser tests
python -m pytest tests/test_resume_parser.py -v

# Job parser tests
python -m pytest tests/test_job_parser.py -v
```

## Architecture

The service is built with a modular architecture:

- **main.py**: FastAPI application with API endpoints
- **services/document_processor.py**: Text extraction from various file formats
- **services/resume_parser.py**: Resume parsing and information extraction
- **services/job_parser.py**: Job description parsing and requirement extraction
- **models/schemas.py**: Pydantic data models for validation and serialization

## Error Handling

The service includes comprehensive error handling:

- File format validation
- Text extraction failures
- Parsing errors with fallback mechanisms
- Structured error responses with meaningful messages

## Performance Considerations

- Uses efficient PDF parsing libraries (pdfplumber + PyPDF2 fallback)
- Implements text cleaning and normalization
- Caches skill patterns and keywords for faster matching
- Graceful degradation when spaCy model is not available

## Dependencies

Key dependencies include:

- **FastAPI**: Modern web framework for building APIs
- **pdfplumber**: PDF text extraction
- **python-docx**: Word document processing
- **spaCy**: Natural language processing (optional but recommended)
- **scikit-learn**: Machine learning utilities
- **pydantic**: Data validation and serialization

## Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure error handling for edge cases
