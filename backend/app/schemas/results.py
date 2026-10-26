from pydantic import BaseModel


class ChapterPerformance(BaseModel):
    chapter: str
    correct: int
    wrong: int
    unanswered: int


class QuestionPerformance(BaseModel):
    question_id: int
    chapter: str
    stem: str
    correct_option: str
    correct: int
    wrong: int
    unanswered: int


class ResultStudent(BaseModel):
    admit_card_id: int
    student_name: str
    student_email: str
    status: str
    score: int | None = None
    max_score: int
    checked: bool = False


class StudentNeedingAttention(BaseModel):
    name: str
    reason: str


class ClassReport(BaseModel):
    summary: str
    strong_areas: list[str] = []
    weak_areas: list[str] = []
    students_needing_attention: list[StudentNeedingAttention] = []
    teaching_suggestions: list[str] = []


class ExamResults(BaseModel):
    exam_id: int
    exam_name: str
    exam_status: str
    finalized: bool
    max_score: int
    total_students: int
    submitted: int
    absent: int
    in_progress: int
    checked: int
    average_score: float | None = None
    students: list[ResultStudent]
    questions: list[QuestionPerformance]
    chapters: list[ChapterPerformance]
    class_report: ClassReport | None = None
    completed_at: str | None = None
    published_at: str | None = None


class StudentReportCard(BaseModel):
    summary: str
    strengths: list[str] = []
    gaps: list[str] = []
    next_steps: list[str] = []


class AnsweredQuestion(BaseModel):
    question_id: int
    chapter: str
    stem: str
    options: dict[str, str]
    selected_option: str | None
    correct_option: str
    is_correct: bool
    marks: int


class StudentResult(BaseModel):
    admit_card_id: int
    exam_name: str
    student_name: str
    student_email: str
    status: str
    score: int | None = None
    max_score: int
    checked_at: str | None = None
    chapters: list[ChapterPerformance] = []
    questions: list[AnsweredQuestion] = []
    report: StudentReportCard | None = None
    locked: bool = False
