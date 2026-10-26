from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.core.db import get_db
from app.core.security import create_access_token, verify_password
from app.models.entities import Teacher
from app.schemas.auth import LoginRequest, TeacherMe, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    teacher = db.query(Teacher).filter(Teacher.email == body.email).first()
    if not teacher or not verify_password(body.password, teacher.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(teacher.email)
    return TokenResponse(
        access_token=token,
        teacher_name=teacher.name,
        teacher_email=teacher.email,
    )


@router.get("/me", response_model=TeacherMe)
def me(teacher: Teacher = Depends(get_current_teacher)) -> Teacher:
    return teacher
