# AI Lead Automation Platform

An end-to-end lead capture and AI-powered follow-up system. When a visitor submits a form on your website, the platform stores the lead, runs AI analysis to score it, and generates a personalised follow-up email and SMS draft — all in under 5 seconds. Your sales team reviews and sends from the admin dashboard.

```
Visitor fills form
      ↓
POST /api/v1/leads
      ↓
AI scores lead (Hot / Warm / Cold)
      ↓
AI drafts personalised email + SMS (tailored to their specific inquiry)
      ↓
Lead saved to database with full context
      ↓
Admin dashboard — review drafts, update status, copy & send
```

---

## Project Structure

```
ai-lead-automation/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, exception handlers, health check
│   ├── config.py                # Centralised settings via pydantic-settings
│   ├── database.py              # SQLAlchemy engine + session factory (SQLite / PostgreSQL)
│   ├── models.py                # ORM models + validated Pydantic schemas (EmailStr, Field)
│   ├── logger.py                # Shared structured logger
│   ├── routers/
│   │   └── leads.py             # All /api/v1/ endpoints with search + filters
│   ├── services/
│   │   ├── lead_processor.py    # Orchestrates AI analysis + DB persistence
│   │   ├── llm_service.py       # Multi-provider AI caller + rule-based mock engine
│   │   └── prompt_engine.py     # System prompt + user prompt templates (business-aware)
│   ├── utils/
│   │   └── text_cleaner.py      # LLM JSON response sanitiser
│   ├── .env                     # Local secrets (not committed)
│   ├── .env.example             # Config reference (committed)
│   └── requirements.txt
└── frontend/
    └── src/app/
        ├── page.tsx             # Landing page + live lead capture form demo
        ├── dashboard/page.tsx   # Admin dashboard (leads, AI drafts, status management)
        └── proposal/page.tsx    # Client proposal / pitch page with ROI calculator
```

---

## API Reference

All endpoints live under `/api/v1/`. Interactive docs at **http://localhost:8000/api/docs**

| Method   | Path                          | Description                                              |
|----------|-------------------------------|----------------------------------------------------------|
| `GET`    | `/api/v1/health`              | Health check — DB status, AI provider, business identity |
| `POST`   | `/api/v1/leads`               | Submit a lead, run AI, store and return full record      |
| `GET`    | `/api/v1/leads`               | List leads with search, score/status filters, pagination |
| `GET`    | `/api/v1/leads/{id}`          | Get a single lead by ID                                  |
| `PATCH`  | `/api/v1/leads/{id}/status`   | Update pipeline status                                   |
| `DELETE` | `/api/v1/leads/{id}`          | Delete lead and its follow-up records                    |
| `POST`   | `/api/v1/followup`            | Generate a follow-up draft (also persists the lead)      |

### GET /api/v1/leads — Query Parameters

| Param    | Type                          | Description                              |
|----------|-------------------------------|------------------------------------------|
| `search` | string                        | Search across name, company, email       |
| `score`  | `Hot` \| `Warm` \| `Cold`    | Filter by AI-assigned lead score         |
| `status` | `New` \| `Contacted` \| `Qualified` \| `Closed` | Filter by pipeline status |
| `limit`  | int (1–500)                   | Results per page (default 100)           |
| `offset` | int                           | Pagination offset (default 0)            |

---

## Quickstart

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows — or: source .venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
cp .env.example .env          # fill in your values
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## Configuration

Copy `.env.example` to `.env` and update:

```env
# Business identity — the company whose website this is deployed on
BUSINESS_NAME=Acme Corp
BUSINESS_SERVICES=custom software development, web development, AI automation
BUSINESS_CONTACT_NAME=The Acme Team
BUSINESS_CONTACT_EMAIL=hello@acme.com

# AI provider: openai | groq | xai | huggingface | mock
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Database (leave empty for local SQLite)
DATABASE_URL=
```

The system falls back to the built-in mock engine automatically if the API key is missing or the provider call fails.

---

## AI Providers

| Value          | Key env var       | Default model            |
|----------------|-------------------|--------------------------|
| `mock`         | —                 | Rule-based, zero API needed |
| `openai`       | `OPENAI_API_KEY`  | `gpt-4o-mini`            |
| `groq`         | `GROQ_API_KEY`    | `mixtral-8x7b-32768`     |
| `xai`          | `XAI_API_KEY`     | `grok-2-latest`          |
| `huggingface`  | `HF_API_KEY`      | `meta-llama/Meta-Llama-3-8B-Instruct` |

---

## Personalisation

Every email is generated specifically for the inquiry type — not from a fixed template. The system detects 13 service areas and builds a distinct reply for each:

- Document AI & data extraction
- Customer support automation & ticket management
- Workflow & process automation
- E-commerce development
- Mobile app development
- AI & chatbot development
- API & systems integration
- Web application development
- Custom software / SaaS / MVP
- UI/UX design
- Maintenance & legacy system support
- Project scoping & pricing

Each reply quotes the lead's actual message, explains the relevant service, cites a plausible past outcome, and signs off as the client business — not as a generic AI tool.

---

## Database

- **Development**: SQLite (`backend/leads.db`) — zero config
- **Production**: Set `DATABASE_URL` to a PostgreSQL connection string (Supabase, Neon, RDS)

Tables: `leads`, `followups`

---

## Production Deployment

| Component | Service |
|-----------|---------|
| Backend   | Railway / Render / DigitalOcean App Platform |
| Frontend  | Vercel — set `NEXT_PUBLIC_API_URL` to backend URL |
| Database  | Supabase / Neon (set `DATABASE_URL`) |
