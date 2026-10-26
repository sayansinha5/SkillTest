from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    teacher_name: str
    teacher_email: str


class TeacherMe(BaseModel):
    id: int
    email: EmailStr
    name: str

    model_config = {"from_attributes": True}


class DashboardCounts(BaseModel):
    students: int
    student_groups: int
    question_papers: int
    exams: int
