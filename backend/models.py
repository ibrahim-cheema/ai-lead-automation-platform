from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


# ── Enums ──────────────────────────────────────────────────────────────────────

class LeadScore(str, Enum):
    hot  = "Hot"
    warm = "Warm"
    cold = "Cold"


class LeadStatus(str, Enum):
    new       = "New"
    contacted = "Contacted"
    qualified = "Qualified"
    closed    = "Closed"


# ── SQLAlchemy ORM Models ──────────────────────────────────────────────────────

class DBLead(Base):
    __tablename__ = "leads"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False)
    email      = Column(String(254), nullable=True)
    company    = Column(String(200), nullable=False)
    role       = Column(String(100), nullable=True)
    message    = Column(Text, nullable=True)
    source     = Column(String(50), default="website")
    status     = Column(String(20), default="New")
    lead_score = Column(String(10), default="Warm")
    summary    = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    followups = relationship("DBFollowup", back_populates="lead", cascade="all, delete-orphan")


class DBFollowup(Base):
    __tablename__ = "followups"

    id           = Column(Integer, primary_key=True, index=True)
    lead_id      = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    email_content = Column(Text, nullable=False)
    sms_content  = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("DBLead", back_populates="followups")


# ── Pydantic Request Schemas ───────────────────────────────────────────────────

class LeadRequest(BaseModel):
    """Validated input for creating or processing a new lead."""

    name:    str           = Field(..., min_length=1, max_length=100,  description="Full name of the lead")
    email:   Optional[EmailStr] = Field(None,                          description="Contact email address")
    company: str           = Field(..., min_length=1, max_length=200,  description="Company or organisation name")
    role:    Optional[str] = Field(None, max_length=100,               description="Job title or role")
    message: Optional[str] = Field(None, max_length=2000,             description="Inquiry or requirement message")
    source:  Optional[str] = Field("api", max_length=50,              description="Lead acquisition source")

    @field_validator("name", "company", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class StatusUpdateRequest(BaseModel):
    """Validated input for updating a lead's pipeline status."""

    status: LeadStatus = Field(..., description="New status value for the lead")


# ── Pydantic Response Schemas ──────────────────────────────────────────────────

class FollowupResponse(BaseModel):
    id:            int
    lead_id:       int
    email_content: str
    sms_content:   str
    generated_at:  datetime

    model_config = ConfigDict(from_attributes=True)


class LeadResponse(BaseModel):
    id:         int
    name:       str
    email:      Optional[str]
    company:    str
    role:       Optional[str]
    message:    Optional[str]
    source:     str
    status:     str
    lead_score: Optional[str]
    summary:    Optional[str]
    created_at: datetime
    followups:  List[FollowupResponse] = []

    model_config = ConfigDict(from_attributes=True)


class GenerateFollowupResponse(BaseModel):
    status:     str
    lead_score: str
    summary:    str
    follow_up:  dict
