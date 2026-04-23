import cron from 'node-cron'
import { refreshTrends } from '../services/trends'

/**
 * Fetches fresh trends from the AI service, upserts into the Trend table,
 * and invalidates all trends:* cache keys.
 * Runs once every 24 hours at midnight UTC.
 * Requirements: 7.1, 7.5
 */
export function scheduleTrendsRefreshJob(): void {
  // '0 */12 * * *' = every 12 hours at :00
  cron.schedule('0 */12 * * *', async () => {
    console.log('[trendsRefresh] Running trend refresh...')
    try {
      await refreshTrends()
      console.log('[trendsRefresh] Trend refresh complete.')
    } catch (err) {
      console.error('[trendsRefresh] Error during trend refresh:', err)
    }
  }, { timezone: 'UTC' })
}
