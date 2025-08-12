# AWS Deployment Guide - AI Recruiter System

## 🎯 Overview

This guide walks through deploying the AI Recruiter system to AWS with a $25/month budget.

## 📋 Prerequisites

- AWS Account with billing set up
- Supabase project (already configured)
- Gemini API key
- Local development environment working

## 🏗️ Architecture

```
Frontend (React) → AWS S3 + CloudFront
Backend (Node.js) → AWS Elastic Beanstalk
ML Service (Python) → AWS Elastic Beanstalk
Database → Supabase (existing)
File Storage → Supabase Storage (existing)
```

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Applications

1. **Build Frontend**

```bash
cd frontend
npm run build
# Creates dist/ folder with production build
```

2. **Build Backend**

```bash
cd backend
npm run build
# Creates dist/ folder with compiled TypeScript
```

3. **Prepare Environment Variables**

- Copy `deployment-config/backend.env.template` to `backend/.env.production`
- Copy `deployment-config/frontend.env.template` to `frontend/.env.production`
- Fill in your actual values (Supabase URLs, API keys, etc.)

### Step 2: Deploy Frontend to S3

1. **Create S3 Bucket**

   - Go to AWS S3 Console
   - Create bucket: `ai-recruiter-frontend-[random-string]`
   - Enable static website hosting
   - Set index document: `index.html`
   - Set error document: `index.html`

2. **Upload Frontend Files**

   - Upload all files from `frontend/dist/` to the bucket
   - Set public read permissions
   - Note the website endpoint URL

3. **Optional: Set up CloudFront**
   - Create CloudFront distribution
   - Point to S3 bucket
   - Configure caching rules

### Step 3: Deploy Backend to Elastic Beanstalk

1. **Create Elastic Beanstalk Application**

   - Go to AWS Elastic Beanstalk Console
   - Create new application: "ai-recruiter-backend"
   - Choose Node.js platform
   - Use sample application initially

2. **Prepare Deployment Package**

```bash
cd backend
zip -r ../backend-deployment.zip . -x "node_modules/*" "src/*" "*.log"
```

3. **Deploy Backend**
   - Upload `backend-deployment.zip` to Beanstalk
   - Configure environment variables in Beanstalk console
   - Set health check URL to `/health`

### Step 4: Deploy ML Service

1. **Create Second Beanstalk Application**

   - Create new application: "ai-recruiter-ml-service"
   - Choose Python platform

2. **Prepare ML Service Package**

```bash
cd ml-service
zip -r ../ml-service-deployment.zip .
```

3. **Deploy ML Service**
   - Upload `ml-service-deployment.zip`
   - Configure environment variables
   - Set health check URL to `/health`

### Step 5: Configure Environment Variables

**Backend Environment Variables:**

- `NODE_ENV=production`
- `SUPABASE_URL=your_supabase_url`
- `SUPABASE_ANON_KEY=your_key`
- `GEMINI_API_KEY=your_key`
- `ML_SERVICE_URL=http://your-ml-service-url`
- `FRONTEND_URL=http://your-s3-website-url`

**Frontend Environment Variables:**

- Update `frontend/.env.production` with backend URLs
- Rebuild and redeploy frontend

## 💰 Cost Estimation

- **S3 + CloudFront**: ~$5/month
- **Elastic Beanstalk (t3.micro x2)**: ~$15-20/month
- **Data Transfer**: ~$2-3/month
- **Total**: ~$22-28/month

## 🔧 Post-Deployment Steps

1. **Test the System**

   - Visit frontend URL
   - Test login/signup
   - Test candidate evaluation
   - Check all API endpoints

2. **Configure CORS**

   - Update backend CORS settings with frontend URL
   - Test cross-origin requests

3. **Set up Monitoring**
   - Enable CloudWatch logs
   - Set up basic alarms
   - Monitor costs

## 🚨 Troubleshooting

**Common Issues:**

- CORS errors: Check environment variables
- 502 errors: Check backend health endpoint
- Build failures: Check Node.js version compatibility
- File upload issues: Check S3 permissions

## 📈 Next Steps After Deployment

1. **Custom Domain** (when ready)
2. **SSL Certificate** via AWS Certificate Manager
3. **CI/CD Pipeline** with GitHub Actions
4. **Staging Environment**
5. **Performance Optimization**

## 🔐 Security Checklist

- [ ] Environment variables properly set
- [ ] S3 bucket permissions configured
- [ ] CORS properly configured
- [ ] API keys secured
- [ ] Health checks working
- [ ] Logs properly configured
