from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine
from models import Base
from routers import auth, interview, jobs, resume, user

# Ensure database tables exist at startup
Base.metadata.create_all(bind=engine)

SESSION_STORE: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Resume Upload API",
    description="API for uploading PDF resumes and returning cleaned resume text.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def session_middleware(request: Request, call_next):
    session_id = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_id or session_id not in SESSION_STORE:
        session_id = str(uuid4())
        SESSION_STORE[session_id] = {}
    request.state.session = SESSION_STORE[session_id]
    response = await call_next(request)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        samesite="lax",
    )
    return response


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(interview.router)
app.include_router(user.router)
app.include_router(auth.router, prefix="/auth")


