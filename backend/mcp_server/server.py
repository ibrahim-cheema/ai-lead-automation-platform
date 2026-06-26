"""
Lead Automation MCP Server
==========================
Exposes lead management capabilities as MCP tools.
The AI Agent calls these tools to orchestrate the full lead processing workflow
instead of hardcoding the sequence in the application layer.

Run standalone:
    python backend/mcp_server/server.py

Inspect with MCP Inspector:
    mcp dev backend/mcp_server/server.py
"""
import json
import logging
import os
import sys

# ── CRITICAL: all logging must go to stderr ────────────────────────────────────
# stdout is reserved exclusively for MCP JSON-RPC protocol messages.
# We must patch logger.get_logger() BEFORE importing any backend module so that
# every named logger writes to stderr. ASCII-only format avoids cp1252 issues.

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _BACKEND_DIR)

_LOG_FMT = logging.Formatter(
    fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def _stderr_logger(name: str) -> logging.Logger:
    """Drop-in replacement for logger.get_logger() that always writes to stderr."""
    lg = logging.getLogger(name)
    if not lg.handlers:
        h = logging.StreamHandler(sys.stderr)
        h.setFormatter(_LOG_FMT)
        try:
            h.stream.reconfigure(encoding="utf-8")
        except AttributeError:
            pass   # Python < 3.7 or non-reconfigurable stream
        lg.addHandler(h)
        lg.setLevel(logging.INFO)
        lg.propagate = False
    return lg


import logger as _logger_mod           # noqa: E402 — must come after sys.path patch
_logger_mod.get_logger = _stderr_logger   # patch before any backend import calls it

# ── Backend imports (all loggers will now use stderr) ─────────────────────────
from typing import Optional

from mcp.server.fastmcp import FastMCP
from sqlalchemy import or_

from config import get_settings
from database import Base, SessionLocal, engine
from models import DBFollowup, DBLead
from services.llm_service import LLMService

Base.metadata.create_all(bind=engine)   # ensure tables exist

log      = _stderr_logger("mcp_server")
settings = get_settings()
mcp      = FastMCP("lead_automation_mcp")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _err(msg: str) -> str:
    return f"Error: {msg}"


def _db():
    return SessionLocal()


# ── MCP Tools ─────────────────────────────────────────────────────────────────
# All tools use flat keyword arguments so the MCP client can call them with
# a plain dict: session.call_tool("save_lead", {"name": ..., "company": ...})
# Do NOT use a single Pydantic model as the only param — that forces the caller
# to wrap everything in {"params": {...}}, which breaks agent tool calls.


@mcp.tool(
    name="save_lead",
    title="Save a new lead to the database",
    annotations={"readOnlyHint": False, "idempotentHint": False},
)
def save_lead(
    name: str,
    company: str,
    email: Optional[str] = None,
    role: Optional[str] = None,
    message: Optional[str] = None,
    source: str = "mcp",
) -> str:
    """
    Persist a new lead record. Returns a JSON object with lead_id which MUST be
    passed to save_followup and update_lead_score in subsequent steps.
    """
    db = _db()
    try:
        lead = DBLead(
            name=name.strip(),
            email=email,
            company=company.strip(),
            role=role,
            message=message,
            source=source or "mcp",
            status="New",
            lead_score="Warm",
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        log.info("save_lead: saved lead ID=%s name=%s", lead.id, lead.name)
        return json.dumps({
            "lead_id":    lead.id,
            "name":       lead.name,
            "company":    lead.company,
            "status":     "saved",
            "created_at": str(lead.created_at),
        })
    except Exception as exc:
        db.rollback()
        log.error("save_lead error: %s", exc)
        return _err(f"Failed to save lead: {exc}")
    finally:
        db.close()


@mcp.tool(
    name="generate_followup",
    title="Generate AI-personalised follow-up email and SMS",
    annotations={"readOnlyHint": True, "idempotentHint": True},
)
def generate_followup(
    name: str,
    company: str,
    role: str = "",
    message: str = "",
) -> str:
    """
    Run AI analysis on the lead's inquiry. Returns a JSON object with:
    lead_score (Hot/Warm/Cold), summary, email draft, sms draft.
    Content is personalised to what the lead asked — not a generic reply.
    """
    try:
        result = LLMService.analyze_lead(
            name=name,
            company=company,
            role=role,
            message=message,
        )
        log.info("generate_followup: score=%s for %s @ %s", result.get("lead_score"), name, company)
        return json.dumps({
            "lead_score": result.get("lead_score", "Warm"),
            "summary":    result.get("summary", ""),
            "email":      result.get("email", ""),
            "sms":        result.get("sms", ""),
        })
    except Exception as exc:
        log.error("generate_followup error: %s", exc)
        return _err(f"Failed to generate follow-up: {exc}")


@mcp.tool(
    name="save_followup",
    title="Persist AI-generated follow-up drafts linked to a lead",
    annotations={"readOnlyHint": False, "idempotentHint": False},
)
def save_followup(
    lead_id: int,
    email_content: str,
    sms_content: str,
) -> str:
    """
    Save the AI-generated email and SMS drafts linked to the lead.
    Call AFTER generate_followup. Pass the lead_id from save_lead.
    """
    db = _db()
    try:
        if not db.query(DBLead).filter(DBLead.id == lead_id).first():
            return _err(f"Lead {lead_id} not found. Call save_lead first.")
        followup = DBFollowup(
            lead_id=lead_id,
            email_content=email_content,
            sms_content=sms_content,
        )
        db.add(followup)
        db.commit()
        db.refresh(followup)
        log.info("save_followup: followup ID=%s linked to lead ID=%s", followup.id, lead_id)
        return json.dumps({"followup_id": followup.id, "lead_id": lead_id, "status": "saved"})
    except Exception as exc:
        db.rollback()
        log.error("save_followup error: %s", exc)
        return _err(f"Failed to save follow-up: {exc}")
    finally:
        db.close()


@mcp.tool(
    name="update_lead_score",
    title="Update a lead's AI score and summary",
    annotations={"readOnlyHint": False, "idempotentHint": True},
)
def update_lead_score(lead_id: int, score: str, summary: str) -> str:
    """
    Update the lead's AI-assigned score (Hot/Warm/Cold) and one-line summary.
    Call AFTER generate_followup — use the lead_id from save_lead.
    """
    db = _db()
    try:
        lead = db.query(DBLead).filter(DBLead.id == lead_id).first()
        if not lead:
            return _err(f"Lead {lead_id} not found.")
        lead.lead_score = score
        lead.summary    = summary
        db.commit()
        log.info("update_lead_score: lead %s score=%s", lead_id, score)
        return json.dumps({"lead_id": lead_id, "lead_score": score, "summary": summary})
    except Exception as exc:
        db.rollback()
        return _err(str(exc))
    finally:
        db.close()


@mcp.tool(
    name="get_lead",
    title="Get full lead details by ID",
    annotations={"readOnlyHint": True, "idempotentHint": True},
)
def get_lead(lead_id: int) -> str:
    """Retrieve full details of a lead including its follow-up drafts."""
    db = _db()
    try:
        lead = db.query(DBLead).filter(DBLead.id == lead_id).first()
        if not lead:
            return _err(f"Lead {lead_id} not found.")
        followup = lead.followups[0] if lead.followups else None
        return json.dumps({
            "id":          lead.id,
            "name":        lead.name,
            "email":       lead.email,
            "company":     lead.company,
            "role":        lead.role,
            "message":     lead.message,
            "status":      lead.status,
            "lead_score":  lead.lead_score,
            "summary":     lead.summary,
            "created_at":  str(lead.created_at),
            "email_draft": followup.email_content if followup else None,
            "sms_draft":   followup.sms_content   if followup else None,
        })
    except Exception as exc:
        return _err(str(exc))
    finally:
        db.close()


@mcp.tool(
    name="list_leads",
    title="List leads with optional filters",
    annotations={"readOnlyHint": True, "idempotentHint": True},
)
def list_leads(
    score:  Optional[str] = None,
    status: Optional[str] = None,
    limit:  int = 20,
) -> str:
    """Return a formatted table of leads, optionally filtered by score or status."""
    db = _db()
    try:
        q = db.query(DBLead)
        if score:
            q = q.filter(DBLead.lead_score == score)
        if status:
            q = q.filter(DBLead.status == status)
        leads = q.order_by(DBLead.created_at.desc()).limit(limit).all()
        if not leads:
            return "No leads found."
        header = f"{'ID':<5} {'Name':<20} {'Company':<20} {'Score':<6} {'Status':<12} Created"
        sep    = "-" * 80
        rows   = [header, sep] + [
            f"{l.id:<5} {(l.name or ''):<20} {(l.company or ''):<20} "
            f"{(l.lead_score or ''):<6} {(l.status or ''):<12} {str(l.created_at)[:16]}"
            for l in leads
        ]
        return "\n".join(rows)
    except Exception as exc:
        return _err(str(exc))
    finally:
        db.close()


@mcp.tool(
    name="search_leads",
    title="Search leads by name, company, or email",
    annotations={"readOnlyHint": True, "idempotentHint": True},
)
def search_leads(query: str, limit: int = 10) -> str:
    """Full-text search across lead name, company, and email fields."""
    db = _db()
    try:
        term  = f"%{query}%"
        leads = (
            db.query(DBLead)
            .filter(or_(
                DBLead.name.ilike(term),
                DBLead.company.ilike(term),
                DBLead.email.ilike(term),
            ))
            .order_by(DBLead.created_at.desc())
            .limit(limit)
            .all()
        )
        if not leads:
            return f"No leads found matching '{query}'."
        return "\n".join(
            f"ID={l.id} | {l.name} @ {l.company} | {l.lead_score} | {l.status}"
            for l in leads
        )
    except Exception as exc:
        return _err(str(exc))
    finally:
        db.close()


@mcp.tool(
    name="update_lead_status",
    title="Move a lead through the sales pipeline",
    annotations={"readOnlyHint": False, "idempotentHint": True},
)
def update_lead_status(lead_id: int, status: str) -> str:
    """
    Update a lead's pipeline status.
    Valid values: New | Contacted | Qualified | Closed
    """
    valid = {"New", "Contacted", "Qualified", "Closed"}
    if status not in valid:
        return _err(f"'{status}' is not a valid status. Use: {sorted(valid)}")
    db = _db()
    try:
        lead = db.query(DBLead).filter(DBLead.id == lead_id).first()
        if not lead:
            return _err(f"Lead {lead_id} not found.")
        old         = lead.status
        lead.status = status
        db.commit()
        log.info("update_lead_status: lead %s: %s -> %s", lead_id, old, status)
        return json.dumps({"lead_id": lead_id, "old_status": old, "new_status": status})
    except Exception as exc:
        db.rollback()
        return _err(str(exc))
    finally:
        db.close()


@mcp.tool(
    name="get_company_context",
    title="Get business services context for personalisation",
    annotations={"readOnlyHint": True, "idempotentHint": True},
)
def get_company_context(company_name: str) -> str:
    """
    Return the host business's services and identity so the agent can
    personalise follow-ups based on what the business actually offers.
    company_name is the LEAD's company (for context), not the host business.
    """
    return json.dumps({
        "our_business":  settings.business_name,
        "our_services":  settings.business_services,
        "our_tagline":   settings.business_tagline,
        "contact_name":  settings.business_contact_name,
        "contact_email": settings.business_contact_email,
        "lead_company":  company_name,
        "note": (
            f"Write the follow-up as {settings.business_name} responding to "
            f"{company_name}. Reference our services: {settings.business_services}."
        ),
    })


# ── Entrypoint ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info("Lead Automation MCP Server starting (stdio transport)...")
    mcp.run()
