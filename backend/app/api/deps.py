from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import decode_access_token
from app.models.entities import Teacher

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_teacher(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Teacher:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    email = decode_access_token(credentials.credentials)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    teacher = db.query(Teacher).filter(Teacher.email == email).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Teacher not found")
    return teacher
