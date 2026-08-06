from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.ai.workflow import run_intake_pipeline
from app.ai.doc_parser import extract_text_from_bytes
from app.ai.groq_client import call_groq_text
from app.ai import prompts
from app.config import settings

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _existing_complaints_context(db: Session):
    rows = (
        db.query(models.Complaint)
        .order_by(models.Complaint.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id,
            "product_name": r.product_name,
            "batch_lot_number": r.batch_lot_number,
            "complaint_type": r.complaint_type,
            "detailed_description": (r.detailed_description or "")[:200],
        }
        for r in rows
    ]


def _pipeline_result_to_response(result: dict) -> schemas.ExtractResponse:
    fields = schemas.ComplaintBase(**result["extracted_fields"])
    ai_analysis = {
        "risk_classification": result.get("risk_classification"),
        "completeness": result.get("completeness"),
        "root_cause_suggestions": result.get("root_cause"),
        "capa_suggestions": result.get("capa"),
        "duplicate_matches": result.get("duplicate_matches"),
        "summary": result.get("summary"),
        "fields_found": result.get("fields_found"),
    }
    return schemas.ExtractResponse(
        fields=fields,
        confidence=result.get("extraction_confidence", 0.5),
        ai_analysis=ai_analysis,
    )


@router.post("/extract/text", response_model=schemas.ExtractResponse)
def extract_from_text(payload: schemas.ExtractRequest, db: Session = Depends(get_db)):
    if not payload.text or not payload.text.strip():
        raise HTTPException(400, "No text supplied")
    result = run_intake_pipeline(
        source_text=payload.text,
        existing_complaints=_existing_complaints_context(db),
    )
    return _pipeline_result_to_response(result)


@router.post("/extract/file", response_model=schemas.ExtractResponse)
async def extract_from_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 10MB limit")
    text = extract_text_from_bytes(file.filename, content)
    if not text.strip():
        raise HTTPException(422, "Could not extract any text from this document")
    result = run_intake_pipeline(
        source_text=text,
        existing_complaints=_existing_complaints_context(db),
    )
    response = _pipeline_result_to_response(result)
    return response


@router.post("/chat", response_model=schemas.ChatResponse)
def chat(payload: schemas.ChatRequest, db: Session = Depends(get_db)):
    context_parts = []

    if payload.complaint_id:
        complaint = db.query(models.Complaint).get(payload.complaint_id)
        if complaint:
            context_parts.append(f"SAVED COMPLAINT RECORD:\n{schemas.ComplaintOut.model_validate(complaint).model_dump()}")
            db.add(models.ChatMessage(complaint_id=complaint.id, role="user", content=payload.message))

    if payload.form_snapshot:
        context_parts.append(f"CURRENT UNSAVED FORM STATE:\n{payload.form_snapshot}")

    context = "\n\n".join(context_parts) if context_parts else "No complaint context available yet."

    reply = call_groq_text(
        system_prompt=prompts.CHAT_SYSTEM_PROMPT,
        user_prompt=f"CONTEXT:\n{context}\n\nUSER QUESTION:\n{payload.message}",
        model=settings.groq_reasoning_model,
    )

    if payload.complaint_id:
        db.add(models.ChatMessage(complaint_id=payload.complaint_id, role="assistant", content=reply))
        db.commit()

    return schemas.ChatResponse(reply=reply)
