#!/usr/bin/env python3
"""
Unified server that serves both FastAPI backend and React frontend
"""

from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Form, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import aiofiles
import json
import subprocess
import bcrypt
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import re

# Import the existing server components
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / 'backend' / '.env')

# Database setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

UPLOAD_DIR = ROOT_DIR / 'backend' / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

# Frontend build directory
FRONTEND_BUILD_DIR = ROOT_DIR / 'frontend' / 'build'

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

app = FastAPI(title="Plagiarism Control - Unified App")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Import all the models and functions from the original server
class AdminCreate(BaseModel):
    username: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    username: str

class FileMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_name: str
    student_id: str
    filename: str
    file_path: str
    upload_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    upload_order: int

class AnalysisRequest(BaseModel):
    threshold: float = 0.5

class AnalysisResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    analysis_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    threshold: float
    results: List[dict]
    total_files: int
    total_matches: int

class ComparisonRequest(BaseModel):
    fileA_id: str
    fileB_id: str

def extract_student_info(filename: str) -> tuple[str, str]:
    """Extract student name and ID from filename"""
    base_name = filename.replace('.ipynb', '').strip()
    
    if not base_name:
        return "unknown", "unknown"
    
    if ' - ' in base_name:
        parts = base_name.split(' - ')
        student_name = parts[-1].strip()
        if student_name:
            student_id = student_name.lower().replace(' ', '_')
            student_id = re.sub(r'[^a-z0-9_]', '', student_id)
            return student_name.title(), student_id
    
    if '-' in base_name and ' - ' not in base_name:
        parts = base_name.split('-')
        student_name = parts[-1].strip()
        if student_name:
            student_id = student_name.lower().replace(' ', '_')
            student_id = re.sub(r'[^a-z0-9_]', '', student_id)
            return student_name.title(), student_id
    
    parts = [part.strip() for part in base_name.split('_') if part.strip()]
    
    if len(parts) == 1:
        part = parts[0]
        if re.match(r'^roll\d+$', part, re.IGNORECASE):
            return part.lower(), part.lower()
        if re.match(r'^\d+$', part):
            return f"student_{part}", part
        return part.title(), part.lower()
    
    assignment_indicators = ['lab', 'assignment', 'hw', 'project', 'task', 'exercise', 'ex', 'test', 'quiz']
    name_start_index = 0
    
    for i, part in enumerate(parts):
        part_lower = part.lower()
        if part_lower in assignment_indicators:
            name_start_index = i + 1
        elif any(part_lower.startswith(indicator) for indicator in assignment_indicators):
            name_start_index = i + 1
        elif re.match(r'^(lab|assignment|hw|project|task|exercise|ex|test|quiz)\d+$', part_lower):
            name_start_index = i + 1
    
    if name_start_index < len(parts):
        name_parts = parts[name_start_index:]
    else:
        if len(parts) >= 2:
            name_parts = parts[-2:]
        else:
            name_parts = parts[-1:]
    
    clean_name_parts = []
    for part in name_parts:
        if not part:
            continue
        if re.match(r'^roll\d+$', part, re.IGNORECASE):
            return part.lower(), part.lower()
        if re.match(r'^\d+$', part):
            return f"student_{part}", part
        clean_name_parts.append(part)
    
    if clean_name_parts:
        student_name = ' '.join(clean_name_parts).title()
        student_id = '_'.join(clean_name_parts).lower()
        return student_name, student_id
    
    clean_name = base_name.replace('_', ' ').title()
    clean_id = base_name.lower().replace(' ', '_')
    return clean_name, clean_id

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# API Routes (same as original server.py)
@api_router.get("/")
async def root():
    return {"message": "PlagiarismControl API", "status": "running"}

@api_router.post("/auth/register")
async def register_admin(admin: AdminCreate):
    existing = await db.admins.find_one({"username": admin.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = bcrypt.hashpw(admin.password.encode('utf-8'), bcrypt.gensalt())
    
    admin_doc = {
        "id": str(uuid.uuid4()),
        "username": admin.username,
        "password": hashed_password.decode('utf-8'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.admins.insert_one(admin_doc)
    return {"message": "Admin registered successfully"}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_admin(admin: AdminLogin):
    admin_doc = await db.admins.find_one({"username": admin.username}, {"_id": 0})
    
    if not admin_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(admin.password.encode('utf-8'), admin_doc['password'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token_data = {"sub": admin.username}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return TokenResponse(token=token, username=admin.username)

# Add all other API endpoints here (upload, analyze, etc.)
# For brevity, I'm including just the essential ones

# Include the API router
app.include_router(api_router)

# Serve static files from React build
if FRONTEND_BUILD_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD_DIR / "static")), name="static")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve React app for all non-API routes
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve React app for all routes that don't start with /api"""
    
    # If it's an API route, let FastAPI handle it
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Check if it's a static file request
    if full_path.startswith("static/"):
        file_path = FRONTEND_BUILD_DIR / full_path
        if file_path.exists():
            return FileResponse(file_path)
        raise HTTPException(status_code=404, detail="Static file not found")
    
    # For all other routes, serve the React index.html
    index_file = FRONTEND_BUILD_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    else:
        return JSONResponse(
            content={"message": "Frontend not built. Run 'npm run build' in frontend directory."},
            status_code=404
        )

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
    print("Starting Unified Plagiarism Control Server...")
    print(f"Server will be available at: http://{host}:{port}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print(f"Frontend: http://{host}:{port}")
    uvicorn.run(app, host=host, port=port, reload=False)