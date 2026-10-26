from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_teacher
from app.core.db import get_db
from app.models.entities import Student, StudentGroup, Teacher
from app.schemas.groups import GroupCreate, GroupDetail, GroupOut, StudentCreate, StudentOut

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("", response_model=list[GroupOut])
def list_groups(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> list[GroupOut]:
    rows = (
        db.query(StudentGroup, func.count(Student.id))
        .outerjoin(Student, Student.group_id == StudentGroup.id)
        .filter(StudentGroup.teacher_id == teacher.id)
        .group_by(StudentGroup.id)
        .order_by(StudentGroup.id.desc())
        .all()
    )
    return [
        GroupOut(id=g.id, name=g.name, student_count=int(count or 0), created_at=g.created_at)
        for g, count in rows
    ]


@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    body: GroupCreate,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> GroupOut:
    group = StudentGroup(teacher_id=teacher.id, name=body.name.strip())
    db.add(group)
    db.commit()
    db.refresh(group)
    return GroupOut(id=group.id, name=group.name, student_count=0, created_at=group.created_at)


def _get_owned_group(db: Session, teacher: Teacher, group_id: int) -> StudentGroup:
    group = (
        db.query(StudentGroup)
        .filter(StudentGroup.id == group_id, StudentGroup.teacher_id == teacher.id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


@router.get("/{group_id}", response_model=GroupDetail)
def get_group(
    group_id: int,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> GroupDetail:
    group = _get_owned_group(db, teacher, group_id)
    students = (
        db.query(Student)
        .filter(Student.group_id == group.id)
        .order_by(Student.id.asc())
        .all()
    )
    return GroupDetail(
        id=group.id,
        name=group.name,
        created_at=group.created_at,
        students=[StudentOut.model_validate(s) for s in students],
    )


@router.post(
    "/{group_id}/students",
    response_model=StudentOut,
    status_code=status.HTTP_201_CREATED,
)
def add_student(
    group_id: int,
    body: StudentCreate,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
) -> StudentOut:
    group = _get_owned_group(db, teacher, group_id)
    email = str(body.email).lower()
    existing = (
        db.query(Student)
        .filter(Student.group_id == group.id, Student.email == email)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student with this email already exists in the group",
        )
    student = Student(
        group_id=group.id,
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        email=email,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentOut.model_validate(student)
