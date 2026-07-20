from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse
from langchain_openai import ChatOpenAI

from chains.ats_chain import ATSResponse, analyze_resume
from chains.format_chain import format_resume_chain
from chains.rewrite_chain import rewrite_resume_chain
from chains.skills_chain import ResumeSkillExtractionResponse, extract_skills_from_resume_chain
from dependencies import get_llm
from schemas import ATSAnalyzeRequest, ATSAnalyzeResponse, ResumeRewriteRequest, ResumeUploadResponse
from services.pdf_parser import extract_text_from_pdf
from services.resume_extractor import clean_resume_text

router = APIRouter()


@router.post("/api/resume/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    llm: ChatOpenAI = Depends(get_llm),
):
    if file is None:
        raise HTTPException(status_code=400, detail="Missing file. Please upload a PDF resume.")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name.")

    is_pdf_filename = file.filename.lower().endswith(".pdf")
    is_pdf_content_type = file.content_type == "application/pdf"

    if not is_pdf_filename and not is_pdf_content_type:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF file.")

    try:
        pdf_bytes = await file.read()
        raw_text = extract_text_from_pdf(pdf_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF parsing failed: {exc}") from exc

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="PDF parsing failed: no text could be extracted from the file.",
        )

    try:
        cleaned_resume = clean_resume_text(raw_text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Resume extraction failed: {exc}") from exc

    if not cleaned_resume:
        raise HTTPException(
            status_code=422,
            detail="Resume extraction failed: cleaned resume text is empty.",
        )

    try:
        skills_chain = extract_skills_from_resume_chain(cleaned_resume, llm)
        skills_result = skills_chain.invoke({"resume_text": cleaned_resume})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Skills extraction failed: {exc}") from exc

    if isinstance(skills_result, ResumeSkillExtractionResponse):
        skills_payload = skills_result.model_dump()
    else:
        skills_payload = ResumeSkillExtractionResponse.model_validate(skills_result).model_dump()

    skills_list = skills_payload.get("skills_flat_list", [])
    request.state.session["cleaned_resume"] = cleaned_resume
    request.state.session["skills"] = skills_list

    return ResumeUploadResponse(
        message="Resume uploaded successfully",
        filename=file.filename,
        raw_text=raw_text,
        cleaned_resume=cleaned_resume,
        skills=skills_list,
    )


@router.post("/resume-analyze", response_model=ATSAnalyzeResponse)
def resume_analyze(
    request: Request,
    payload: ATSAnalyzeRequest,
    llm: ChatOpenAI = Depends(get_llm),
):
    if not payload.cleaned_text.strip():
        raise HTTPException(status_code=400, detail="cleaned_text is required.")

    try:
        result = analyze_resume(payload.cleaned_text, llm)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ATS analysis failed: {exc}") from exc

    if isinstance(result, ATSResponse):
        analysis = result
    else:
        analysis = ATSResponse.model_validate(result)

    request.state.session["ats_analysis"] = analysis.model_dump()

    return ATSAnalyzeResponse(
        success=True,
        ats_score=analysis.ats_score,
        strengths=analysis.strengths,
        weaknesses=analysis.weaknesses,
        missing_keywords=analysis.missing_keywords,
    )


@router.post("/resume-rewrite")
def resume_rewrite(
    request: Request,
    payload: ResumeRewriteRequest,
    llm: ChatOpenAI = Depends(get_llm),
):
    session = request.state.session

    cleaned_resume = payload.cleaned_resume or session.get("cleaned_resume")
    skills = payload.skills or session.get("skills")
    ats_analysis = payload.ats_analysis or session.get("ats_analysis")

    if not cleaned_resume:
        raise HTTPException(status_code=400, detail="cleaned_resume is missing from session.")
    if not skills:
        raise HTTPException(status_code=400, detail="skills are missing from session.")
    if not ats_analysis:
        raise HTTPException(status_code=400, detail="ats_analysis is missing from session.")

    rewritten_resume = rewrite_resume_chain(
        cleaned_resume,
        ats_analysis,
        skills,
        payload.job_role,
        payload.job_description,
        llm,
    )

    html_output = format_resume_chain(rewritten_resume, llm)
    request.state.session["rewritten_resume"] = (
        rewritten_resume.model_dump()
        if hasattr(rewritten_resume, "model_dump")
        else rewritten_resume
    )
    return HTMLResponse(content=html_output, media_type="text/html")
