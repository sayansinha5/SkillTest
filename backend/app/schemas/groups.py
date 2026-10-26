from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class GroupOut(BaseModel):
    id: int
    name: str
    student_count: int = 0
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class StudentCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
    email: EmailStr


class StudentOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class GroupDetail(BaseModel):
    id: int
    name: str
    students: list[StudentOut]
    created_at: datetime | None = None
