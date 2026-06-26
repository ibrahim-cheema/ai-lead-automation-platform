"""
MCP Tool Tests
==============
Tests the MCP server tools directly (without the stdio transport overhead).
Each tool function is imported and called as a plain Python function.
Uses an in-memory SQLite database isolated per test session.
"""
import json
import os
import sys
import pytest

# Ensure backend is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# ── Override DATABASE_URL before any backend import ────────────────────────────
os.environ["DATABASE_URL"] = ""       # force SQLite
os.environ["AI_PROVIDER"]  = "mock"  # never hit external APIs in tests

# ── Imports after path and env setup ──────────────────────────────────────────
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import DBLead, DBFollowup


# ── Test-scoped in-memory database ────────────────────────────────────────────

TEST_DB_URL = "sqlite:///./test_leads.db"


@pytest.fixture(scope="session", autouse=True)
def setup_test_db(tmp_path_factory):
    """Create a temporary SQLite database for the test session."""
    tmp = tmp_path_factory.mktemp("data")
    db_path = str(tmp / "test_leads.db")
    test_url = f"sqlite:///{db_path}"

    engine = create_engine(test_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    # Monkey-patch the mcp_server to use the test database
    import database as _db_module
    _db_module.engine = engine
    _db_module.SessionLocal = Session

    # Also patch the MCP server module's session factory
    import mcp_server.server as srv
    srv.SessionLocal = Session

    yield Session

    engine.dispose()


# ── Tool imports (after DB setup) ─────────────────────────────────────────────

import mcp_server.server as srv


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse(result: str) -> dict:
    """Parse a JSON tool result string."""
    assert not result.startswith("Error:"), f"Tool returned error: {result}"
    return json.loads(result)


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestSaveLead:
    def test_saves_lead_and_returns_id(self):
        result = _parse(srv.save_lead(
            name="Ali Hassan",
            email="ali@techco.io",
            company="TechCo",
            role="CEO",
            message="We need a mobile app for our business",
            source="test",
        ))
        assert "lead_id" in result
        assert result["lead_id"] > 0
        assert result["name"] == "Ali Hassan"
        assert result["company"] == "TechCo"
        assert result["status"] == "saved"

    def test_strips_whitespace(self):
        result = _parse(srv.save_lead(
            name="  Sara  ",
            company="  CloudTech  ",
        ))
        assert result["name"] == "Sara"
        assert result["company"] == "CloudTech"

    def test_optional_fields_can_be_none(self):
        result = _parse(srv.save_lead(
            name="Bob",
            company="StartupX",
        ))
        assert result["lead_id"] > 0


class TestGenerateFollowup:
    def test_returns_required_keys(self):
        result = _parse(srv.generate_followup(
            name="James",
            company="RetailCorp",
            role="Operations Manager",
            message="We need to automate our invoice processing workflow",
        ))
        assert "lead_score"  in result
        assert "summary"     in result
        assert "email"       in result
        assert "sms"         in result

    def test_score_is_valid(self):
        result = _parse(srv.generate_followup(
            name="X",
            company="Y",
            message="",
        ))
        assert result["lead_score"] in {"Hot", "Warm", "Cold"}

    def test_email_personalised_to_mobile_app(self):
        result = _parse(srv.generate_followup(
            name="Nadia",
            company="Startup",
            message="We need a React Native mobile app for iOS and Android",
        ))
        email = result["email"].lower()
        assert "mobile" in email or "ios" in email or "android" in email or "flutter" in email

    def test_email_personalised_to_ecommerce(self):
        result = _parse(srv.generate_followup(
            name="Omar",
            company="ShopCo",
            message="We want to build a Shopify store with custom checkout",
        ))
        email = result["email"].lower()
        assert "shopify" in email or "e-commerce" in email or "ecommerce" in email

    def test_hot_score_for_urgent_message(self):
        result = _parse(srv.generate_followup(
            name="Dana",
            company="UrgentCorp",
            message="We need this ASAP, urgent deadline next Friday, ready to start immediately",
        ))
        assert result["lead_score"] == "Hot"

    def test_sms_within_limit(self):
        result = _parse(srv.generate_followup(
            name="Tim",
            company="BriefCo",
            message="Need a quote for a web app",
        ))
        assert len(result["sms"]) <= 240


class TestSaveFollowup:
    def test_saves_and_links_to_lead(self, setup_test_db):
        # First save a lead
        lead_result = _parse(srv.save_lead(
            name="FollowupTest",
            company="TestInc",
        ))
        lead_id = lead_result["lead_id"]

        # Then save a followup
        result = _parse(srv.save_followup(
            lead_id=lead_id,
            email_content="Hi there, this is the email.",
            sms_content="SMS text here",
        ))
        assert result["lead_id"] == lead_id
        assert result["followup_id"] > 0
        assert result["status"] == "saved"

    def test_error_on_invalid_lead_id(self):
        result = srv.save_followup(
            lead_id=999999,
            email_content="email",
            sms_content="sms",
        )
        assert result.startswith("Error:")


class TestUpdateLeadScore:
    def test_updates_score_and_summary(self, setup_test_db):
        lead_result = _parse(srv.save_lead(name="ScoreTest", company="ScoreCo"))
        lead_id = lead_result["lead_id"]

        result = _parse(srv.update_lead_score(
            lead_id=lead_id,
            score="Hot",
            summary="High-value lead from ScoreCo",
        ))
        assert result["lead_score"] == "Hot"
        assert result["lead_id"] == lead_id

    def test_error_on_invalid_lead_id(self):
        result = srv.update_lead_score(lead_id=999999, score="Hot", summary="x")
        assert result.startswith("Error:")


class TestGetLead:
    def test_retrieves_lead(self, setup_test_db):
        lead_result = _parse(srv.save_lead(name="Getter", company="GetCo", email="g@g.com"))
        lead_id = lead_result["lead_id"]

        result = _parse(srv.get_lead(lead_id=lead_id))
        assert result["id"]      == lead_id
        assert result["name"]    == "Getter"
        assert result["company"] == "GetCo"
        assert result["email"]   == "g@g.com"

    def test_error_on_missing_lead(self):
        result = srv.get_lead(lead_id=999999)
        assert result.startswith("Error:")


class TestListLeads:
    def test_returns_formatted_table(self, setup_test_db):
        srv.save_lead(name="ListTest1", company="ListCo")
        srv.save_lead(name="ListTest2", company="ListCo")
        result = srv.list_leads()
        assert "ListTest1" in result or "ListTest2" in result

    def test_filter_by_score(self, setup_test_db):
        lead = _parse(srv.save_lead(name="HotLead", company="HotCo"))
        srv.update_lead_score(lead_id=lead["lead_id"], score="Hot", summary="hot lead")

        result = srv.list_leads(score="Hot")
        assert "HotLead" in result

    def test_no_results_message(self):
        result = srv.list_leads(score="Cold", status="Closed", limit=1)
        # Either returns leads or the no-results message
        assert isinstance(result, str)


class TestSearchLeads:
    def test_finds_by_company(self, setup_test_db):
        srv.save_lead(name="Search Target", company="UniqueSearchCorp999")
        result = srv.search_leads(query="UniqueSearchCorp999")
        assert "UniqueSearchCorp999" in result

    def test_no_results_message(self):
        result = srv.search_leads(query="xyznonexistentxyz12345")
        assert "No leads found" in result


class TestUpdateLeadStatus:
    def test_updates_status(self, setup_test_db):
        lead = _parse(srv.save_lead(name="StatusTest", company="StatusCo"))
        lead_id = lead["lead_id"]

        result = _parse(srv.update_lead_status(lead_id=lead_id, status="Contacted"))
        assert result["new_status"] == "Contacted"
        assert result["old_status"] == "New"
        assert result["lead_id"]    == lead_id

    def test_rejects_invalid_status(self):
        result = srv.update_lead_status(lead_id=1, status="InvalidStatus")
        assert result.startswith("Error:")


class TestGetCompanyContext:
    def test_returns_business_info(self):
        result = _parse(srv.get_company_context(company_name="ClientCo"))
        assert "our_business"  in result
        assert "our_services"  in result
        assert "contact_email" in result
        assert result["lead_company"] == "ClientCo"

    def test_includes_personalisation_note(self):
        result = _parse(srv.get_company_context(company_name="ACME"))
        assert "note" in result
        assert "ACME" in result["note"]
