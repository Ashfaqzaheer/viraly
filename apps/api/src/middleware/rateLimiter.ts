import { Request, Response, NextFunction } from 'express'
import Redis from 'ioredis'

const WINDOW_SECONDS = 60
const MAX_REQUESTS = 100

let redisClient: Redis | null = null

function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
    redisClient = new Redis(redisUrl, { lazyConnect: true })
  }
  return redisClient
}

/** Reset the cached Redis client (for testing). */
export function _resetRedisClient(): void {
  redisClient = null
}

/**
 * Redis sliding window rate limiter.
 * Enforces 100 requests per 60-second window per authenticated Creator.
 * Requirements 11.1, 11.2
 */
export async function rateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Only rate-limit authenticated requests (JWT middleware runs before this)
  const creatorId = req.creator?.sub
  if (!creatorId) {
    return next()
  }

  const redis = getRedisClient()
  const key = `ratelimit:${creatorId}`
  const now = Date.now()
  const windowStart = now - WINDOW_SECONDS * 1000

  try {
    // Sliding window using a sorted set:
    // - Remove entries older than the window
    // - Add current request timestamp
    // - Count entries in the window
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, '-inf', windowStart)
    pipeline.zadd(key, now, `${now}-${Math.random()}`)
    pipeline.zcard(key)
    pipeline.expire(key, WINDOW_SECONDS)

    const results = await pipeline.exec()
    const count = results?.[2]?.[1] as number ?? 0

    if (count > MAX_REQUESTS) {
      // Calculate when the oldest entry in the window will expire
      const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES')
      const oldestTimestamp = oldestEntry[1] ? parseInt(oldestEntry[1], 10) : now
      const retryAfterMs = oldestTimestamp + WINDOW_SECONDS * 1000 - now
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)

      res.set('Retry-After', String(retryAfterSeconds))
      res.status(429).json({
        error: 'rate_limit_exceeded',
        retryAfterSeconds,
      })
      return
    }

    next()
  } catch {
    // If Redis is unavailable, fail open to avoid blocking all requests
    next()
  }
}
