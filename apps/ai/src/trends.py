"""
Trend Radar logic for Viraly AI service.
Requirements: 7.1, 7.5
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
    "You are a social media trend analyst. Generate a list of currently trending content formats "
    "and styles for Instagram and TikTok creators. "
    "Return a JSON object with a 'trends' array. Each trend must have: "
    "'title' (string), 'description' (string), 'exampleFormat' (string), "
    "'engagementLiftPercent' (number, estimated % engagement lift), 'niche' (string). "
    "Include trends across multiple niches: fitness, finance, comedy, lifestyle, education, beauty, food, travel. "
    "Return at least 10 trends."
)

NICHES = [
    "fitness", "finance", "comedy", "lifestyle",
    "education", "beauty", "food", "travel",
]


async def _call_ai_provider() -> list[dict[str, Any]]:
    """Call the AI provider and return the parsed trends list."""
    user_prompt = (
        "Generate a list of at least 10 currently trending content formats and styles "
        "for Instagram and TikTok creators across multiple niches. "
        "Focus on formats that are driving high engagement right now."
    )

    payload = {
        "model": AI_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.7,
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
    trends = parsed.get("trends", [])

    if not trends:
        raise ValueError("AI provider returned no trends")

    # Validate required fields on each trend
    required_keys = {"title", "description", "exampleFormat", "engagementLiftPercent", "niche"}
    for trend in trends:
        missing = required_keys - trend.keys()
        if missing:
            raise ValueError(f"Trend missing required fields: {missing}")

    return trends


def _generate_mock_trends() -> list[dict[str, Any]]:
    """Generate realistic mock trends when no AI provider key is configured."""
    return [
        {"title": "Get Ready With Me (GRWM)", "description": "Casual narrated routines showing authentic daily prep", "exampleFormat": "30-60s talking head with product close-ups", "engagementLiftPercent": 45, "niche": "beauty"},
        {"title": "Day in My Life", "description": "Aesthetic vlog-style content showing daily routines", "exampleFormat": "60-90s montage with trending audio", "engagementLiftPercent": 38, "niche": "lifestyle"},
        {"title": "Myth vs Fact", "description": "Quick debunking format with split-screen or text overlays", "exampleFormat": "15-30s with bold text and reaction", "engagementLiftPercent": 52, "niche": "fitness"},
        {"title": "Silent Tutorial", "description": "Step-by-step tutorials with text overlays and no voiceover", "exampleFormat": "30-45s overhead shot with captions", "engagementLiftPercent": 41, "niche": "food"},
        {"title": "Money Math", "description": "Quick financial breakdowns with on-screen calculations", "exampleFormat": "15-30s with calculator or whiteboard", "engagementLiftPercent": 55, "niche": "finance"},
        {"title": "POV Storytelling", "description": "First-person narrative reels with dramatic hooks", "exampleFormat": "30-60s talking to camera with captions", "engagementLiftPercent": 48, "niche": "comedy"},
        {"title": "Before & After", "description": "Transformation reveals with dramatic transitions", "exampleFormat": "15-30s with snap transition", "engagementLiftPercent": 60, "niche": "fitness"},
        {"title": "Hidden Gems", "description": "Showcasing underrated spots or products", "exampleFormat": "30-45s cinematic b-roll with voiceover", "engagementLiftPercent": 43, "niche": "travel"},
        {"title": "Explain Like I'm 5", "description": "Complex topics broken down with simple analogies", "exampleFormat": "30-60s whiteboard or prop-based explanation", "engagementLiftPercent": 50, "niche": "education"},
        {"title": "Outfit Check", "description": "Quick outfit transitions synced to beat drops", "exampleFormat": "15-30s with trending audio beat sync", "engagementLiftPercent": 42, "niche": "lifestyle"},
    ]


async def refresh_trends() -> list[dict[str, Any]]:
    """
    Fetch trending content formats from the AI provider.
    Retries once on AI provider error.
    Requirements: 7.1, 7.5
    """
    if not AI_PROVIDER_KEY:
        return _generate_mock_trends()

    try:
        return await asyncio.wait_for(_call_ai_provider(), timeout=29.5)
    except Exception:
        # Retry once on AI provider error
        try:
            await asyncio.sleep(1)
            return await asyncio.wait_for(_call_ai_provider(), timeout=28.0)
        except Exception as e:
            raise RuntimeError(f"Trend refresh failed after retry: {e}") from e
