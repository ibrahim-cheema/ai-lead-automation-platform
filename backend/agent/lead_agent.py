"""
Lead Processing Agent
=====================
An Agentic AI that orchestrates the full lead workflow by calling MCP server tools.
Instead of hardcoding the sequence in application code, the agent decides which tools
to call and in what order — demonstrating autonomous AI decision-making over a tool set.

Architecture:
    FastAPI Route
        └── run_lead_agent()          ← This file
                ├── Anthropic Claude  (decision maker / orchestrator)
                └── MCP ClientSession (tool executor)
                        └── MCP Server tools
                                ├── save_lead
                                ├── get_company_context
                                ├── generate_followup
                                ├── save_followup
                                └── update_lead_score

Fallback: if ANTHROPIC_API_KEY is not set, _run_direct_sequence() calls the
MCP tools in a fixed order without the AI decision layer. The result is identical
but skips the agentic orchestration step.
"""
import asyncio
import json
import os
import sys

import anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Ensure backend package importable when agent module is imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import get_settings
from logger import get_logger

log      = get_logger(__name__)
settings = get_settings()

# Path to the MCP server script (sibling directory)
_MCP_SERVER_SCRIPT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "mcp_server", "server.py",
)

# ── Agent system prompt ────────────────────────────────────────────────────────

AGENT_SYSTEM_PROMPT = f"""You are an intelligent lead management agent for {settings.business_name}.

When a new lead arrives you MUST execute the following workflow using the available tools.
Complete every step in order — do not skip any step.

WORKFLOW:
Step 1 ->save_lead
         Save the lead to the database. Note the returned lead_id for later steps.

Step 2 ->get_company_context
         Retrieve our business services and context so the follow-up is relevant.
         Pass the lead's company name as the argument.

Step 3 ->generate_followup
         Generate a personalised email draft and SMS draft for this lead.
         Use what you learned in Step 2 to understand what we offer.
         The follow-up must address the lead's specific inquiry — not a generic reply.

Step 4 ->save_followup
         Persist the generated email and SMS drafts linked to the lead.
         Use the lead_id from Step 1 and the email/sms from Step 3.

Step 5 ->update_lead_score
         Update the lead record with the score and summary from Step 3.

After all 5 steps are complete, respond with ONLY a valid JSON object:
{{
  "lead_id":    <integer from Step 1>,
  "lead_score": "<Hot|Warm|Cold from Step 3>",
  "summary":    "<one-line summary from Step 3>",
  "status":     "processed"
}}

RULES:
- Call all tools in the order listed. Do not reorder or skip steps.
- Pass lead_id from save_lead to save_followup and update_lead_score.
- Extract email and sms values from generate_followup's JSON response.
- Your final reply must be valid JSON only — no extra text, no markdown.
"""


# ── Tool format conversion ─────────────────────────────────────────────────────

def _to_anthropic_tools(mcp_tools) -> list[dict]:
    """Convert MCP tool definitions to Anthropic API tool format."""
    return [
        {
            "name":         t.name,
            "description":  t.description or "",
            "input_schema": t.inputSchema,
        }
        for t in mcp_tools
    ]


# ── Main agent entry point ─────────────────────────────────────────────────────

async def run_lead_agent(lead: dict) -> dict:
    """
    Process a lead through the agentic workflow.
    Returns {"lead_id": int, "lead_score": str, "summary": str, "status": str}
    """
    if not settings.anthropic_api_key:
        log.warning("ANTHROPIC_API_KEY not set — running agent in direct-tool mode (no AI orchestration)")
        return await _run_direct_sequence(lead)

    log.info("Starting agent workflow for lead: %s @ %s", lead.get("name"), lead.get("company"))

    server_params = StdioServerParameters(
        command=sys.executable,
        args=[_MCP_SERVER_SCRIPT],
        env={**os.environ},
    )

    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                mcp_tools       = (await session.list_tools()).tools
                anthropic_tools = _to_anthropic_tools(mcp_tools)
                log.info("MCP server ready — %d tools available: %s",
                         len(mcp_tools), [t.name for t in mcp_tools])

                client   = anthropic.Anthropic(api_key=settings.anthropic_api_key)
                messages = [{"role": "user", "content": _format_lead_prompt(lead)}]
                step     = 0

                while True:
                    step += 1
                    log.info("Agent iteration %d", step)

                    response = client.messages.create(
                        model="claude-haiku-4-5-20251001",
                        max_tokens=2048,
                        system=AGENT_SYSTEM_PROMPT,
                        tools=anthropic_tools,
                        messages=messages,
                    )

                    messages.append({"role": "assistant", "content": response.content})
                    log.info("Agent stop_reason=%s", response.stop_reason)

                    # Agent finished — extract final JSON result
                    if response.stop_reason == "end_turn":
                        for block in response.content:
                            if hasattr(block, "text"):
                                text = block.text.strip()
                                log.info("Agent final output: %s", text[:200])
                                try:
                                    result = json.loads(text)
                                    if "lead_id" in result:
                                        return result
                                except json.JSONDecodeError:
                                    pass
                        # If agent gave text but not parseable JSON, fall through to fallback
                        log.warning("Agent completed but output was not parseable JSON — using fallback")
                        return await _run_direct_sequence(lead)

                    # Agent wants to call tools
                    if response.stop_reason == "tool_use":
                        tool_results = []
                        for block in response.content:
                            if block.type == "tool_use":
                                log.info("Agent ->tool call: %s(%s)", block.name, json.dumps(block.input)[:120])
                                try:
                                    call_result = await session.call_tool(block.name, arguments=block.input)
                                    result_text = "".join(
                                        c.text for c in call_result.content if c.type == "text"
                                    )
                                    is_error = bool(getattr(call_result, "isError", False))
                                    log.info("Tool %s ->%s", block.name, result_text[:120])
                                except Exception as tool_exc:
                                    result_text = f"Error: {tool_exc}"
                                    is_error    = True
                                    log.error("Tool %s failed: %s", block.name, tool_exc)

                                tool_results.append({
                                    "type":        "tool_result",
                                    "tool_use_id": block.id,
                                    "content":     result_text,
                                    "is_error":    is_error,
                                })

                        messages.append({"role": "user", "content": tool_results})

                    # Guard against infinite loops
                    if step > 15:
                        log.error("Agent exceeded max iterations — falling back to direct sequence")
                        return await _run_direct_sequence(lead)

    except Exception as exc:
        log.error("Agent error: %s — falling back to direct sequence", exc, exc_info=True)
        return await _run_direct_sequence(lead)


def _format_lead_prompt(lead: dict) -> str:
    return (
        f"New lead received. Process through the full workflow:\n\n"
        f"Name:    {lead.get('name', '')}\n"
        f"Email:   {lead.get('email', '')}\n"
        f"Company: {lead.get('company', '')}\n"
        f"Role:    {lead.get('role', '')}\n"
        f"Message: {lead.get('message', '')}\n"
        f"Source:  {lead.get('source', 'website')}\n\n"
        f"Execute all 5 workflow steps and return the final JSON result."
    )


# ── Direct-tool fallback (no AI orchestration) ────────────────────────────────

async def _run_direct_sequence(lead: dict) -> dict:
    """
    Call the MCP tools in a fixed sequence without using Claude as orchestrator.
    Used when ANTHROPIC_API_KEY is not set or when the agent fails.
    Demonstrates the same MCP tool interface, minus the AI decision layer.
    """
    log.info("Direct-tool sequence for lead: %s @ %s", lead.get("name"), lead.get("company"))

    server_params = StdioServerParameters(
        command=sys.executable,
        args=[_MCP_SERVER_SCRIPT],
        env={**os.environ},
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            async def call(tool_name: str, args: dict) -> dict:
                result = await session.call_tool(tool_name, arguments=args)
                text   = "".join(c.text for c in result.content if c.type == "text")
                log.info("Direct call %s ->%s", tool_name, text[:120])
                try:
                    return json.loads(text)
                except json.JSONDecodeError:
                    return {"raw": text}

            # Step 1: Save lead
            saved = await call("save_lead", {
                "name":    lead.get("name", ""),
                "email":   lead.get("email"),
                "company": lead.get("company", ""),
                "role":    lead.get("role"),
                "message": lead.get("message"),
                "source":  lead.get("source", "website"),
            })
            lead_id = saved.get("lead_id")
            if not lead_id:
                raise RuntimeError(f"save_lead did not return a lead_id. Got: {saved}")

            # Step 2: Company context (informational — used in prompt for generate_followup)
            await call("get_company_context", {"company_name": lead.get("company", "")})

            # Step 3: Generate follow-up
            followup = await call("generate_followup", {
                "name":    lead.get("name", ""),
                "company": lead.get("company", ""),
                "role":    lead.get("role", ""),
                "message": lead.get("message", ""),
            })

            # Step 4: Save followup drafts
            await call("save_followup", {
                "lead_id":       lead_id,
                "email_content": followup.get("email", ""),
                "sms_content":   followup.get("sms", ""),
            })

            # Step 5: Update lead score and summary
            await call("update_lead_score", {
                "lead_id": lead_id,
                "score":   followup.get("lead_score", "Warm"),
                "summary": followup.get("summary", ""),
            })

            return {
                "lead_id":    lead_id,
                "lead_score": followup.get("lead_score", "Warm"),
                "summary":    followup.get("summary", ""),
                "status":     "processed",
            }
