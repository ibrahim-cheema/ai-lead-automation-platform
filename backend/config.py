from functools import lru_cache
from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Single source of truth for all environment configuration."""

    # ── Agent Orchestration ──────────────────────────────────────────────────
    # Used by the AI Agent (lead_agent.py) for tool-use orchestration.
    # Leave empty to run in direct-tool mode (same tools, no AI decision layer).
    anthropic_api_key: str = ""

    # ── AI Provider ──────────────────────────────────────────────────────────
    # Controls which LLM is used for lead analysis & email/SMS generation.
    # Options: gpt-oss | openai | groq | xai | hf | mock
    ai_provider: str = "mock"

    # GPT-OSS-120B (primary — via Hugging Face Inference API)
    # Set AI_PROVIDER=gpt-oss and provide HF_API_KEY to enable.
    gptoss_model:       str   = "openai/gpt-oss-120b"
    gptoss_temperature: float = 0.7
    gptoss_max_tokens:  int   = 1024

    # OpenAI
    openai_api_key: str = ""
    openai_model:   str = "gpt-4o-mini"

    # Groq
    groq_api_key: str = ""
    groq_model:   str = "mixtral-8x7b-32768"

    # Hugging Face (generic — also used as API key for GPT-OSS)
    hf_api_key: str = ""
    hf_model:   str = "meta-llama/Meta-Llama-3-8B-Instruct"

    # xAI
    xai_api_key: str = ""
    xai_model:   str = "grok-2-latest"

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str = ""

    # ── Business Identity ────────────────────────────────────────────────────
    business_name: str = "Our Company"
    business_tagline: str = "Software & Technology Services"
    business_services: str = "software development and technology consulting"
    business_contact_name: str = "The Team"
    business_contact_email: str = "hello@company.com"

    model_config = ConfigDict(env_file=".env", extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
