from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Form, Depends
from fastapi.responses import JSONResponse
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()


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


@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    student_name: str = Form(...),
    student_id: str = Form(...),
    username: str = Depends(verify_token)
):
    if not file.filename.endswith('.ipynb'):
        raise HTTPException(status_code=400, detail="Only .ipynb files are allowed")
    
    files_count = await db.files.count_documents({})
    if files_count >= 100:
        raise HTTPException(status_code=400, detail="Maximum file limit (100) reached")
    
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix
    safe_filename = f"{file_id}{file_extension}"
    file_path = UPLOAD_DIR / safe_filename
    
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
    
    upload_order = await db.files.count_documents({}) + 1
    
    file_metadata = FileMetadata(
        id=file_id,
        student_name=student_name,
        student_id=student_id,
        filename=file.filename,
        file_path=str(file_path),
        upload_order=upload_order
    )
    
    file_doc = file_metadata.model_dump()
    file_doc['upload_timestamp'] = file_doc['upload_timestamp'].isoformat()
    
    await db.files.insert_one(file_doc)
    
    return {"message": "File uploaded successfully", "file_id": file_id}


@api_router.get("/files")
async def get_files(username: str = Depends(verify_token)):
    files = await db.files.find({}, {"_id": 0}).to_list(1000)
    
    for file in files:
        if isinstance(file['upload_timestamp'], str):
            file['upload_timestamp'] = datetime.fromisoformat(file['upload_timestamp'])
    
    files.sort(key=lambda x: x['upload_order'])
    
    return files


@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str, username: str = Depends(verify_token)):
    file_doc = await db.files.find_one({"id": file_id}, {"_id": 0})
    
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = Path(file_doc['file_path'])
    if file_path.exists():
        file_path.unlink()
    
    await db.files.delete_one({"id": file_id})
    
    return {"message": "File deleted successfully"}


@api_router.post("/analyze")
async def analyze_plagiarism(
    request: AnalysisRequest,
    username: str = Depends(verify_token)
):
    files = await db.files.find({}, {"_id": 0}).to_list(1000)
    
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="At least 2 files are required for analysis")
    
    files_data = [
        {
            "file_id": f['id'],
            "student_name": f['student_name'],
            "student_id": f['student_id'],
            "file_path": f['file_path'],
            "upload_order": f['upload_order']
        }
        for f in files
    ]
    
    files_json = json.dumps(files_data)
    
    try:
        result = subprocess.run(
            ['python', str(ROOT_DIR / 'plagiarism_detector.py'), files_json, str(request.threshold)],
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Analysis failed: {result.stderr}")
        
        results = json.loads(result.stdout)
        
        analysis_result = AnalysisResult(
            threshold=request.threshold,
            results=results,
            total_files=len(files),
            total_matches=len(results)
        )
        
        analysis_doc = analysis_result.model_dump()
        analysis_doc['analysis_timestamp'] = analysis_doc['analysis_timestamp'].isoformat()
        
        await db.analysis_results.insert_one(analysis_doc)
        
        return analysis_result
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Analysis timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@api_router.get("/results/latest")
async def get_latest_result(username: str = Depends(verify_token)):
    result = await db.analysis_results.find_one(
        {},
        {"_id": 0},
        sort=[("analysis_timestamp", -1)]
    )
    
    if not result:
        return {"results": [], "total_files": 0, "total_matches": 0}
    
    if isinstance(result['analysis_timestamp'], str):
        result['analysis_timestamp'] = datetime.fromisoformat(result['analysis_timestamp'])
    
    return result


@api_router.post("/compare")
async def compare_files(
    request: ComparisonRequest,
    username: str = Depends(verify_token)
):
    file_a = await db.files.find_one({"id": request.fileA_id}, {"_id": 0})
    file_b = await db.files.find_one({"id": request.fileB_id}, {"_id": 0})
    
    if not file_a or not file_b:
        raise HTTPException(status_code=404, detail="One or both files not found")
    
    from plagiarism_detector import NotebookParser, CodeNormalizer
    
    code_a = NotebookParser.extract_code_from_notebook(file_a['file_path'])
    code_b = NotebookParser.extract_code_from_notebook(file_b['file_path'])
    
    return {
        "fileA": {
            "student_name": file_a['student_name'],
            "student_id": file_a['student_id'],
            "code": code_a
        },
        "fileB": {
            "student_name": file_b['student_name'],
            "student_id": file_b['student_id'],
            "code": code_b
        }
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
