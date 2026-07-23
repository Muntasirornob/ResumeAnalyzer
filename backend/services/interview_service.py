"""
Interview service — all database operations and AI calls for the
interview feature.  The router stays thin; logic lives here.
"""
import json
from datetime import datetime, timezone

import aiohttp
from openai import OpenAI
from sqlalchemy.orm import Session

from config import settings
from models import Interview, InterviewEvaluation, InterviewMessage

# ── Constants ─────────────────────────────────────────────────────────────────

_REALTIME_SESSION_URL = "https://api.openai.com/v1/realtime/client_secrets"

_INTERVIEWER_INSTRUCTIONS = """You are a senior recruiter conducting a 10-minute behavioural interview.

Guidelines:
- Start by briefly introducing yourself and asking the candidate to introduce themselves.
- Ask exactly one behavioural question at a time (e.g. "Tell me about a time when...").
- Wait in full silence until the candidate finishes before responding.
- Ask a single follow-up only if the answer lacks a concrete result.
- Cover 3–4 questions across: leadership, problem-solving, teamwork, conflict resolution.
- Do NOT score or evaluate during the interview.
- After approximately 10 minutes, close the interview professionally and thank the candidate.

Tone: professional, encouraging, and unhurried."""

_EVALUATION_SYSTEM_PROMPT = """You are a senior engineering manager evaluating a mock behavioural interview.

Respond with exactly this JSON object (no markdown fences, no extra keys):

{
  "communication":   <float 0-10>,
  "clarity":         <float 0-10>,
  "leadership":      <float 0-10>,
  "confidence":      <float 0-10>,
  "structure":       <float 0-10>,
  "problem_solving": <float 0-10>,
  "star_method":     <float 0-10>,
  "overall":         <float 0-10>,
  "strengths":       ["...", "..."],
  "weaknesses":      ["...", "..."],
  "suggestions":     ["...", "..."],
  "improved_answers":["...", "..."]
}

Scoring guide (0–10 per dimension):
  communication   — clarity and articulation of ideas
  clarity         — structure and conciseness of each answer
  leadership      — evidence of ownership, initiative, and influence
  confidence      — assertiveness and self-awareness shown
  structure       — logical flow of responses
  problem_solving — analytical thinking and decision quality
  star_method     — adherence to Situation → Task → Action → Result format
  overall         — weighted average of all dimensions

strengths       : 3–4 concrete positives observed in the transcript
weaknesses      : 2–3 clear improvement areas
suggestions     : actionable coaching tips (one per weakness)
improved_answers: 2–3 example rephrased answers for the weakest responses"""


# ── OpenAI Realtime ephemeral token ──────────────────────────────────────────

async def get_realtime_ephemeral_key() -> str:
    """
    Call the OpenAI Realtime sessions endpoint and return the ephemeral
    ``client_secret.value`` that the frontend needs for WebRTC.
    The key expires in ~60 seconds so it must be used immediately.
        """

    async with aiohttp.ClientSession() as http:
        async with http.post(
            "https://api.openai.com/v1/realtime/client_secrets",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "session": {
                    "type": "realtime",
                    "model": "gpt-realtime",
                    "instructions": _INTERVIEWER_INSTRUCTIONS,
                     "audio": {
                            "input": {
                                "turn_detection": {
                                    "type": "server_vad"
                                },
                                "transcription": {
                                    "model": "gpt-4o-mini-transcribe"
                                }
                            },
                            "output": {
                                "voice": "alloy"
                            }
                        },
                },
            },
        ) as resp:
            data = await resp.json()
            print(data)
        return data["value"]
# ── Interview CRUD ────────────────────────────────────────────────────────────

def create_interview(
    user_id: int,
    role: str | None,
    company: str | None,
    db: Session,
) -> Interview:
    interview = Interview(user_id=user_id, role=role, company=company)
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


def get_interview(interview_id: int, user_id: int, db: Session) -> Interview | None:
    return (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user_id)
        .first()
    )


def list_interviews(user_id: int, db: Session) -> list[Interview]:
    return (
        db.query(Interview)
        .filter(Interview.user_id == user_id)
        .order_by(Interview.created_at.desc())
        .all()
    )


def end_interview(interview_id: int, db: Session) -> Interview:
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if interview and interview.status == "active":
        now = datetime.now(timezone.utc)
        interview.status = "completed"
        interview.ended_at = now
        if interview.started_at:
            delta = now - interview.started_at.replace(tzinfo=timezone.utc) \
                if interview.started_at.tzinfo is None \
                else now - interview.started_at
            interview.duration = max(0, int(delta.total_seconds()))
        db.commit()
        db.refresh(interview)
    return interview


# ── Messages ──────────────────────────────────────────────────────────────────

def save_message(
    interview_id: int,
    speaker: str,
    text: str,
    db: Session,
) -> InterviewMessage:
    msg = InterviewMessage(interview_id=interview_id, speaker=speaker, text=text)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_messages(interview_id: int, db: Session) -> list[InterviewMessage]:
    return (
        db.query(InterviewMessage)
        .filter(InterviewMessage.interview_id == interview_id)
        .order_by(InterviewMessage.created_at)
        .all()
    )


# ── Evaluation ────────────────────────────────────────────────────────────────

def evaluate_interview(interview_id: int, db: Session) -> InterviewEvaluation:
    """
    Build the full transcript, call GPT with the evaluation prompt, and
    persist the structured result to ``interview_evaluations``.
    Also back-fills ``Interview.overall_score`` and ``Interview.feedback``.
    """
    messages = get_messages(interview_id, db)
    interview = db.query(Interview).filter(Interview.id == interview_id).first()

    transcript = "\n".join(
        f"[{m.speaker.upper()}]: {m.text}" for m in messages
    )

    user_prompt = (
        f"Job Role: {interview.role or 'Not specified'}\n"
        f"Company:  {interview.company or 'Not specified'}\n\n"
        f"Transcript:\n{transcript}"
    )

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=settings.OPENAI_API_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _EVALUATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0,
    )

    data = json.loads(response.choices[0].message.content)

    evaluation = InterviewEvaluation(
        interview_id=interview_id,
        communication=data.get("communication"),
        clarity=data.get("clarity"),
        leadership=data.get("leadership"),
        confidence=data.get("confidence"),
        structure=data.get("structure"),
        problem_solving=data.get("problem_solving"),
        star_method=data.get("star_method"),
        overall_score=data.get("overall"),
        strengths=data.get("strengths"),
        weaknesses=data.get("weaknesses"),
        suggestions=data.get("suggestions"),
        improved_answers=data.get("improved_answers"),
    )
    db.add(evaluation)

    # Back-fill overall score on the interview row
    if interview:
        interview.overall_score = data.get("overall")
        top_suggestion = (data.get("suggestions") or [None])[0]
        interview.feedback = top_suggestion

    db.commit()
    db.refresh(evaluation)
    return evaluation
