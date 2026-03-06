from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import uuid
import csv
import io

load_dotenv()

# Configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/exam_allotment")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Initialize FastAPI
app = FastAPI(title="Exam Allotment System")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
# Extract database name from MONGO_URL or use default
client = MongoClient(MONGO_URL)
# Get the default database from the connection string
# MongoDB client will use the database specified in the URI
db = client.get_default_database()
users_collection = db.users
exams_collection = db.exams
assignments_collection = db.assignments
notifications_collection = db.notifications

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Pydantic Models
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # admin or student
    usn: Optional[str] = None  # University Seat Number (for students)
    section: Optional[str] = None  # Section (for students)
    branch: Optional[str] = None  # Branch/Department (for students)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ExamCreate(BaseModel):
    title: str
    subject: str
    date: str
    duration: int  # in minutes
    total_marks: int
    description: Optional[str] = ""

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    date: Optional[str] = None
    duration: Optional[int] = None
    total_marks: Optional[int] = None
    description: Optional[str] = None

class AssignmentCreate(BaseModel):
    exam_id: str
    student_ids: List[str]

class ResultUpdate(BaseModel):
    assignment_id: str
    marks: int
    feedback: Optional[str] = ""

# Helper Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return payload

def create_notification(user_id: str, message: str, notification_type: str = "info"):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "message": message,
        "type": notification_type,
        "read": False,
        "created_at": datetime.utcnow().isoformat()
    }
    notifications_collection.insert_one(notification)

# Routes
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Exam Allotment System API is running"}

# Authentication Routes
@app.post("/api/auth/register")
async def register(user: UserRegister):
    # Check if user exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    if user.role not in ["admin", "student"]:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'student'")
    
    # Create user
    user_data = {
        "id": str(uuid.uuid4()),
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "role": user.role,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Add student-specific fields if role is student
    if user.role == "student":
        user_data["usn"] = user.usn or ""
        user_data["section"] = user.section or ""
        user_data["branch"] = user.branch or ""
    
    users_collection.insert_one(user_data)
    
    # Create welcome notification
    create_notification(
        user_data["id"],
        f"Welcome to Exam Allotment System, {user.name}!",
        "success"
    )
    
    return {"message": "User registered successfully", "user_id": user_data["id"]}

@app.post("/api/auth/login")
async def login(user: UserLogin):
    # Find user
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    token = create_access_token({
        "user_id": db_user["id"],
        "email": db_user["email"],
        "role": db_user["role"]
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user["id"],
            "name": db_user["name"],
            "email": db_user["email"],
            "role": db_user["role"]
        }
    }


# Bulk Student Upload Routes
@app.get("/api/students/template")
async def download_template(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can download template")
    
    # Create CSV template
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Name', 'Email', 'USN', 'Section', 'Branch', 'Password'])
    writer.writerow(['John Doe', 'john@example.com', 'USN001', 'A', 'Computer Science', 'password123'])
    writer.writerow(['Jane Smith', 'jane@example.com', 'USN002', 'B', 'Electronics', 'password123'])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students_template.csv"}
    )

@app.post("/api/students/bulk-upload")
async def bulk_upload_students(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can upload students")
    
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        content = await file.read()
        decoded = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded))
        
        created_count = 0
        skipped_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # Check required fields
                if not all(key in row for key in ['Name', 'Email', 'Password']):
                    errors.append(f"Row {row_num}: Missing required fields")
                    continue
                
                # Check if email already exists
                if users_collection.find_one({"email": row['Email'].strip()}):
                    skipped_count += 1
                    continue
                
                # Create student
                user_data = {
                    "id": str(uuid.uuid4()),
                    "name": row['Name'].strip(),
                    "email": row['Email'].strip(),
                    "password": hash_password(row['Password'].strip()),
                    "role": "student",
                    "usn": row.get('USN', '').strip(),
                    "section": row.get('Section', '').strip(),
                    "branch": row.get('Branch', '').strip(),
                    "created_at": datetime.utcnow().isoformat()
                }
                users_collection.insert_one(user_data)
                
                # Create welcome notification
                create_notification(
                    user_data["id"],
                    f"Welcome to Exam Allotment System, {user_data['name']}!",
                    "success"
                )
                
                created_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "message": "Bulk upload completed",
            "created": created_count,
            "skipped": skipped_count,
            "errors": errors
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")


# Exam Routes (Admin)
@app.post("/api/exams")
async def create_exam(exam: ExamCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create exams")
    
    exam_id = str(uuid.uuid4())
    exam_data = {
        "id": exam_id,
        "title": exam.title,
        "subject": exam.subject,
        "date": exam.date,
        "duration": exam.duration,
        "total_marks": exam.total_marks,
        "description": exam.description,
        "created_by": current_user["user_id"],
        "created_at": datetime.utcnow().isoformat()
    }
    exams_collection.insert_one(exam_data)
    
    # Fetch back without _id
    created_exam = exams_collection.find_one({"id": exam_id}, {"_id": 0})
    
    return {"message": "Exam created successfully", "exam_id": exam_id, "exam": created_exam}

@app.get("/api/exams")
async def get_all_exams(current_user: dict = Depends(get_current_user)):
    exams = list(exams_collection.find({}, {"_id": 0}).limit(100))
    return {"exams": exams}

@app.get("/api/exams/{exam_id}")
async def get_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    exam = exams_collection.find_one({"id": exam_id}, {"_id": 0})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {"exam": exam}

@app.put("/api/exams/{exam_id}")
async def update_exam(exam_id: str, exam_update: ExamUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update exams")
    
    exam = exams_collection.find_one({"id": exam_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    update_data = {k: v for k, v in exam_update.dict().items() if v is not None}
    if update_data:
        exams_collection.update_one({"id": exam_id}, {"$set": update_data})
    
    updated_exam = exams_collection.find_one({"id": exam_id}, {"_id": 0})
    return {"message": "Exam updated successfully", "exam": updated_exam}

@app.delete("/api/exams/{exam_id}")
async def delete_exam(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete exams")
    
    result = exams_collection.delete_one({"id": exam_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Also delete related assignments
    assignments_collection.delete_many({"exam_id": exam_id})
    
    return {"message": "Exam deleted successfully"}

# Assignment Routes
@app.post("/api/assignments")
async def assign_exam(assignment: AssignmentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign exams")
    
    # Verify exam exists
    exam = exams_collection.find_one({"id": assignment.exam_id})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Create assignments for each student
    created_assignment_ids = []
    for student_id in assignment.student_ids:
        # Check if already assigned
        existing = assignments_collection.find_one({
            "exam_id": assignment.exam_id,
            "student_id": student_id
        })
        if existing:
            continue
        
        assignment_id = str(uuid.uuid4())
        assignment_data = {
            "id": assignment_id,
            "exam_id": assignment.exam_id,
            "student_id": student_id,
            "assigned_at": datetime.utcnow().isoformat(),
            "status": "pending",
            "marks": None,
            "submitted_at": None,
            "feedback": ""
        }
        assignments_collection.insert_one(assignment_data)
        created_assignment_ids.append(assignment_id)
        
        # Create notification for student
        create_notification(
            student_id,
            f"New exam assigned: {exam['title']} - {exam['subject']}",
            "info"
        )
    
    # Fetch created assignments without _id
    created_assignments = list(assignments_collection.find(
        {"id": {"$in": created_assignment_ids}},
        {"_id": 0}
    ))
    
    return {
        "message": f"Exam assigned to {len(created_assignments)} students",
        "assignments": created_assignments
    }

@app.get("/api/assignments/exam/{exam_id}")
async def get_exam_assignments(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view assignments")
    
    assignments = list(assignments_collection.find({"exam_id": exam_id}, {"_id": 0}))
    
    # Batch fetch student details to avoid N+1 queries
    student_ids = [a["student_id"] for a in assignments]
    students = list(users_collection.find(
        {"id": {"$in": student_ids}},
        {"_id": 0, "password": 0}
    ))
    students_map = {s["id"]: s for s in students}
    
    # Enrich with student details
    for assignment in assignments:
        assignment["student"] = students_map.get(assignment["student_id"])
    
    return {"assignments": assignments}

# Student Routes
@app.get("/api/students/exams")
async def get_student_exams(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can view assigned exams")
    
    assignments = list(assignments_collection.find(
        {"student_id": current_user["user_id"]},
        {"_id": 0}
    ))
    
    # Batch fetch exam details to avoid N+1 queries
    exam_ids = [a["exam_id"] for a in assignments]
    exams = list(exams_collection.find(
        {"id": {"$in": exam_ids}},
        {"_id": 0}
    ))
    exams_map = {e["id"]: e for e in exams}
    
    # Enrich with exam details
    for assignment in assignments:
        assignment["exam"] = exams_map.get(assignment["exam_id"])
    
    return {"exams": assignments}

@app.get("/api/students/results")
async def get_student_results(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can view results")
    
    results = list(assignments_collection.find(
        {"student_id": current_user["user_id"], "status": "completed"},
        {"_id": 0}
    ))
    
    # Batch fetch exam details to avoid N+1 queries
    exam_ids = [r["exam_id"] for r in results]
    exams = list(exams_collection.find(
        {"id": {"$in": exam_ids}},
        {"_id": 0}
    ))
    exams_map = {e["id"]: e for e in exams}
    
    # Enrich with exam details
    for result in results:
        result["exam"] = exams_map.get(result["exam_id"])
    
    return {"results": results}

# Results Management (Admin)
@app.post("/api/results")
async def update_result(result: ResultUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update results")
    
    assignment = assignments_collection.find_one({"id": result.assignment_id})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    update_data = {
        "marks": result.marks,
        "feedback": result.feedback,
        "status": "completed",
        "submitted_at": datetime.utcnow().isoformat()
    }
    assignments_collection.update_one({"id": result.assignment_id}, {"$set": update_data})
    
    # Create notification for student
    exam = exams_collection.find_one({"id": assignment["exam_id"]})
    create_notification(
        assignment["student_id"],
        f"Results published for {exam['title']}: {result.marks}/{exam['total_marks']}",
        "success"
    )
    
    return {"message": "Result updated successfully"}

@app.get("/api/results/exam/{exam_id}")
async def get_exam_results(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view exam results")
    
    results = list(assignments_collection.find({"exam_id": exam_id}, {"_id": 0}))
    
    # Batch fetch student details to avoid N+1 queries
    student_ids = [r["student_id"] for r in results]
    students = list(users_collection.find(
        {"id": {"$in": student_ids}},
        {"_id": 0, "password": 0}
    ))
    students_map = {s["id"]: s for s in students}
    
    # Enrich with student details
    for result in results:
        result["student"] = students_map.get(result["student_id"])
    
    return {"results": results}

# Notifications
@app.get("/api/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = list(notifications_collection.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50))
    
    return {"notifications": notifications}

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    notification = notifications_collection.find_one({"id": notification_id})
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    notifications_collection.update_one({"id": notification_id}, {"$set": {"read": True}})
    return {"message": "Notification marked as read"}

# Analytics Routes (Admin)
@app.get("/api/analytics/overview")
async def get_analytics_overview(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view analytics")
    
    total_exams = exams_collection.count_documents({})
    total_students = users_collection.count_documents({"role": "student"})
    total_assignments = assignments_collection.count_documents({})
    completed_assignments = assignments_collection.count_documents({"status": "completed"})
    pending_assignments = assignments_collection.count_documents({"status": "pending"})
    
    # Calculate average marks
    completed = list(assignments_collection.find({"status": "completed", "marks": {"$ne": None}}))
    avg_marks = sum(a["marks"] for a in completed) / len(completed) if completed else 0
    
    return {
        "total_exams": total_exams,
        "total_students": total_students,
        "total_assignments": total_assignments,
        "completed_assignments": completed_assignments,
        "pending_assignments": pending_assignments,
        "average_marks": round(avg_marks, 2)
    }

@app.get("/api/analytics/exam/{exam_id}")
async def get_exam_analytics(exam_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view analytics")
    
    exam = exams_collection.find_one({"id": exam_id}, {"_id": 0})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    assignments = list(assignments_collection.find({"exam_id": exam_id}, {"_id": 0}))
    total_assigned = len(assignments)
    completed = [a for a in assignments if a["status"] == "completed"]
    pending = [a for a in assignments if a["status"] == "pending"]
    
    marks_list = [a["marks"] for a in completed if a.get("marks") is not None]
    avg_marks = sum(marks_list) / len(marks_list) if marks_list else 0
    highest_marks = max(marks_list) if marks_list else 0
    lowest_marks = min(marks_list) if marks_list else 0
    
    return {
        "exam": exam,
        "total_assigned": total_assigned,
        "completed": len(completed),
        "pending": len(pending),
        "average_marks": round(avg_marks, 2),
        "highest_marks": highest_marks,
        "lowest_marks": lowest_marks,
        "pass_rate": round((len([m for m in marks_list if m >= exam["total_marks"] * 0.4]) / len(marks_list) * 100), 2) if marks_list else 0
    }

# Get all students (for admin to assign exams)
@app.get("/api/students")
async def get_all_students(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view students")
    
    students = list(users_collection.find({"role": "student"}, {"_id": 0, "password": 0}).limit(100))
    return {"students": students}


# Get unique sections and branches
@app.get("/api/students/sections")
async def get_sections(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view sections")
    
    sections = users_collection.distinct("section", {"role": "student", "section": {"$ne": ""}})
    return {"sections": sorted(sections)}

@app.get("/api/students/branches")
async def get_branches(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view branches")
    
    branches = users_collection.distinct("branch", {"role": "student", "branch": {"$ne": ""}})
    return {"branches": sorted(branches)}

# Get students by section or branch
@app.get("/api/students/filter")
async def filter_students(
    section: Optional[str] = None,
    branch: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can filter students")
    
    query = {"role": "student"}
    if section:
        query["section"] = section
    if branch:
        query["branch"] = branch
    
    students = list(users_collection.find(query, {"_id": 0, "password": 0}).limit(200))
    return {"students": students, "count": len(students)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
