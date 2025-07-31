# Candidate Evaluation System

An AI-powered recruitment platform that automates candidate evaluation by analyzing resumes against job requirements using machine learning and natural language processing. The system consists of three main components: ML Service (Python), Backend API (Node.js), and Frontend (React).

## 🚀 Features

### For Recruiters

- **Job Posting Management** - Create and manage job postings with requirement extraction
- **AI-Powered Candidate Evaluation** - Automated resume analysis and scoring
- **Intelligent Matching** - Skills, experience, and education matching with confidence scores
- **Candidate Dashboard** - View evaluated candidates with detailed breakdowns
- **Shortlist Management** - Create and manage candidate shortlists
- **Email Communication** - Send emails to shortlisted candidates
- **Real-time Updates** - WebSocket-powered live updates
- **Advanced Filtering** - Filter candidates by scores, skills, and experience

### For Job Applicants

- **Public Application Portal** - Submit resumes for specific job postings
- **Multi-format Support** - PDF, DOC, DOCX file uploads (max 10MB)
- **Instant Processing** - AI-powered resume parsing and evaluation
- **Application Tracking** - View application status and feedback

### AI/ML Features

- **Document Processing** - Advanced PDF/DOCX text extraction with dual-method approach
- **Resume Parsing** - NLP-powered extraction of skills, experience, education, and contact info
- **Job Description Analysis** - Automated requirement extraction from job postings
- **Intelligent Evaluation** - Multi-algorithm candidate scoring with gap analysis
- **Skill Matching** - 50+ skill synonyms with similarity scoring
- **Experience Relevance** - Context-aware experience matching
- **Automated Recommendations** - AI-generated hiring recommendations

## 🛠 Tech Stack

### ML Service (Python)

- **FastAPI 0.104.1** - Modern Python web framework
- **spaCy 3.7.2** - NLP library with en_core_web_sm model
- **PyPDF2 & pdfplumber** - PDF text extraction
- **python-docx** - DOCX document processing
- **scikit-learn** - Machine learning algorithms
- **Pydantic** - Data validation and serialization
- **Uvicorn** - ASGI server

### Backend API (Node.js)

- **Node.js** with Express and TypeScript
- **Supabase** - PostgreSQL database and authentication
- **JWT** - Token-based authentication
- **Multer** - File upload handling
- **Socket.io** - Real-time WebSocket communication
- **Winston** - Structured logging
- **Jest** - Testing framework

### Frontend (React)

- **React 18** with TypeScript
- **Vite** - Build tooling and development server
- **React Router** - Client-side routing
- **React Context** - State management
- **CSS Modules** - Component-scoped styling
- **Vitest** - Testing framework

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **npm** or yarn
- **Supabase** account and project

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd candidate-evaluation-system
```

### 2. Database Setup

1. Create a new project in [Supabase](https://supabase.com)
2. Run the database migration:
   ```sql
   -- Copy and paste the contents of backend/migrations/001_initial_schema.sql
   -- into your Supabase SQL editor and run it
   ```

### 3. ML Service Setup

```bash
cd ml-service

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy English model
python -m spacy download en_core_web_sm

# Start ML service
python main.py
```

### 4. Backend API Setup

```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
# PORT=3001
# SUPABASE_URL=https://your-project-id.supabase.co
# SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# JWT_SECRET=your_jwt_secret
# REDIS_DISABLED=true

# Start development server
npm run dev
```

### 5. Frontend Setup

```bash
cd frontend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key
# VITE_API_BASE_URL=http://localhost:3001

# Start development server
npm run dev
```

### 6. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **ML Service:** http://localhost:8001
- **Health Checks:**
  - Backend: http://localhost:3001/health
  - ML Service: http://localhost:8001/health

## 📖 Usage

### For Recruiters

1. **Login/Register:** Access the system at http://localhost:5173/login
2. **Job Postings:** Create and manage job postings with automatic requirement extraction
3. **Candidate Dashboard:** View AI-evaluated candidates with detailed scoring breakdowns
4. **Evaluation Details:** Review skill matches, experience relevance, and gap analysis
5. **Shortlist Management:** Create shortlists and communicate with selected candidates
6. **Real-time Updates:** Receive live notifications for new applications and evaluations

### For Job Applicants

1. **Browse Jobs:** Visit the public portal to view available positions
2. **Apply:** Submit applications through http://localhost:5173/apply
3. **Upload Resume:** AI automatically extracts and analyzes your information
4. **Track Status:** Monitor your application status and receive feedback

## 🧪 Testing

### ML Service Tests

```bash
cd ml-service
pytest
```

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📁 Project Structure

```
candidate-evaluation-system/
├── ml-service/              # Python ML/NLP Service
│   ├── services/            # ML processing logic
│   │   ├── document_processor.py    # PDF/DOCX text extraction
│   │   ├── resume_parser.py         # Resume information extraction
│   │   ├── job_parser.py           # Job requirement extraction
│   │   └── evaluation_engine.py    # Candidate evaluation algorithms
│   ├── models/              # Pydantic data models
│   ├── tests/               # ML service tests
│   ├── requirements.txt     # Python dependencies
│   └── main.py             # FastAPI application
├── backend/                 # Node.js API Server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic & ML client
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Authentication & error handling
│   │   ├── utils/           # Utilities (logger, document parser)
│   │   ├── types/           # TypeScript type definitions
│   │   └── config/          # Configuration files
│   ├── migrations/          # Database schema
│   ├── uploads/             # File storage (gitignored)
│   └── __tests__/           # Test files
├── frontend/                # React Application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── auth/        # Authentication components
│   │   │   ├── evaluation/  # Candidate evaluation UI
│   │   │   ├── jobPosting/  # Job posting management
│   │   │   ├── resume/      # Resume management
│   │   │   └── shortlist/   # Shortlist management
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── contexts/        # React contexts
│   │   ├── types/           # TypeScript types
│   │   └── styles/          # CSS files
│   └── __tests__/           # Test files
├── .kiro/                   # Kiro IDE specifications
│   └── specs/               # Feature specifications
├── SYSTEM_ARCHITECTURE.md  # System architecture documentation
└── ML_SERVICE_DETAILED_DOCUMENTATION.md  # ML service technical docs
```

## 🔧 API Endpoints

### Backend API (Node.js - Port 3001)

#### Public Endpoints

- `POST /api/resumes/upload` - Upload resume (multipart/form-data)
- `GET /health` - Backend health check

#### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

#### Protected Endpoints (Require Authentication)

- `GET /api/job-postings` - Get all job postings
- `POST /api/job-postings` - Create new job posting
- `GET /api/resumes` - Get all resumes
- `GET /api/evaluations` - Get candidate evaluations
- `POST /api/evaluations/evaluate` - Trigger candidate evaluation
- `GET /api/shortlists` - Get shortlists
- `POST /api/shortlists` - Create new shortlist
- `GET /api/monitoring/health` - Detailed system health check

### ML Service API (Python - Port 8001)

#### Document Processing

- `POST /parse/resume` - Parse uploaded resume file
- `POST /parse/job-description` - Parse job description file
- `POST /parse/text/resume` - Parse resume from raw text
- `POST /parse/text/job-description` - Parse job description from raw text

#### Evaluation Endpoints

- `POST /evaluate/candidate` - Evaluate single candidate
- `POST /evaluate/batch` - Batch evaluate multiple candidates
- `GET /health` - ML service health check

## 🔒 Security Features

- JWT-based authentication
- File type validation
- File size limits (10MB)
- SQL injection prevention
- CORS configuration
- Environment variable protection

## 🚀 Deployment

### Backend Deployment

1. Build the application: `npm run build`
2. Set production environment variables
3. Deploy to your preferred platform (Heroku, Railway, etc.)

### Frontend Deployment

1. Build the application: `npm run build`
2. Deploy the `dist` folder to your preferred platform (Vercel, Netlify, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**

   - Verify Supabase credentials in .env
   - Ensure database migration has been run

2. **File Upload Issues**

   - Check file size (max 10MB)
   - Verify file type (PDF, DOC, DOCX, TXT only)
   - Ensure uploads directory exists and is writable

3. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration settings

### Getting Help

- Check the [Issues](../../issues) page for known problems
- Create a new issue if you encounter a bug
- Review the test files for usage examples

## 🔄 Development Workflow

1. **Feature Development:** Create feature branches from main
2. **Testing:** Ensure all tests pass before merging
3. **Code Review:** Use pull requests for code review
4. **Deployment:** Deploy from main branch only

## 📊 Performance

- File upload limit: 10MB
- Supported file types: PDF, DOC, DOCX, TXT
- Database: Optimized with proper indexing
- Frontend: Lazy loading and code splitting ready

---

Built with ❤️ using modern web technologies
