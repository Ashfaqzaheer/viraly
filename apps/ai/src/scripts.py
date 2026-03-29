"""
Script generation for Viraly AI service.
3-step flow — ALL steps return deep-detail scripts.
Step 1: Generate 1 full-detail script (scenes, shot list, lighting, audio, pro tips)
Step 2: Generate 3 unique full-detail scripts
Step 3: Generate full beginner execution guide for a selected script
"""
import asyncio
import json
import logging
import os
import random
import re
import uuid
from typing import Any, Optional

import httpx

logger = logging.getLogger("viraly.scripts")

AI_PROVIDER_URL = os.getenv("AI_PROVIDER_URL", "https://api.openai.com/v1/chat/completions")
AI_PROVIDER_KEY = os.getenv("AI_PROVIDER_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")

# Unified deep-detail system prompt used by ALL steps
DEEP_SCRIPT_SYSTEM = (
    "You are a professional viral Instagram content strategist and video production coach. "
    "You generate scripts based on REAL trending patterns, not generic content. "
    "CRITICAL RULES: "
    "1. NEVER copy existing hooks or captions verbatim. TRANSFORM patterns into original scripts. "
    "2. Use the same PATTERN but different WORDING. Same structure, original content. "
    "3. Every script must feel like it knows what is trending RIGHT NOW. "
    "Generate a DETAILED reel script with full production details. "
    "Return JSON: {\"script\": {"
    "\"hook\": str (attention-grabbing opening line), "
    "\"concept\": str (the creative concept), "
    "\"whyViral\": str (1-2 sentences on viral potential), "
    "\"duration\": str (e.g. '20-25 sec'), "
    "\"voiceType\": str (Talking Head / Voiceover / Mixed \u2014 with explanation), "
    "\"scenes\": [{\"sceneNumber\": int, \"title\": str, \"timeRange\": str, "
    "\"shotType\": str, \"cameraSetup\": str, \"action\": str, \"dialogue\": str or null, "
    "\"textOverlay\": str or null, \"sound\": str or null, \"lightingTip\": str or null, "
    "\"editingTip\": str or null}], "
    "\"caption\": str, \"hashtags\": [str] (no # prefix, 10-15 tags), "
    "\"trendingAudio\": [str] (3 suggestions), "
    "\"proTips\": [str] (3-4 tips), "
    "\"whyItWorks\": [str] (3-4 reasons)}}. "
    "Include 4-6 scenes with exact timing, shot types, camera setup, dialogue, "
    "text overlays, sound, lighting tips, and editing tips. "
    "Make it so detailed a complete beginner can shoot this with just a phone."
)

DEEP_MULTI_SYSTEM = (
    "You are a professional viral Instagram content strategist and video production coach. "
    "You generate scripts based on REAL trending patterns, not generic content. "
    "CRITICAL: Each script must use a DIFFERENT trend cluster, hook type, and emotion. "
    "NEVER copy hooks verbatim. TRANSFORM patterns into original scripts. "
    "Generate exactly 3 COMPLETELY DIFFERENT reel scripts with FULL production details. "
    "Each must have a DIFFERENT angle, DIFFERENT hook style, and DIFFERENT creative approach. "
    "Do NOT reword the same idea 3 times. Each script must be genuinely distinct. "
    "Return JSON: {\"scripts\": [{\"hook\": str, \"concept\": str, \"whyViral\": str, "
    "\"duration\": str, \"voiceType\": str, "
    "\"scenes\": [{\"sceneNumber\": int, \"title\": str, \"timeRange\": str, "
    "\"shotType\": str, \"cameraSetup\": str, \"action\": str, \"dialogue\": str or null, "
    "\"textOverlay\": str or null, \"sound\": str or null, \"lightingTip\": str or null, "
    "\"editingTip\": str or null}], "
    "\"caption\": str, \"hashtags\": [str] (no # prefix, 10-15 tags), "
    "\"trendingAudio\": [str], \"proTips\": [str], \"whyItWorks\": [str]}]}. "
    "Each script needs 4-6 scenes with full shot-by-shot instructions. "
    "CRITICAL: All 3 scripts must be truly unique \u2014 different formats, emotions, and hooks."
)

STEP3_SYSTEM = (
    "You are a professional video production coach for Instagram creators. "
    "Generate a DETAILED beginner-friendly shooting guide for the given script concept. "
    "Return JSON: {\"guide\": {"
    "\"title\": str, \"hook\": str, \"concept\": str, \"duration\": str, "
    "\"voiceType\": str, "
    "\"scenes\": [{\"sceneNumber\": int, \"title\": str, \"timeRange\": str, "
    "\"shotType\": str, \"cameraSetup\": str, \"action\": str, \"dialogue\": str or null, "
    "\"textOverlay\": str or null, \"sound\": str or null, \"lightingTip\": str or null, "
    "\"editingTip\": str or null}], "
    "\"subtitlesSuggestion\": str, \"editingNotes\": str, "
    "\"caption\": str, \"hashtags\": [str], \"callToAction\": str, "
    "\"trendingAudio\": [str], \"proTips\": [str], "
    "\"whyItWorks\": [str]}}. "
    "Each scene must have specific shot instructions a beginner can follow."
)


# -- LLM Call --

async def _llm_call(system: str, user: str, temperature: float = 0.9) -> dict:
    payload = {
        "model": AI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
        "temperature": temperature,
    }
    headers = {"Authorization": f"Bearer {AI_PROVIDER_KEY}", "Content-Type": "application/json"}
    logger.info("LLM call | model=%s temp=%.1f prompt_len=%d", AI_MODEL, temperature, len(user))
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(AI_PROVIDER_URL, json=payload, headers=headers)
        response.raise_for_status()
    data = response.json()
    content = data["choices"][0]["message"]["content"]
    return json.loads(content)


async def _llm_call_with_retry(system: str, user: str, temperature: float = 0.9) -> dict:
    try:
        return await asyncio.wait_for(_llm_call(system, user, temperature), timeout=29.0)
    except Exception:
        logger.warning("LLM call failed, retrying once...")
        await asyncio.sleep(0.5)
        return await asyncio.wait_for(_llm_call(system, user, temperature + 0.05), timeout=29.0)


# -- Hashtag helper --

_NICHE_HASHTAGS = {
    "fitness": ["fitnessmotivation", "gymtok", "workoutroutine", "fitcheck", "healthylifestyle", "gains", "fitfam", "gymlife", "fitnessjourney", "workout"],
    "finance": ["moneytok", "financialfreedom", "investing101", "budgeting", "wealthmindset", "passiveincome", "stockmarket", "crypto", "sidehustle", "moneygoals"],
    "comedy": ["comedyreels", "funnyvideos", "relatable", "humor", "comedygold", "memes", "funny", "lol", "comedysketch", "laughing"],
    "beauty": ["beautytok", "makeuptutorial", "skincareroutine", "glowup", "beautyhacks", "grwm", "skincare", "makeup", "beautytips", "selfcare"],
    "fashion": ["fashiontok", "ootd", "streetstyle", "fashiontrends", "styleinspo", "outfitideas", "fashionista", "lookbook", "thriftflip", "fashionweek"],
    "food": ["foodtok", "recipe", "cookinghacks", "foodie", "easyrecipe", "whatieatinaday", "homecooking", "mealprep", "foodporn", "cooking"],
    "travel": ["traveltok", "wanderlust", "travelreels", "hiddenplaces", "travelhacks", "bucketlist", "explore", "adventure", "travelgram", "vacation"],
    "tech": ["techtok", "techreview", "coding", "ai", "techtrends", "programming", "developer", "startup", "innovation", "gadgets"],
    "education": ["edutok", "learnontiktok", "studytips", "knowledge", "facts", "didyouknow", "learning", "studywithme", "educational", "mindblown"],
    "lifestyle": ["lifestyleblogger", "dayinmylife", "aesthetic", "productive", "morningroutine", "selfcare", "wellness", "minimalist", "dailyvlog", "motivation"],
}


def _get_hashtags(niche: str, idea: str) -> list[str]:
    niche_tags = _NICHE_HASHTAGS.get(niche, ["viral", "trending", "explore", "reels", "fyp", "content", "creator"])
    base_tags = ["trendingreels", "viralreels", "reelitfeelit", "explorepage", "instagramreels"]
    idea_tag = re.sub(r"[^a-z0-9]", "", idea.lower())[:20]
    tags = list(set(niche_tags[:7] + base_tags[:4]))
    if idea_tag:
        tags.append(idea_tag)
    return tags[:15]




# -- Trend Context Prompt Injection --

def _build_trend_injection(trend_context: dict | None) -> str:
    """Build a trend injection block for the AI prompt from trend context data."""
    if not trend_context:
        return ""

    parts = ["\n\n--- TRENDING PATTERNS (use as inspiration, NEVER copy verbatim) ---"]

    # Inject top hooks
    top_hooks = trend_context.get("topHooks", [])
    if top_hooks:
        parts.append("\nTrending hooks in this niche (TRANSFORM these, do NOT copy):")
        for h in top_hooks[:5]:
            parts.append(f"  - {h}")

    # Inject top patterns
    top_patterns = trend_context.get("topPatterns", [])
    if top_patterns:
        parts.append("\nTrending hook patterns:")
        for p in top_patterns[:5]:
            parts.append(f"  - Template: {p.get('hookTemplate', '')} | Type: {p.get('hookType', '')} | Emotion: {p.get('emotionType', '')} | Score: {p.get('trendScore', 0)}")

    # Inject top structures and formats
    structures = trend_context.get("topStructures", [])
    formats = trend_context.get("topFormats", [])
    if structures:
        parts.append(f"\nTrending structures: {', '.join(structures[:4])}")
    if formats:
        parts.append(f"Trending formats: {', '.join(formats[:4])}")

    # Inject cluster info
    clusters = trend_context.get("topClusters", [])
    if clusters:
        parts.append("\nTrend clusters (each script should draw from a different cluster):")
        for c in clusters[:4]:
            parts.append(f"  - {c.get('name', '')} (growth: +{c.get('growthPercent', 0)}%, strength: {c.get('strength', 0)})")

    parts.append("\nRULES: Use the PATTERN but create ORIGINAL wording. Same structure, different words. No plagiarism.")
    parts.append("--- END TRENDING PATTERNS ---\n")

    return "\n".join(parts)

# -- Step 1: Initial Script (FULL DETAIL -- same depth as guide) --

async def generate_initial_script(niche: str, idea: str, trend_context: dict | None = None) -> dict[str, Any]:
    logger.info("Step 1 (deep) | niche=%s idea=%s", niche, idea)
    if AI_PROVIDER_KEY:
        trend_injection = _build_trend_injection(trend_context)
        user_prompt = (
            f"Niche: {niche}\nCreator idea: {idea}\n"
            f"{trend_injection}\n"
            f"Generate 1 specific, creative reel script with FULL production details. "
            f"Use the trending patterns above as INSPIRATION to create an ORIGINAL script. "
            f"TRANSFORM the patterns -- same structure, completely different wording. "
            f"Include 4-6 scenes with exact timing, shot types, camera angles, dialogue, "
            f"text overlays, sound cues, lighting tips, and editing suggestions. "
            f"Make the hook attention-grabbing and every scene actionable for a beginner."
        )
        result = await _llm_call_with_retry(DEEP_SCRIPT_SYSTEM, user_prompt, temperature=0.85)
        script = result.get("script", result)
    else:
        script = _mock_deep_script(niche, idea, trend_context)
    script["id"] = str(uuid.uuid4())
    logger.info("Step 1 done | id=%s scenes=%d", script["id"], len(script.get("scenes", [])))
    return script


def _mock_deep_script(niche: str, idea: str, trend_context: dict | None = None) -> dict[str, Any]:
    # Use trend context hooks if available, otherwise fallback
    if trend_context and trend_context.get("topPatterns"):
        patterns = trend_context["topPatterns"]
        # Transform patterns into original hooks (same pattern, different words)
        hooks = []
        for p in patterns[:5]:
            template = p.get("hookTemplate", "")
            # Replace template placeholders with actual idea/niche
            transformed = template.replace("[mistake/bug]", idea).replace("[time period]", "my entire day")
            transformed = transformed.replace("[bad practice]", idea).replace("[context]", niche)
            transformed = transformed.replace("[audience]", f"{niche} creators").replace("[topic]", idea)
            transformed = transformed.replace("[relatable developer scenario]", f"you finally master {idea}")
            transformed = transformed.replace("[automated/built]", "mastered").replace("[thing]", idea).replace("[short time]", "one weekend")
            transformed = transformed.replace("[tool/extension]", idea).replace("[workflow]", f"{niche} workflow")
            transformed = transformed.replace("[number]", "50").replace("[twist]", f"then {idea} changed everything")
            transformed = transformed.replace("[exercise]", idea).replace("[time]", "30 days")
            transformed = transformed.replace("[authority]", "everyone").replace("[body part]", "progress")
            transformed = transformed.replace("[achieved result]", f"mastered {idea}").replace("[expected method]", "the usual approach")
            transformed = transformed.replace("[amount]", "a lot").replace("[age]", "25")
            transformed = transformed.replace("[habit]", f"ignoring {idea}").replace("[negative outcome]", "stuck")
            transformed = transformed.replace("[common action]", "the old way").replace("[routine]", f"{idea} routine")
            transformed = transformed.replace("[role]", f"{niche} creator").replace("[days]", "30 days")
            transformed = transformed.replace("[critical skill]", idea).replace("[activity]", idea)
            transformed = transformed.replace("[trigger phrase]", f"just a small {idea} change")
            transformed = transformed.replace("[relatable workplace/life scenario]", f"you finally nail {idea}")
            transformed = transformed.replace("[expensive thing]", f"expensive {idea} tools")
            transformed = transformed.replace("[product/hack]", idea).replace("[dramatic result]", f"transformed my {niche} game")
            transformed = transformed.replace("[cooking method]", idea).replace("[timeframe]", "entire week")
            transformed = transformed.replace("[Number]", "3").replace("[Superlative]", "best").replace("[Thing]", idea)
            if transformed and transformed != template:
                hooks.append(transformed)
        if not hooks:
            hooks = [f"This {idea} approach is trending in {niche} right now -- here is why"]
    else:
        hooks = [
            f"Nobody in {niche} is doing this with {idea}... and it is a mistake",
            f"I tried {idea} for 7 days as a {niche} creator -- here is what happened",
            f"The {idea} approach that is blowing up in {niche} right now",
            f"Stop scrolling -- this {idea} trick will change your {niche} game",
            f"POV: You finally nail {idea} in your {niche} content",
        ]
    hook = random.choice(hooks)
    return {
        "hook": hook,
        "concept": f"{idea.title()} -- {niche.title()} Creator Edition",
        "whyViral": f"This {idea} angle taps into the curiosity gap -- viewers need to see the result. Combined with the {niche} niche trending upward, this format drives high saves and shares.",
        "duration": "20-25 sec",
        "voiceType": "Mixed -- Use voiceover for explanations and talking head for the hook and CTA. This keeps energy high while maintaining clarity.",
        "scenes": [
            {
                "sceneNumber": 1, "title": "Hook",
                "timeRange": "0-3s", "shotType": "Close-up / selfie angle",
                "cameraSetup": "Handheld, front camera, eye level",
                "action": f"Look directly at camera with energy. Deliver the hook about {idea}.",
                "dialogue": hook, "textOverlay": hook,
                "sound": "Trending hook audio -- use a rising sound effect",
                "lightingTip": "Face a window for natural light on your face",
                "editingTip": "Quick zoom-in on the first word for impact",
            },
            {
                "sceneNumber": 2, "title": "Setup / Context",
                "timeRange": "3-8s", "shotType": "Medium shot / screen recording",
                "cameraSetup": "Tripod or propped phone, slightly wider angle",
                "action": f"Show the context -- your {niche} setup, the problem, or the starting point for {idea}.",
                "dialogue": f"So here is what most people get wrong about {idea}...",
                "textOverlay": f"The {idea} truth nobody shares",
                "sound": None,
                "lightingTip": "Keep consistent lighting from Scene 1",
                "editingTip": "Cut on action -- transition as you gesture or move",
            },
            {
                "sceneNumber": 3, "title": "Main Content / Demo",
                "timeRange": "8-15s", "shotType": "Mix of close-ups and medium shots",
                "cameraSetup": "Switch between angles -- front and side",
                "action": f"Demonstrate the core of your {idea} content. Show, do not just tell.",
                "dialogue": f"Here is exactly how I approach {idea} -- watch closely...",
                "textOverlay": f"Step-by-step {idea} breakdown",
                "sound": "Background lo-fi beat kicks in",
                "lightingTip": "If showing a screen, reduce background light to avoid glare",
                "editingTip": "Use 2-3 quick cuts here to maintain energy. Add subtle zoom on key moments.",
            },
            {
                "sceneNumber": 4, "title": "Result / Payoff",
                "timeRange": "15-20s", "shotType": "Reveal shot -- wide or dramatic angle",
                "cameraSetup": "Tripod, pull back for full reveal",
                "action": "Show the result, the transformation, or the aha moment.",
                "dialogue": None, "textOverlay": "The result speaks for itself",
                "sound": "Beat drop or reveal sound effect",
                "lightingTip": "Best lighting for this shot -- golden hour or ring light",
                "editingTip": "Slow-mo on the reveal moment, then snap back to normal speed",
            },
            {
                "sceneNumber": 5, "title": "CTA -- Call to Action",
                "timeRange": "20-25s", "shotType": "Close-up, face to camera",
                "cameraSetup": "Handheld, same as Scene 1 for visual bookend",
                "action": "Look at camera genuinely. Deliver CTA with confidence.",
                "dialogue": f"Save this if you want more {niche} tips. Follow for daily scripts!",
                "textOverlay": f"Follow for more {niche} content",
                "sound": "Outro music fade",
                "lightingTip": "Same as Scene 1 -- consistency matters",
                "editingTip": "Add a subtle fade or hold the last frame for 1 extra second",
            },
        ],
        "caption": f"{hook} Drop a fire emoji if you want the full breakdown!",
        "hashtags": _get_hashtags(niche, idea),
        "trendingAudio": [
            "Lo-fi chill beats (search aesthetic in Reels audio)",
            "Trending hook sounds with beat drops",
            f"Search {niche} motivation in Instagram audio library",
        ],
        "proTips": [
            "Film in natural light near a window -- it looks 10x better than ring lights",
            "Record each scene 2-3 times and pick the best take in editing",
            "Add text overlays on EVERY scene -- most viewers watch on mute",
            "Post between 6-9 PM in your timezone for maximum initial reach",
        ],
        "whyItWorks": [
            f"{idea} content is trending in the {niche} space right now",
            "Scene-by-scene format keeps viewers watching till the end",
            "Strong hook + CTA combo drives follows and saves",
            "Beginner-friendly = shareable to friends who want to start creating",
        ],
    }


# -- Step 2: Generate More (3 unique FULL-DETAIL scripts) --

async def generate_more_scripts(niche: str, idea: str, trend_context: dict | None = None) -> list[dict[str, Any]]:
    logger.info("Step 2 (deep) | niche=%s idea=%s", niche, idea)
    if AI_PROVIDER_KEY:
        trend_injection = _build_trend_injection(trend_context)
        user_prompt = (
            f"Niche: {niche}\nCreator idea: {idea}\n"
            f"{trend_injection}\n"
            f"Generate 3 COMPLETELY DIFFERENT reel scripts with FULL production details. "
            f"Each script MUST use a DIFFERENT trend cluster from the patterns above. "
            f"TRANSFORM the patterns -- same structure, completely different wording. "
            f"Each must take a totally different creative angle:\n"
            f"- Script 1: A different FORMAT (e.g., tutorial, POV, challenge, storytelling)\n"
            f"- Script 2: A different EMOTION (e.g., funny, inspiring, shocking, educational)\n"
            f"- Script 3: A different HOOK STYLE (e.g., question, bold claim, controversy, curiosity)\n\n"
            f"Each script needs 4-6 scenes with exact timing, shot types, camera setup, "
            f"dialogue, text overlays, sound cues, lighting tips, and editing suggestions. "
            f"They must NOT be variations of the same idea. NO duplicate hooks or concepts."
        )
        result = await _llm_call_with_retry(DEEP_MULTI_SYSTEM, user_prompt, temperature=0.95)
        scripts = result.get("scripts", [])
        if len(scripts) == 3 and _scripts_too_similar(scripts):
            logger.warning("Scripts too similar, regenerating...")
            result = await _llm_call_with_retry(DEEP_MULTI_SYSTEM, user_prompt, temperature=1.1)
            scripts = result.get("scripts", [])
        logger.info("Step 2 done | count=%d unique=%s", len(scripts), not _scripts_too_similar(scripts))
    else:
        scripts = _mock_more_scripts(niche, idea, trend_context)
        logger.info("Step 2 done (mock) | count=%d", len(scripts))
    for s in scripts:
        s["id"] = str(uuid.uuid4())
    return scripts


def _scripts_too_similar(scripts: list[dict]) -> bool:
    if len(scripts) < 2:
        return False
    hooks = [s.get("hook", "").lower().strip() for s in scripts]
    for i in range(len(hooks)):
        words_i = set(hooks[i].split())
        for j in range(i + 1, len(hooks)):
            words_j = set(hooks[j].split())
            if not words_i or not words_j:
                continue
            overlap = len(words_i & words_j) / min(len(words_i), len(words_j))
            if overlap > 0.5:
                return True
    return False


def _mock_more_scripts(niche: str, idea: str, trend_context: dict | None = None) -> list[dict[str, Any]]:
    templates = [
        {
            "hook": f"I tried {idea} for a week -- here is my honest review as a {niche} creator",
            "concept": f"7-Day {idea.title()} Challenge -- {niche.title()} Edition",
            "whyViral": "Challenge content drives participation. Viewers comment Day 1 and share to stories, creating organic reach loops.",
        },
        {
            "hook": f"3 {idea} mistakes every {niche} beginner makes (and what to do instead)",
            "concept": f"Common {idea.title()} Mistakes -- The Fix Nobody Shares",
            "whyViral": "Mistake-correction content gets high saves because viewers bookmark it as a reference. The number format sets clear expectations.",
        },
        {
            "hook": f"POV: You discover the {idea} secret that {niche} pros do not share",
            "concept": f"The Hidden {idea.title()} Strategy -- {niche.title()} Pro Secrets",
            "whyViral": "Secret and pro tips hooks create curiosity gaps that stop the scroll. POV format adds immersion and relatability.",
        },
    ]
    scripts = []
    voice_types = [
        "Talking Head -- Direct, personal energy builds trust.",
        "Voiceover -- Clean narration over B-roll keeps focus on visuals.",
        "Mixed -- Talking head for hook/CTA, voiceover for the teaching sections.",
    ]
    for i, tmpl in enumerate(templates):
        script = {
            **tmpl,
            "duration": "20-25 sec",
            "voiceType": voice_types[i],
            "scenes": [
                {
                    "sceneNumber": 1, "title": "Hook",
                    "timeRange": "0-3s", "shotType": "Close-up / selfie angle",
                    "cameraSetup": "Handheld, front camera, eye level",
                    "action": "Deliver the hook with energy. Make eye contact with the lens.",
                    "dialogue": tmpl["hook"], "textOverlay": tmpl["hook"],
                    "sound": "Trending hook sound -- rising whoosh effect",
                    "lightingTip": "Face a window for soft natural light",
                    "editingTip": "Quick zoom-in on first word for impact",
                },
                {
                    "sceneNumber": 2, "title": "Setup",
                    "timeRange": "3-8s", "shotType": "Medium shot",
                    "cameraSetup": "Tripod or propped phone, wider angle",
                    "action": f"Set the context for your {idea} take. Show the problem or starting point.",
                    "dialogue": f"Here is what most {niche} creators miss about {idea}...",
                    "textOverlay": f"The {idea} truth", "sound": None,
                    "lightingTip": "Keep consistent with Scene 1",
                    "editingTip": "Cut on action for smooth transition",
                },
                {
                    "sceneNumber": 3, "title": "Main Content",
                    "timeRange": "8-16s", "shotType": "Mix of close-ups and medium shots",
                    "cameraSetup": "Switch between front and side angles",
                    "action": f"Demonstrate the core {idea} content. Show, don't just tell.",
                    "dialogue": "Watch this -- this is the part that changes everything...",
                    "textOverlay": "Step-by-step breakdown", "sound": "Lo-fi beat kicks in",
                    "lightingTip": "Add side lighting for depth if possible",
                    "editingTip": "2-3 quick cuts to maintain energy",
                },
                {
                    "sceneNumber": 4, "title": "Payoff / Result",
                    "timeRange": "16-21s", "shotType": "Reveal shot -- wide angle",
                    "cameraSetup": "Pull back for the full reveal",
                    "action": "Show the transformation, result, or aha moment.",
                    "dialogue": None, "textOverlay": "The result speaks for itself",
                    "sound": "Beat drop or reveal sound effect",
                    "lightingTip": "Best lighting -- golden hour or ring light",
                    "editingTip": "Slow-mo on reveal, snap back to normal speed",
                },
                {
                    "sceneNumber": 5, "title": "CTA",
                    "timeRange": "21-25s", "shotType": "Close-up, face to camera",
                    "cameraSetup": "Handheld, same as Scene 1",
                    "action": "Deliver CTA with genuine energy.",
                    "dialogue": f"Save this and follow for more {niche} content!",
                    "textOverlay": f"Follow for {niche} tips",
                    "sound": "Outro music fade",
                    "lightingTip": "Same as Scene 1 for visual bookend",
                    "editingTip": "Hold last frame 1 extra second",
                },
            ],
            "caption": f"{tmpl['hook']} Drop a fire emoji if you want more!",
            "hashtags": _get_hashtags(niche, idea),
            "trendingAudio": [
                "Lo-fi chill beats (search aesthetic in Reels audio)",
                "Trending hook sounds with beat drops",
                f"Search {niche} motivation in Instagram audio library",
            ],
            "proTips": [
                "Film in natural light near a window for the best look",
                "Record each scene 2-3 times and pick the best take",
                "Add text overlays on EVERY scene -- 85% watch on mute",
                f"Post between 6-9 PM for maximum {niche} audience reach",
            ],
            "whyItWorks": [
                f"{idea} content is trending in {niche} right now",
                "Scene-by-scene format maximizes watch time",
                "Strong hook + CTA drives follows and saves",
                "Beginner-friendly format is highly shareable",
            ],
        }
        scripts.append(script)
    return scripts


# -- Step 3: Full Execution Guide --

async def generate_execution_guide(niche: str, idea: str, hook: str, concept: str) -> dict[str, Any]:
    logger.info("Step 3 | niche=%s concept=%s", niche, concept[:50])
    if AI_PROVIDER_KEY:
        user_prompt = (
            f"Niche: {niche}\nCreator idea: {idea}\n"
            f"Selected hook: {hook}\nSelected concept: {concept}\n\n"
            f"Generate a COMPLETE beginner-friendly shooting guide for this reel. "
            f"Include 4-6 scenes with exact timing, shot types, camera setup, dialogue/voiceover, "
            f"text overlays, sound suggestions, lighting tips, and editing suggestions. "
            f"The guide should be so detailed that a complete beginner can shoot this reel "
            f"with just a phone and natural light. "
            f"Also suggest whether to use Talking Head, Voiceover, or Mixed approach and explain why."
        )
        result = await _llm_call_with_retry(STEP3_SYSTEM, user_prompt, temperature=0.8)
        guide = result.get("guide", result)
    else:
        guide = _mock_execution_guide(niche, idea, hook, concept)
    guide["id"] = str(uuid.uuid4())
    logger.info("Step 3 done | scenes=%d", len(guide.get("scenes", [])))
    return guide


def _mock_execution_guide(niche: str, idea: str, hook: str, concept: str) -> dict[str, Any]:
    return {
        "title": concept,
        "hook": hook,
        "concept": concept,
        "duration": "20-25 sec",
        "voiceType": "Mixed -- Use voiceover for explanations and talking head for the hook and CTA.",
        "scenes": [
            {
                "sceneNumber": 1, "title": "Hook",
                "timeRange": "0-3s", "shotType": "Close-up / selfie angle",
                "cameraSetup": "Handheld, front camera, eye level",
                "action": f"Look directly at camera with energy. Deliver the hook about {idea}.",
                "dialogue": hook, "textOverlay": hook,
                "sound": "Trending hook audio -- use a rising sound effect",
                "lightingTip": "Face a window for natural light on your face",
                "editingTip": "Quick zoom-in on the first word for impact",
            },
            {
                "sceneNumber": 2, "title": "Setup / Context",
                "timeRange": "3-8s", "shotType": "Medium shot / screen recording",
                "cameraSetup": "Tripod or propped phone, slightly wider angle",
                "action": f"Show the context -- your {niche} setup, the problem, or the starting point for {idea}.",
                "dialogue": f"So here is what most people get wrong about {idea}...",
                "textOverlay": f"The {idea} truth nobody shares",
                "sound": None,
                "lightingTip": "Keep consistent lighting from Scene 1",
                "editingTip": "Cut on action -- transition as you gesture or move",
            },
            {
                "sceneNumber": 3, "title": "Main Content",
                "timeRange": "8-15s", "shotType": "Mix of close-ups and medium shots",
                "cameraSetup": "Switch between angles -- front and side",
                "action": f"Demonstrate the core of your {idea} content. Show, do not just tell.",
                "dialogue": f"Here is exactly how I approach {idea} -- watch closely...",
                "textOverlay": f"Step-by-step {idea} breakdown",
                "sound": "Background lo-fi beat kicks in",
                "lightingTip": "If showing a screen, reduce background light to avoid glare",
                "editingTip": "Use 2-3 quick cuts here to maintain energy.",
            },
            {
                "sceneNumber": 4, "title": "Result / Payoff",
                "timeRange": "15-20s", "shotType": "Reveal shot -- wide or dramatic angle",
                "cameraSetup": "Tripod, pull back for full reveal",
                "action": "Show the result, the transformation, or the aha moment.",
                "dialogue": None, "textOverlay": "The result speaks for itself",
                "sound": "Beat drop or reveal sound effect",
                "lightingTip": "Best lighting for this shot -- golden hour or ring light",
                "editingTip": "Slow-mo on the reveal moment, then snap back to normal speed",
            },
            {
                "sceneNumber": 5, "title": "CTA -- Call to Action",
                "timeRange": "20-25s", "shotType": "Close-up, face to camera",
                "cameraSetup": "Handheld, same as Scene 1 for visual bookend",
                "action": "Look at camera genuinely. Deliver CTA with confidence.",
                "dialogue": f"Save this if you want more {niche} tips. Follow for daily scripts!",
                "textOverlay": f"Follow for more {niche} content",
                "sound": "Outro music fade",
                "lightingTip": "Same as Scene 1 -- consistency matters",
                "editingTip": "Add a subtle fade or hold the last frame for 1 extra second",
            },
        ],
        "subtitlesSuggestion": "Add auto-captions (Instagram has built-in). Use white text with black outline for readability. 85% of viewers watch on mute.",
        "editingNotes": "Keep cuts tight -- no dead air. Use 0.5s transitions between scenes. Add subtle zoom animations on text overlays.",
        "caption": f"{hook} Drop a fire emoji if you want more {idea} content!",
        "hashtags": _get_hashtags(niche, idea),
        "callToAction": f"Save this and shoot it today! Follow for daily {niche} scripts.",
        "trendingAudio": [
            "Lo-fi chill beats (search aesthetic in Reels audio)",
            "Trending hook sounds with beat drops",
            f"Search {niche} motivation in Instagram audio library",
        ],
        "proTips": [
            "Film in natural light near a window -- it looks 10x better than ring lights",
            "Record each scene 2-3 times and pick the best take in editing",
            "Add text overlays on EVERY scene -- most viewers watch on mute",
            "Post between 6-9 PM in your timezone for maximum initial reach",
        ],
        "whyItWorks": [
            f"{idea} content is trending in the {niche} space right now",
            "Scene-by-scene format keeps viewers watching till the end",
            "Strong hook + CTA combo drives follows and saves",
            "Beginner-friendly = shareable to friends who want to start creating",
        ],
    }


# -- Legacy compatibility --

async def generate_scripts(niche: str, idea: Optional[str] = None) -> list[dict[str, Any]]:
    actual_idea = idea or f"{niche} content"
    script = await generate_initial_script(niche, actual_idea)
    return [script]
