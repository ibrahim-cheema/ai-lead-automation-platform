from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from config import get_settings
from database import Base, SessionLocal, engine
from logger import get_logger
from routers.leads import router as leads_router

log      = get_logger(__name__)
settings = get_settings()

# ── Database initialisation ───────────────────────────────────────────────────
try:
    Base.metadata.create_all(bind=engine)
    log.info("Database tables initialised.")
except Exception as exc:
    log.error("Failed to initialise database tables: %s", exc)

# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Lead Automation API",
    description=(
        "Captures inbound leads, runs AI-powered scoring and personalised follow-up "
        "generation, and exposes a REST API for the admin dashboard."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ────────────────────────────────────────────────────────

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    log.warning("Validation error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Validation failed", "detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "An internal server error occurred.", "status_code": 500},
    )


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(leads_router)


# ── Health & root ─────────────────────────────────────────────────────────────

@app.get("/", tags=["meta"], summary="API root")
def root():
    return {
        "status":   "online",
        "name":     "AI Lead Automation API",
        "version":  "1.0.0",
        "docs":     "/api/docs",
        "endpoints": {
            "submit_lead":     "POST /api/v1/leads",
            "list_leads":      "GET  /api/v1/leads",
            "get_lead":        "GET  /api/v1/leads/{id}",
            "update_status":   "PATCH /api/v1/leads/{id}/status",
            "delete_lead":     "DELETE /api/v1/leads/{id}",
            "generate_followup": "POST /api/v1/followup",
            "health":          "GET  /api/v1/health",
        },
    }


@app.get("/api/v1/health", tags=["meta"], summary="Health check")
def health_check():
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
        db.close()
    except Exception:
        pass
    return {
        "status":      "healthy" if db_ok else "degraded",
        "database":    "connected" if db_ok else "unreachable",
        "ai_provider": settings.ai_provider,
        "business":    settings.business_name,
    }
