import { Router, Request, Response } from 'express'
import { prisma } from '@viraly/db'
import { recordDailyAction, getStreak, todayUTC } from '../services/streak'
import { buildTrendContext } from '../services/trendEngine'

const router = Router()

// Streak reward thresholds
const STREAK_REWARDS = [
  { days: 3, label: '2nd script unlocked', unlocks: 'script_2' },
  { days: 7, label: 'Advanced hooks unlocked', unlocks: 'advanced_hooks' },
  { days: 14, label: 'Trend-based scripts unlocked', unlocks: 'trend_scripts' },
  { days: 30, label: 'Monetization insights unlocked', unlocks: 'monetization' },
]

// GET /mission/today — get or create today's mission
router.get('/today', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { primaryNiche: true },
  })

  const date = todayUTC()
  let mission = await prisma.dailyMission.findUnique({
    where: { creatorId_date: { creatorId, date } },
  })

  if (!mission) {
    // Generate today's mission from trend data
    const niche = creator?.primaryNiche ?? 'lifestyle'
    const trendContext = await buildTrendContext(niche)
    const topPattern = trendContext.topPatterns[0]
    const topCluster = trendContext.topClusters[0]

    const hook = topPattern
      ? topPattern.hookTemplate.replace(/\[.*?\]/g, niche)
      : `Create a ${niche} reel that stops the scroll`
    const concept = topCluster
      ? `${topCluster.name} — ${topCluster.description ?? 'trending format'}`
      : `Trending ${niche} content`

    mission = await prisma.dailyMission.create({
      data: { creatorId, date, hook, concept },
    })
  }

  const streak = await getStreak(creatorId)
  const unlockedRewards = STREAK_REWARDS.filter(r => streak.current >= r.days)
  const nextReward = STREAK_REWARDS.find(r => streak.current < r.days)

  res.status(200).json({
    mission,
    streak,
    rewards: { unlocked: unlockedRewards, next: nextReward ?? null },
  })
})

// POST /mission/complete — mark today's mission as done
router.post('/complete', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const date = todayUTC()
  const mission = await prisma.dailyMission.findUnique({
    where: { creatorId_date: { creatorId, date } },
  })

  if (!mission) {
    res.status(404).json({ error: 'no_mission', message: 'No mission found for today' })
    return
  }

  if (mission.completed) {
    const streak = await getStreak(creatorId)
    res.status(200).json({ mission, streak })
    return
  }

  const updated = await prisma.dailyMission.update({
    where: { id: mission.id },
    data: { completed: true },
  })

  const streak = await recordDailyAction(creatorId)

  res.status(200).json({ mission: updated, streak })
})

// GET /mission/streak-rewards — get reward status
router.get('/streak-rewards', async (req: Request, res: Response): Promise<void> => {
  const creatorId = req.creator?.sub
  if (!creatorId) { res.status(401).json({ error: 'unauthorized' }); return }

  const streak = await getStreak(creatorId)
  const unlocked = STREAK_REWARDS.filter(r => streak.current >= r.days)
  const next = STREAK_REWARDS.find(r => streak.current < r.days)

  res.status(200).json({
    streak,
    rewards: STREAK_REWARDS,
    unlocked: unlocked.map(r => r.unlocks),
    next,
  })
})

export default router
