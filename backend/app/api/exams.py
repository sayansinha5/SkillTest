import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.core.db import get_db
from app.models.entities import AdmitCard, Exam, ExamReview, Question, QuestionPaper, Student, StudentGroup, Teacher
from app.schemas.exams import AdmitCardOut, ExamCreate, ExamDetail, ExamOut
from app.services.exam_timing import current_status, ends_at, iso_utc, utcnow

router = APIRouter(prefix="/exams", tags=["exams"])

_PASSWORD_ALPHABET = string.ascii_letters + string.digits


def get_owned_exam(db: Session, teacher: Teacher, exam_id: int) -> Exam:
    exam = db.query(Exam).filter(Exam.id == exam_id, Exam.teacher_id == teacher.id).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")
    return exam


def review_status(db: Session, exam: Exam) -> str:
    if exam.published_at:
        return "published"
    review = db.query(ExamReview).filter(ExamReview.exam_id == exam.id).first()
    if review and review.completed_at:
        return "completed"
    return current_status(exam)


def _exam_out(db: Session, exam: Exam) -> dict:
    group = db.get(StudentGroup, exam.group_id) if exam.group_id else None
    paper = db.get(QuestionPaper, exam.paper_id) if exam.paper_id else None
    return {
        "id": exam.id,
        "name": exam.name,
        "group_id": exam.group_id,
        "group_name": group.name if group else None,
        "paper_id": exam.paper_id,
        "paper_name": paper.name if paper else None,
        "duration_seconds": exam.duration_seconds,
        "late_duration_seconds": exam.late_duration_seconds,
        "share_token": exam.share_token,
        "status": review_status(db, exam),
        "activated_at": iso_utc(exam.activated_at),
        "ends_at": iso_utc(ends_at(exam)),
    }


@router.get("", response_model=list[ExamOut])
def list_exams(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> list[ExamOut]:
    exams = db.query(Exam).filter(Exam.teacher_id == teacher.id).order_by(Exam.id.desc()).all()
    return [ExamOut(**_exam_out(db, e)) for e in exams]


@router.post("", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
def create_exam(
    body: ExamCreate,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> ExamOut:
    group = (
        db.query(StudentGroup)
        .filter(StudentGroup.id == body.group_id, StudentGroup.teacher_id == teacher.id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=400, detail="Student group not found")
    paper = (
        db.query(QuestionPaper)
        .filter(QuestionPaper.id == body.paper_id, QuestionPaper.teacher_id == teacher.id)
        .first()
    )
    if not paper:
        raise HTTPException(status_code=400, detail="Question paper not found")
    if paper.status != "ready" or not db.query(Question).filter(Question.paper_id == paper.id).count():
        raise HTTPException(status_code=400, detail="Question paper has no generated questions yet")
    if body.late_duration_seconds and body.late_duration_seconds >= body.duration_seconds:
        raise HTTPException(status_code=400, detail="Late login window must be shorter than the exam duration")

    exam = Exam(
        teacher_id=teacher.id,
        name=body.name.strip(),
        group_id=group.id,
        paper_id=paper.id,
        duration_seconds=body.duration_seconds,
        late_duration_seconds=body.late_duration_seconds,
        share_token=secrets.token_urlsafe(16),
        status="inactive",
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return ExamOut(**_exam_out(db, exam))


@router.get("/{exam_id}", response_model=ExamDetail)
def get_exam(
    exam_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> ExamDetail:
    exam = get_owned_exam(db, teacher, exam_id)
    cards = db.query(AdmitCard).filter(AdmitCard.exam_id == exam.id).order_by(AdmitCard.id).all()
    student_count = (
        db.query(Student).filter(Student.group_id == exam.group_id).count() if exam.group_id else 0
    )
    return ExamDetail(
        **_exam_out(db, exam),
        student_count=student_count,
        admit_cards=[
            AdmitCardOut(
                id=c.id,
                student_id=c.student_id,
                student_name=f"{c.student.first_name} {c.student.last_name}",
                student_email=c.student.email,
                admit_id=c.admit_id,
                password=c.password,
            )
            for c in cards
        ],
    )


@router.post("/{exam_id}/admit-cards", response_model=ExamDetail)
def generate_admit_cards(
    exam_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> ExamDetail:
    exam = get_owned_exam(db, teacher, exam_id)
    if current_status(exam) != "inactive":
        raise HTTPException(status_code=400, detail="Admit cards can only be generated before activation")
    students = db.query(Student).filter(Student.group_id == exam.group_id).all()
    if not students:
        raise HTTPException(status_code=400, detail="The selected group has no students")

    existing = {c.student_id for c in db.query(AdmitCard).filter(AdmitCard.exam_id == exam.id).all()}
    for student in students:
        if student.id in existing:
            continue
        db.add(
            AdmitCard(
                exam_id=exam.id,
                student_id=student.id,
                admit_id=f"TS{exam.id}-{secrets.token_hex(3).upper()}",
                password="".join(secrets.choice(_PASSWORD_ALPHABET) for _ in range(8)),
            )
        )
    db.commit()
    return get_exam(exam_id, teacher, db)


@router.post("/{exam_id}/activate", response_model=ExamDetail)
def activate_exam(
    exam_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> ExamDetail:
    exam = get_owned_exam(db, teacher, exam_id)
    if exam.activated_at:
        raise HTTPException(status_code=400, detail="Exam is already activated")
    if not db.query(AdmitCard).filter(AdmitCard.exam_id == exam.id).count():
        raise HTTPException(status_code=400, detail="Generate admit cards before activating")
    exam.activated_at = utcnow()
    exam.status = "active"
    db.commit()
    return get_exam(exam_id, teacher, db)
