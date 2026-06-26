"""
LLM Provider Base
=================
Abstract interface for all language model providers.
The rest of the application calls get_llm_provider() from the factory and
never depends on a specific provider implementation.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMResult:
    """Structured output from any LLM provider."""
    lead_score: str          # Hot | Warm | Cold
    summary:    str          # One-line summary of the lead
    email:      str          # Personalised follow-up email draft
    sms:        str          # Short SMS draft (≤ 160 chars)
    provider:   str          # Which provider produced this result
    raw:        Optional[str] = None  # Raw model output (for debugging)


class BaseLLMProvider(ABC):
    """
    Every LLM provider implements this interface.
    The agent and MCP tools call analyze_lead() — they never import a
    specific provider class.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name, e.g. 'gpt-oss-120b' or 'mock'."""
        ...

    @abstractmethod
    def analyze_lead(
        self,
        name:    str,
        company: str,
        role:    str,
        message: str,
    ) -> LLMResult:
        """
        Analyse the lead's inquiry and produce a personalised follow-up.

        Returns an LLMResult with lead_score, summary, email draft, and SMS.
        Implementations must never raise — return a fallback result on error.
        """
        ...

    def chat(self, system: str, user: str, max_tokens: int = 1024) -> str:
        """
        Generic single-turn chat completion. Used by the agent for reasoning
        when the provider supports open-ended generation.
        Returns empty string on failure.
        """
        return ""
