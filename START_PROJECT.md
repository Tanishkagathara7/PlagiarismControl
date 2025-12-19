# Plagiarism Control - Quick Start Guide

A standalone code similarity detection tool for analyzing Jupyter notebooks.

## Prerequisites
- Python 3.8+
- Node.js 16+ and npm/yarn
- MongoDB Atlas account (or local MongoDB)

## Step 1: Configure Database
Update `backend/.env` with your MongoDB connection string:
```
MONGO_URL="your-mongodb-connection-string"
DB_NAME="plagiarism_control"
```

## Step 2: Start Backend (Terminal 1)
```bash
cd PlagiarismControl-main/backend
pip install -r requirements.txt
uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

Backend will run on: http://localhost:8000

## Step 3: Start Frontend (Terminal 2)
```bash
cd PlagiarismControl-main/frontend
npm install --legacy-peer-deps
npm start
```

Frontend will run on: http://localhost:3000

## Quick Test
1. Open http://localhost:3000 in your browser
2. Register an admin account
3. Login and start uploading .ipynb files (up to 300 files)
4. Run plagiarism analysis

## API Documentation
Once backend is running, visit: http://localhost:8000/docs

## Features
- Upload and manage up to 300 Jupyter notebook files
- Bulk upload with drag & drop support
- Advanced plagiarism detection using TF-IDF and cosine similarity
- Code normalization (removes comments, normalizes variables)
- Line-by-line comparison with similarity scores
- Export results to PDF
- Secure authentication system
- Configurable similarity thresholds
