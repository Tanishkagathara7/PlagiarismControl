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
import re


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


def extract_student_info(filename: str) -> tuple[str, str]:
    """
    Extract student name and ID from filename where student name is at the END.
    Supports formats like:
    - Python_(Lab_05)_(Tuple) - Ashish Vadher.ipynb -> name: "Ashish Vadher", id: "ashish_vadher"
    - lab7_tanish_kagathara.ipynb -> name: "Tanish Kagathara", id: "tanish_kagathara"
    - assignment1_john_doe.ipynb -> name: "John Doe", id: "john_doe"
    """
    # Remove file extension and clean filename
    base_name = filename.replace('.ipynb', '').strip()
    
    # Handle empty or invalid filenames
    if not base_name:
        return "unknown", "unknown"
    
    # Pattern 1: Check if filename contains " - " (dash separator)
    # Format: "Assignment - Student Name" or "Python_(Lab_05) - Student Name"
    if ' - ' in base_name:
        parts = base_name.split(' - ')
        # Take the last part after the last dash as the student name
        student_name = parts[-1].strip()
        if student_name:
            student_id = student_name.lower().replace(' ', '_')
            # Remove any special characters from ID
            student_id = re.sub(r'[^a-z0-9_]', '', student_id)
            return student_name.title(), student_id
    
    # Pattern 2: Check if filename contains "-" (dash without spaces)
    if '-' in base_name and ' - ' not in base_name:
        parts = base_name.split('-')
        # Take the last part after the last dash as the student name
        student_name = parts[-1].strip()
        if student_name:
            student_id = student_name.lower().replace(' ', '_')
            student_id = re.sub(r'[^a-z0-9_]', '', student_id)
            return student_name.title(), student_id
    
    # Split by underscore
    parts = [part.strip() for part in base_name.split('_') if part.strip()]
    
    if len(parts) == 1:
        # Single part - could be just a name or assignment
        part = parts[0]
        # Check if it's a roll number
        if re.match(r'^roll\d+$', part, re.IGNORECASE):
            return part.lower(), part.lower()
        # Check if it's just numbers (student ID)
        if re.match(r'^\d+$', part):
            return f"student_{part}", part
        # Otherwise treat as name
        return part.title(), part.lower()
    
    # Multiple parts - find where assignment part ends and name begins
    assignment_indicators = ['lab', 'assignment', 'hw', 'project', 'task', 'exercise', 'ex', 'test', 'quiz']
    
    name_start_index = 0
    
    # Find the last assignment indicator
    for i, part in enumerate(parts):
        part_lower = part.lower()
        # Check if this part is an assignment indicator
        if part_lower in assignment_indicators:
            name_start_index = i + 1
        # Check if this part is assignment + number (like lab7, hw3)
        elif any(part_lower.startswith(indicator) for indicator in assignment_indicators):
            name_start_index = i + 1
        # Check if this part ends with numbers and might be assignment related
        elif re.match(r'^(lab|assignment|hw|project|task|exercise|ex|test|quiz)\d+$', part_lower):
            name_start_index = i + 1
    
    # Extract name parts (everything after the assignment indicators)
    if name_start_index < len(parts):
        name_parts = parts[name_start_index:]
    else:
        # If no assignment indicators found, take the last 1-2 parts as name
        if len(parts) >= 2:
            name_parts = parts[-2:]  # Take last two parts as first_name last_name
        else:
            name_parts = parts[-1:]  # Take last part as name
    
    # Clean and format the name parts
    clean_name_parts = []
    for part in name_parts:
        # Skip empty parts
        if not part:
            continue
        # Check if it's a roll number
        if re.match(r'^roll\d+$', part, re.IGNORECASE):
            return part.lower(), part.lower()
        # Check if it's just numbers (student ID)
        if re.match(r'^\d+$', part):
            return f"student_{part}", part
        clean_name_parts.append(part)
    
    if clean_name_parts:
        student_name = ' '.join(clean_name_parts).title()
        student_id = '_'.join(clean_name_parts).lower()
        return student_name, student_id
    
    # Fallback: use the whole base name
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
    if files_count >= 300:
        raise HTTPException(status_code=400, detail="Maximum file limit (300) reached")
    
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


@api_router.post("/upload/bulk")
async def upload_bulk_files(
    files: List[UploadFile] = File(...),
    username: str = Depends(verify_token)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if len(files) > 300:
        raise HTTPException(status_code=400, detail="Maximum 300 files allowed per upload")
    
    # Check current file count
    current_count = await db.files.count_documents({})
    if current_count + len(files) > 300:
        raise HTTPException(
            status_code=400, 
            detail=f"Upload would exceed maximum limit. Current: {current_count}, Trying to add: {len(files)}, Max: 300"
        )
    
    uploaded_files = []
    failed_files = []
    
    for file in files:
        try:
            # Validate file type
            if not file.filename.endswith('.ipynb'):
                failed_files.append({
                    "filename": file.filename,
                    "error": "Only .ipynb files are allowed"
                })
                continue
            
            # Extract student info from filename
            student_name, student_id = extract_student_info(file.filename)
            
            # Generate unique file ID and path
            file_id = str(uuid.uuid4())
            file_extension = Path(file.filename).suffix
            safe_filename = f"{file_id}{file_extension}"
            file_path = UPLOAD_DIR / safe_filename
            
            # Save file
            content = await file.read()
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            # Get upload order
            upload_order = await db.files.count_documents({}) + 1
            
            # Create metadata
            file_metadata = FileMetadata(
                id=file_id,
                student_name=student_name,
                student_id=student_id,
                filename=file.filename,
                file_path=str(file_path),
                upload_order=upload_order
            )
            
            # Save to database
            file_doc = file_metadata.model_dump()
            file_doc['upload_timestamp'] = file_doc['upload_timestamp'].isoformat()
            await db.files.insert_one(file_doc)
            
            uploaded_files.append({
                "file_id": file_id,
                "filename": file.filename,
                "student_name": student_name,
                "student_id": student_id
            })
            
        except Exception as e:
            failed_files.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return {
        "message": f"Bulk upload completed. {len(uploaded_files)} files uploaded successfully.",
        "uploaded_files": uploaded_files,
        "failed_files": failed_files,
        "total_uploaded": len(uploaded_files),
        "total_failed": len(failed_files)
    }


@api_router.get("/files")
async def get_files(username: str = Depends(verify_token)):
    # Optimize query with projection and sorting
    files = await db.files.find(
        {},
        {
            "_id": 0,
            "id": 1,
            "student_name": 1,
            "student_id": 1,
            "filename": 1,
            "upload_timestamp": 1,
            "upload_order": 1
        }
    ).sort("upload_order", 1).to_list(300)
    
    # Batch process timestamp conversion
    for file in files:
        if isinstance(file['upload_timestamp'], str):
            try:
                file['upload_timestamp'] = datetime.fromisoformat(file['upload_timestamp'])
            except:
                file['upload_timestamp'] = datetime.now(timezone.utc)
    
    return files


@api_router.get("/files/count")
async def get_files_count(username: str = Depends(verify_token)):
    """Fast endpoint to get just the file count"""
    count = await db.files.count_documents({})
    return {"count": count, "max": 300}


@api_router.post("/test-extraction")
async def test_filename_extraction(
    filename: str,
    username: str = Depends(verify_token)
):
    """Test endpoint to verify filename extraction logic"""
    name, student_id = extract_student_info(filename)
    return {
        "filename": filename,
        "extracted_name": name,
        "extracted_id": student_id
    }


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


@api_router.delete("/files")
async def delete_all_files(username: str = Depends(verify_token)):
    """Delete all uploaded files"""
    try:
        # Get all files to delete their physical files
        files = await db.files.find({}, {"_id": 0, "file_path": 1}).to_list(300)
        
        deleted_count = 0
        failed_count = 0
        
        # Delete physical files
        for file_doc in files:
            try:
                file_path = Path(file_doc['file_path'])
                if file_path.exists():
                    file_path.unlink()
                deleted_count += 1
            except Exception as e:
                failed_count += 1
                print(f"Failed to delete file {file_doc['file_path']}: {e}")
        
        # Delete all records from database
        result = await db.files.delete_many({})
        
        return {
            "message": f"Deleted {result.deleted_count} file records",
            "deleted_files": deleted_count,
            "failed_files": failed_count,
            "total_records_deleted": result.deleted_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete files: {str(e)}")


@api_router.post("/analyze")
async def analyze_plagiarism(
    request: AnalysisRequest,
    username: str = Depends(verify_token)
):
    files = await db.files.find({}, {"_id": 0}).to_list(300)
    
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="At least 2 files are required for analysis")
    
    # Limit files for performance (can be increased later)
    if len(files) > 100:
        files = files[:100]  # Take first 100 files for now
    
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
        # Use the optimized detector directly instead of subprocess for better performance
        from plagiarism_detector import FastPlagiarismDetector
        
        detector = FastPlagiarismDetector(threshold=request.threshold)
        results = detector.detect_plagiarism(files_data)
        
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
        
    except Exception as e:
        # Fallback to subprocess if direct import fails
        try:
            result = subprocess.run(
                ['python', str(ROOT_DIR / 'plagiarism_detector.py'), files_json, str(request.threshold)],
                capture_output=True,
                text=True,
                timeout=120,  # Reduced timeout
                cwd=str(ROOT_DIR)  # Ensure correct working directory
            )
            
            if result.returncode != 0:
                error_msg = result.stderr or "Unknown error"
                raise HTTPException(status_code=500, detail=f"Analysis failed: {error_msg}")
            
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
            raise HTTPException(status_code=500, detail="Analysis timeout - try with fewer files or lower threshold")
        except Exception as subprocess_error:
            raise HTTPException(status_code=500, detail=f"Analysis error: {str(subprocess_error)}")


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


@api_router.get("/results/history")
async def get_analysis_history(username: str = Depends(verify_token)):
    """Get analysis history with date/time information"""
    results = await db.analysis_results.find(
        {},
        {
            "_id": 0,
            "id": 1,
            "analysis_timestamp": 1,
            "threshold": 1,
            "total_files": 1,
            "total_matches": 1,
            "results": 1
        }
    ).sort("analysis_timestamp", -1).limit(50).to_list(50)
    
    # Process timestamps and add summary statistics
    for result in results:
        if isinstance(result['analysis_timestamp'], str):
            try:
                result['analysis_timestamp'] = datetime.fromisoformat(result['analysis_timestamp'])
            except:
                result['analysis_timestamp'] = datetime.now(timezone.utc)
        
        # Add summary statistics for each analysis
        if 'results' in result and result['results']:
            similarities = [r.get('similarity', 0) for r in result['results']]
            result['avg_similarity'] = sum(similarities) / len(similarities) if similarities else 0
            result['max_similarity'] = max(similarities) if similarities else 0
            result['high_risk_count'] = len([s for s in similarities if s >= 70])
            result['medium_risk_count'] = len([s for s in similarities if 40 <= s < 70])
            result['low_risk_count'] = len([s for s in similarities if s < 40])
        else:
            result['avg_similarity'] = 0
            result['max_similarity'] = 0
            result['high_risk_count'] = 0
            result['medium_risk_count'] = 0
            result['low_risk_count'] = 0
    
    return results


@api_router.get("/results/analytics")
async def get_analytics_data(username: str = Depends(verify_token)):
    """Get analytics data for charts and graphs"""
    # Get recent analysis results
    results = await db.analysis_results.find(
        {},
        {"_id": 0}
    ).sort("analysis_timestamp", -1).limit(10).to_list(10)
    
    if not results:
        return {
            "timeline_data": [],
            "similarity_distribution": [],
            "risk_trends": [],
            "threshold_analysis": []
        }
    
    timeline_data = []
    similarity_distribution = {"0-20": 0, "20-40": 0, "40-60": 0, "60-80": 0, "80-100": 0}
    risk_trends = []
    
    for result in results:
        # Process timestamp
        if isinstance(result['analysis_timestamp'], str):
            try:
                timestamp = datetime.fromisoformat(result['analysis_timestamp'])
            except:
                timestamp = datetime.now(timezone.utc)
        else:
            timestamp = result['analysis_timestamp']
        
        # Timeline data
        timeline_data.append({
            "date": timestamp.strftime("%Y-%m-%d %H:%M"),
            "total_matches": result.get('total_matches', 0),
            "total_files": result.get('total_files', 0),
            "threshold": result.get('threshold', 0) * 100
        })
        
        # Similarity distribution
        if 'results' in result and result['results']:
            for match in result['results']:
                similarity = match.get('similarity', 0)
                if similarity < 20:
                    similarity_distribution["0-20"] += 1
                elif similarity < 40:
                    similarity_distribution["20-40"] += 1
                elif similarity < 60:
                    similarity_distribution["40-60"] += 1
                elif similarity < 80:
                    similarity_distribution["60-80"] += 1
                else:
                    similarity_distribution["80-100"] += 1
        
        # Risk trends
        if 'results' in result and result['results']:
            similarities = [r.get('similarity', 0) for r in result['results']]
            high_risk = len([s for s in similarities if s >= 70])
            medium_risk = len([s for s in similarities if 40 <= s < 70])
            low_risk = len([s for s in similarities if s < 40])
            
            risk_trends.append({
                "date": timestamp.strftime("%Y-%m-%d"),
                "high_risk": high_risk,
                "medium_risk": medium_risk,
                "low_risk": low_risk
            })
    
    # Threshold analysis
    threshold_analysis = []
    thresholds = [30, 40, 50, 60, 70, 80]
    latest_result = results[0] if results else None
    
    if latest_result and 'results' in latest_result:
        for threshold in thresholds:
            matches = len([r for r in latest_result['results'] if r.get('similarity', 0) >= threshold])
            threshold_analysis.append({
                "threshold": threshold,
                "matches": matches
            })
    
    return {
        "timeline_data": timeline_data[::-1],  # Reverse to show chronological order
        "similarity_distribution": [
            {"range": k, "count": v} for k, v in similarity_distribution.items()
        ],
        "risk_trends": risk_trends[::-1],  # Reverse to show chronological order
        "threshold_analysis": threshold_analysis
    }


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


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
    print("Starting Plagiarism Control Backend Server...")
    print(f"Server will be available at: http://{host}:{port}")
    print(f"API Documentation: http://{host}:{port}/docs")
    uvicorn.run(app, host=host, port=port, reload=False)
