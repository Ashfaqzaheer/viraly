/**
 * Trend Radar service — getTrends and refreshTrends.
 * Requirements: 7.1, 7.3, 7.4, 7.5
 */
import Redis from 'ioredis'
import { prisma } from '@viraly/db'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000'
const TREND_CACHE_TTL = 3600 // 1 hour in seconds
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000 // 48 hours in milliseconds

let redisClient: Redis | null = null

function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
    redisClient = new Redis(redisUrl, { lazyConnect: true })
  }
  return redisClient
}

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
 * Returns non-stale trends, optionally filtered by niche.
 * Serves from Redis cache (key: trends:{niche|all}, TTL: 1 hour).
 * Requirements: 7.1, 7.3, 7.4, 7.5
 */
export async function getTrends(niche?: string): Promise<Trend[]> {
  const cacheKey = niche ? `trends:${niche}` : 'trends:all'
  const redis = getRedisClient()

  // Check cache first
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as Trend[]
    }
  } catch {
    // Redis unavailable — fall through to DB query
  }

  // Requirement 7.4: filter out stale records (updatedAt > 48h ago)
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS)

  const where: { updatedAt: { gte: Date }; niche?: string } = {
    updatedAt: { gte: cutoff },
  }

  if (niche) {
    where.niche = niche
  }

  const records = await prisma.trend.findMany({ where, orderBy: { updatedAt: 'desc' } })
  const trends = records.map(toTrend)

  // Populate cache
  try {
    await redis.set(cacheKey, JSON.stringify(trends), 'EX', TREND_CACHE_TTL)
  } catch {
    // Non-fatal: cache failure doesn't break the response
  }

  return trends
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
  const redis = getRedisClient()
  try {
    // Delete known keys: trends:all plus any niche-specific keys
    const keys = await redis.keys('trends:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {
    // Non-fatal: cache invalidation failure is acceptable
  }
}
