/**
 * Unit tests for Analytics Dashboard service.
 * Requirements: 9.1, 9.5, 9.6
 */

// ---------------------------------------------------------------------------
// Mock Redis
// ---------------------------------------------------------------------------
const mockRedisGet = jest.fn()
const mockRedisSet = jest.fn()

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
  }))
})

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
jest.mock('@viraly/db', () => ({
  prisma: {
    analyticsSnapshot: { findFirst: jest.fn() },
    streak: { findUnique: jest.fn() },
    reelSubmission: { findMany: jest.fn() },
  },
}))

const { prisma: mockPrisma } = require('@viraly/db')

// ---------------------------------------------------------------------------
// Date mocking helpers
// ---------------------------------------------------------------------------
const RealDate = global.Date
const FIXED_NOW = new RealDate('2025-06-15T12:00:00Z')

function mockDate() {
  const Mock = class extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) super(FIXED_NOW.getTime())
      // @ts-ignore
      else super(...args)
    }
    static now() {
      return FIXED_NOW.getTime()
    }
  } as DateConstructor
  global.Date = Mock
}

function restoreDate() {
  global.Date = RealDate
}

// ---------------------------------------------------------------------------
// Import service AFTER mocks are set up
// ---------------------------------------------------------------------------
import { getDashboard } from '../../../services/analytics'

const fakeRedis = { get: mockRedisGet, set: mockRedisSet } as any

// ---------------------------------------------------------------------------
// Requirement 9.5: Empty state when no reels exist
// ---------------------------------------------------------------------------
describe('Empty state when no reels exist (Req 9.5)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDate()
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue('OK')
  })
  afterEach(() => restoreDate())

  it('returns zeroed follower metrics, empty reels array, and empty streak when creator has no data', async () => {
    const creatorId = 'creator-empty'

    mockPrisma.analyticsSnapshot.findFirst.mockResolvedValue(null)
    mockPrisma.streak.findUnique.mockResolvedValue(null)
    mockPrisma.reelSubmission.findMany.mockResolvedValue([])

    const dashboard = await getDashboard(creatorId, fakeRedis)

    expect(dashboard.followerCount).toBe(0)
    expect(dashboard.followerGrowth7d).toBe(0)
    expect(dashboard.followerGrowth30d).toBe(0)
    expect(dashboard.reels).toEqual([])
    expect(dashboard.streak).toEqual({
      current: 0,
      highest: 0,
      milestones: [],
      lastActionDate: '',
    })
  })
})

// ---------------------------------------------------------------------------
// Requirement 9.6: Cache returns stale data within 5-minute window
// ---------------------------------------------------------------------------
describe('Cache returns stale data within 5-minute window (Req 9.6)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDate()
  })
  afterEach(() => restoreDate())

  it('returns cached data without querying Prisma when Redis has a cache hit', async () => {
    const creatorId = 'creator-cached'
    const cachedData = {
      followerCount: 500,
      followerGrowth7d: 25,
      followerGrowth30d: 100,
      postingConsistency30d: 50,
      streak: { current: 3, highest: 10, milestones: [], lastActionDate: '2025-06-14' },
      reels: [],
      cachedAt: '2025-06-15T11:57:00Z',
    }

    mockRedisGet.mockResolvedValue(JSON.stringify(cachedData))

    const dashboard = await getDashboard(creatorId, fakeRedis)

    // Should return the cached values
    expect(dashboard.followerCount).toBe(500)
    expect(dashboard.followerGrowth7d).toBe(25)
    expect(dashboard.followerGrowth30d).toBe(100)
    expect(dashboard.cachedAt).toBe('2025-06-15T11:57:00Z')

    // Prisma should NOT have been called
    expect(mockPrisma.analyticsSnapshot.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.streak.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.reelSubmission.findMany).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Requirement 9.1: Follower growth calculations
// ---------------------------------------------------------------------------
describe('Follower growth calculations (Req 9.1)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDate()
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue('OK')
  })
  afterEach(() => restoreDate())

  it('returns exact followerCount, followerGrowth7d, and followerGrowth30d from the analytics snapshot', async () => {
    const creatorId = 'creator-growth'

    mockPrisma.analyticsSnapshot.findFirst.mockResolvedValue({
      id: 'snap-1',
      creatorId,
      followerCount: 12500,
      followerGrowth7d: 340,
      followerGrowth30d: 1200,
      postingConsistency30d: 80,
      snapshotAt: FIXED_NOW,
    })
    mockPrisma.streak.findUnique.mockResolvedValue(null)
    mockPrisma.reelSubmission.findMany.mockResolvedValue([])

    const dashboard = await getDashboard(creatorId, fakeRedis)

    expect(dashboard.followerCount).toBe(12500)
    expect(dashboard.followerGrowth7d).toBe(340)
    expect(dashboard.followerGrowth30d).toBe(1200)
  })
})
