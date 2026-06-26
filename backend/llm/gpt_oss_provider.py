"""
GPT-OSS-120B Provider
=====================
Integrates OpenAI's open-source GPT-OSS-120B model via the Hugging Face
Inference API using the OpenAI-compatible chat completions endpoint.

HF Inference API (OpenAI-compatible):
    base_url : https://api-inference.huggingface.co/v1/
    model    : openai/gpt-oss-120b
    auth     : Bearer <HF_API_KEY>

The `openai` Python SDK is used so the same client can also be pointed at
other OpenAI-compatible endpoints (Together, Fireworks, etc.) in the future.
"""
import json
import logging
import time
from typing import Optional

from openai import OpenAI, APIError, RateLimitError, APITimeoutError

from .base import BaseLLMProvider, LLMResult

log = logging.getLogger(__name__)

_HF_BASE_URL     = "https://api-inference.huggingface.co/v1/"
_DEFAULT_MODEL   = "openai/gpt-oss-120b"
_MAX_RETRIES     = 3
_RETRY_DELAY     = 2.0   # seconds


def _build_lead_prompt(
    name:         str,
    company:      str,
    role:         str,
    message:      str,
    business_name: str,
    services:     str,
    contact_name: str,
    contact_email: str,
) -> tuple[str, str]:
    """Return (system_prompt, user_prompt) for the lead analysis task."""
    system = (
        f"You are a professional business writer working for {business_name}.\n"
        f"We offer: {services}.\n\n"
        "Your task: analyse an inbound lead and produce a follow-up response.\n\n"
        "RESPOND WITH VALID JSON ONLY — no markdown fences, no extra text:\n"
        "{\n"
        '  "lead_score": "Hot" | "Warm" | "Cold",\n'
        '  "summary": "<one sentence, ≤15 words>",\n'
        '  "email": "<professional follow-up email, 3-4 paragraphs>",\n'
        '  "sms": "<SMS ≤160 chars>"\n'
        "}\n\n"
        "RULES:\n"
        f"- Write as {business_name}, not as an AI or platform.\n"
        "- Personalise to the lead's specific inquiry — no generic replies.\n"
        "- Open the email with a quote from their message.\n"
        f"- Sign off: {contact_name} | {business_name} | {contact_email}\n"
        "- SMS must be ≤160 characters.\n"
        "- lead_score: Hot = urgent/specific/high-value, Warm = interested, Cold = vague.\n"
        "- summary format: '<Name>, <Role> at <Company> — \"<topic>\"'\n"
    )
    user = (
        f"Lead details:\n"
        f"Name:    {name}\n"
        f"Company: {company}\n"
        f"Role:    {role or 'Not specified'}\n"
        f"Message: {message or 'No message provided'}\n\n"
        f"Generate the follow-up response for {business_name}."
    )
    return system, user


class GPTOSSProvider(BaseLLMProvider):
    """
    GPT-OSS-120B via Hugging Face Inference API.
    Falls back to mock output if the API is unavailable.
    """

    def __init__(
        self,
        api_key:       str,
        model:         str = _DEFAULT_MODEL,
        temperature:   float = 0.7,
        max_tokens:    int = 1024,
        business_name: str = "Our Company",
        business_services: str = "technology services",
        contact_name:  str = "The Team",
        contact_email: str = "hello@company.com",
    ):
        self._client = OpenAI(
            base_url=_HF_BASE_URL,
            api_key=api_key,
            max_retries=0,   # we handle retries ourselves for better logging
            timeout=60.0,
        )
        self._model       = model
        self._temperature = temperature
        self._max_tokens  = max_tokens
        self._biz_name    = business_name
        self._services    = business_services
        self._contact_name  = contact_name
        self._contact_email = contact_email

    @property
    def name(self) -> str:
        return self._model

    def analyze_lead(
        self,
        name:    str,
        company: str,
        role:    str,
        message: str,
    ) -> LLMResult:
        system_prompt, user_prompt = _build_lead_prompt(
            name, company, role, message,
            self._biz_name, self._services,
            self._contact_name, self._contact_email,
        )
        raw = self._complete(system_prompt, user_prompt)
        if not raw:
            log.warning("GPT-OSS returned empty — using emergency fallback")
            return self._fallback(name, company, role, message)

        try:
            data = json.loads(raw)
            return LLMResult(
                lead_score=data.get("lead_score", "Warm"),
                summary=   data.get("summary",    f"{name} @ {company}"),
                email=     data.get("email",      ""),
                sms=       data.get("sms",        ""),
                provider=  self.name,
                raw=       raw,
            )
        except json.JSONDecodeError:
            log.warning("GPT-OSS output was not valid JSON: %s", raw[:200])
            return self._parse_loose(raw, name, company)

    def chat(self, system: str, user: str, max_tokens: int = 1024) -> str:
        """Open-ended generation used by the agent for reasoning."""
        return self._complete(system, user, max_tokens=max_tokens)

    # ── Internals ──────────────────────────────────────────────────────────────

    def _complete(
        self,
        system:     str,
        user:       str,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Call the HF API with retry logic. Returns raw string or ''."""
        tokens = max_tokens or self._max_tokens
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                log.info("GPT-OSS request: model=%s attempt=%d", self._model, attempt)
                response = self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user},
                    ],
                    temperature=self._temperature,
                    max_tokens=tokens,
                )
                text = response.choices[0].message.content or ""
                # Strip markdown code fences if the model added them
                text = text.strip()
                if text.startswith("```"):
                    text = text.split("```", 2)[1]
                    if text.startswith("json"):
                        text = text[4:]
                    text = text.rsplit("```", 1)[0].strip()
                log.info("GPT-OSS response: %d chars", len(text))
                return text
            except RateLimitError:
                log.warning("GPT-OSS rate limit (attempt %d/%d)", attempt, _MAX_RETRIES)
                if attempt < _MAX_RETRIES:
                    time.sleep(_RETRY_DELAY * attempt)
            except APITimeoutError:
                log.warning("GPT-OSS timeout (attempt %d/%d)", attempt, _MAX_RETRIES)
                if attempt < _MAX_RETRIES:
                    time.sleep(_RETRY_DELAY)
            except APIError as exc:
                log.error("GPT-OSS API error: %s", exc)
                break
            except Exception as exc:
                log.error("GPT-OSS unexpected error: %s", exc)
                break
        return ""

    def _fallback(self, name: str, company: str, role: str, message: str) -> LLMResult:
        """Emergency result when GPT-OSS is unreachable."""
        summary = f"{name}, {role} at {company}" if role else f"{name} at {company}"
        email   = (
            f"Hi {name},\n\n"
            f"Thank you for reaching out to {self._biz_name}.\n\n"
            f"We received your inquiry and will get back to you shortly.\n\n"
            f"Best regards,\n{self._contact_name} | {self._biz_name}"
        )
        sms = f"Hi {name}, thanks for contacting {self._biz_name}! We'll be in touch soon."
        return LLMResult(
            lead_score="Warm",
            summary=summary,
            email=email,
            sms=sms[:160],
            provider=f"{self.name}:fallback",
        )

    def _parse_loose(self, raw: str, name: str, company: str) -> LLMResult:
        """Best-effort parse when GPT-OSS returns prose instead of JSON."""
        score = "Warm"
        if "hot" in raw.lower():
            score = "Hot"
        elif "cold" in raw.lower():
            score = "Cold"
        return LLMResult(
            lead_score=score,
            summary=f"{name} @ {company}",
            email=raw,
            sms=f"Hi {name}, thanks for contacting {self._biz_name}. We'll follow up soon."[:160],
            provider=f"{self.name}:loose-parse",
            raw=raw,
        )
