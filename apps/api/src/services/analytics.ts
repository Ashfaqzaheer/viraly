/**
 * Analytics Dashboard service — getDashboard, exportCSV.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
import { prisma } from '@viraly/db'
import redis from '../lib/redis'
import { StreakState } from './streak'

const ANALYTICS_CACHE_TTL = 300 // 5 minutes

export interface FeedbackScoresSummary {
  hookStrength: number | null
  pacing: number | null
  visualClarity: number | null
  callToAction: number | null
}

export interface ReelSummary {
  id: string
  url: string
  submittedAt: Date
  feedback: FeedbackScoresSummary | null
  viralityScore: number | null
}

export interface DashboardData {
  followerCount: number
  followerGrowth7d: number
  followerGrowth30d: number
  postingConsistency30d: number
  streak: StreakState
  reels: ReelSummary[]
  cachedAt: Date
}

const EMPTY_STREAK: StreakState = {
  current: 0,
  highest: 0,
  milestones: [],
  lastActionDate: '',
}

/**
 * Computes posting consistency for the last 30 days.
 * Action days = distinct calendar days (UTC) where the creator:
 *   - submitted a reel, OR
 *   - has lastActionDate within the window (streak-recorded action)
 * Returns a percentage (0–100).
 */
function computePostingConsistency(
  reelDates: Date[],
  lastActionDate: string | null
): number {
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - 30)

  const actionDays = new Set<string>()

  for (const d of reelDates) {
    if (d >= cutoff) {
      actionDays.add(d.toISOString().slice(0, 10))
    }
  }

  if (lastActionDate) {
    const lad = new Date(lastActionDate)
    if (lad >= cutoff) {
      actionDays.add(lastActionDate.slice(0, 10))
    }
  }

  return Math.round((actionDays.size / 30) * 100)
}

function parseFeedback(raw: unknown): FeedbackScoresSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const f = raw as Record<string, unknown>
  return {
    hookStrength: typeof f.hookStrength === 'number' ? f.hookStrength : null,
    pacing: typeof f.pacing === 'number' ? f.pacing : null,
    visualClarity: typeof f.visualClarity === 'number' ? f.visualClarity : null,
    callToAction: typeof f.callToAction === 'number' ? f.callToAction : null,
  }
}

/**
 * Returns the analytics dashboard for a creator.
 * Serves from Redis cache (key: analytics:{creatorId}, TTL: 300s).
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export async function getDashboard(
  creatorId: string
): Promise<DashboardData> {
  const cacheKey = `analytics:${creatorId}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as DashboardData
    }
  } catch (err) { console.error("[analytics] Redis read error:", err) }

  // Fetch latest analytics snapshot
  const snapshot = await prisma.analyticsSnapshot.findFirst({
    where: { creatorId },
    orderBy: { snapshotAt: 'desc' },
  })

  // Fetch streak
  const streakRecord = await prisma.streak.findUnique({ where: { creatorId } })
  const streak: StreakState = streakRecord
    ? {
        current: streakRecord.current,
        highest: streakRecord.highest,
        milestones: Array.isArray(streakRecord.milestones) ? (streakRecord.milestones as unknown as StreakState['milestones']) : [],
        lastActionDate: streakRecord.lastActionDate ?? '',
      }
    : EMPTY_STREAK

  // Fetch reels with virality predictions
  const reelRecords = await prisma.reelSubmission.findMany({
    where: { creatorId },
    orderBy: { submittedAt: 'desc' },
    include: { prediction: true },
  })

  const reels: ReelSummary[] = reelRecords.map((r) => ({
    id: r.id,
    url: r.url,
    submittedAt: r.submittedAt,
    feedback: parseFeedback(r.feedback),
    viralityScore: r.prediction?.score ?? null,
  }))

  // Compute posting consistency
  const reelDates = reelRecords.map((r) => r.submittedAt)
  const postingConsistency30d = computePostingConsistency(
    reelDates,
    streakRecord?.lastActionDate ?? null
  )

  const data: DashboardData = {
    followerCount: snapshot?.followerCount ?? 0,
    followerGrowth7d: snapshot?.followerGrowth7d ?? 0,
    followerGrowth30d: snapshot?.followerGrowth30d ?? 0,
    postingConsistency30d,
    streak,
    reels,
    cachedAt: new Date(),
  }

  // Populate cache
  try {
    await redis.set(cacheKey, JSON.stringify(data), 'EX', ANALYTICS_CACHE_TTL)
  } catch (err) { console.error("[analytics] Redis write error:", err) }

  return data
}

/**
 * Exports all analytics dashboard data as a two-section CSV.
 *
 * Section 1 — summary: follower metrics, posting consistency, streak state.
 * Section 2 — reels: one row per reel with feedback scores and virality score.
 *
 * Requirements: 9.7
 */
export async function exportCSV(creatorId: string): Promise<string> {
  // Fetch latest analytics snapshot
  const snapshot = await prisma.analyticsSnapshot.findFirst({
    where: { creatorId },
    orderBy: { snapshotAt: 'desc' },
  })

  // Fetch streak
  const streakRecord = await prisma.streak.findUnique({ where: { creatorId } })
  const streak: StreakState = streakRecord
    ? {
        current: streakRecord.current,
        highest: streakRecord.highest,
        milestones: Array.isArray(streakRecord.milestones)
          ? (streakRecord.milestones as unknown as StreakState['milestones'])
          : [],
        lastActionDate: streakRecord.lastActionDate ?? '',
      }
    : EMPTY_STREAK

  // Fetch reels with virality predictions
  const reelRecords = await prisma.reelSubmission.findMany({
    where: { creatorId },
    orderBy: { submittedAt: 'desc' },
    include: { prediction: true },
  })

  const reelDates = reelRecords.map((r) => r.submittedAt)
  const postingConsistency30d = computePostingConsistency(
    reelDates,
    streakRecord?.lastActionDate ?? null
  )

  const rows: string[] = []

  // ── Section 1: summary ──────────────────────────────────────────────────
  rows.push('section,followerCount,followerGrowth7d,followerGrowth30d,postingConsistency30d,streakCurrent,streakHighest,streakLastActionDate')
  rows.push(
    [
      'summary',
      snapshot?.followerCount ?? 0,
      snapshot?.followerGrowth7d ?? 0,
      snapshot?.followerGrowth30d ?? 0,
      postingConsistency30d,
      streak.current,
      streak.highest,
      streak.lastActionDate ?? '',
    ].join(',')
  )

  // ── Section 2: reels ────────────────────────────────────────────────────
  rows.push('section,reelId,url,submittedAt,hookStrength,pacing,visualClarity,callToAction,viralityScore')
  for (const r of reelRecords) {
    const fb = parseFeedback(r.feedback)
    rows.push(
      [
        'reels',
        r.id,
        r.url,
        r.submittedAt.toISOString(),
        fb?.hookStrength ?? '',
        fb?.pacing ?? '',
        fb?.visualClarity ?? '',
        fb?.callToAction ?? '',
        r.prediction?.score ?? '',
      ].join(',')
    )
  }

  return rows.join('\n') + '\n'
}
