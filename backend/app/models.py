import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Enum, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class SeverityEnum(str, enum.Enum):
    critical = "Critical"
    major = "Major"
    minor = "Minor"


class PriorityEnum(str, enum.Enum):
    urgent = "Urgent"
    high = "High"
    normal = "Normal"
    low = "Low"


class StatusEnum(str, enum.Enum):
    pending_triage = "Pending Triage"
    under_investigation = "Under Investigation"
    capa_assigned = "CAPA Assigned"
    closed = "Closed"


class Complaint(Base):
    """
    Maps 1:1 to the four sections of the 'Log Customer Complaint' form:
    1. Origin & Customer Details
    2. Product & Batch Identification
    3. Complaint Details
    4. Initial Assessment & Priority
    """

    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=gen_uuid)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(Enum(StatusEnum), default=StatusEnum.pending_triage)

    # 1. Origin & Customer Details
    complaint_source = Column(String)   # Email / Phone / Portal / Field Rep ...
    customer_name = Column(String)

    # 2. Product & Batch Identification
    product_name = Column(String)
    product_strength_grade = Column(String)
    batch_lot_number = Column(String)
    manufacturing_date = Column(String)
    expiry_date = Column(String)
    quantity_affected = Column(String)
    quantity_unit = Column(String, default="kg")

    # 3. Complaint Details
    complaint_type = Column(String)     # e.g. Discoloration, Contamination, Packaging defect...
    complaint_date = Column(String)
    detailed_description = Column(Text)

    # 4. Initial Assessment & Priority
    initial_severity = Column(Enum(SeverityEnum), nullable=True)
    priority = Column(Enum(PriorityEnum), nullable=True)

    # Raw source text that was fed to the AI (kept for audit trail per QMS practice)
    source_document_text = Column(Text, nullable=True)
    source_document_name = Column(String, nullable=True)

    # AI-derived fields (bonus features), stored as JSON so the schema stays flexible
    ai_analysis = Column(JSON, nullable=True)
    # shape: {
    #   "risk_classification": {"level": "High", "rationale": "..."},
    #   "completeness": {"score": 0.8, "missing_fields": [...]},
    #   "root_cause_suggestions": [...],
    #   "capa_suggestions": [...],
    #   "duplicate_matches": [{"complaint_id": "...", "similarity": 0.87, "reason": "..."}],
    #   "summary": "..."
    # }

    extraction_confidence = Column(Float, nullable=True)

    chat_messages = relationship(
        "ChatMessage", back_populates="complaint", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    """Turn-by-turn history for the 'Ask me anything about this complaint' copilot."""

    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    complaint_id = Column(String, ForeignKey("complaints.id"), nullable=True)
    role = Column(String)  # "user" | "assistant"
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="chat_messages")
