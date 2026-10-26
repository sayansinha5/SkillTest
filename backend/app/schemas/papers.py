from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PaperCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    total_marks: int = Field(gt=0, default=50)


class PaperOut(BaseModel):
    id: int
    name: str
    total_marks: int
    status: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ChapterInfo(BaseModel):
    key: str
    title: str
    summary: str = ""


class ExtractChaptersResponse(BaseModel):
    paper_id: int
    chapters: list[ChapterInfo]


class GeneratePaperRequest(BaseModel):
    chapter_keys: list[str] = Field(min_length=1)
    weights: dict[str, float]
    question_count: int = Field(default=5, ge=1, le=50)


class QuestionOut(BaseModel):
    id: int
    chapter_key: str
    stem: str
    options: dict[str, Any]
    correct_option: str
    marks: int


class PaperDetail(BaseModel):
    id: int
    name: str
    total_marks: int
    status: str
    chapters: list[ChapterInfo] = []
    questions: list[QuestionOut] = []
    created_at: datetime | None = None
