"""
Interview router — 7 endpoints, all JWT-protected.

POST  /api/interview/start                 Create session + return ephemeral key
POST  /api/interview/message               Save one transcript turn
POST  /api/interview/end                   End session + trigger evaluation (blocking)
GET   /api/interview/                      List user's past interviews
GET   /api/interview/{interview_id}        Get single interview
GET   /api/interview/{interview_id}/evaluation   Get evaluation scores
GET   /api/interview/{interview_id}/messages     Get full transcript
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.auth_handler import get_current_active_user
from database import get_db
from models import Interview, InterviewEvaluation, User
from schemas import (
    InterviewEndRequest,
    InterviewEvaluationResponse,
    InterviewMessageCreate,
    InterviewMessageResponse,
    InterviewResponse,
    InterviewStartRequest,
    InterviewStartResponse,
)
from services import interview_service

router = APIRouter(prefix="/api/interview", tags=["interview"])


# ── Start ─────────────────────────────────────────────────────────────────────

@router.post("/start", response_model=InterviewStartResponse, status_code=status.HTTP_201_CREATED)
async def start_interview(
    payload: InterviewStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Create an interview record in the database and return an ephemeral
    OpenAI Realtime key.  The frontend uses the key to open a WebRTC
    data-channel directly to OpenAI (the server API key never reaches
    the browser).
    """
    interview = interview_service.create_interview(
        user_id=current_user.id,
        role=payload.role,
        company=payload.company,
        db=db,
    )
    try:
        ephemeral_key = await interview_service.get_realtime_ephemeral_key()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not create OpenAI Realtime session: {exc}",
        )
    return InterviewStartResponse(interview_id=interview.id, ephemeral_key=ephemeral_key)


# ── Save message ──────────────────────────────────────────────────────────────

@router.post("/message", response_model=InterviewMessageResponse)
def save_message(
    payload: InterviewMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Persist a single transcript turn.  Called by the frontend whenever
    the OpenAI Realtime data-channel emits a completed transcript event
    (either candidate speech or AI response).
    """
    interview = interview_service.get_interview(payload.interview_id, current_user.id, db)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview is not active.")

    msg = interview_service.save_message(
        interview_id=payload.interview_id,
        speaker=payload.role,
        text=payload.transcript,
        db=db,
    )
    return msg


# ── End + evaluate ────────────────────────────────────────────────────────────

@router.post("/end")
def end_interview(
    payload: InterviewEndRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Mark the interview completed, then synchronously call GPT to evaluate
    the full transcript.  The request blocks until evaluation is saved
    (~10–30 s) so the frontend can navigate directly to the results page.
    """
    interview = interview_service.get_interview(payload.interview_id, current_user.id, db)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    if interview.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview already ended.")

    interview_service.end_interview(payload.interview_id, db)

    messages = interview_service.get_messages(payload.interview_id, db)
    if messages:
        interview_service.evaluate_interview(payload.interview_id, db)

    return {"status": "completed", "interview_id": payload.interview_id}


# ── List / get ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[InterviewResponse])
def list_interviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return interview_service.list_interviews(current_user.id, db)


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    interview = interview_service.get_interview(interview_id, current_user.id, db)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    return interview


@router.get("/{interview_id}/evaluation", response_model=InterviewEvaluationResponse)
def get_evaluation(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    interview = interview_service.get_interview(interview_id, current_user.id, db)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    evaluation = (
        db.query(InterviewEvaluation)
        .filter(InterviewEvaluation.interview_id == interview_id)
        .first()
    )
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not ready. End the interview first.",
        )
    return evaluation


@router.get("/{interview_id}/messages", response_model=list[InterviewMessageResponse])
def get_messages(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    interview = interview_service.get_interview(interview_id, current_user.id, db)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    return interview_service.get_messages(interview_id, db)
