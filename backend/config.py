import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── OpenAI ────────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_API_MODEL: str = os.getenv("OPENAI_API_MODEL", "gpt-4o")

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )

    # ── Session ───────────────────────────────────────────────────────────────
    SESSION_COOKIE_NAME: str = os.getenv("SESSION_COOKIE_NAME", "resume_session_id")

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")

    # ── JWT ───────────────────────────────────────────────────────────────────
    # Generate a strong secret with: openssl rand -hex 32
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    def get_cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
