from sqlalchemy.orm import Session

from logger import get_logger
from models import DBFollowup, DBLead, LeadRequest
from services.llm_service import LLMService

log = get_logger(__name__)


def process_lead(lead: LeadRequest, db: Session) -> DBLead:
    """
    Process an incoming lead through the full pipeline:
    1. Run AI analysis (scoring, summary, email draft, SMS draft)
    2. Persist the Lead record
    3. Persist the linked Followup record
    4. Return the saved DBLead with its followups loaded
    """
    log.info(
        "Processing lead — name=%s company=%s source=%s",
        lead.name, lead.company, lead.source,
    )

    ai_results = LLMService.analyze_lead(
        name=lead.name,
        company=lead.company,
        role=lead.role or "",
        message=lead.message or "",
    )

    log.info(
        "AI result — score=%s summary=%s",
        ai_results.get("lead_score"), ai_results.get("summary", "")[:80],
    )

    db_lead = DBLead(
        name=lead.name,
        email=str(lead.email) if lead.email else None,
        company=lead.company,
        role=lead.role,
        message=lead.message,
        source=lead.source or "api",
        status="New",
        lead_score=ai_results.get("lead_score", "Warm"),
        summary=ai_results.get("summary", ""),
    )
    db.add(db_lead)
    db.flush()

    db_followup = DBFollowup(
        lead_id=db_lead.id,
        email_content=ai_results.get("email", ""),
        sms_content=ai_results.get("sms", ""),
    )
    db.add(db_followup)
    db.commit()
    db.refresh(db_lead)

    log.info("Lead saved — id=%s score=%s", db_lead.id, db_lead.lead_score)
    return db_lead
