import cron from 'node-cron'
import webpush from 'web-push'
import { prisma } from '@viraly/db'

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:hello@viraly.app'

/**
 * Sends push notifications to creators who haven't completed today's mission.
 * Runs daily at 6 PM UTC (11:30 PM IST).
 */
export function scheduleStreakReminderJob(): void {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log('[streakReminder] VAPID keys not configured — push notifications disabled')
    return
  }

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

  cron.schedule('0 18 * * *', async () => {
    console.log('[streakReminder] Checking for inactive users...')
    try {
      const today = new Date().toISOString().slice(0, 10)

      // Find creators with push subscriptions who haven't completed today's mission
      const subscriptions = await prisma.pushSubscription.findMany({
        include: {
          creator: {
            include: {
              dailyMissions: { where: { date: today } },
              streak: true,
            },
          },
        },
      })

      let sent = 0
      for (const sub of subscriptions) {
        const todayMission = sub.creator.dailyMissions[0]
        if (todayMission?.completed) continue // Already completed

        const streakDays = sub.creator.streak?.current ?? 0
        const payload = JSON.stringify({
          title: '🔥 Don\'t break your streak!',
          body: streakDays > 0
            ? `You're on a ${streakDays}-day streak. Complete today's mission now.`
            : 'Complete today\'s mission to start your streak.',
          url: '/dashboard',
        })

        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          sent++
        } catch (err) {
          // Subscription expired — clean up
          if ((err as { statusCode?: number }).statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          }
          console.error(`[streakReminder] Push failed for ${sub.creatorId}:`, (err as Error).message)
        }
      }

      console.log(`[streakReminder] Sent ${sent} reminders`)
    } catch (err) {
      console.error('[streakReminder] Error:', err)
    }
  }, { timezone: 'UTC' })
}
