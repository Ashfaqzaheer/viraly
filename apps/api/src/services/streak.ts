import { prisma } from '@viraly/db'

export interface MilestoneAchievement {
  days: 7 | 30 | 60 | 100
  achievedAt: string // ISO date string
}

export interface StreakState {
  current: number
  highest: number
  milestones: MilestoneAchievement[]
  lastActionDate: string // YYYY-MM-DD UTC
}

const MILESTONE_DAYS = [7, 30, 60, 100] as const

/** Returns today's date as YYYY-MM-DD in UTC */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Returns yesterday's date as YYYY-MM-DD in UTC */
export function yesterdayUTC(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function parseMilestones(raw: unknown): MilestoneAchievement[] {
  if (Array.isArray(raw)) return raw as MilestoneAchievement[]
  return []
}

/**
 * Records a daily action for a creator, updating their streak.
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export async function recordDailyAction(creatorId: string): Promise<StreakState> {
  const today = todayUTC()
  const yesterday = yesterdayUTC()

  const existing = await prisma.streak.findUnique({ where: { creatorId } })

  if (!existing) {
    // First ever action — create streak with current=1
    const milestones = checkMilestones(1, [])
    const streak = await prisma.streak.create({
      data: {
        creatorId,
        current: 1,
        highest: 1,
        lastActionDate: today,
        milestones: milestones as unknown as import('@prisma/client').Prisma.InputJsonValue,
      },
    })
    return toStreakState(streak)
  }

  // Idempotent: already acted today
  if (existing.lastActionDate === today) {
    return toStreakState(existing)
  }

  // Determine new current value
  let newCurrent: number
  if (existing.lastActionDate === yesterday) {
    // Consecutive day — increment
    newCurrent = existing.current + 1
  } else {
    // Streak broken — reset
    newCurrent = 1
  }

  const newHighest = Math.max(existing.highest, newCurrent)
  const existingMilestones = parseMilestones(existing.milestones)
  const updatedMilestones = checkMilestones(newCurrent, existingMilestones)

  const updated = await prisma.streak.update({
    where: { creatorId },
    data: {
      current: newCurrent,
      highest: newHighest,
      lastActionDate: today,
      milestones: updatedMilestones as unknown as import('@prisma/client').Prisma.InputJsonValue,
    },
  })

  return toStreakState(updated)
}

/**
 * Returns the current streak state for a creator.
 */
export async function getStreak(creatorId: string): Promise<StreakState> {
  const streak = await prisma.streak.findUnique({ where: { creatorId } })
  if (!streak) {
    return { current: 0, highest: 0, milestones: [], lastActionDate: '' }
  }
  return toStreakState(streak)
}

/**
 * Checks if the new current streak value crosses a milestone threshold
 * that hasn't been recorded yet, and appends it if so.
 */
function checkMilestones(
  current: number,
  existing: MilestoneAchievement[]
): MilestoneAchievement[] {
  if (!MILESTONE_DAYS.includes(current as (typeof MILESTONE_DAYS)[number])) {
    return existing
  }
  const alreadyRecorded = existing.some((m) => m.days === current)
  if (alreadyRecorded) return existing

  return [
    ...existing,
    { days: current as MilestoneAchievement['days'], achievedAt: new Date().toISOString() },
  ]
}

function toStreakState(streak: {
  current: number
  highest: number
  milestones: unknown
  lastActionDate: string | null
}): StreakState {
  return {
    current: streak.current,
    highest: streak.highest,
    milestones: parseMilestones(streak.milestones),
    lastActionDate: streak.lastActionDate ?? '',
  }
}
