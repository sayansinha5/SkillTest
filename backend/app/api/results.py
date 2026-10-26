import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.api.exams import get_owned_exam
from app.core.db import get_db
from app.models.entities import (
    AdmitCard,
    Attempt,
    Exam,
    ExamReview,
    Question,
    QuestionPaper,
    StudentReport,
    Teacher,
)
from app.schemas.results import ExamResults, StudentResult
from app.services.exam_timing import accepts_answers, current_status, ends_at, iso_utc, utcnow
from app.services.openai_client import write_class_report, write_student_report
from app.services.scoring import chapter_titles, score_attempt

router = APIRouter(prefix="/exams", tags=["results"])

AI_REPORT_ERROR = "Could not generate the AI report right now. Please try again."


def _finalize(db: Session, exam: Exam) -> bool:
    """Once the submit grace window has passed, auto-submit open attempts and mark non-logins absent."""
    if not exam.activated_at or accepts_answers(exam):
        return False
    end = ends_at(exam)
    attempts = {a.admit_card_id: a for a in db.query(Attempt).filter(Attempt.exam_id == exam.id).all()}
    changed = False
    for card in db.query(AdmitCard).filter(AdmitCard.exam_id == exam.id).all():
        attempt = attempts.get(card.id)
        if attempt is None:
            db.add(Attempt(exam_id=exam.id, admit_card_id=card.id, student_id=card.student_id, status="absent"))
            changed = True
        elif attempt.status == "in_progress":
            attempt.status = "submitted"
            attempt.submitted_at = end
            changed = True
    if changed:
        db.commit()
    return True


def _review(db: Session, exam: Exam) -> ExamReview | None:
    return db.query(ExamReview).filter(ExamReview.exam_id == exam.id).first()


def _questions(db: Session, exam: Exam) -> list[Question]:
    return db.query(Question).filter(Question.paper_id == exam.paper_id).order_by(Question.id).all()


def _selected(attempt: Attempt) -> dict[int, str | None]:
    return {a.question_id: a.selected_option for a in attempt.answers}


def _ensure_unlocked(db: Session, exam: Exam) -> None:
    review = _review(db, exam)
    if review and review.completed_at:
        raise HTTPException(status_code=400, detail="Results are already marked complete")


def _check_attempt(
    db: Session,
    card: AdmitCard,
    attempt: Attempt,
    questions: list[Question],
    titles: dict[str, str],
) -> StudentReport:
    scored = score_attempt(questions, _selected(attempt), titles)
    student_name = f"{card.student.first_name} {card.student.last_name}"
    try:
        report = write_student_report(student_name, scored)
    except Exception as exc:  # noqa: BLE001 — OpenAI/network errors surface as one friendly message
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=AI_REPORT_ERROR) from exc
    row = db.query(StudentReport).filter(StudentReport.attempt_id == attempt.id).first()
    if row is None:
        row = StudentReport(attempt_id=attempt.id)
        db.add(row)
    row.score = scored["score"]
    row.max_score = scored["max_score"]
    row.report_json = json.dumps(report)
    row.checked_at = utcnow()
    return row


@router.get("/{exam_id}/results", response_model=ExamResults)
def get_results(
    exam_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> ExamResults:
    exam = get_owned_exam(db, teacher, exam_id)
    finalized = _finalize(db, exam)
    questions = _questions(db, exam)
    titles = chapter_titles(db.get(QuestionPaper, exam.paper_id) if exam.paper_id else None)
    max_score = sum(q.marks for q in questions)

    cards = db.query(AdmitCard).filter(AdmitCard.exam_id == exam.id).order_by(AdmitCard.id).all()
    attempts = {a.admit_card_id: a for a in db.query(Attempt).filter(Attempt.exam_id == exam.id).all()}
    reports = {
        r.attempt_id: r
        for r in db.query(StudentReport).filter(StudentReport.attempt_id.in_([a.id for a in attempts.values()])).all()
    }

    question_stats = {
        q.id: {
            "question_id": q.id,
            "chapter": titles.get(q.chapter_key) or q.chapter_key or "General",
            "stem": q.stem,
            "correct_option": q.correct_option,
            "correct": 0,
            "wrong": 0,
            "unanswered": 0,
        }
        for q in questions
    }
    chapter_stats: dict[str, dict] = {}
    students = []
    counts = {"submitted": 0, "absent": 0, "in_progress": 0}
    for card in cards:
        attempt = attempts.get(card.id)
        state = attempt.status if attempt else "not_started"
        if state in counts:
            counts[state] += 1
        report = reports.get(attempt.id) if attempt else None
        if state == "submitted":
            for q in score_attempt(questions, _selected(attempt), titles)["questions"]:
                outcome = "correct" if q["is_correct"] else ("unanswered" if not q["selected_option"] else "wrong")
                question_stats[q["question_id"]][outcome] += 1
                bucket = chapter_stats.setdefault(
                    q["chapter"], {"chapter": q["chapter"], "correct": 0, "wrong": 0, "unanswered": 0}
                )
                bucket[outcome] += 1
        students.append(
            {
                "admit_card_id": card.id,
                "student_name": f"{card.student.first_name} {card.student.last_name}",
                "student_email": card.student.email,
                "status": state,
                "score": report.score if report else None,
                "max_score": max_score,
                "checked": report is not None,
            }
        )

    checked_scores = [s["score"] for s in students if s["checked"]]
    review = _review(db, exam)
    return ExamResults(
        exam_id=exam.id,
        exam_name=exam.name,
        exam_status=current_status(exam),
        finalized=finalized,
        max_score=max_score,
        total_students=len(cards),
        checked=len(checked_scores),
        average_score=round(sum(checked_scores) / len(checked_scores), 1) if checked_scores else None,
        students=students,
        questions=list(question_stats.values()),
        chapters=list(chapter_stats.values()),
        class_report=json.loads(review.class_report_json) if review and review.class_report_json else None,
        completed_at=iso_utc(review.completed_at) if review else None,
        published_at=iso_utc(exam.published_at),
        **counts,
    )


@router.get("/{exam_id}/results/{admit_card_id}", response_model=StudentResult)
def get_student_result(
    exam_id: int,
    admit_card_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> StudentResult:
    exam = get_owned_exam(db, teacher, exam_id)
    _finalize(db, exam)
    card = db.query(AdmitCard).filter(AdmitCard.id == admit_card_id, AdmitCard.exam_id == exam.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Student not found in this exam")
    questions = _questions(db, exam)
    titles = chapter_titles(db.get(QuestionPaper, exam.paper_id) if exam.paper_id else None)
    attempt = db.query(Attempt).filter(Attempt.admit_card_id == card.id).first()
    review = _review(db, exam)
    result = {
        "admit_card_id": card.id,
        "exam_name": exam.name,
        "student_name": f"{card.student.first_name} {card.student.last_name}",
        "student_email": card.student.email,
        "status": attempt.status if attempt else "not_started",
        "max_score": sum(q.marks for q in questions),
        "locked": bool(review and review.completed_at),
    }
    if attempt and attempt.status == "submitted":
        scored = score_attempt(questions, _selected(attempt), titles)
        result.update(chapters=scored["chapters"], questions=scored["questions"])
        report = db.query(StudentReport).filter(StudentReport.attempt_id == attempt.id).first()
        if report:
            result.update(
                score=report.score,
                checked_at=iso_utc(report.checked_at),
                report=json.loads(report.report_json),
            )
    return StudentResult(**result)


@router.post("/{exam_id}/results/{admit_card_id}/autocheck", response_model=StudentResult)
def autocheck_student(
    exam_id: int,
    admit_card_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> StudentResult:
    exam = get_owned_exam(db, teacher, exam_id)
    _ensure_unlocked(db, exam)
    _finalize(db, exam)
    card = db.query(AdmitCard).filter(AdmitCard.id == admit_card_id, AdmitCard.exam_id == exam.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Student not found in this exam")
    attempt = db.query(Attempt).filter(Attempt.admit_card_id == card.id).first()
    if not attempt or attempt.status != "submitted":
        raise HTTPException(status_code=400, detail="This student has no submitted answers to check")
    questions = _questions(db, exam)
    titles = chapter_titles(db.get(QuestionPaper, exam.paper_id) if exam.paper_id else None)
    _check_attempt(db, card, attempt, questions, titles)
    db.commit()
    return get_student_result(exam_id, admit_card_id, teacher, db)


@router.post("/{exam_id}/results/autocheck-all", response_model=ExamResults)
def bulk_autocheck(
    exam_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> ExamResults:
    exam = get_owned_exam(db, teacher, exam_id)
    _ensure_unlocked(db, exam)
    if not _finalize(db, exam):
        raise HTTPException(status_code=400, detail="Bulk autocheck is available once the exam has ended")
    questions = _questions(db, exam)
    titles = chapter_titles(db.get(QuestionPaper, exam.paper_id) if exam.paper_id else None)
    cards = {c.id: c for c in db.query(AdmitCard).filter(AdmitCard.exam_id == exam.id).all()}
    attempts = db.query(Attempt).filter(Attempt.exam_id == exam.id, Attempt.status == "submitted").all()
    checked_ids = {
        r.attempt_id
        for r in db.query(StudentReport).filter(StudentReport.attempt_id.in_([a.id for a in attempts])).all()
    }
    for attempt in attempts:
        if attempt.id not in checked_ids:
            _check_attempt(db, cards[attempt.admit_card_id], attempt, questions, titles)
            db.commit()

    results = get_results(exam_id, teacher, db)
    if results.submitted:
        class_data = {
            "max_score": results.max_score,
            "average_score": results.average_score,
            "students_total": results.total_students,
            "absent": [s.student_name for s in results.students if s.status == "absent"],
            "scores": [{"name": s.student_name, "score": s.score} for s in results.students if s.checked],
            "chapters": [c.model_dump() for c in results.chapters],
            "questions": [
                {"question": q.stem, "chapter": q.chapter, "correct": q.correct, "wrong": q.wrong, "unanswered": q.unanswered}
                for q in results.questions
            ],
        }
        try:
            class_report = write_class_report(exam.name, class_data)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=AI_REPORT_ERROR) from exc
        review = _review(db, exam) or ExamReview(exam_id=exam.id)
        review.class_report_json = json.dumps(class_report)
        review.class_report_at = utcnow()
        db.add(review)
        db.commit()
    return get_results(exam_id, teacher, db)


@router.post("/{exam_id}/complete", response_model=ExamResults)
def mark_complete(
    exam_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> ExamResults:
    exam = get_owned_exam(db, teacher, exam_id)
    _ensure_unlocked(db, exam)
    results = get_results(exam_id, teacher, db)
    if not results.finalized:
        raise HTTPException(status_code=400, detail="Results can be marked complete once the exam has ended")
    if results.checked < results.submitted:
        raise HTTPException(status_code=400, detail="Autocheck every submitted paper before marking complete")
    if results.submitted and not results.class_report:
        raise HTTPException(status_code=400, detail="Run Bulk autocheck to generate the class report first")
    review = _review(db, exam) or ExamReview(exam_id=exam.id)
    review.completed_at = utcnow()
    db.add(review)
    db.commit()
    return get_results(exam_id, teacher, db)


@router.post("/{exam_id}/publish", response_model=ExamResults)
def publish_results(
    exam_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> ExamResults:
    exam = get_owned_exam(db, teacher, exam_id)
    review = _review(db, exam)
    if not review or not review.completed_at:
        raise HTTPException(status_code=400, detail="Mark the results complete before publishing")
    if exam.published_at:
        raise HTTPException(status_code=400, detail="Results are already published")
    exam.published_at = utcnow()
    db.commit()
    return get_results(exam_id, teacher, db)
