from datetime import datetime, timedelta, timezone

from app.models.entities import Exam


def utcnow() -> datetime:
    # MySQL DATETIME columns come back without tzinfo, so all exam times are naive UTC.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def ends_at(exam: Exam) -> datetime | None:
    if not exam.activated_at:
        return None
    return exam.activated_at + timedelta(seconds=exam.duration_seconds)


def late_cutoff_at(exam: Exam) -> datetime | None:
    if not exam.activated_at or exam.late_duration_seconds is None:
        return None
    return exam.activated_at + timedelta(seconds=exam.late_duration_seconds)


def current_status(exam: Exam) -> str:
    if not exam.activated_at:
        return "inactive"
    end = ends_at(exam)
    if end and utcnow() >= end:
        return "ended"
    return "active"


def iso_utc(value: datetime | None) -> str | None:
    return value.strftime("%Y-%m-%dT%H:%M:%SZ") if value else None
