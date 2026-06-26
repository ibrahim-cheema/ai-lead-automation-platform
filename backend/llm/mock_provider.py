"""
Mock LLM Provider
=================
Rule-based lead analysis that runs with zero API keys.
Uses keyword detection to personalise follow-up drafts — 13 service categories,
checked specific-first to avoid false matches on broad terms.
Used as the guaranteed fallback when no external provider is configured.
"""
import logging

from .base import BaseLLMProvider, LLMResult

log = logging.getLogger(__name__)

_HOT_SIGNALS  = [
    "urgent", "asap", "immediately", "right away", "this week",
    "budget", "ready to start", "need this now", "deadline",
    "launch", "going live", "how much", "pricing", "cost", "quote",
]
_COLD_SIGNALS = [
    "just looking", "just browsing", "not sure", "maybe",
    "test", "hello", "hi", "checking out", "just curious",
]


class MockProvider(BaseLLMProvider):
    """
    Deterministic mock that never fails and requires no API key.
    Produces personalised, service-specific drafts for all 13 service categories.
    """

    def __init__(
        self,
        business_name:     str = "Our Company",
        business_services: str = "technology services",
        contact_name:      str = "The Team",
        contact_email:     str = "hello@company.com",
    ):
        self._biz      = business_name
        self._services = business_services
        self._contact  = contact_name
        self._email    = contact_email

    @property
    def name(self) -> str:
        return "mock"

    def analyze_lead(
        self,
        name:    str,
        company: str,
        role:    str,
        message: str,
    ) -> LLMResult:
        log.info("Mock provider: analyzing lead %s @ %s", name, company)
        result = self._compute(name, company, role, message)
        return LLMResult(
            lead_score=result["lead_score"],
            summary=   result["summary"],
            email=     result["email"],
            sms=       result["sms"],
            provider=  self.name,
        )

    # ── Internals ──────────────────────────────────────────────────────────────

    def _compute(self, name: str, company: str, role: str, message: str) -> dict:
        msg         = (message or "").strip()
        ml          = msg.lower()
        role_str    = f", {role}" if role else ""
        company_str = (
            company if (company and company.lower() not in ("unknown", "n/a", "")) else "your company"
        )
        first_name  = (name or "there").split()[0]
        biz         = self._biz
        contact     = self._contact
        contact_email = self._email

        # Scoring
        score = "Warm"
        if any(w in ml for w in _HOT_SIGNALS):
            score = "Hot"
        elif not msg or len(msg) < 15 or any(w == ml.strip() or w in ml for w in _COLD_SIGNALS):
            score = "Cold"

        # Summary
        first_sentence = (msg.split(".")[0].strip() if msg else "")
        if len(first_sentence) > 80:
            first_sentence = first_sentence[:77] + "..."
        summary = (
            f"{name}{role_str} at {company_str} -- \"{first_sentence}.\""
            if first_sentence and len(first_sentence) > 5
            else f"New enquiry from {name}{role_str} at {company_str}."
        )

        # Service area detection (specific signals checked before broad ones)
        service_area = "technology services"
        what_we_do   = (
            f"{biz} covers the full spectrum -- from scoping and architecture to "
            f"development, launch, and ongoing support"
        )
        example_line = "We've helped businesses of all sizes go from idea to live product quickly and efficiently"
        cta_line     = f"Would a 15-minute call this week work? I can walk you through how we'd approach this for {company_str}."

        if any(w in ml for w in [
            "invoice", "document", "pdf", "ocr", "data extract",
            "extract data", "receipt", "form recogni", "document process", "data captur",
        ]):
            service_area = "document AI & data extraction"
            what_we_do   = (
                f"{biz} builds document intelligence solutions -- automated extraction of "
                f"structured data from invoices, PDFs, receipts, and scanned documents using AI/OCR"
            )
            example_line = (
                "We recently built a document extraction pipeline for a finance firm that processed "
                "10,000+ invoices per month with 98% accuracy, eliminating manual data entry entirely"
            )

        elif any(w in ml for w in [
            "customer support", "ticket", "helpdesk", "help desk",
            "support automation", "support team", "support system",
            "live chat", "triage", "support ticket",
        ]):
            service_area = "customer support automation"
            what_we_do   = (
                f"{biz} builds customer support automation systems -- AI ticket triage, "
                f"smart routing, automated responses, and helpdesk integrations"
            )
            example_line = (
                "We helped a SaaS company automate 60% of their Tier-1 support tickets using AI, "
                "cutting response times from 4 hours to under 5 minutes"
            )

        elif any(w in ml for w in [
            "workflow", "automat", "manual task", "manual process", "repetitive",
            "business process", "internal process", "rpa", "process automat",
            "reduce manual", "eliminate manual", "operational",
        ]):
            service_area = "workflow automation"
            what_we_do   = (
                f"{biz} specialises in workflow automation -- identifying manual bottlenecks "
                f"in your operations and replacing them with automated, error-free processes"
            )
            example_line = (
                "We automated an operations team's weekly reporting and approval workflow, saving "
                "them 30+ hours a week and eliminating a category of human error entirely"
            )

        elif any(w in ml for w in [
            "ecommerce", "e-commerce", "shopify", "woocommerce", "magento",
            "online store", "online shop", "cart", "abandoned cart", "product listing",
        ]):
            service_area = "e-commerce development"
            what_we_do   = (
                f"{biz} builds and customises e-commerce platforms -- Shopify, WooCommerce, "
                f"or fully bespoke stores with custom checkout flows, integrations, and AI features"
            )
            example_line = (
                "We helped a retail brand migrate to a custom Shopify setup and integrate with their "
                "warehouse system, improving conversion rate by 35%"
            )

        elif any(w in ml for w in [
            "mobile app", "ios app", "android app", "flutter", "react native",
            "mobile application", "cross-platform", "app store", "play store",
        ]):
            service_area = "mobile app development"
            what_we_do   = (
                f"{biz} develops cross-platform mobile apps using Flutter and React Native "
                f"-- one codebase, full iOS and Android support"
            )
            example_line = "Our last mobile project went from wireframes to App Store submission in 8 weeks"

        elif any(w in ml for w in [
            "chatbot", "ai chatbot", "chat bot", "virtual assistant",
            "artificial intelligence", "machine learning", " ml ", "llm",
            "gpt", "language model", "ai integration", "ai automat",
        ]):
            service_area = "AI & chatbot development"
            what_we_do   = (
                f"{biz} builds custom AI solutions -- intelligent chatbots, LLM integrations, "
                f"AI assistants, and predictive systems embedded into your existing products"
            )
            example_line = (
                "We built a customer-facing AI chatbot for an e-commerce company that handled "
                "70% of enquiries autonomously, freeing the team to focus on complex cases"
            )

        elif any(w in ml for w in [
            "api", "integrat", "webhook", "connect", "sync", "third-party",
            "third party", "zapier", "erp", "crm integration", "middleware",
        ]):
            service_area = "API & systems integration"
            what_we_do   = (
                f"{biz} handles complex API integrations -- connecting your tools, building "
                f"custom connectors, and automating data flows between systems"
            )
            example_line = "We've integrated payment gateways, CRMs, ERPs, and custom internal systems for clients across industries"

        elif any(w in ml for w in [
            "web app", "web application", "website", "frontend", "backend",
            "full stack", "fullstack", "portal", "admin panel", "dashboard",
        ]):
            service_area = "web development"
            what_we_do   = (
                f"{biz} builds custom web applications -- from marketing sites to complex "
                f"platforms with multi-role dashboards, real-time data, and third-party integrations"
            )
            example_line = "We recently delivered a full-stack logistics platform that reduced their team's manual work by 60%"

        elif any(w in ml for w in [
            "software", "custom software", "saas", "platform", "system",
            "product", "tool", "mvp", "prototype",
        ]):
            service_area = "custom software development"
            what_we_do   = (
                f"{biz} builds custom software products from scratch -- scoping, "
                f"design, development, testing, and deployment, all under one roof"
            )
            example_line = "We've built SaaS platforms, internal tools, and client-facing products for startups and established businesses alike"

        elif any(w in ml for w in [
            "design", "ui ", "ux ", "ui/ux", "figma", "wireframe", "prototype", "mockup",
        ]):
            service_area = "UI/UX design"
            what_we_do   = (
                f"{biz} handles design end-to-end -- user research, wireframes, interactive "
                f"prototypes, and pixel-perfect UI -- before a single line of code is written"
            )
            example_line = "We always kick off with a design sprint so you can validate the product experience before committing to full development"

        elif any(w in ml for w in [
            "maintain", "legacy", "bug", "fix", "update", "upgrade", "refactor", "support contract",
        ]):
            service_area = "maintenance & support"
            what_we_do   = (
                f"{biz} takes on maintenance contracts -- bug fixes, security updates, "
                f"performance improvements, and incremental feature additions"
            )
            example_line = "We currently support several legacy systems for clients, keeping them stable and secure while modernising them gradually"

        elif any(w in ml for w in [
            "quote", "pricing", "cost", "how much", "budget", "price", "rate", "fee",
        ]):
            service_area = "project scoping & pricing"
            what_we_do   = (
                f"{biz} works on both fixed-price and time-and-materials models -- "
                f"you'll get a clear, itemised quote after a short discovery call, no surprises"
            )
            example_line = "Every quote we send comes with a detailed scope breakdown so you know exactly what you're paying for"
            cta_line     = f"The fastest way to get an accurate number is a 15-minute scoping call. Does this week suit you, {first_name}?"

        # Email
        opening = ""
        if len(msg) > 12:
            asked_about = msg if len(msg) <= 130 else msg[:127] + "..."
            opening = f'You mentioned: "{asked_about}"\n\n'

        email = (
            f"Subject: Re: {service_area.title()} enquiry -- {company_str}\n\n"
            f"Hi {first_name},\n\n"
            f"Thanks for getting in touch with {biz}.\n\n"
            f"{opening}"
            f"{what_we_do}. {example_line}, and we'd love to explore how we can do the same for {company_str}.\n\n"
            f"{cta_line}\n\n"
            f"Best regards,\n"
            f"{contact}\n"
            f"{biz} | {contact_email}"
        )

        # SMS
        if len(msg) > 12:
            short_ask = msg[:55].strip() + ("..." if len(msg) > 55 else "")
            sms = (
                f"Hi {first_name}! Got your enquiry re: \"{short_ask}\" -- "
                f"{biz} can help. Free for a quick 15-min call this week? {contact_email}"
            )
        else:
            sms = (
                f"Hi {first_name}! Thanks for reaching out to {biz}. "
                f"We'd love to learn more about what you need -- free for a quick call this week? {contact_email}"
            )
        if len(sms) > 240:
            sms = sms[:237] + "..."

        return {
            "lead_score": score,
            "summary":    summary,
            "email":      email,
            "sms":        sms,
        }
