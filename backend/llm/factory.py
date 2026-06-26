"""
LLM Provider Factory
====================
Selects and returns the appropriate LLM provider based on environment config.
All application code calls get_llm_provider() — never a specific provider class.

Priority order:
    1. gpt-oss  (HF_API_KEY set + AI_PROVIDER=gpt-oss)
    2. openai   (OPENAI_API_KEY set + AI_PROVIDER=openai)
    3. groq     (GROQ_API_KEY set + AI_PROVIDER=groq)
    4. xai      (XAI_API_KEY set + AI_PROVIDER=xai)
    5. hf       (HF_API_KEY set + AI_PROVIDER=hf, uses default HF model)
    6. mock     (fallback — always available, no API key required)
"""
import logging
from functools import lru_cache

from .base import BaseLLMProvider, LLMResult

log = logging.getLogger(__name__)

# Re-export LLMResult so callers can do: from llm import LLMResult
__all__ = ["get_llm_provider", "LLMResult"]


@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    """
    Return a cached LLM provider instance.
    Re-import config here to avoid circular imports.
    """
    from config import get_settings
    s = get_settings()
    return _build_provider(s)


def _build_provider(s) -> BaseLLMProvider:  # type: ignore[no-untyped-def]
    """Instantiate the correct provider based on settings."""
    biz_kwargs = dict(
        business_name=    s.business_name,
        business_services=s.business_services,
        contact_name=     s.business_contact_name,
        contact_email=    s.business_contact_email,
    )

    provider = (s.ai_provider or "mock").lower().strip()

    # GPT-OSS-120B (primary per project requirement)
    if provider in ("gpt-oss", "gpt_oss") and s.hf_api_key:
        from .gpt_oss_provider import GPTOSSProvider
        log.info("LLM provider: GPT-OSS-120B via Hugging Face")
        return GPTOSSProvider(
            api_key=s.hf_api_key,
            model=s.gptoss_model,
            temperature=s.gptoss_temperature,
            max_tokens=s.gptoss_max_tokens,
            **biz_kwargs,
        )

    # OpenAI
    if provider == "openai" and s.openai_api_key:
        from .openai_provider import OpenAIProvider
        log.info("LLM provider: OpenAI (%s)", s.openai_model)
        return OpenAIProvider(
            api_key=s.openai_api_key,
            model=s.openai_model,
            **biz_kwargs,
        )

    # Groq
    if provider == "groq" and s.groq_api_key:
        from .groq_provider import GroqProvider
        log.info("LLM provider: Groq (%s)", s.groq_model)
        return GroqProvider(
            api_key=s.groq_api_key,
            model=s.groq_model,
            **biz_kwargs,
        )

    # xAI / Grok
    if provider == "xai" and s.xai_api_key:
        from .xai_provider import XAIProvider
        log.info("LLM provider: xAI (%s)", s.xai_model)
        return XAIProvider(
            api_key=s.xai_api_key,
            model=s.xai_model,
            **biz_kwargs,
        )

    # Hugging Face (generic — not GPT-OSS-specific)
    if provider == "hf" and s.hf_api_key:
        from .hf_provider import HFProvider
        log.info("LLM provider: Hugging Face (%s)", s.hf_model)
        return HFProvider(
            api_key=s.hf_api_key,
            model=s.hf_model,
            **biz_kwargs,
        )

    # Mock — always available
    if provider != "mock":
        log.warning(
            "AI_PROVIDER=%r needs an API key that is not set — falling back to mock",
            provider,
        )
    from .mock_provider import MockProvider
    log.info("LLM provider: mock (no external API)")
    return MockProvider(**biz_kwargs)
