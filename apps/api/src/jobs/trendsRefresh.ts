import cron from 'node-cron'
import { refreshTrends } from '../services/trends'

/**
 * Fetches fresh trends from the AI service, upserts into the Trend table,
 * and invalidates all trends:* cache keys.
 * Runs once every 24 hours at midnight UTC.
 * Requirements: 7.1, 7.5
 */
export function scheduleTrendsRefreshJob(): void {
  // '0 0 * * *' = at 00:00 every day; timezone UTC
  cron.schedule('0 0 * * *', async () => {
    console.log('[trendsRefresh] Running daily trend refresh...')
    try {
      await refreshTrends()
      console.log('[trendsRefresh] Trend refresh complete.')
    } catch (err) {
      console.error('[trendsRefresh] Error during trend refresh:', err)
    }
  }, { timezone: 'UTC' })
}
