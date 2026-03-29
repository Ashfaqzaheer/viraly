// Feature: viraly-app, Property 30: Posting consistency computation correctness
// Feature: viraly-app, Property 31: Analytics CSV export round-trip
import * as fc from 'fast-check'

const mockRedisGet = jest.fn()
const mockRedisSet = jest.fn()

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
  }))
})

jest.mock('@viraly/db', () => ({
  prisma: {
    analyticsSnapshot: { findFirst: jest.fn() },
    streak: { findUnique: jest.fn() },
    reelSubmission: { findMany: jest.fn() },
  },
}))

const mockPrisma = require('@viraly/db').prisma

const FIXED_NOW = new Date('2025-06-15T12:00:00Z')
const RealDate = global.Date

function mockDate() {
  const MockDate = class extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(FIXED_NOW.getTime())
      } else {
        // @ts-ignore
        super(...args)
      }
    }
    static now() {
      return FIXED_NOW.getTime()
    }
  } as DateConstructor
  global.Date = MockDate
}

function restoreDate() {
  global.Date = RealDate
}

import { getDashboard, exportCSV } from '../../services/analytics'

describe('Property 30: Posting consistency computation correctness', () => {
  const fakeRedis = { get: mockRedisGet, set: mockRedisSet } as any

  beforeEach(() => {
    jest.clearAllMocks()
    mockDate()
    // Always bypass cache so we hit the computation path
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue('OK')
  })

  afterEach(() => {
    restoreDate()
  })

  /**
   * Validates: Requirements 9.2
   *
   * For any Creator, the postingConsistency30d value SHALL equal the number
   * of distinct days in the last 30 days on which the Creator completed a
   * daily action, divided by 30, expressed as a percentage.
   */
  it('computes posting consistency as (distinct action days in last 30 / 30) * 100', async () => {
    // Feature: viraly-app, Property 30: Posting consistency computation correctness

    const cutoff = new RealDate(FIXED_NOW)
    cutoff.setUTCDate(cutoff.getUTCDate() - 30)

    // Generate a random set of day offsets (0 = today, 1 = yesterday, etc.)
    // Some within the 30-day window, some outside
    const dayOffsetArb = fc.integer({ min: 0, max: 60 })
    const reelDaysArb = fc.array(dayOffsetArb, { minLength: 0, maxLength: 30 })

    // Whether the streak lastActionDate falls within the window
    const lastActionDayOffsetArb = fc.option(
      fc.integer({ min: 0, max: 60 }),
      { nil: undefined }
    )

    await fc.assert(
      fc.asyncProperty(reelDaysArb, lastActionDayOffsetArb, async (dayOffsets, lastActionOffset) => {
        jest.clearAllMocks()
        mockDate()
        mockRedisGet.mockResolvedValue(null)
        mockRedisSet.mockResolvedValue('OK')

        const creatorId = 'creator-consistency-test'

        // Build reel submission dates from offsets
        const reelDates = dayOffsets.map((offset) => {
          const d = new RealDate(FIXED_NOW.getTime())
          d.setUTCDate(d.getUTCDate() - offset)
          d.setUTCHours(10, 0, 0, 0)
          return d
        })

        // Build lastActionDate string
        let lastActionDate: string | null = null
        if (lastActionOffset !== undefined) {
          const d = new RealDate(FIXED_NOW.getTime())
          d.setUTCDate(d.getUTCDate() - lastActionOffset)
          lastActionDate = d.toISOString().slice(0, 10)
        }

        // Compute expected distinct days within the 30-day window
        const expectedDays = new Set<string>()
        for (const d of reelDates) {
          if (d >= cutoff) {
            expectedDays.add(d.toISOString().slice(0, 10))
          }
        }
        if (lastActionDate) {
          const lad = new RealDate(lastActionDate)
          if (lad >= cutoff) {
            expectedDays.add(lastActionDate)
          }
        }
        const expectedConsistency = Math.round((expectedDays.size / 30) * 100)

        // Mock Prisma responses
        mockPrisma.analyticsSnapshot.findFirst.mockResolvedValue(null)
        mockPrisma.streak.findUnique.mockResolvedValue(
          lastActionDate
            ? {
                id: 'streak-1',
                creatorId,
                current: 1,
                highest: 1,
                lastActionDate,
                milestones: [],
                updatedAt: FIXED_NOW,
              }
            : null
        )
        mockPrisma.reelSubmission.findMany.mockResolvedValue(
          reelDates.map((d, i) => ({
            id: `reel-${i}`,
            creatorId,
            url: `https://instagram.com/reel/${i}`,
            feedback: null,
            submittedAt: d,
            prediction: null,
          }))
        )

        const dashboard = await getDashboard(creatorId, fakeRedis)

        expect(dashboard.postingConsistency30d).toBe(expectedConsistency)
      }),
      { numRuns: 100 }
    )
  }, 60000)
})

describe('Property 31: Analytics CSV export round-trip', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDate()
  })

  afterEach(() => {
    restoreDate()
  })

  /**
   * Validates: Requirements 9.7
   *
   * For any Creator with dashboard data, exporting to CSV SHALL produce a
   * file where each row corresponds to a data point present in the dashboard,
   * and no dashboard data SHALL be omitted from the export.
   */
  it('CSV export contains all dashboard data points for any creator data', async () => {
    // Feature: viraly-app, Property 31: Analytics CSV export round-trip

    const followerCountArb = fc.integer({ min: 0, max: 1_000_000 })
    const growthArb = fc.integer({ min: -10000, max: 100000 })
    const streakArb = fc.integer({ min: 0, max: 500 })
    const scoreArb = fc.integer({ min: 0, max: 100 })
    const reelCountArb = fc.integer({ min: 0, max: 5 })
    const lastActionOffsetArb = fc.option(fc.integer({ min: 0, max: 60 }), { nil: undefined })

    await fc.assert(
      fc.asyncProperty(
        followerCountArb,
        growthArb,
        growthArb,
        streakArb,
        streakArb,
        reelCountArb,
        lastActionOffsetArb,
        async (followerCount, growth7d, growth30d, streakCurrent, streakHighest, reelCount, lastActionOffset) => {
          jest.clearAllMocks()
          mockDate()

          const creatorId = 'creator-csv-test'
          const actualHighest = Math.max(streakCurrent, streakHighest)

          let lastActionDate: string | null = null
          if (lastActionOffset !== undefined) {
            const d = new RealDate(FIXED_NOW.getTime())
            d.setUTCDate(d.getUTCDate() - lastActionOffset)
            lastActionDate = d.toISOString().slice(0, 10)
          }

          // Build reel records
          const reelRecords = Array.from({ length: reelCount }, (_, i) => {
            const submittedAt = new RealDate(FIXED_NOW.getTime())
            submittedAt.setUTCDate(submittedAt.getUTCDate() - i)
            const hasScores = i % 2 === 0
            return {
              id: `reel-${i}`,
              creatorId,
              url: `https://instagram.com/reel/${i}`,
              feedback: hasScores
                ? { hookStrength: 80 + i, pacing: 70 + i, visualClarity: 60 + i, callToAction: 50 + i }
                : null,
              submittedAt,
              prediction: hasScores ? { score: 65 + i } : null,
            }
          })

          // Mock Prisma
          mockPrisma.analyticsSnapshot.findFirst.mockResolvedValue({
            id: 'snap-1',
            creatorId,
            followerCount,
            followerGrowth7d: growth7d,
            followerGrowth30d: growth30d,
            postingConsistency30d: 0,
            snapshotAt: FIXED_NOW,
          })

          mockPrisma.streak.findUnique.mockResolvedValue(
            lastActionDate
              ? {
                  id: 'streak-1',
                  creatorId,
                  current: streakCurrent,
                  highest: actualHighest,
                  lastActionDate,
                  milestones: [],
                  updatedAt: FIXED_NOW,
                }
              : null
          )

          mockPrisma.reelSubmission.findMany.mockResolvedValue(reelRecords)

          const csv = await exportCSV(creatorId)
          const lines = csv.trim().split('\n')

          // ── Section 1: summary row ──
          // Header line + 1 data line
          expect(lines[0]).toContain('followerCount')
          expect(lines[0]).toContain('followerGrowth7d')
          expect(lines[0]).toContain('followerGrowth30d')
          expect(lines[0]).toContain('postingConsistency30d')
          expect(lines[0]).toContain('streakCurrent')
          expect(lines[0]).toContain('streakHighest')

          const summaryValues = lines[1].split(',')
          expect(summaryValues[0]).toBe('summary')
          expect(Number(summaryValues[1])).toBe(followerCount)
          expect(Number(summaryValues[2])).toBe(growth7d)
          expect(Number(summaryValues[3])).toBe(growth30d)
          // postingConsistency30d is at index 4 — just verify it's a number
          expect(Number.isFinite(Number(summaryValues[4]))).toBe(true)
          // Streak values
          const expectedStreakCurrent = lastActionDate ? streakCurrent : 0
          const expectedStreakHighest = lastActionDate ? actualHighest : 0
          expect(Number(summaryValues[5])).toBe(expectedStreakCurrent)
          expect(Number(summaryValues[6])).toBe(expectedStreakHighest)

          // ── Section 2: reels ──
          // Header at lines[2], reel rows from lines[3] onward
          expect(lines[2]).toContain('reelId')
          expect(lines[2]).toContain('url')
          expect(lines[2]).toContain('viralityScore')

          const reelLines = lines.slice(3)
          expect(reelLines.length).toBe(reelCount)

          // Every reel record must appear in the CSV
          for (let i = 0; i < reelCount; i++) {
            const row = reelLines[i].split(',')
            expect(row[0]).toBe('reels')
            expect(row[1]).toBe(reelRecords[i].id)
            expect(row[2]).toBe(reelRecords[i].url)
            expect(row[3]).toBe(reelRecords[i].submittedAt.toISOString())

            if (reelRecords[i].feedback) {
              const fb = reelRecords[i].feedback as any
              expect(Number(row[4])).toBe(fb.hookStrength)
              expect(Number(row[5])).toBe(fb.pacing)
              expect(Number(row[6])).toBe(fb.visualClarity)
              expect(Number(row[7])).toBe(fb.callToAction)
            }

            if (reelRecords[i].prediction) {
              expect(Number(row[8])).toBe(reelRecords[i].prediction!.score)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})
