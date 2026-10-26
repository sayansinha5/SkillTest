from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.entities import Teacher


def seed_teacher(db: Session) -> None:
    settings = get_settings()
    existing = db.query(Teacher).filter(Teacher.email == settings.teacher_email).first()
    if existing:
        return
    teacher = Teacher(
        email=settings.teacher_email,
        name=settings.teacher_name,
        password_hash=hash_password(settings.teacher_password),
    )
    db.add(teacher)
    db.commit()
