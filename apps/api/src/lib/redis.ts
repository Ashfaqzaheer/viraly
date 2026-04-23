import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null
    return Math.min(times * 200, 2000)
  },
})

redis.on('error', (err) => {
  console.error('[redis] Connection error:', err.message)
})

export default redis
