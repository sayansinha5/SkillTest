from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_user: str = "teachskills"
    db_password: str = "teachskills"
    db_name: str = "teachskills"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    teacher_email: str = "teacher@example.com"
    teacher_password: str = "teachskills123"
    teacher_name: str = "Demo Teacher"

    ai_provider: str = "openai"
    ai_model: str = "gpt-4o-mini"
    ai_api_key: str = ""

    frontend_origin: str = "http://localhost:5173"

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
