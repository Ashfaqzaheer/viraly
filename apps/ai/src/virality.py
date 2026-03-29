"""
Virality Improvement Engine for Viraly AI service.
Upgraded from basic prediction to detailed, actionable improvement system.
"""
import asyncio
import json
import os
import random
from typing import Any

import httpx

AI_PROVIDER_URL = os.getenv("AI_PROVIDER_URL", "https://api.openai.com/v1/chat/completions")
AI_PROVIDER_KEY = os.getenv("AI_PROVIDER_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = (
    "You are an expert social media virality analyst and improvement coach. "
    "Given a reel URL, analyze it deeply and return a JSON object with these keys:\n"
    "- \'score\': integer 0-100 representing overall viral potential\n"
    "- \'reachMin\': integer minimum estimated views\n"
    "- \'reachMax\': integer maximum estimated views (must be >= reachMin)\n"
    "- \'breakdown\': object with sub-scores (each 1-10):\n"
    "  - \'hookStrength\': how strong the opening hook is\n"
    "  - \'retentionPotential\': likelihood viewers watch to the end\n"
    "  - \'shareability\': how likely viewers will share/send to friends\n"
    "  - \'trendAlignment\': how well it aligns with current trends\n"
    "- \'improvements\': array of objects, each with:\n"
    "  - \'problem\': what is wrong (specific, not generic)\n"
    "  - \'fix\': what to do instead\n"
    "  - \'reason\': why this fix works\n"
    "- \'howToFix\': array of objects (step-by-step guide to reach 9/10), each with:\n"
    "  - \'problem\': the specific weakness\n"
    "  - \'fix\': the exact replacement (e.g., a better hook line)\n"
    "  - \'howToShoot\': array of strings with execution steps\n"
    "  - \'expectedResult\': what improvement to expect\n"
    "- \'suggestions\': array of quick improvement strings (backward compat)\n"
    "RULES: Be specific, not generic. Reference the actual reel content. "
    "Include at least 3 improvements when score < 70. "
    "Return only valid JSON."
)


async def _call_ai_provider(url: str) -> dict[str, Any]:
    user_prompt = (
        f"Analyze this reel for virality: {url}\n"
        "Return score, breakdown (hookStrength, retentionPotential, shareability, trendAlignment), "
        "reachMin, reachMax, improvements (problem/fix/reason), "
        "howToFix (problem/fix/howToShoot/expectedResult), and suggestions."
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

    async with httpx.AsyncClient(timeout=13.0) as client:
        response = await client.post(AI_PROVIDER_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)

    return _validate_prediction(parsed)


def _validate_prediction(parsed: dict) -> dict[str, Any]:
    score = max(0, min(100, int(parsed.get("score", 0))))
    reach_min = int(parsed.get("reachMin", 0))
    reach_max = int(parsed.get("reachMax", 0))
    if reach_max < reach_min:
        reach_max = reach_min

    breakdown = parsed.get("breakdown", {})
    breakdown = {
        "hookStrength": max(1, min(10, int(breakdown.get("hookStrength", 5)))),
        "retentionPotential": max(1, min(10, int(breakdown.get("retentionPotential", 5)))),
        "shareability": max(1, min(10, int(breakdown.get("shareability", 5)))),
        "trendAlignment": max(1, min(10, int(breakdown.get("trendAlignment", 5)))),
    }

    improvements = parsed.get("improvements", [])
    if not isinstance(improvements, list):
        improvements = []

    how_to_fix = parsed.get("howToFix", [])
    if not isinstance(how_to_fix, list):
        how_to_fix = []

    suggestions = parsed.get("suggestions", [])
    if score < 70 and len(suggestions) < 3:
        suggestions = suggestions + ["Improve hook strength", "Add a clear call-to-action", "Use trending audio"]
        suggestions = suggestions[:max(3, len(suggestions))]

    return {
        "score": score,
        "reachMin": reach_min,
        "reachMax": reach_max,
        "breakdown": breakdown,
        "improvements": improvements,
        "howToFix": how_to_fix,
        "suggestions": suggestions,
    }


def _generate_mock_prediction(url: str) -> dict[str, Any]:
    random.seed(hash(url) % 2**32)
    score = random.randint(35, 92)
    reach_min = random.randint(500, 5000)
    reach_max = reach_min + random.randint(2000, 50000)

    # Sub-scores derived from overall score with variance
    base = score / 10
    hook = max(1, min(10, round(base + random.uniform(-2, 1))))
    retention = max(1, min(10, round(base + random.uniform(-1, 1.5))))
    share = max(1, min(10, round(base + random.uniform(-1.5, 1))))
    trend = max(1, min(10, round(base + random.uniform(-2.5, 0.5))))

    breakdown = {
        "hookStrength": hook,
        "retentionPotential": retention,
        "shareability": share,
        "trendAlignment": trend,
    }

    # Generate specific improvements based on weak sub-scores
    improvements = []
    if hook <= 5:
        improvements.append({
            "problem": "Hook is too slow -- viewers scroll past in the first 1.5 seconds",
            "fix": "Start with a bold statement or visual pattern interrupt within 0.5 seconds",
            "reason": "Instagram data shows 65% of viewers decide to stay or leave in the first 2 seconds",
        })
    if retention <= 5:
        improvements.append({
            "problem": "Pacing drops in the middle -- viewers lose interest before the payoff",
            "fix": "Add a visual cut or new information every 3-4 seconds to maintain momentum",
            "reason": "Reels with consistent pacing have 40% higher completion rates",
        })
    if share <= 5:
        improvements.append({
            "problem": "No clear reason for viewers to share this with friends",
            "fix": "Add a relatable moment or surprising fact that makes viewers think of someone specific",
            "reason": "Shares are the strongest signal to the algorithm -- they 10x your reach",
        })
    if trend <= 5:
        improvements.append({
            "problem": "Content format does not match current trending patterns",
            "fix": "Use a trending audio clip and adopt a popular format like POV or before/after",
            "reason": "Trend-aligned content gets 3-5x more initial distribution from the algorithm",
        })
    if not improvements:
        improvements.append({
            "problem": "CTA is missing or weak",
            "fix": "End with a specific question or instruction (e.g., Save this for later)",
            "reason": "Reels with strong CTAs get 2x more saves and comments",
        })

    # How to fix guide
    how_to_fix = []
    if hook <= 6:
        how_to_fix.append({
            "problem": "Weak hook -- does not stop the scroll",
            "fix": "Use: Stop scrolling if you [niche-specific action]...",
            "howToShoot": [
                "Look directly at camera within 0.5 seconds",
                "Speak the hook line with energy and confidence",
                "Add bold white subtitles with black outline",
                "Use a rising sound effect in the first second",
            ],
            "expectedResult": "Higher retention rate in first 3 seconds, leading to more algorithm distribution",
        })
    if retention <= 6:
        how_to_fix.append({
            "problem": "Low retention -- viewers drop off before the end",
            "fix": "Restructure as: Hook (0-3s) -> Tease (3-5s) -> Deliver (5-15s) -> CTA (15-20s)",
            "howToShoot": [
                "Cut every 3-4 seconds to a new angle or visual",
                "Add text overlays on every scene for mute viewers",
                "Use a beat-synced transition at the midpoint",
                "Tease the payoff early so viewers stay for the reveal",
            ],
            "expectedResult": "30-50% improvement in watch-through rate",
        })
    if share <= 6:
        how_to_fix.append({
            "problem": "Low shareability -- no viral trigger",
            "fix": "Add a relatable or surprising moment that makes viewers tag a friend",
            "howToShoot": [
                "Include a moment viewers will relate to personally",
                "Add text: Tag someone who needs to see this",
                "Make the content useful enough to save for later",
                "End with something unexpected or funny",
            ],
            "expectedResult": "Shares are the #1 algorithm signal -- expect 2-5x reach increase",
        })
    if trend <= 6:
        how_to_fix.append({
            "problem": "Not aligned with current trends",
            "fix": "Adopt a trending format (POV, before/after, or list style) with trending audio",
            "howToShoot": [
                "Search Instagram Reels for trending audio in your niche",
                "Use the POV or transformation format",
                "Match your cuts to the beat of the audio",
                "Add the trending hashtags for discoverability",
            ],
            "expectedResult": "Trend-aligned content gets 3-5x more initial push from the algorithm",
        })

    suggestions = [imp["fix"] for imp in improvements[:5]]

    return {
        "score": score,
        "reachMin": reach_min,
        "reachMax": reach_max,
        "breakdown": breakdown,
        "improvements": improvements,
        "howToFix": how_to_fix,
        "suggestions": suggestions,
    }


async def predict_virality(url: str) -> dict[str, Any]:
    if not AI_PROVIDER_KEY:
        return _generate_mock_prediction(url)

    try:
        return await asyncio.wait_for(_call_ai_provider(url), timeout=14.5)
    except Exception:
        try:
            await asyncio.sleep(1)
            return await asyncio.wait_for(_call_ai_provider(url), timeout=13.0)
        except Exception as e:
            raise RuntimeError(f"Virality prediction failed after retry: {e}") from e
