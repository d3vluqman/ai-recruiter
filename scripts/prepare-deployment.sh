#!/bin/bash

# Deployment Preparation Script for AI Recruiter System
echo "🚀 Preparing AI Recruiter System for AWS Deployment..."

# Create deployment directory
mkdir -p deployment

echo "📦 Building Frontend..."
cd frontend
npm run build
echo "✅ Frontend build completed"

echo "📦 Building Backend..."
cd ../backend
npm run build
echo "✅ Backend build completed"

echo "📦 Preparing ML Service..."
cd ../ml-service
# Create requirements.txt if not exists
if [ ! -f requirements.txt ]; then
    pip freeze > requirements.txt
fi
echo "✅ ML Service prepared"

echo "📋 Creating deployment package..."
cd ..

# Copy built files to deployment directory
cp -r frontend/dist deployment/frontend-build
cp -r backend/dist deployment/backend-build
cp -r backend/node_modules deployment/backend-node_modules
cp backend/package.json deployment/
cp -r ml-service deployment/

echo "✅ Deployment package created in ./deployment directory"
echo "🎯 Ready for AWS deployment!"