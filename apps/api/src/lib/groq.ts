/**
 * Shared Groq/OpenAI-compatible AI client.
 * Replaces the external Python AI service with direct API calls.
 */

const AI_URL = process.env.AI_PROVIDER_URL ?? 'https://api.groq.com/openai/v1/chat/completions'
const AI_KEY = process.env.AI_PROVIDER_KEY ?? ''
const AI_MODEL = process.env.AI_MODEL ?? 'llama-3.3-70b-versatile'
const TIMEOUT_MS = 15_000

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
}

async function callAI(systemPrompt: string, userPrompt: string, temperature = 0.85): Promise<any> {
  if (!AI_KEY) {
    throw new Error('AI_PROVIDER_KEY not configured — cannot generate content')
  }

  console.log(`[groq] Calling ${AI_MODEL} | temp=${temperature} | prompt=${userPrompt.slice(0, 80)}...`)

  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_KEY}`,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      top_p: 0.9,
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[groq] API error ${res.status}: ${body.slice(0, 200)}`)
    throw new Error(`AI API error ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json() as any
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')

  console.log(`[groq] Response received | length=${content.length}`)

  try {
    return JSON.parse(stripCodeFences(content))
  } catch (parseErr) {
    console.error(`[groq] JSON parse failed: ${(parseErr as Error).message} | raw=${content.slice(0, 200)}`)
    throw new Error('AI returned invalid JSON')
  }
}

// ── Script Generation ────────────────────────────────────────────────────────

export async function generateInitialScript(params: {
  niche: string; idea: string; trendContext: any
}): Promise<Record<string, unknown>> {
  const { niche, idea, trendContext } = params
  const trendInfo = trendContext?.topClusters?.length
    ? `\nTrending now in ${niche}: ${trendContext.topClusters.map((c: any) => c.name).join(', ')}.\nTop hooks: ${trendContext.topHooks?.slice(0, 3).join(' | ') ?? 'none'}`
    : ''

  const system = `You are a viral Instagram Reels script writer for the ${niche} niche. Generate ONE script that maximizes engagement.${trendInfo}
IMPORTANT: Generate a fresh, original script. Do NOT use common examples like "30-day challenge", "100 pushups", or "squats every day". Be creative and unique.
Return ONLY valid JSON with this structure:
{"hook": "opening line", "concept": "brief concept", "script": "full script text", "hashtags": ["tag1","tag2"], "estimatedDuration": "30-60s", "trendAlignment": "why this aligns with current trends"}`

  const user = `Create a viral reel script about: ${idea}`
  return await callAI(system, user)
}

export async function generateMoreScripts(params: {
  niche: string; idea: string; trendContext?: any
}): Promise<Array<Record<string, unknown>>> {
  const { niche, idea, trendContext } = params
  const trendInfo = trendContext?.topClusters?.length
    ? `\nUse these trending clusters for variety: ${trendContext.topClusters.map((c: any) => c.name).join(', ')}`
    : ''

  const system = `You are a viral Instagram Reels script writer for the ${niche} niche. Generate exactly 3 DIFFERENT scripts with unique angles.${trendInfo}
IMPORTANT: Each script must be completely different. Avoid generic examples like "30-day challenges" or "100 reps every day". Be creative and surprising.
Return ONLY valid JSON array:
[{"hook": "...", "concept": "...", "script": "...", "hashtags": [...], "estimatedDuration": "...", "angle": "what makes this unique"}, ...]`

  const user = `Create 3 different viral reel scripts about: ${idea}`
  const result = await callAI(system, user)
  return Array.isArray(result) ? result : [result]
}

export async function generateFullGuide(params: {
  niche: string; idea: string; hook: string; concept: string
}): Promise<Record<string, unknown>> {
  const { niche, idea, hook, concept } = params

  const system = `You are a professional Instagram Reels shooting guide creator for the ${niche} niche.
Return ONLY valid JSON with this exact structure, no markdown:
{"title": "reel title", "hook": "opening hook line", "concept": "content concept", "whyViral": "why this will go viral", "duration": "30 seconds", "voiceType": "energetic and motivational", "scenes": [{"sceneNumber": 1, "duration": "0-3s", "action": "...", "dialogue": "...", "shotType": "wide/medium/close-up", "cameraSetup": "specific camera angle and setup instructions", "sound": "...", "lightingTip": "...", "editingTip": "...", "textOverlay": "optional text on screen"}], "caption": "full post caption", "hashtags": ["hashtag1", "hashtag2"], "trendingAudio": ["song1", "song2"], "proTips": ["tip1", "tip2"], "whyItWorks": ["reason1", "reason2"], "subtitlesSuggestion": "subtitle recommendation", "editingNotes": "overall editing notes", "callToAction": "end call to action"}`

  const user = `Create a complete shooting guide:\nIdea: ${idea}\nHook: ${hook}\nConcept: ${concept}\nNiche: ${niche}\nInclude 5-7 scenes.`
  return await callAI(system, user, 0.7)
}

export async function predictVirality(params: {
  url: string
}): Promise<{
  score: number; reachMin: number; reachMax: number; suggestions: string[];
  breakdown?: Record<string, number>;
  improvements?: Array<{ problem: string; fix: string; reason: string }>;
  howToFix?: Array<{ problem: string; fix: string; howToShoot: string[]; expectedResult: string }>;
}> {
  const { url } = params

  const system = `You are a viral content analyst. Analyze the reel at the given URL and predict its virality.
Return ONLY valid JSON:
{"score": 7, "reachMin": 5000, "reachMax": 25000, "suggestions": ["tip1","tip2","tip3"], "breakdown": {"hookStrength": 8, "retentionPotential": 7, "shareability": 6, "trendAlignment": 7}, "improvements": [{"problem": "...", "fix": "...", "reason": "..."}], "howToFix": [{"problem": "...", "fix": "...", "howToShoot": ["step1","step2"], "expectedResult": "..."}]}`

  const user = `Analyze this reel for virality potential: ${url}`
  return await callAI(system, user, 0.6)
}

export async function analyzeReel(params: {
  url: string
}): Promise<Record<string, unknown>> {
  const { url } = params

  const system = `You are an expert Instagram Reels coach. Analyze the reel and provide detailed feedback across 5 dimensions.
Return ONLY valid JSON:
{"overallScore": 7.5, "dimensions": {"hook": {"score": 8, "feedback": "..."}, "content": {"score": 7, "feedback": "..."}, "editing": {"score": 7, "feedback": "..."}, "audio": {"score": 8, "feedback": "..."}, "cta": {"score": 6, "feedback": "..."}}, "strengths": ["..."], "improvements": ["..."], "actionItems": ["..."]}`

  const user = `Analyze this reel and provide coaching feedback: ${url}`
  return await callAI(system, user, 0.6)
}
