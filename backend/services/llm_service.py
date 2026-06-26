"""
LLM Service
===========
Thin wrapper around the LLM provider abstraction.
The MCP server and other callers use LLMService.analyze_lead() — they never
depend on a specific provider. The factory selects the right provider based
on environment configuration (AI_PROVIDER env var).

Provider priority (configured via AI_PROVIDER):
    gpt-oss   -> GPT-OSS-120B via Hugging Face  (HF_API_KEY required)
    openai    -> OpenAI GPT models               (OPENAI_API_KEY required)
    groq      -> Groq LLMs                       (GROQ_API_KEY required)
    xai       -> xAI Grok                        (XAI_API_KEY required)
    hf        -> Hugging Face generic models     (HF_API_KEY required)
    mock      -> Rule-based fallback             (no key required)
"""
from logger import get_logger
from llm.factory import get_llm_provider

log = get_logger(__name__)


class LLMService:
    """Facade that delegates to the configured LLM provider."""

    @staticmethod
    def analyze_lead(name: str, company: str, role: str, message: str) -> dict:
        """
        Analyse the lead and return a dict with keys:
            lead_score, summary, email, sms
        This method never raises — the provider's fallback guarantees a result.
        """
        provider = get_llm_provider()
        log.info("LLMService.analyze_lead: provider=%s lead=%s@%s", provider.name, name, company)
        result = provider.analyze_lead(name=name, company=company, role=role, message=message)
        return {
            "lead_score": result.lead_score,
            "summary":    result.summary,
            "email":      result.email,
            "sms":        result.sms,
        }
