#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Start the FastAPI server
echo "Starting ML/NLP Document Processing Service..."
echo "Service will be available at http://localhost:8001"
echo "API documentation at http://localhost:8001/docs"

uvicorn main:app --host 0.0.0.0 --port 8001 --reload