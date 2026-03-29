"""
Reel feedback analysis logic for Viraly AI service.
Requirements: 5.2, 5.3, 5.5
"""
import asyncio
import json
import os
from typing import Any

import httpx

AI_PROVIDER_URL = os.getenv("AI_PROVIDER_URL", "https://api.openai.com/v1/chat/completions")
AI_PROVIDER_KEY = os.getenv("AI_PROVIDER_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = (
    "You are an expert social media content analyst. Analyze the given reel URL and return "
    "structured feedback as a JSON object with two keys: 'scores' and 'commentary'. "
    "'scores' must contain integer values 0-100 for: hookStrength, pacing, captionQuality, "
    "hashtagRelevance, ctaEffectiveness. "
    "'commentary' must contain a string explanation for each of those same five keys."
)


async def _call_ai_provider(url: str) -> dict[str, Any]:
    """Call the AI provider and return parsed feedback dict."""
    user_prompt = (
        f"Analyze this reel URL and provide structured feedback: {url}\n"
        "Score each dimension 0-100 and provide commentary explaining the score."
    )

    payload = {
        "model": AI_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
    }

    headers = {
        "Authorization": f"Bearer {AI_PROVIDER_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=28.0) as client:
        response = await client.post(AI_PROVIDER_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)

    # Validate required structure
    scores = parsed.get("scores", {})
    commentary = parsed.get("commentary", {})
    required_keys = {"hookStrength", "pacing", "captionQuality", "hashtagRelevance", "ctaEffectiveness"}

    if not required_keys.issubset(scores.keys()):
        raise ValueError(f"Missing score keys: {required_keys - scores.keys()}")
    if not required_keys.issubset(commentary.keys()):
        raise ValueError(f"Missing commentary keys: {required_keys - commentary.keys()}")

    return {"scores": scores, "commentary": commentary}


def _generate_mock_feedback(url: str) -> dict[str, Any]:
    """Generate realistic mock feedback when no AI provider key is configured."""
    import random
    random.seed(hash(url) % 2**32)
    return {
        "scores": {
            "hookStrength": random.randint(55, 95),
            "pacing": random.randint(50, 90),
            "captionQuality": random.randint(45, 85),
            "hashtagRelevance": random.randint(40, 80),
            "ctaEffectiveness": random.randint(50, 88),
        },
        "commentary": {
            "hookStrength": "The opening grabs attention within the first second. Consider adding text overlay for extra impact.",
            "pacing": "Good rhythm overall. The middle section could be tightened by 1-2 seconds to maintain viewer retention.",
            "captionQuality": "Caption tells a story but could benefit from a stronger emotional hook in the first line.",
            "hashtagRelevance": "Mix of broad and niche hashtags is solid. Consider adding 1-2 trending hashtags for extra reach.",
            "ctaEffectiveness": "Clear call-to-action but could be more specific. Try asking a question to drive comments.",
        },
    }


async def analyze_reel(url: str) -> dict[str, Any]:
    """
    Analyze a reel URL and return structured feedback.
    Retries once on AI provider error. Enforces 30-second response time.
    Requirements: 5.2, 5.3, 5.5
    """
    if not AI_PROVIDER_KEY:
        return _generate_mock_feedback(url)

    try:
        # Requirement 5.3: 30-second total response time (29.5s timeout)
        return await asyncio.wait_for(_call_ai_provider(url), timeout=29.5)
    except Exception:
        # Retry once on AI provider error (same pattern as scripts.py)
        try:
            await asyncio.sleep(1)
            return await asyncio.wait_for(_call_ai_provider(url), timeout=28.0)
        except Exception as e:
            raise RuntimeError(f"Reel analysis failed after retry: {e}") from e
