from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, dashboard, groups, papers
from app.core.config import get_settings
from app.core.db import Base, SessionLocal, engine
from app.services.seed import seed_teacher

settings = get_settings()

app = FastAPI(title="TeachSkills API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(papers.router, prefix="/api")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_teacher(db)
    finally:
        db.close()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
