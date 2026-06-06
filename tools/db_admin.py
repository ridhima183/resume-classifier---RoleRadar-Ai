"""
Database Admin Tool - View resume classifier database contents.

Usage: python db_admin.py
"""

import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.database.session import engine, get_db
from backend.database.models import User, Resume, PredictionResult, Feedback, SystemLog, LinkedinProfile
from sqlalchemy.orm import Session
from sqlalchemy import text, desc
import json


def safe_text(value):
    """Return console-safe text for Windows terminals with limited encodings."""
    if value is None:
        return ""
    text = str(value)
    return text.encode("cp1252", errors="replace").decode("cp1252")


def view_users(db: Session):
    print("\nUSERS (Logins):")
    print("-" * 80)
    users = db.query(User).all()
    if not users:
        print("No users found.")
        return
    
    for user in users:
        print(f"ID: {user.id}")
        print(f"Name: {safe_text(user.name)}")
        print(f"Email: {safe_text(user.email)}")
        print(f"Account Created: {user.account_created_date}")
        print(f"Resumes Count: {len(user.resumes)}")
        print("-" * 40)

def view_resumes(db: Session):
    print("\nRESUMES:")
    print("-" * 80)
    resumes = db.query(Resume).order_by(desc(Resume.upload_date)).limit(10).all()
    if not resumes:
        print("No resumes found.")
        return
    
    for resume in resumes:
        print(f"ID: {resume.id}")
        print(f"User: {safe_text(resume.user.name)} ({safe_text(resume.user.email)})")
        print(f"Filename: {safe_text(resume.resume_filename)}")
        print(f"Upload Date: {resume.upload_date}")
        print(f"Text Preview: {safe_text(resume.resume_text[:100])}...")
        print("-" * 40)

def view_predictions(db: Session):
    print("\nPREDICTIONS:")
    print("-" * 80)
    predictions = db.query(PredictionResult).order_by(desc(PredictionResult.id)).limit(10).all()
    if not predictions:
        print("No predictions found.")
        return
    
    for pred in predictions:
        print(f"ID: {pred.id}")
        print(f"Resume ID: {pred.resume_id}")
        print(f"Predicted Role: {safe_text(pred.predicted_job_role)}")
        print(f"Confidence: {pred.confidence_score}%")
        if pred.extracted_skills:
            skills = json.loads(pred.extracted_skills) if pred.extracted_skills.startswith('[') else pred.extracted_skills
            print(f"Skills: {safe_text(skills)}")
        print("-" * 40)

def view_feedback(db: Session):
    print("\nFEEDBACK:")
    print("-" * 80)
    feedback = db.query(Feedback).order_by(desc(Feedback.created_at)).limit(10).all()
    if not feedback:
        print("No feedback found.")
        return
    
    for fb in feedback:
        print(f"ID: {fb.id}")
        print(f"User: {safe_text(fb.user.name)} ({safe_text(fb.user.email)})")
        print(f"Rating: {fb.rating}/5")
        print(f"Comments: {safe_text(fb.comments or 'No comments')}")
        print(f"Date: {fb.created_at}")
        print("-" * 40)

def view_system_logs(db: Session):
    print("\nSYSTEM LOGS:")
    print("-" * 80)
    logs = db.query(SystemLog).order_by(desc(SystemLog.created_at)).limit(10).all()
    if not logs:
        print("No system logs found.")
        return
    
    for log in logs:
        print(f"ID: {log.id}")
        print(f"Level: {safe_text(log.level)}")
        print(f"Message: {safe_text(log.message)}")
        print(f"Date: {log.created_at}")
        if log.context and len(log.context) < 200:
            print(f"Context: {safe_text(log.context)}")
        print("-" * 40)

def view_linkedin_profiles(db: Session):
    print("\nLINKEDIN PROFILES:")
    print("-" * 80)
    profiles = db.query(LinkedinProfile).order_by(desc(LinkedinProfile.created_at)).limit(10).all()
    if not profiles:
        print("No LinkedIn profiles found.")
        return
    
    for profile in profiles:
        print(f"ID: {profile.id}")
        print(f"User: {safe_text(profile.user.name)} ({safe_text(profile.user.email)})")
        print(f"Source: {safe_text(profile.source)}")
        print(f"Predicted Role: {safe_text(profile.predicted_job_role)}")
        print(f"Confidence: {profile.confidence_score}%")
        print(f"ATS Score: {profile.ats_score or 'N/A'}")
        print(f"Created: {profile.created_at}")
        print("-" * 40)

def view_database_stats(db: Session):
    print("\nDATABASE STATISTICS:")
    print("-" * 80)
    
    stats = {
        'Users': db.query(User).count(),
        'Resumes': db.query(Resume).count(),
        'Predictions': db.query(PredictionResult).count(),
        'Feedback': db.query(Feedback).count(),
        'System Logs': db.query(SystemLog).count(),
        'LinkedIn Profiles': db.query(LinkedinProfile).count(),
    }
    
    for table, count in stats.items():
        print(f"{table}: {count}")

def main():
    print("Resume Classifier Database Admin Tool")
    print("=" * 80)
    
    # Test database connection
    try:
        db = next(get_db())
        print("[OK] Database connected successfully!")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        return
    
    try:
        # Show overview
        view_database_stats(db)
        
        # Show detailed data
        view_users(db)
        view_resumes(db)
        view_predictions(db)
        view_linkedin_profiles(db)
        view_feedback(db)
        view_system_logs(db)
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
