import cron from 'node-cron'
import { refreshTrends } from '../services/trends'
import redis from '../lib/redis'

/**
 * Fetches fresh trends from the AI service, upserts into the Trend table,
 * and invalidates all trends:* cache keys.
 * Runs once every 48 hours at midnight UTC.
 * Requirements: 7.1, 7.5
 */
export function scheduleTrendsRefreshJob(): void {
  // '0 0 */2 * *' = midnight every 2 days
  cron.schedule('0 0 */2 * *', async () => {
    // Guard: skip if refreshed recently
    try {
      const lastRefresh = await redis.get('trends:last:refresh')
      if (lastRefresh) {
        const hoursSince = (Date.now() - parseInt(lastRefresh)) / (1000 * 60 * 60)
        if (hoursSince < 48) {
          console.log(`[trendsRefresh] Skipping — refreshed ${hoursSince.toFixed(1)}hr ago`)
          return
        }
      }
    } catch (err) { console.error('[trendsRefresh] Guard check failed:', err) }

    console.log('[trendsRefresh] Running trend refresh...')
    try {
      await refreshTrends()
      console.log('[trendsRefresh] Trend refresh complete.')
      try { await redis.set('trends:last:refresh', Date.now().toString(), 'EX', 172800) } catch (err) {}
    } catch (err) {
      console.error('[trendsRefresh] Error during trend refresh:', err)
    }
  }, { timezone: 'UTC' })
}
