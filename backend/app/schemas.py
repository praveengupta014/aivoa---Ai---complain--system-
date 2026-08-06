from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ComplaintBase(BaseModel):
    complaint_source: Optional[str] = None
    customer_name: Optional[str] = None

    product_name: Optional[str] = None
    product_strength_grade: Optional[str] = None
    batch_lot_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity_affected: Optional[str] = None
    quantity_unit: Optional[str] = "kg"

    complaint_type: Optional[str] = None
    complaint_date: Optional[str] = None
    detailed_description: Optional[str] = None

    initial_severity: Optional[str] = None
    priority: Optional[str] = None


class ComplaintCreate(ComplaintBase):
    source_document_text: Optional[str] = None
    source_document_name: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    extraction_confidence: Optional[float] = None


class ComplaintUpdate(ComplaintBase):
    status: Optional[str] = None


class ComplaintOut(ComplaintBase):
    id: str
    status: str
    ai_analysis: Optional[Dict[str, Any]] = None
    extraction_confidence: Optional[float] = None
    source_document_name: Optional[str] = None

    class Config:
        from_attributes = True


class ExtractRequest(BaseModel):
    text: str
    document_name: Optional[str] = None


class ExtractResponse(BaseModel):
    fields: ComplaintBase
    confidence: float
    ai_analysis: Dict[str, Any]


class ChatRequest(BaseModel):
    message: str
    complaint_id: Optional[str] = None
    # current form state, so the copilot can answer questions like
    # "what's the risk level?" even before the record is saved
    form_snapshot: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str
