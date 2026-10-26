from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import create_access_token
from app.models.entities import AdmitCard, Exam
from app.schemas.exams import PortalExamInfo, PortalLoginRequest, PortalLoginResponse
from app.services.exam_timing import current_status, ends_at, iso_utc, late_cutoff_at, utcnow

router = APIRouter(prefix="/portal", tags=["portal"])


def _exam_by_token(db: Session, token: str) -> Exam:
    exam = db.query(Exam).filter(Exam.share_token == token).first()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This exam link is not valid")
    return exam


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

    cutoff = late_cutoff_at(exam)
    if cutoff and utcnow() > cutoff:
        raise HTTPException(status_code=403, detail="The late login window for this exam has closed")

    end = ends_at(exam)
    remaining_minutes = max(1, int((end - utcnow()).total_seconds() // 60) + 1) if end else 60
    return PortalLoginResponse(
        access_token=create_access_token(f"admit:{card.id}", role="student", minutes=remaining_minutes),
        student_name=f"{card.student.first_name} {card.student.last_name}",
        exam_name=exam.name,
        ends_at=iso_utc(end),
    )
