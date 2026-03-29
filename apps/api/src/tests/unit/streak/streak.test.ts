import { resetExpiredStreaks } from '../../../jobs/streakReset'
import { recordDailyAction } from '../../../services/streak'

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
jest.mock('@viraly/db', () => ({
  prisma: {
    streak: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

const { prisma: mockPrisma } = require('@viraly/db')

// ---------------------------------------------------------------------------
// Date mocking helpers
// ---------------------------------------------------------------------------
const RealDate = global.Date

function mockDateTo(isoString: string) {
  const fixed = new RealDate(isoString)
  const Mock = class extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) super(fixed.getTime())
      // @ts-ignore
      else super(...args)
    }
    static now() {
      return fixed.getTime()
    }
  } as DateConstructor
  global.Date = Mock
}

function restoreDate() {
  global.Date = RealDate
}

// ---------------------------------------------------------------------------
// Requirement 4.3: Streak reset preserves highest count
// ---------------------------------------------------------------------------
describe('Streak reset preserves highest count', () => {
  beforeEach(() => jest.clearAllMocks())
  afterEach(() => restoreDate())

  it('resetExpiredStreaks sets current to 0 but does NOT touch highest', async () => {
    mockDateTo('2025-06-15T00:00:00Z')

    mockPrisma.streak.updateMany.mockResolvedValue({ count: 2 })

    await resetExpiredStreaks()

    // updateMany should only set current = 0, never modify highest
    expect(mockPrisma.streak.updateMany).toHaveBeenCalledTimes(1)
    const call = mockPrisma.streak.updateMany.mock.calls[0][0]
    expect(call.data).toEqual({ current: 0 })
    expect(call.data.highest).toBeUndefined()
  })

  it('recordDailyAction after a gap resets current to 1 but keeps highest unchanged', async () => {
    mockDateTo('2025-06-15T12:00:00Z')

    const creatorId = 'creator-reset-test'
    const existingStreak = {
      id: 'streak-1',
      creatorId,
      current: 0, // was reset by the midnight job
      highest: 45,
      lastActionDate: '2025-06-10', // 5 days ago — gap
      milestones: [],
      updatedAt: new RealDate(),
    }

    mockPrisma.streak.findUnique.mockResolvedValue(existingStreak)
    mockPrisma.streak.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ ...existingStreak, ...data, milestones: data.milestones ?? [] })
    )

    const result = await recordDailyAction(creatorId)

    expect(result.current).toBe(1)
    expect(result.highest).toBe(45) // preserved
  })
})

// ---------------------------------------------------------------------------
// Requirement 4.6: Same-day action is idempotent
// ---------------------------------------------------------------------------
describe('Same-day action is idempotent', () => {
  beforeEach(() => jest.clearAllMocks())
  afterEach(() => restoreDate())

  it('returns the same streak state without updating the database when called twice on the same day', async () => {
    mockDateTo('2025-06-15T12:00:00Z')

    const creatorId = 'creator-idempotent-test'
    const existingStreak = {
      id: 'streak-1',
      creatorId,
      current: 5,
      highest: 12,
      lastActionDate: '2025-06-15', // already acted today
      milestones: [{ days: 7, achievedAt: '2025-06-10T00:00:00Z' }],
      updatedAt: new RealDate(),
    }

    mockPrisma.streak.findUnique.mockResolvedValue(existingStreak)

    const result = await recordDailyAction(creatorId)

    // Should return existing state unchanged
    expect(result.current).toBe(5)
    expect(result.highest).toBe(12)
    expect(result.lastActionDate).toBe('2025-06-15')
    expect(result.milestones).toEqual(existingStreak.milestones)

    // Should NOT call create or update — no DB write needed
    expect(mockPrisma.streak.create).not.toHaveBeenCalled()
    expect(mockPrisma.streak.update).not.toHaveBeenCalled()
  })
})
