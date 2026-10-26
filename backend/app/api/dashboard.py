from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.core.db import get_db
from app.models.entities import Exam, QuestionPaper, Student, StudentGroup, Teacher
from app.schemas.auth import DashboardCounts

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/counts", response_model=DashboardCounts)
def dashboard_counts(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> DashboardCounts:
    groups = (
        db.query(func.count(StudentGroup.id))
        .filter(StudentGroup.teacher_id == teacher.id)
        .scalar()
        or 0
    )
    students = (
        db.query(func.count(distinct(Student.email)))
        .join(StudentGroup, Student.group_id == StudentGroup.id)
        .filter(StudentGroup.teacher_id == teacher.id)
        .scalar()
        or 0
    )
    papers = (
        db.query(func.count(QuestionPaper.id))
        .filter(QuestionPaper.teacher_id == teacher.id)
        .scalar()
        or 0
    )
    exams = (
        db.query(func.count(Exam.id)).filter(Exam.teacher_id == teacher.id).scalar() or 0
    )
    return DashboardCounts(
        students=int(students),
        student_groups=int(groups),
        question_papers=int(papers),
        exams=int(exams),
    )
