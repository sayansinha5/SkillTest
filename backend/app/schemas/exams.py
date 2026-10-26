from pydantic import BaseModel, Field


class ExamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    group_id: int
    paper_id: int
    duration_seconds: int = Field(gt=0)
    late_duration_seconds: int | None = Field(default=None, gt=0)


class ExamOut(BaseModel):
    id: int
    name: str
    group_id: int | None
    group_name: str | None = None
    paper_id: int | None
    paper_name: str | None = None
    duration_seconds: int
    late_duration_seconds: int | None
    share_token: str
    status: str
    activated_at: str | None = None
    ends_at: str | None = None


class AdmitCardOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_email: str
    admit_id: str
    password: str


class ExamDetail(ExamOut):
    admit_cards: list[AdmitCardOut] = []
    student_count: int = 0


class PortalExamInfo(BaseModel):
    name: str
    status: str
    duration_seconds: int
    ends_at: str | None = None


class PortalLoginRequest(BaseModel):
    admit_id: str = Field(min_length=1)
    password: str = Field(min_length=1)


class PortalLoginResponse(BaseModel):
    access_token: str
    student_name: str
    exam_name: str
    ends_at: str | None


class PortalQuestion(BaseModel):
    id: int
    stem: str
    options: dict[str, str]
    marks: int


class PortalSession(BaseModel):
    exam_name: str
    student_name: str
    total_marks: int
    duration_seconds: int
    ends_at: str | None
    server_now: str
    status: str
    questions: list[PortalQuestion]
    answers: dict[int, str | None]


class AnswerUpdate(BaseModel):
    selected_option: str | None = Field(default=None, pattern="^[ABCD]$")
