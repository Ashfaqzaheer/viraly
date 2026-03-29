import cron from 'node-cron'
import { prisma } from '@viraly/db'
import { todayUTC } from '../services/streak'

/**
 * Resets current streak to 0 for all creators who did not act today.
 * Runs at midnight UTC daily.
 * Requirements: 4.3
 */
export async function resetExpiredStreaks(): Promise<void> {
  const today = todayUTC()

  await prisma.streak.updateMany({
    where: {
      lastActionDate: { not: null },
      // lastActionDate is before today — streak has expired
      AND: [{ lastActionDate: { lt: today } }],
    },
    data: { current: 0 },
  })
}

/**
 * Schedules the streak reset job to run at 00:00 UTC every day.
 * Requirements: 4.3
 */
export function scheduleStreakResetJob(): void {
  // '0 0 * * *' = at 00:00 every day; timezone UTC
  cron.schedule('0 0 * * *', async () => {
    console.log('[streakReset] Running midnight UTC streak reset...')
    try {
      await resetExpiredStreaks()
      console.log('[streakReset] Streak reset complete.')
    } catch (err) {
      console.error('[streakReset] Error during streak reset:', err)
    }
  }, { timezone: 'UTC' })
}
