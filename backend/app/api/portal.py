import json
import random

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import create_access_token, decode_access_token
from app.models.entities import AdmitCard, Answer, Attempt, Exam, Question, QuestionPaper
from app.schemas.exams import (
    AnswerUpdate,
    PortalExamInfo,
    PortalLoginRequest,
    PortalLoginResponse,
    PortalQuestion,
    PortalSession,
)
from app.services.exam_timing import (
    accepts_answers,
    current_status,
    ends_at,
    iso_utc,
    late_cutoff_at,
    utcnow,
)

router = APIRouter(prefix="/portal", tags=["portal"])
bearer_scheme = HTTPBearer(auto_error=False)


def _exam_by_token(db: Session, token: str) -> Exam:
    exam = db.query(Exam).filter(Exam.share_token == token).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This exam link is not valid")
    return exam


def _current_attempt(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Attempt:
    sub = decode_access_token(credentials.credentials, role="student") if credentials else None
    if not sub or not sub.startswith("admit:"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please log in to the exam again")
    card = db.get(AdmitCard, int(sub.split(":", 1)[1]))
    attempt = (
        db.query(Attempt).filter(Attempt.admit_card_id == card.id).first() if card else None
    )
    if not attempt:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please log in to the exam again")
    return attempt


def _open_attempt(db: Session, attempt: Attempt) -> Exam:
    exam = db.get(Exam, attempt.exam_id)
    if attempt.status != "in_progress":
        raise HTTPException(status_code=403, detail="You have already submitted this exam")
    if not accepts_answers(exam):
        raise HTTPException(status_code=403, detail="This exam has ended")
    return exam


def _questions(db: Session, exam: Exam) -> list[Question]:
    return db.query(Question).filter(Question.paper_id == exam.paper_id).order_by(Question.id).all()


@router.get("/{token}", response_model=PortalExamInfo)
def portal_info(token: str, db: Session = Depends(get_db)) -> PortalExamInfo:
    exam = _exam_by_token(db, token)
    return PortalExamInfo(
        name=exam.name,
        status=current_status(exam),
        duration_seconds=exam.duration_seconds,
        ends_at=iso_utc(ends_at(exam)),
    )


@router.post("/{token}/login", response_model=PortalLoginResponse)
def portal_login(token: str, body: PortalLoginRequest, db: Session = Depends(get_db)) -> PortalLoginResponse:
    exam = _exam_by_token(db, token)
    exam_status = current_status(exam)
    if exam_status == "inactive":
        raise HTTPException(status_code=403, detail="This exam has not started yet")
    if exam_status == "ended":
        raise HTTPException(status_code=403, detail="This exam has ended")

    card = (
        db.query(AdmitCard)
        .filter(AdmitCard.exam_id == exam.id, AdmitCard.admit_id == body.admit_id.strip())
        .first()
    )
    if not card or card.password != body.password:
        raise HTTPException(status_code=401, detail="Invalid admit card ID or password")

    attempt = db.query(Attempt).filter(Attempt.admit_card_id == card.id).first()
    if attempt and attempt.status != "in_progress":
        raise HTTPException(status_code=403, detail="You have already submitted this exam")

    # The late window only blocks students who have not started; someone already in progress may log back in.
    cutoff = late_cutoff_at(exam)
    if not attempt and cutoff and utcnow() > cutoff:
        raise HTTPException(status_code=403, detail="The late login window for this exam has closed")

    if not attempt:
        attempt = Attempt(
            exam_id=exam.id,
            admit_card_id=card.id,
            student_id=card.student_id,
            status="in_progress",
            started_at=utcnow(),
        )
        db.add(attempt)
        db.commit()

    end = ends_at(exam)
    remaining_minutes = max(1, int((end - utcnow()).total_seconds() // 60) + 2) if end else 60
    return PortalLoginResponse(
        access_token=create_access_token(f"admit:{card.id}", role="student", minutes=remaining_minutes),
        student_name=f"{card.student.first_name} {card.student.last_name}",
        exam_name=exam.name,
        ends_at=iso_utc(end),
    )


@router.get("/session/exam", response_model=PortalSession)
def portal_session(attempt: Attempt = Depends(_current_attempt), db: Session = Depends(get_db)) -> PortalSession:
    exam = _open_attempt(db, attempt)
    paper = db.get(QuestionPaper, exam.paper_id)
    card = db.get(AdmitCard, attempt.admit_card_id)
    questions = _questions(db, exam)
    saved = {a.question_id: a.selected_option for a in attempt.answers}
    return PortalSession(
        exam_name=exam.name,
        student_name=f"{card.student.first_name} {card.student.last_name}",
        total_marks=paper.total_marks if paper else 0,
        duration_seconds=exam.duration_seconds,
        ends_at=iso_utc(ends_at(exam)),
        server_now=iso_utc(utcnow()),
        status=attempt.status,
        questions=[
            PortalQuestion(id=q.id, stem=q.stem, options=json.loads(q.options_json), marks=q.marks)
            for q in questions
        ],
        answers={q.id: saved.get(q.id) for q in questions},
    )


@router.put("/session/answers/{question_id}")
def save_answer(
    question_id: int,
    body: AnswerUpdate,
    attempt: Attempt = Depends(_current_attempt),
    db: Session = Depends(get_db),
) -> dict[str, str | None]:
    exam = _open_attempt(db, attempt)
    question = db.get(Question, question_id)
    if not question or question.paper_id != exam.paper_id:
        raise HTTPException(status_code=404, detail="Question not found")
    answer = (
        db.query(Answer)
        .filter(Answer.attempt_id == attempt.id, Answer.question_id == question_id)
        .first()
    )
    if answer:
        answer.selected_option = body.selected_option
    else:
        db.add(Answer(attempt_id=attempt.id, question_id=question_id, selected_option=body.selected_option))
    db.commit()
    return {"question_id": str(question_id), "selected_option": body.selected_option}


@router.post("/session/demo-fill")
def demo_fill(attempt: Attempt = Depends(_current_attempt), db: Session = Depends(get_db)) -> dict[str, int]:
    """Demo-only shortcut for the hackathon recording: answers every unanswered question at random."""
    exam = _open_attempt(db, attempt)
    answered = {a.question_id: a for a in attempt.answers}
    filled = 0
    for question in _questions(db, exam):
        existing = answered.get(question.id)
        if existing and existing.selected_option:
            continue
        choice = random.choice(list(json.loads(question.options_json).keys()))
        if existing:
            existing.selected_option = choice
        else:
            db.add(Answer(attempt_id=attempt.id, question_id=question.id, selected_option=choice))
        filled += 1
    db.commit()
    return {"filled": filled}


@router.post("/session/submit")
def submit_exam(attempt: Attempt = Depends(_current_attempt), db: Session = Depends(get_db)) -> dict[str, str]:
    _open_attempt(db, attempt)
    attempt.status = "submitted"
    attempt.submitted_at = utcnow()
    db.commit()
    return {"status": "submitted"}
