import re
import json

def clean_text(text: str) -> str:
    """Cleans multiple spaces and tabs to single spaces."""
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def clean_json_response(raw_response: str) -> dict:
    """
    Cleans markdown code fences (like ```json ... ```) from LLM output 
    and parses it into a Python dictionary.
    """
    if not raw_response:
        return {}
    
    cleaned = raw_response.strip()
    
    # Remove markdown code fences if present
    if cleaned.startswith("```"):
        # Match ```json or ``` and strip it
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    
    cleaned = cleaned.strip()
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # If parsing fails, try to extract anything between { and }
        match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Failed to parse LLM response as JSON. Raw: {raw_response}")
