import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.core.db import get_db
from app.models.entities import Question, QuestionPaper, Teacher
from app.schemas.papers import (
    ChapterInfo,
    ExtractChaptersResponse,
    GeneratePaperRequest,
    PaperCreate,
    PaperDetail,
    PaperOut,
    QuestionOut,
)
from app.services.openai_client import extract_chapters_from_text, generate_mcqs
from app.services.pdf_extract import extract_text_from_pdf

router = APIRouter(prefix="/papers", tags=["papers"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _owned_paper(db: Session, teacher: Teacher, paper_id: int) -> QuestionPaper:
    paper = (
        db.query(QuestionPaper)
        .filter(QuestionPaper.id == paper_id, QuestionPaper.teacher_id == teacher.id)
        .first()
    )
    if not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return paper


@router.get("", response_model=list[PaperOut])
def list_papers(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> list[QuestionPaper]:
    return (
        db.query(QuestionPaper)
        .filter(QuestionPaper.teacher_id == teacher.id)
        .order_by(QuestionPaper.id.desc())
        .all()
    )


@router.post("", response_model=PaperOut, status_code=status.HTTP_201_CREATED)
def create_paper(
    body: PaperCreate,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> QuestionPaper:
    paper = QuestionPaper(
        teacher_id=teacher.id,
        name=body.name.strip(),
        total_marks=body.total_marks,
        status="draft",
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper


@router.post("/{paper_id}/extract-chapters", response_model=ExtractChaptersResponse)
async def extract_chapters(
    paper_id: int,
    file: UploadFile = File(...),
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> ExtractChaptersResponse:
    paper = _owned_paper(db, teacher, paper_id)
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")

    dest = UPLOAD_DIR / f"paper_{paper.id}_{file.filename}"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    dest.write_bytes(content)

    try:
        text = extract_text_from_pdf(dest)
        chapters = extract_chapters_from_text(text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — surface AI/PDF failures to UI
        raise HTTPException(status_code=502, detail=f"Chapter extraction failed: {exc}") from exc

    # Store chapters plus raw text for later generation
    payload = {"chapters": chapters, "full_text": text}
    paper.pdf_path = str(dest)
    paper.chapters_json = json.dumps(payload)
    paper.status = "chapters_ready"
    db.commit()

    return ExtractChaptersResponse(
        paper_id=paper.id,
        chapters=[ChapterInfo(**c) for c in chapters],
    )


@router.post("/{paper_id}/generate", response_model=PaperDetail)
def generate_paper(
    paper_id: int,
    body: GeneratePaperRequest,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> PaperDetail:
    paper = _owned_paper(db, teacher, paper_id)
    if not paper.chapters_json:
        raise HTTPException(status_code=400, detail="Upload and extract chapters first")

    stored = json.loads(paper.chapters_json)
    all_chapters = stored.get("chapters") or []
    full_text = stored.get("full_text") or ""
    by_key = {c["key"]: c for c in all_chapters}
    selected = []
    for key in body.chapter_keys:
        if key not in by_key:
            raise HTTPException(status_code=400, detail=f"Unknown chapter key: {key}")
        ch = dict(by_key[key])
        # Approximate chapter content from full text using title match
        title = ch.get("title") or key
        idx = full_text.lower().find(title.lower())
        if idx >= 0:
            ch["content"] = full_text[idx : idx + 4000]
        else:
            ch["content"] = f"{title}\n{ch.get('summary', '')}\n{full_text[:3000]}"
        selected.append(ch)

    weight_sum = sum(float(body.weights.get(k, 0)) for k in body.chapter_keys)
    if abs(weight_sum - 100.0) > 0.5:
        raise HTTPException(status_code=400, detail="Chapter weights must total 100%")

    try:
        generated = generate_mcqs(selected, body.question_count, body.weights)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Question generation failed: {exc}") from exc

    db.query(Question).filter(Question.paper_id == paper.id).delete()
    for q in generated:
        db.add(
            Question(
                paper_id=paper.id,
                chapter_key=q["chapter_key"],
                stem=q["stem"],
                options_json=json.dumps(q["options"]),
                correct_option=q["correct_option"],
                marks=q["marks"],
            )
        )
    paper.status = "ready"
    # Keep chapter selection metadata
    stored["selected_keys"] = body.chapter_keys
    stored["weights"] = body.weights
    stored["question_count"] = body.question_count
    paper.chapters_json = json.dumps(stored)
    db.commit()

    return get_paper(paper_id, teacher, db)


@router.get("/{paper_id}", response_model=PaperDetail)
def get_paper(
    paper_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> PaperDetail:
    paper = _owned_paper(db, teacher, paper_id)
    chapters: list[ChapterInfo] = []
    if paper.chapters_json:
        stored = json.loads(paper.chapters_json)
        chapters = [ChapterInfo(**c) for c in (stored.get("chapters") or [])]
    questions = db.query(Question).filter(Question.paper_id == paper.id).all()
    return PaperDetail(
        id=paper.id,
        name=paper.name,
        total_marks=paper.total_marks,
        status=paper.status,
        created_at=paper.created_at,
        chapters=chapters,
        questions=[
            QuestionOut(
                id=q.id,
                chapter_key=q.chapter_key,
                stem=q.stem,
                options=json.loads(q.options_json),
                correct_option=q.correct_option,
                marks=q.marks,
            )
            for q in questions
        ],
    )
