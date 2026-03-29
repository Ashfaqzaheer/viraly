// Feature: viraly-app, Property 14: Streak increment on first daily action
import * as fc from 'fast-check'

jest.mock('@viraly/db', () => ({
  prisma: {
    streak: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const mockPrisma = require('@viraly/db').prisma

// The streak service uses `new Date()` internally via todayUTC/yesterdayUTC.
// We mock the global Date to control the current time.
const FIXED_NOW = new Date('2025-06-15T12:00:00Z')
const FIXED_TODAY = '2025-06-15'
const FIXED_YESTERDAY = '2025-06-14'

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

// Import after mocking @viraly/db but before mocking Date
// (the service reads Date at call time, not import time)
import { recordDailyAction } from '../../services/streak'

describe('Property 14: Streak increment on first daily action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDate()
  })

  afterEach(() => {
    restoreDate()
  })

  /**
   * Validates: Requirements 4.1, 4.2
   *
   * For any Creator whose last action date is not today (UTC), recording a
   * daily action SHALL increment the streak count by exactly 1 and update
   * the last action date to today.
   */
  it('increments streak by 1 and sets lastActionDate to today when last action was yesterday', async () => {
    // Feature: viraly-app, Property 14: Streak increment on first daily action

    const consecutiveStreakArb = fc.record({
      current: fc.integer({ min: 1, max: 500 }),
      highest: fc.integer({ min: 1, max: 1000 }),
    }).filter(s => s.highest >= s.current)

    await fc.assert(
      fc.asyncProperty(consecutiveStreakArb, async (streak) => {
        jest.clearAllMocks()

        const creatorId = 'creator-streak-test'

        const existingStreak = {
          id: 'streak-1',
          creatorId,
          current: streak.current,
          highest: streak.highest,
          lastActionDate: FIXED_YESTERDAY,
          milestones: [],
          updatedAt: FIXED_NOW,
        }

        mockPrisma.streak.findUnique.mockResolvedValue(existingStreak)

        const expectedCurrent = streak.current + 1
        const expectedHighest = Math.max(streak.highest, expectedCurrent)

        mockPrisma.streak.update.mockImplementation(({ data }: any) => {
          return Promise.resolve({
            ...existingStreak,
            current: data.current,
            highest: data.highest,
            lastActionDate: data.lastActionDate,
            milestones: data.milestones ?? [],
          })
        })

        const result = await recordDailyAction(creatorId)

        expect(result.current).toBe(expectedCurrent)
        expect(result.highest).toBe(expectedHighest)
        expect(result.lastActionDate).toBe(FIXED_TODAY)
      }),
      { numRuns: 100 }
    )
  }, 60000)

  it('resets streak to 1 and sets lastActionDate to today when last action was not yesterday', async () => {
    // Feature: viraly-app, Property 14: Streak increment on first daily action (gap variant)

    const oldDateArb = fc.integer({ min: 2, max: 365 }).map(daysAgo => {
      const d = new RealDate(FIXED_NOW.getTime())
      d.setUTCDate(d.getUTCDate() - daysAgo)
      return d.toISOString().slice(0, 10)
    })

    const brokenStreakArb = fc.record({
      current: fc.integer({ min: 1, max: 500 }),
      highest: fc.integer({ min: 1, max: 1000 }),
      lastActionDate: oldDateArb,
    }).filter(s => s.highest >= s.current)

    await fc.assert(
      fc.asyncProperty(brokenStreakArb, async (streak) => {
        jest.clearAllMocks()

        const creatorId = 'creator-streak-test'

        const existingStreak = {
          id: 'streak-1',
          creatorId,
          current: streak.current,
          highest: streak.highest,
          lastActionDate: streak.lastActionDate,
          milestones: [],
          updatedAt: FIXED_NOW,
        }

        mockPrisma.streak.findUnique.mockResolvedValue(existingStreak)

        mockPrisma.streak.update.mockImplementation(({ data }: any) => {
          return Promise.resolve({
            ...existingStreak,
            current: data.current,
            highest: data.highest,
            lastActionDate: data.lastActionDate,
            milestones: data.milestones ?? [],
          })
        })

        const result = await recordDailyAction(creatorId)

        expect(result.current).toBe(1)
        expect(result.highest).toBe(Math.max(streak.highest, 1))
        expect(result.lastActionDate).toBe(FIXED_TODAY)
      }),
      { numRuns: 100 }
    )
  }, 60000)

  it('creates streak with current=1 for a creator with no prior streak', async () => {
    // Feature: viraly-app, Property 14: Streak increment on first daily action (first-ever variant)

    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        jest.clearAllMocks()

        const creatorId = 'creator-streak-test'

        mockPrisma.streak.findUnique.mockResolvedValue(null)

        mockPrisma.streak.create.mockImplementation(({ data }: any) => {
          return Promise.resolve({
            id: 'streak-new',
            creatorId: data.creatorId,
            current: data.current,
            highest: data.highest,
            lastActionDate: data.lastActionDate,
            milestones: data.milestones ?? [],
            updatedAt: FIXED_NOW,
          })
        })

        const result = await recordDailyAction(creatorId)

        expect(result.current).toBe(1)
        expect(result.highest).toBe(1)
        expect(result.lastActionDate).toBe(FIXED_TODAY)
      }),
      { numRuns: 100 }
    )
  }, 60000)
})

// Feature: viraly-app, Property 15: Streak highest count never decreases
describe('Property 15: Streak highest count never decreases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    restoreDate()
  })

  /**
   * Validates: Requirements 4.6
   *
   * For any sequence of streak operations on a Creator (including resets),
   * the highest streak value SHALL never be less than any previously recorded highest value.
   */
  it('highest streak value never decreases across any sequence of operations', async () => {
    // Feature: viraly-app, Property 15: Streak highest count never decreases

    // Operation types: 'consecutive' advances 1 day, 'gap' advances 2+ days (reset), 'sameDay' repeats same day
    const operationArb = fc.constantFrom('consecutive', 'gap', 'sameDay')
    const sequenceArb = fc.array(operationArb, { minLength: 2, maxLength: 20 })

    await fc.assert(
      fc.asyncProperty(sequenceArb, async (operations) => {
        jest.clearAllMocks()

        const creatorId = 'creator-highest-test'

        // Mutable state tracking the current streak record in the "database"
        let currentStreak: any = null
        // Start date for the sequence
        let currentDate = new RealDate('2025-01-01T12:00:00Z')

        // Helper to set the mocked Date to currentDate
        function setMockDate(date: Date) {
          const MockDate = class extends RealDate {
            constructor(...args: any[]) {
              if (args.length === 0) {
                super(date.getTime())
              } else {
                // @ts-ignore
                super(...args)
              }
            }
            static now() {
              return date.getTime()
            }
          } as DateConstructor
          global.Date = MockDate
        }

        // Track the highest value we've ever seen returned
        let maxHighestSeen = 0

        for (const op of operations) {
          // Advance the date based on operation type
          if (op === 'consecutive') {
            currentDate = new RealDate(currentDate.getTime() + 24 * 60 * 60 * 1000) // +1 day
          } else if (op === 'gap') {
            // Advance by 2-5 days to trigger a reset
            currentDate = new RealDate(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000)
          }
          // 'sameDay' — don't advance the date

          setMockDate(currentDate)

          // Set up mocks for this iteration
          mockPrisma.streak.findUnique.mockResolvedValue(currentStreak)

          if (currentStreak === null) {
            mockPrisma.streak.create.mockImplementation(({ data }: any) => {
              const created = {
                id: 'streak-1',
                creatorId: data.creatorId,
                current: data.current,
                highest: data.highest,
                lastActionDate: data.lastActionDate,
                milestones: data.milestones ?? [],
                updatedAt: currentDate,
              }
              currentStreak = created
              return Promise.resolve(created)
            })
          } else {
            mockPrisma.streak.update.mockImplementation(({ data }: any) => {
              const updated = {
                ...currentStreak,
                current: data.current ?? currentStreak.current,
                highest: data.highest ?? currentStreak.highest,
                lastActionDate: data.lastActionDate ?? currentStreak.lastActionDate,
                milestones: data.milestones ?? currentStreak.milestones,
                updatedAt: currentDate,
              }
              currentStreak = updated
              return Promise.resolve(updated)
            })
          }

          const result = await recordDailyAction(creatorId)

          // The core property: highest must never decrease
          expect(result.highest).toBeGreaterThanOrEqual(maxHighestSeen)
          maxHighestSeen = result.highest
        }

        // Restore Date after each property run
        restoreDate()
      }),
      { numRuns: 100 }
    )
  }, 60000)
})

// Feature: viraly-app, Property 16: Milestone recorded at threshold crossings
describe('Property 16: Milestone recorded at threshold crossings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDate()
  })

  afterEach(() => {
    restoreDate()
  })

  /**
   * Validates: Requirements 4.4
   *
   * For any Creator whose streak count transitions to exactly 7, 30, 60, or 100,
   * the Streak_Service SHALL record a milestone achievement for that threshold
   * value with the current timestamp.
   */
  it('records a milestone when streak transitions to a threshold value', async () => {
    // Feature: viraly-app, Property 16: Milestone recorded at threshold crossings

    const milestoneThresholdArb = fc.constantFrom(7, 30, 60, 100)

    await fc.assert(
      fc.asyncProperty(milestoneThresholdArb, async (threshold) => {
        jest.clearAllMocks()
        mockDate()

        const creatorId = 'creator-milestone-test'

        // Streak is at threshold - 1 with lastActionDate = yesterday,
        // so the next action will increment to exactly the threshold
        const existingStreak = {
          id: 'streak-1',
          creatorId,
          current: threshold - 1,
          highest: threshold - 1,
          lastActionDate: FIXED_YESTERDAY,
          milestones: [],
          updatedAt: FIXED_NOW,
        }

        mockPrisma.streak.findUnique.mockResolvedValue(existingStreak)

        mockPrisma.streak.update.mockImplementation(({ data }: any) => {
          return Promise.resolve({
            ...existingStreak,
            current: data.current,
            highest: data.highest,
            lastActionDate: data.lastActionDate,
            milestones: data.milestones ?? [],
          })
        })

        const result = await recordDailyAction(creatorId)

        // Streak should have incremented to the threshold
        expect(result.current).toBe(threshold)

        // A milestone should have been recorded for this threshold
        const milestone = result.milestones.find((m: any) => m.days === threshold)
        expect(milestone).toBeDefined()
        expect(milestone!.days).toBe(threshold)
        expect(typeof milestone!.achievedAt).toBe('string')
        // The achievedAt should be a valid ISO timestamp
        expect(new RealDate(milestone!.achievedAt).getTime()).not.toBeNaN()
      }),
      { numRuns: 100 }
    )
  }, 60000)

  it('does NOT record a milestone for non-threshold streak values', async () => {
    // Feature: viraly-app, Property 16: Milestone recorded at threshold crossings (non-threshold variant)

    // Generate streak values that are NOT milestone thresholds
    const nonThresholdArb = fc.integer({ min: 1, max: 200 }).filter(
      (n) => n !== 7 && n !== 30 && n !== 60 && n !== 100
    )

    await fc.assert(
      fc.asyncProperty(nonThresholdArb, async (targetStreak) => {
        jest.clearAllMocks()
        mockDate()

        const creatorId = 'creator-no-milestone-test'

        const existingStreak = {
          id: 'streak-1',
          creatorId,
          current: targetStreak - 1,
          highest: Math.max(targetStreak - 1, 1),
          lastActionDate: FIXED_YESTERDAY,
          milestones: [],
          updatedAt: FIXED_NOW,
        }

        mockPrisma.streak.findUnique.mockResolvedValue(existingStreak)

        mockPrisma.streak.update.mockImplementation(({ data }: any) => {
          return Promise.resolve({
            ...existingStreak,
            current: data.current,
            highest: data.highest,
            lastActionDate: data.lastActionDate,
            milestones: data.milestones ?? [],
          })
        })

        const result = await recordDailyAction(creatorId)

        expect(result.current).toBe(targetStreak)
        // No milestones should be recorded for non-threshold values
        expect(result.milestones).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  }, 60000)
})
