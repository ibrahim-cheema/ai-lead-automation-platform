import asyncio
import csv
import io
from typing import List, Optional

import openpyxl

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
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

# ── CSV column detection ──────────────────────────────────────────────────────

_COLUMN_ALIASES: dict[str, list[str]] = {
    "name":       ["name", "full_name", "fullname", "contact", "contact_name", "customer"],
    "first_name": ["first_name", "firstname", "first"],
    "last_name":  ["last_name", "lastname", "last", "surname"],
    "email":      ["email", "email_address", "e_mail", "mail"],
    "company":    ["company", "organization", "organisation", "org", "company_name", "business", "account"],
    "role":       ["role", "title", "job_title", "position", "designation", "job"],
    "message":    ["message", "notes", "note", "description", "requirements", "inquiry", "enquiry", "details"],
    "source":     ["source", "lead_source", "channel", "origin"],
}

def _norm(s: str) -> str:
    return s.strip().lower().replace(" ", "_").replace("-", "_")

def _detect_columns(headers: list[str]) -> dict[str, str]:
    col_map: dict[str, str] = {}
    for h in headers:
        key = _norm(h)
        for field, aliases in _COLUMN_ALIASES.items():
            if field not in col_map and key in aliases:
                col_map[field] = h
                break
    return col_map

def _get_col(row: dict, col_map: dict[str, str], field: str, default: str = "") -> str:
    header = col_map.get(field)
    return str(row[header]).strip() if header and header in row else default


def _parse_xlsx(raw: bytes) -> tuple[list[str], list[dict]]:
    wb   = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
    ws   = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return [], []
    headers = [str(c).strip() if c is not None else "" for c in rows[0]]
    data    = [
        {headers[i]: str(cell).strip() if cell is not None else ""
         for i, cell in enumerate(row) if i < len(headers)}
        for row in rows[1:]
    ]
    return headers, data


def _parse_csv(raw: bytes) -> tuple[list[str], list[dict]]:
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    reader  = csv.DictReader(io.StringIO(text))
    headers = list(reader.fieldnames or [])
    data    = list(reader)
    return headers, data

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


# ── POST /api/v1/leads/import-csv ─────────────────────────────────────────────

@router.post(
    "/leads/import-csv",
    summary="Bulk-import leads from an uploaded CSV or Excel (.xlsx) file",
)
async def import_csv_leads(
    file: UploadFile = File(...),
    default_source: str = Query("csv_import", description="Fallback source tag when file has no source column"),
    db: Session = Depends(get_db),
):
    fname = (file.filename or "").lower()
    if not (fname.endswith(".csv") or fname.endswith(".xlsx")):
        raise HTTPException(status_code=400, detail="Only .csv and .xlsx files are accepted.")

    raw = await file.read()

    if fname.endswith(".xlsx"):
        headers, rows = _parse_xlsx(raw)
    else:
        headers, rows = _parse_csv(raw)

    col_map = _detect_columns(headers)

    if "name" not in col_map and "first_name" not in col_map and "last_name" not in col_map:
        raise HTTPException(
            status_code=422,
            detail=f"Could not detect a Name column in: {headers}",
        )

    imported, skipped = 0, 0
    errors: list[dict] = []

    for row_num, row in enumerate(rows, start=2):
        try:
            name = _get_col(row, col_map, "name")
            if not name:
                first = _get_col(row, col_map, "first_name")
                last  = _get_col(row, col_map, "last_name")
                name  = f"{first} {last}".strip()
            if not name:
                skipped += 1
                continue

            req = LeadRequest(
                name    = name,
                email   = _get_col(row, col_map, "email") or None,
                company = _get_col(row, col_map, "company"),
                role    = _get_col(row, col_map, "role"),
                message = _get_col(row, col_map, "message"),
                source  = _get_col(row, col_map, "source") or default_source,
            )
            process_lead(req, db)
            imported += 1
        except Exception as exc:
            errors.append({"row": row_num, "error": str(exc)})
            if len(errors) >= 20:
                break

    log.info("File import: %d imported, %d skipped, %d errors", imported, skipped, len(errors))
    return {
        "imported":          imported,
        "skipped":           skipped,
        "errors":            errors,
        "detected_columns":  col_map,
    }


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
