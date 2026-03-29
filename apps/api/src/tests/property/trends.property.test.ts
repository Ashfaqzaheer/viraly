import * as fc from 'fast-check'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRedisGet = jest.fn()
const mockRedisSet = jest.fn()
const mockRedisKeys = jest.fn()
const mockRedisDel = jest.fn()

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
    keys: mockRedisKeys,
    del: mockRedisDel,
  }))
})

jest.mock('@viraly/db', () => ({
  prisma: {
    trend: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

const mockPrisma = require('@viraly/db').prisma

import { getTrends } from '../../services/trends'

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000

// ─── Property 23: Trend default view excludes stale data ─────────────────────
// Feature: viraly-app, Property 23: Trend default view excludes stale data
// For any call to getTrends without explicit stale inclusion, all returned
// trends SHALL have an updatedAt timestamp within the last 48 hours.
//
// Validates: Requirements 7.1, 7.4

describe('Property 23: Trend default view excludes stale data', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Always bypass cache so we hit the DB/filter path
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue('OK')
  })

  it('getTrends returns only non-stale trends for any mix of fresh and stale records', async () => {
    // Feature: viraly-app, Property 23: Trend default view excludes stale data

    const niches = ['fitness', 'finance', 'comedy', 'lifestyle', 'tech']

    // Generate a random offset in hours; 0–47 = fresh, 49–168 = stale
    const freshOffsetHoursArb = fc.integer({ min: 0, max: 47 })
    const staleOffsetHoursArb = fc.integer({ min: 49, max: 168 })

    const freshTrendArb = fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 80 }),
      description: fc.string({ minLength: 1, maxLength: 200 }),
      exampleFormat: fc.string({ minLength: 1, maxLength: 100 }),
      engagementLiftPercent: fc.double({ min: 0, max: 100, noNaN: true }),
      niche: fc.constantFrom(...niches),
      offsetHours: freshOffsetHoursArb,
    })

    const staleTrendArb = fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 80 }),
      description: fc.string({ minLength: 1, maxLength: 200 }),
      exampleFormat: fc.string({ minLength: 1, maxLength: 100 }),
      engagementLiftPercent: fc.double({ min: 0, max: 100, noNaN: true }),
      niche: fc.constantFrom(...niches),
      offsetHours: staleOffsetHoursArb,
    })

    await fc.assert(
      fc.asyncProperty(
        fc.array(freshTrendArb, { minLength: 0, maxLength: 10 }),
        fc.array(staleTrendArb, { minLength: 0, maxLength: 10 }),
        async (freshInputs, staleInputs) => {
          jest.clearAllMocks()
          mockRedisGet.mockResolvedValue(null)
          mockRedisSet.mockResolvedValue('OK')

          // Build DB records with concrete updatedAt dates
          const now = Date.now()

          const freshRecords = freshInputs.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            exampleFormat: t.exampleFormat,
            engagementLiftPercent: t.engagementLiftPercent,
            niche: t.niche,
            updatedAt: new Date(now - t.offsetHours * 60 * 60 * 1000),
            createdAt: new Date(now - t.offsetHours * 60 * 60 * 1000),
          }))

          // The service filters stale records via the Prisma `where` clause,
          // so Prisma.findMany should only return fresh records (simulating
          // the DB doing the filtering). We verify the service passes the
          // correct cutoff and that the response contains no stale data.
          mockPrisma.trend.findMany.mockResolvedValue(freshRecords)

          const result = await getTrends()

          // Verify: Prisma was called with the correct stale cutoff filter
          expect(mockPrisma.trend.findMany).toHaveBeenCalledTimes(1)
          const callArgs = mockPrisma.trend.findMany.mock.calls[0][0]
          expect(callArgs.where.updatedAt).toBeDefined()
          expect(callArgs.where.updatedAt.gte).toBeInstanceOf(Date)

          const cutoffUsed = callArgs.where.updatedAt.gte as Date
          const expectedCutoff = now - STALE_THRESHOLD_MS
          // Allow 2 seconds of drift for test execution time
          expect(Math.abs(cutoffUsed.getTime() - expectedCutoff)).toBeLessThan(2000)

          // Verify: every returned trend has updatedAt within 48h
          for (const trend of result) {
            const updatedAtMs = new Date(trend.updatedAt).getTime()
            expect(now - updatedAtMs).toBeLessThanOrEqual(STALE_THRESHOLD_MS)
            expect(trend.isStale).toBe(false)
          }

          // Verify: result count matches fresh records only
          expect(result.length).toBe(freshRecords.length)
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('stale trends are never returned even when DB contains only stale records', async () => {
    // Feature: viraly-app, Property 23: Trend default view excludes stale data
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 49, max: 168 }),
        async (staleOffsetHours) => {
          jest.clearAllMocks()
          mockRedisGet.mockResolvedValue(null)
          mockRedisSet.mockResolvedValue('OK')

          // DB returns nothing because all records are stale (filtered by WHERE)
          mockPrisma.trend.findMany.mockResolvedValue([])

          const result = await getTrends()

          expect(result).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
})


// ─── Property 24: Trend structure completeness ───────────────────────────────
// Feature: viraly-app, Property 24: Trend structure completeness
// For any trend returned by the Trend_Radar, the object SHALL contain non-empty
// title, description, exampleFormat, and a numeric engagementLiftPercent.
//
// Validates: Requirements 7.2

describe('Property 24: Trend structure completeness', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue('OK')
  })

  it('every trend returned by getTrends has non-empty title, description, exampleFormat, and numeric engagementLiftPercent', async () => {
    // Feature: viraly-app, Property 24: Trend structure completeness

    const nonEmptyStr = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

    const trendRecordArb = fc.record({
      id: fc.uuid(),
      title: nonEmptyStr,
      description: nonEmptyStr,
      exampleFormat: nonEmptyStr,
      engagementLiftPercent: fc.double({ min: 0, max: 500, noNaN: true }),
      niche: fc.string({ minLength: 1, maxLength: 50 }),
    })

    await fc.assert(
      fc.asyncProperty(
        fc.array(trendRecordArb, { minLength: 1, maxLength: 10 }),
        async (trendInputs) => {
          jest.clearAllMocks()
          mockRedisGet.mockResolvedValue(null)
          mockRedisSet.mockResolvedValue('OK')

          const now = new Date()
          const records = trendInputs.map(t => ({
            ...t,
            updatedAt: now,
            createdAt: now,
          }))

          mockPrisma.trend.findMany.mockResolvedValue(records)

          const result = await getTrends()

          for (const trend of result) {
            expect(trend.title).toBeTruthy()
            expect(trend.title.length).toBeGreaterThan(0)
            expect(trend.description).toBeTruthy()
            expect(trend.description.length).toBeGreaterThan(0)
            expect(trend.exampleFormat).toBeTruthy()
            expect(trend.exampleFormat.length).toBeGreaterThan(0)
            expect(typeof trend.engagementLiftPercent).toBe('number')
            expect(isNaN(trend.engagementLiftPercent)).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})

// ─── Property 25: Trend niche filter correctness ─────────────────────────────
// Feature: viraly-app, Property 25: Trend niche filter correctness
// For any niche filter value passed to getTrends, every returned trend SHALL
// have a niche field equal to the requested niche.
//
// Validates: Requirements 7.3

describe('Property 25: Trend niche filter correctness', () => {
  const niches = ['fitness', 'finance', 'comedy', 'lifestyle', 'tech', 'food', 'travel']

  beforeEach(() => {
    jest.clearAllMocks()
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue('OK')
  })

  it('all returned trends match the requested niche filter', async () => {
    // Feature: viraly-app, Property 25: Trend niche filter correctness
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...niches),
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1 }),
            description: fc.string({ minLength: 1 }),
            exampleFormat: fc.string({ minLength: 1 }),
            engagementLiftPercent: fc.double({ min: 0, max: 100, noNaN: true }),
            niche: fc.constantFrom(...niches),
          }),
          { minLength: 0, maxLength: 15 }
        ),
        async (requestedNiche, allTrends) => {
          jest.clearAllMocks()
          mockRedisGet.mockResolvedValue(null)
          mockRedisSet.mockResolvedValue('OK')

          const now = new Date()
          // Simulate DB filtering: only return trends matching the niche
          const matchingRecords = allTrends
            .filter(t => t.niche === requestedNiche)
            .map(t => ({ ...t, updatedAt: now, createdAt: now }))

          mockPrisma.trend.findMany.mockResolvedValue(matchingRecords)

          const result = await getTrends(requestedNiche)

          // Verify the service passed the niche to Prisma
          const callArgs = mockPrisma.trend.findMany.mock.calls[0][0]
          expect(callArgs.where.niche).toBe(requestedNiche)

          // Every returned trend must match the requested niche
          for (const trend of result) {
            expect(trend.niche).toBe(requestedNiche)
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})
