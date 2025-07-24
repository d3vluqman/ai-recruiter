# Candidate Evaluation System

A comprehensive resume upload and management system built with React, Node.js, TypeScript, and Supabase. This system allows job applicants to submit resumes through a public portal and enables recruiters to manage applications through a secure dashboard.

## 🚀 Features

### For Job Applicants

- **Public Application Portal** - Submit resumes without registration
- **File Upload Support** - PDF, DOC, DOCX, and TXT files (max 10MB)
- **Real-time Validation** - Form validation with immediate feedback
- **Professional Interface** - Clean, responsive design

### For Recruiters

- **Resume Management Dashboard** - View and manage all applications
- **File Download** - Download submitted resume files
- **Candidate Information** - View applicant contact details
- **Status Management** - Update resume processing status
- **Secure Access** - JWT-based authentication

### Technical Features

- **Document Processing** - Text extraction and metadata parsing
- **Database Integration** - Full CRUD operations with Supabase
- **File Storage** - Secure file handling with unique naming
- **Authentication System** - Protected routes for recruiters
- **Comprehensive Testing** - Backend and frontend test suites

## 🛠 Tech Stack

### Backend

- **Node.js** with Express
- **TypeScript** for type safety
- **Supabase** for database and authentication
- **Multer** for file uploads
- **JWT** for authentication
- **Jest** for testing

### Frontend

- **React** with TypeScript
- **React Router** for navigation
- **Vite** for build tooling
- **Vitest** for testing
- **CSS3** for styling

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

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

### 3. Backend Setup

```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL=https://your-project-id.supabase.co
# SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# JWT_SECRET=your_jwt_secret

# Start development server
npm run dev
```

### 4. Frontend Setup

```bash
cd frontend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key
# VITE_API_URL=http://localhost:3001/api

# Start development server
npm run dev
```

### 5. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

## 📖 Usage

### For Recruiters

1. **Login/Register:** Access the system at http://localhost:5173/login
2. **Dashboard:** Navigate to the main dashboard
3. **Manage Resumes:** Click "Manage Resumes" to view applications
4. **Download/Delete:** Use the action buttons to manage submissions

### For Job Applicants

1. **Apply:** Visit http://localhost:5173/apply/{job-id}
2. **Fill Form:** Enter your contact information
3. **Upload Resume:** Select and upload your resume file
4. **Submit:** Complete the application process

## 🧪 Testing

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
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Authentication & error handling
│   │   ├── utils/           # Utilities (document parser, logger)
│   │   ├── types/           # TypeScript type definitions
│   │   └── config/          # Configuration files
│   ├── migrations/          # Database schema
│   ├── uploads/             # File storage (gitignored)
│   └── __tests__/           # Test files
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── contexts/        # React contexts
│   │   ├── types/           # TypeScript types
│   │   └── styles/          # CSS files
│   └── __tests__/           # Test files
└── .kiro/                   # Kiro IDE specifications
```

## 🔧 API Endpoints

### Public Endpoints

- `POST /api/resumes/upload` - Upload resume (multipart/form-data)

### Protected Endpoints (Require Authentication)

- `GET /api/resumes` - Get all resumes
- `GET /api/resumes/job/:jobPostingId` - Get resumes for specific job
- `GET /api/resumes/:id` - Get specific resume
- `GET /api/resumes/:id/download` - Download resume file
- `PUT /api/resumes/:id/status` - Update resume status
- `DELETE /api/resumes/:id` - Delete resume

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

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
