# System Architecture

## Overview

AI Lead Automation Platform with Agentic AI and MCP Server architecture.

```
Browser (Next.js 16)
    |
    | POST /api/v1/leads
    v
FastAPI Backend (Python)
    |
    v
AI Agent (agent/lead_agent.py)
    |--- Claude Haiku (orchestration, tool-use decisions)
    |--- Direct-tool fallback (when no Anthropic key)
    |
    | MCP stdio transport
    v
MCP Server (mcp_server/server.py)
    |
    +-- save_lead            --> SQLite / PostgreSQL
    +-- get_company_context  --> Settings (business identity)
    +-- generate_followup    --> LLM Provider (email + SMS)
    +-- save_followup        --> SQLite / PostgreSQL
    +-- update_lead_score    --> SQLite / PostgreSQL
    +-- get_lead             --> SQLite / PostgreSQL
    +-- list_leads           --> SQLite / PostgreSQL
    +-- search_leads         --> SQLite / PostgreSQL
    +-- update_lead_status   --> SQLite / PostgreSQL
    |
    v
LLM Provider (llm/)
    |--- GPT-OSS-120B  (HF_API_KEY + AI_PROVIDER=gpt-oss)  [PRIMARY]
    |--- OpenAI        (OPENAI_API_KEY + AI_PROVIDER=openai)
    |--- Groq          (GROQ_API_KEY + AI_PROVIDER=groq)
    |--- xAI           (XAI_API_KEY + AI_PROVIDER=xai)
    |--- HuggingFace   (HF_API_KEY + AI_PROVIDER=hf)
    +--- Mock          (no key required, always available)   [FALLBACK]
```

## Directory Structure

```
project/
├── backend/
│   ├── main.py              # FastAPI app, exception handlers, health endpoint
│   ├── config.py            # pydantic-settings, single source of truth
│   ├── database.py          # SQLAlchemy engine, session factory
│   ├── logger.py            # Structured logging (stdout; stderr in MCP server)
│   ├── models.py            # SQLAlchemy ORM models + Pydantic request/response
│   │
│   ├── agent/
│   │   └── lead_agent.py    # AI Agent — Claude Haiku + MCP ClientSession
│   │
│   ├── mcp_server/
│   │   └── server.py        # FastMCP server — 9 lead management tools
│   │
│   ├── llm/
│   │   ├── base.py          # BaseLLMProvider abstract interface
│   │   ├── factory.py       # Provider selection based on AI_PROVIDER env var
│   │   ├── gpt_oss_provider.py  # GPT-OSS-120B via Hugging Face
│   │   └── mock_provider.py # Rule-based fallback (13 service categories)
│   │
│   ├── routers/
│   │   └── leads.py         # HTTP routes — delegates POST /leads to agent
│   │
│   ├── services/
│   │   ├── llm_service.py   # Thin facade over llm/ factory
│   │   ├── lead_processor.py # Direct processing fallback (bypasses agent)
│   │   └── prompt_engine.py  # System prompt and templates
│   │
│   ├── utils/
│   │   └── text_cleaner.py
│   │
│   ├── .env                 # Secrets (not committed)
│   ├── .env.example         # Config reference (safe to commit)
│   └── requirements.txt
│
├── frontend/                # Next.js 16 App Router
│   └── src/app/
│       ├── page.tsx         # Lead submission form
│       ├── dashboard/       # Admin pipeline view
│       └── proposal/        # Client proposal + ROI calculator
│
├── tests/
│   └── test_mcp_tools.py    # 24 unit tests for MCP tools
│
└── docs/
    └── architecture.md      # This file
```

## Agent Workflow

When a lead is submitted to `POST /api/v1/leads`, the AI Agent executes:

| Step | MCP Tool           | What Happens                                          |
|------|--------------------|-------------------------------------------------------|
| 1    | `save_lead`        | Lead persisted to DB; returns `lead_id`               |
| 2    | `get_company_context` | Business services and identity loaded for context  |
| 3    | `generate_followup` | GPT-OSS-120B generates personalised email + SMS     |
| 4    | `save_followup`    | Email/SMS drafts saved, linked to lead               |
| 5    | `update_lead_score` | Lead record updated with AI score (Hot/Warm/Cold)  |

Claude Haiku (AI_PROVIDER=anthropic) decides the tool call sequence.  
If `ANTHROPIC_API_KEY` is not set, the agent runs the same 5-step sequence directly.

## LLM Provider Abstraction

```
llm/factory.py::get_llm_provider()
    |
    +--> GPTOSSProvider     (AI_PROVIDER=gpt-oss,  HF_API_KEY required)
    +--> OpenAIProvider     (AI_PROVIDER=openai,   OPENAI_API_KEY required)
    +--> GroqProvider       (AI_PROVIDER=groq,     GROQ_API_KEY required)
    +--> XAIProvider        (AI_PROVIDER=xai,      XAI_API_KEY required)
    +--> HFProvider         (AI_PROVIDER=hf,       HF_API_KEY required)
    +--> MockProvider       (AI_PROVIDER=mock,     no key required)
```

All providers implement `BaseLLMProvider.analyze_lead()` and return `LLMResult`.
Application code never imports a specific provider — only `get_llm_provider()`.

## API Endpoints

| Method | Path                        | Description                      |
|--------|-----------------------------|----------------------------------|
| POST   | /api/v1/leads               | Submit lead (processed by agent) |
| GET    | /api/v1/leads               | List leads (search/filter/page)  |
| GET    | /api/v1/leads/{id}          | Get single lead                  |
| PATCH  | /api/v1/leads/{id}/status   | Update pipeline status           |
| DELETE | /api/v1/leads/{id}          | Delete a lead                    |
| POST   | /api/v1/followup            | Generate follow-up draft only    |
| GET    | /api/v1/health              | Health check                     |
| GET    | /api/docs                   | Swagger UI                       |

## Configuration

| Variable            | Purpose                                    | Default         |
|---------------------|--------------------------------------------|-----------------|
| `AI_PROVIDER`       | Which LLM to use                           | `mock`          |
| `HF_API_KEY`        | Hugging Face token (GPT-OSS + HF providers)| —               |
| `GPTOSS_MODEL`      | GPT-OSS model name                         | `openai/gpt-oss-120b` |
| `ANTHROPIC_API_KEY` | Claude Haiku for agent orchestration       | —               |
| `DATABASE_URL`      | PostgreSQL URL (blank = local SQLite)      | SQLite          |
| `BUSINESS_NAME`     | Business writing as in emails              | `Our Company`   |

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Running Tests

```bash
cd project-root
backend/.venv/Scripts/python -m pytest tests/ -v
```

## Inspecting the MCP Server

```bash
mcp dev backend/mcp_server/server.py
```
