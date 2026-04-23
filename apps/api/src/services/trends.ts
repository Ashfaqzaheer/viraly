/**
 * Trend Radar service — getTrends and refreshTrends.
 * Requirements: 7.1, 7.3, 7.4, 7.5
 */
import { prisma } from '@viraly/db'
import redis from '../lib/redis'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
const TREND_CACHE_TTL = 3600
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000

export interface Trend {
  id: string
  title: string
  description: string
  exampleFormat: string
  engagementLiftPercent: number
  niche: string
  updatedAt: Date
  isStale: boolean
}

function isStale(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() > STALE_THRESHOLD_MS
}

function toTrend(record: {
  id: string
  title: string
  description: string
  exampleFormat: string
  engagementLiftPercent: number
  niche: string
  updatedAt: Date
}): Trend {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    exampleFormat: record.exampleFormat,
    engagementLiftPercent: record.engagementLiftPercent,
    niche: record.niche,
    updatedAt: record.updatedAt,
    isStale: isStale(record.updatedAt),
  }
}

/**
 * Returns trends, optionally filtered by niche.
 * Strategy: try fresh trends first (<48h), fallback to latest available if none fresh.
 * Never returns empty if data exists in DB.
 * Serves from Redis cache (key: trends:{niche|all}, TTL: 1 hour).
 */
export async function getTrends(niche?: string): Promise<{ trends: Trend[]; isFallback: boolean }> {
  const cacheKey = niche ? `trends:${niche}` : 'trends:all'
  

  // Check cache first
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached) as { trends: Trend[]; isFallback: boolean }
      // Handle old cache format (plain array)
      if (Array.isArray(parsed)) return { trends: parsed, isFallback: false }
      return parsed
    }
  } catch (err) { console.error("[trends] Redis error:", err)
    // Redis unavailable — fall through to DB query
  }

  const nicheFilter = niche ? { niche } : {}

  // Try fresh trends first (<48h)
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS)
  const freshRecords = await prisma.trend.findMany({
    where: { updatedAt: { gte: cutoff }, ...nicheFilter },
    orderBy: { updatedAt: 'desc' },
  })

  let trends: Trend[]
  let isFallback = false

  if (freshRecords.length > 0) {
    trends = freshRecords.map(toTrend)
  } else {
    // Fallback: return latest trends regardless of age
    const fallbackRecords = await prisma.trend.findMany({
      where: nicheFilter,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })
    trends = fallbackRecords.map(toTrend)
    isFallback = trends.length > 0
  }

  // Populate cache
  const result = { trends, isFallback }
  try {
    await redis.set(cacheKey, JSON.stringify(result), 'EX', TREND_CACHE_TTL)
  } catch (err) { console.error('[trends] Redis error:', err) }

  return result
}

/**
 * Fetches fresh trends from the AI service, upserts into the Trend table,
 * and invalidates all trends:* cache keys.
 * Requirements: 7.1, 7.5
 */
export async function refreshTrends(): Promise<void> {
  const aiResponse = await fetch(`${AI_SERVICE_URL}/refresh-trends`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
  })

  if (!aiResponse.ok) {
    const body = await aiResponse.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? 'Trend refresh failed')
  }

  const { trends } = await aiResponse.json() as {
    trends: Array<{
      title: string
      description: string
      exampleFormat: string
      engagementLiftPercent: number
      niche: string
    }>
  }

  // Upsert each trend — match on title+niche as natural key
  for (const trend of trends) {
    const existing = await prisma.trend.findFirst({
      where: { title: trend.title, niche: trend.niche },
    })

    if (existing) {
      await prisma.trend.update({
        where: { id: existing.id },
        data: {
          description: trend.description,
          exampleFormat: trend.exampleFormat,
          engagementLiftPercent: trend.engagementLiftPercent,
        },
      })
    } else {
      await prisma.trend.create({ data: trend })
    }
  }

  // Invalidate all trends:* cache keys
  
  try {
    // Delete known keys: trends:all plus any niche-specific keys
    const keys = await redis.keys('trends:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (err) { console.error("[trends] Redis error:", err)
    // Non-fatal: cache invalidation failure is acceptable
  }
}
