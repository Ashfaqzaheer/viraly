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

async function callAI(systemPrompt: string, userPrompt: string, temperature = 0.8): Promise<any> {
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
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`AI API error ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json() as any
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')

  return JSON.parse(stripCodeFences(content))
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

  const system = `You are a professional Instagram Reels shooting guide creator for the ${niche} niche. Create a detailed execution guide.
Return ONLY valid JSON:
{"hook": "${hook}", "concept": "${concept}", "scenes": [{"sceneNumber": 1, "duration": "0-3s", "action": "...", "dialogue": "...", "cameraAngle": "...", "lighting": "...", "props": "..."}], "audioSuggestion": "...", "editingTips": ["..."], "thumbnailIdea": "...", "bestTimeToPost": "...", "estimatedTotalDuration": "..."}`

  const user = `Create a full shooting guide for this reel:\nIdea: ${idea}\nHook: ${hook}\nConcept: ${concept}`
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
