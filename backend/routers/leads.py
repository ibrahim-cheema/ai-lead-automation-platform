import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from logger import get_logger
from models import (
    DBLead, GenerateFollowupResponse, LeadRequest,
    LeadResponse, LeadStatus, StatusUpdateRequest,
)
from services.lead_processor import process_lead

log    = get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["leads"])

VALID_SCORES   = {"Hot", "Warm", "Cold"}
VALID_STATUSES = {s.value for s in LeadStatus}


# ── POST /api/v1/followup ─────────────────────────────────────────────────────

@router.post(
    "/followup",
    response_model=GenerateFollowupResponse,
    summary="Generate AI follow-up draft",
)
def generate_followup_endpoint(lead: LeadRequest, db: Session = Depends(get_db)):
    """Process a lead and return the AI-generated follow-up draft."""
    log.info("POST /api/v1/followup — %s <%s>", lead.name, lead.email)
    db_lead  = process_lead(lead, db)
    followup = db_lead.followups[0] if db_lead.followups else None
    return {
        "status":     "success",
        "lead_score": db_lead.lead_score,
        "summary":    db_lead.summary or "",
        "follow_up":  {
            "email": followup.email_content if followup else "",
            "sms":   followup.sms_content   if followup else "",
        },
    }


# ── POST /api/v1/leads ─────────────────────────────────────────────────────────

@router.post(
    "/leads",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new lead — processed by the AI Agent via MCP",
)
def create_lead(lead: LeadRequest, db: Session = Depends(get_db)):
    """
    Primary entry point for lead submission.

    Flow:
        1. AI Agent receives the lead
        2. Agent orchestrates via MCP Server tools:
              save_lead → get_company_context → generate_followup → save_followup → update_lead_score
        3. Route fetches the fully processed record from DB and returns it

    Falls back to direct processing if the agent is unavailable.
    """
    log.info("POST /api/v1/leads — %s @ %s (via AI Agent)", lead.name, lead.company)

    # Import agent lazily to avoid import-time side-effects
    from agent.lead_agent import run_lead_agent

    try:
        result  = asyncio.run(run_lead_agent(lead.model_dump(mode="json")))
        lead_id = result.get("lead_id")

        if lead_id:
            db_lead = db.query(DBLead).filter(DBLead.id == lead_id).first()
            if db_lead:
                log.info("Agent processed lead ID=%s score=%s", lead_id, db_lead.lead_score)
                return db_lead

        log.warning("Agent returned no lead_id — falling back to direct processing")
    except Exception as exc:
        log.error("Agent failed (%s) — falling back to direct processing", exc)

    # Fallback: bypass agent, process directly
    return process_lead(lead, db)


# ── GET /api/v1/leads ──────────────────────────────────────────────────────────

@router.get(
    "/leads",
    response_model=List[LeadResponse],
    summary="List all leads with optional search and filters",
)
def list_leads(
    search: Optional[str] = Query(None, description="Search by name, company, or email"),
    score:  Optional[str] = Query(None, description="Filter by lead score: Hot | Warm | Cold"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit:  int = Query(100, ge=1, le=500),
    offset: int = Query(0,   ge=0),
    db: Session = Depends(get_db),
):
    if score and score not in VALID_SCORES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid score '{score}'. Must be one of: {sorted(VALID_SCORES)}",
        )
    if status_filter and status_filter not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{status_filter}'. Must be one of: {sorted(VALID_STATUSES)}",
        )

    query = db.query(DBLead)
    if search:
        term  = f"%{search}%"
        query = query.filter(or_(
            DBLead.name.ilike(term),
            DBLead.company.ilike(term),
            DBLead.email.ilike(term),
        ))
    if score:
        query = query.filter(DBLead.lead_score == score)
    if status_filter:
        query = query.filter(DBLead.status == status_filter)

    leads = query.order_by(DBLead.created_at.desc()).offset(offset).limit(limit).all()
    log.info("GET /api/v1/leads — %d results (search=%s score=%s status=%s)", len(leads), search, score, status_filter)
    return leads


# ── GET /api/v1/leads/{id} ────────────────────────────────────────────────────

@router.get("/leads/{lead_id}", response_model=LeadResponse, summary="Get a single lead by ID")
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    db_lead = db.query(DBLead).filter(DBLead.id == lead_id).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found.")
    return db_lead


# ── PATCH /api/v1/leads/{id}/status ──────────────────────────────────────────

@router.patch(
    "/leads/{lead_id}/status",
    response_model=LeadResponse,
    summary="Update a lead's pipeline status",
)
def update_lead_status(lead_id: int, payload: StatusUpdateRequest, db: Session = Depends(get_db)):
    db_lead = db.query(DBLead).filter(DBLead.id == lead_id).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found.")
    old_status     = db_lead.status
    db_lead.status = payload.status.value
    db.commit()
    db.refresh(db_lead)
    log.info("Lead %s status: %s → %s", lead_id, old_status, db_lead.status)
    return db_lead


# ── DELETE /api/v1/leads/{id} ─────────────────────────────────────────────────

@router.delete("/leads/{lead_id}", status_code=status.HTTP_200_OK, summary="Delete a lead")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    db_lead = db.query(DBLead).filter(DBLead.id == lead_id).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found.")
    db.delete(db_lead)
    db.commit()
    log.info("Lead %s deleted.", lead_id)
    return {"status": "success", "message": f"Lead {lead_id} deleted."}
