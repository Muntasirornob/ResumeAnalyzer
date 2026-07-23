from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.auth_handler import get_current_active_user
from database import get_db
from models import JobApplication, User
from schemas import JobApplicationCreate, JobApplicationResponse, JobApplicationUpdate

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _owned_or_404(job_id: int, user_id: int, db: Session) -> JobApplication:
    """Fetch a job application that belongs to the current user or raise 404."""
    job = (
        db.query(JobApplication)
        .filter(JobApplication.id == job_id, JobApplication.user_id == user_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job application not found.")
    return job


@router.post("", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_job_application(
    payload: JobApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    job = JobApplication(user_id=current_user.id, **payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=list[JobApplicationResponse])
def list_job_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return (
        db.query(JobApplication)
        .filter(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.created_at.desc())
        .all()
    )


@router.get("/{job_id}", response_model=JobApplicationResponse)
def get_job_application(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return _owned_or_404(job_id, current_user.id, db)


@router.patch("/{job_id}", response_model=JobApplicationResponse)
def update_job_application(
    job_id: int,
    payload: JobApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    job = _owned_or_404(job_id, current_user.id, db)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)

    job.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_application(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    job = _owned_or_404(job_id, current_user.id, db)
    db.delete(job)
    db.commit()
