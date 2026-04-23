import { Router, Request, Response } from 'express'
import { prisma } from '@viraly/db'
import redis from '../lib/redis'
import { recordDailyAction, getStreak } from '../services/streak'
import { buildTrendContext } from '../services/trendEngine'

const router = Router()
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
const AI_TIMEOUT_MS = 10_000
const STREAK_UNLOCK_SCRIPTS = 3

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function secondsUntilMidnightUTC(): number {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000)
}

// ── Step 1: Initial script (1 result) ────────────────────────────────────────
router.post('/initial', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { primaryNiche: true },
  })
  if (!creator?.primaryNiche) {
    res.status(422).json({ error: 'onboarding_incomplete', message: 'Complete your profile to use this feature' })
    return
  }

  const idea = (req.body.idea as string)?.trim()
  if (!idea) { res.status(400).json({ error: 'bad_request', message: 'idea is required' }); return }

  // Build trend context for AI prompt injection
  const trendContext = await buildTrendContext(creator.primaryNiche)

  const aiRes = await fetch(`${AI_SERVICE_URL}/scripts/initial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({
      creatorId, niche: creator.primaryNiche, date: todayUTC(), idea,
      trendContext,
    }),
  })
  if (!aiRes.ok) {
    const body = await aiRes.json().catch(() => ({})) as { message?: string }
    res.status(502).json({ error: 'ai_service_unavailable', message: body.message ?? 'Script generation failed' })
    return
  }

  const { script } = await aiRes.json() as { script: Record<string, unknown> }
  // Tag the script as trend-based
  ;(script as Record<string, unknown>).trendBased = trendContext.topClusters.length > 0
  ;(script as Record<string, unknown>).trendCluster = trendContext.topClusters[0]?.name ?? null
  await recordDailyAction(creatorId).catch((err) => { console.error('[scripts/initial] streak record failed:', err) })
  res.status(200).json({ script })
})

// ── Step 2: Generate more (3 unique scripts) ─────────────────────────────────
router.post('/more', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { primaryNiche: true },
  })
  if (!creator?.primaryNiche) {
    res.status(422).json({ error: 'onboarding_incomplete', message: 'Complete your profile' })
    return
  }

  // Backend streak gate: enforce Day 3 streak requirement for script 2
  const streak = await getStreak(creatorId)
  const scriptIndex = typeof req.body.scriptIndex === 'number' ? req.body.scriptIndex : undefined

  // If requesting a specific locked script, enforce gates
  if (scriptIndex === 2 && streak.current < STREAK_UNLOCK_SCRIPTS) {
    console.warn(`[scripts/more] Streak gate blocked: creator=${creatorId} streak=${streak.current} required=${STREAK_UNLOCK_SCRIPTS}`)
    res.status(403).json({ error: 'streak_required', message: `Day ${STREAK_UNLOCK_SCRIPTS} streak required to unlock script 2`, currentStreak: streak.current })
    return
  }
  if (scriptIndex === 3) {
    // Premium gate — no premium system yet, block script 3
    console.warn(`[scripts/more] Premium gate blocked: creator=${creatorId}`)
    res.status(403).json({ error: 'premium_required', message: 'Premium subscription required to access script 3' })
    return
  }

  const idea = (req.body.idea as string)?.trim()
  if (!idea) { res.status(400).json({ error: 'bad_request', message: 'idea is required' }); return }

  // Build trend context — each of the 3 scripts should use a different cluster
  const trendContext = await buildTrendContext(creator.primaryNiche)

  let aiRes: globalThis.Response
  try {
    aiRes = await fetch(`${AI_SERVICE_URL}/scripts/more`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      body: JSON.stringify({ niche: creator.primaryNiche, idea, trendContext }),
    })
  } catch (err) {
    console.error('[scripts/more] AI request failed:', err)
    res.status(502).json({ error: 'ai_service_unavailable', message: 'AI service timeout or failure' })
    return
  }

  if (!aiRes.ok) {
    const body = await aiRes.json().catch(() => ({})) as { message?: string }
    res.status(502).json({ error: 'ai_service_unavailable', message: body.message ?? 'Generation failed' })
    return
  }

  const { scripts } = await aiRes.json() as { scripts: Array<Record<string, unknown>> }
  // Tag each script with its trend cluster
  const clusterNames = trendContext.topClusters.map(c => c.name)
  scripts.forEach((s, i) => {
    s.trendBased = true
    s.trendCluster = clusterNames[i] ?? clusterNames[0] ?? null
  })
  res.status(200).json({ scripts, streakCurrent: streak.current })
})

// ── Step 3: Full execution guide ─────────────────────────────────────────────
router.post('/guide', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { primaryNiche: true },
  })
  if (!creator?.primaryNiche) {
    res.status(422).json({ error: 'onboarding_incomplete', message: 'Complete your profile' })
    return
  }

  const { idea, hook, concept } = req.body as { idea?: string; hook?: string; concept?: string }
  if (!idea || !hook || !concept) {
    res.status(400).json({ error: 'bad_request', message: 'idea, hook, and concept are required' })
    return
  }

  const aiRes = await fetch(`${AI_SERVICE_URL}/scripts/guide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({ niche: creator.primaryNiche, idea: idea.trim(), hook: hook.trim(), concept: concept.trim() }),
  })
  if (!aiRes.ok) {
    const body = await aiRes.json().catch(() => ({})) as { message?: string }
    res.status(502).json({ error: 'ai_service_unavailable', message: body.message ?? 'Guide generation failed' })
    return
  }

  const { guide } = await aiRes.json() as { guide: unknown }

  // Persist the guide
  const date = todayUTC()
  const cacheKey = `scripts:${creatorId}:${date}`
  
  await persistAndCache({ creatorId, date, scripts: [guide], cacheKey })
  await recordDailyAction(creatorId).catch((err) => { console.error('[scripts/guide] streak record failed:', err) })

  res.status(200).json({ guide })
})

// ── Trend Radar: GET /scripts/trend-radar ────────────────────────────────────
router.get('/trend-radar', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { primaryNiche: true },
  })
  if (!creator?.primaryNiche) {
    res.status(422).json({ error: 'onboarding_incomplete' })
    return
  }

  const trendContext = await buildTrendContext(creator.primaryNiche)
  res.status(200).json({
    clusters: trendContext.topClusters,
    patterns: trendContext.topPatterns.slice(0, 5),
    topHooks: trendContext.topHooks.slice(0, 5),
  })
})

// ── Legacy: GET /scripts/daily (kept for backward compat) ────────────────────
router.get('/daily', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { primaryNiche: true },
  })
  if (!creator?.primaryNiche) {
    res.status(422).json({ error: 'onboarding_incomplete', message: 'Complete your profile to use this feature' })
    return
  }

  const idea = (req.query.idea as string | undefined)?.trim() || undefined
  const date = todayUTC()
  const cacheKey = `scripts:${creatorId}:${date}`
  

  if (!idea) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        await recordDailyAction(creatorId).catch((err) => { console.error('[scripts/daily] streak record failed:', err) })
        res.status(200).json({ date, scripts: JSON.parse(cached), cached: true })
        return
      }
    } catch (err) { console.error('[scripts/daily] Redis cache read failed:', err) }
  }

  const aiResponse = await fetch(`${AI_SERVICE_URL}/generate-scripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({ creatorId, niche: creator.primaryNiche, date, ...(idea && { idea }) }),
  })
  if (!aiResponse.ok) {
    const body = await aiResponse.json().catch(() => ({})) as { message?: string }
    res.status(502).json({ error: 'ai_service_unavailable', message: body.message ?? 'Script generation failed' })
    return
  }

  const { scripts } = await aiResponse.json() as { scripts: unknown[] }
  await persistAndCache({ creatorId, date, scripts, cacheKey })
  await recordDailyAction(creatorId).catch((err) => { console.error('[scripts/daily] streak record failed:', err) })
  res.status(200).json({ date, scripts, cached: false })
})

// ── Shared helper ────────────────────────────────────────────────────────────
export async function persistAndCache(params: {
  creatorId: string; date: string; scripts: unknown[]; cacheKey: string
}): Promise<void> {
  const { creatorId, date, scripts, cacheKey } = params
  const scriptsJson = scripts as import('@prisma/client').Prisma.InputJsonValue
  await prisma.script.upsert({
    where: { creatorId_date: { creatorId, date } },
    create: { creatorId, date, scripts: scriptsJson },
    update: { scripts: scriptsJson },
  })
  try { await redis.set(cacheKey, JSON.stringify(scripts), 'EX', secondsUntilMidnightUTC()) } catch (err) { console.error('[persistAndCache] Redis write failed:', err) }
}

export default router
