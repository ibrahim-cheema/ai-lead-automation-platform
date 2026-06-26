"""
Batch Follow-up Generator
=========================
Generates AI follow-up email + SMS for every lead that has no followup yet.
Run from the backend directory:
    python ../scripts/generate_followups.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
os.environ.setdefault("AI_PROVIDER", "mock")

from database import Base, SessionLocal, engine
from models import DBLead, DBFollowup
from services.llm_service import LLMService

Base.metadata.create_all(bind=engine)

def run():
    db = SessionLocal()
    leads = db.query(DBLead).filter(~DBLead.followups.any()).all()
    print(f"Found {len(leads)} leads without follow-ups. Generating...")

    done = 0
    for lead in leads:
        try:
            result = LLMService.analyze_lead(
                name=lead.name or "",
                company=lead.company or "",
                role=lead.role or "",
                message=lead.message or "",
            )
            followup = DBFollowup(
                lead_id=lead.id,
                email_content=result["email"],
                sms_content=result["sms"],
            )
            lead.lead_score = result["lead_score"]
            lead.summary    = result["summary"]
            db.add(followup)
            done += 1
            if done % 10 == 0:
                db.commit()
                print(f"  {done}/{len(leads)} done...")
        except Exception as exc:
            print(f"  ERROR on lead {lead.id} ({lead.name}): {exc}")

    db.commit()
    db.close()
    print(f"Done. Follow-ups generated for {done}/{len(leads)} leads.")

if __name__ == "__main__":
    run()
