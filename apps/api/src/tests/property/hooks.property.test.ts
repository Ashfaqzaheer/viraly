import * as fc from 'fast-check'

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@viraly/db', () => ({
  prisma: {
    hook: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    savedHook: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

const mockPrisma = require('@viraly/db').prisma

import { searchHooks } from '../../services/hooks'

// ─── Property 26: Hook niche filter correctness ──────────────────────────────
// Feature: viraly-app, Property 26: Hook niche filter correctness
// For any niche value passed to the Hook_Library query, every returned hook
// SHALL include that niche in its niches array.
//
// Validates: Requirements 8.1, 8.2

describe('Property 26: Hook niche filter correctness', () => {
  const niches = ['fitness', 'finance', 'comedy', 'lifestyle', 'tech', 'food', 'travel']

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('all returned hooks include the requested niche in their niches array', async () => {
    // Feature: viraly-app, Property 26: Hook niche filter correctness
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...niches),
        fc.array(
          fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 200 }),
            niches: fc.array(fc.constantFrom(...niches), { minLength: 1, maxLength: 4 }),
            relevanceScore: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (requestedNiche, allHooks) => {
          jest.clearAllMocks()

          // Simulate DB filtering: only hooks whose niches array contains the requested niche
          const matchingHooks = allHooks.filter((h) => h.niches.includes(requestedNiche))

          mockPrisma.hook.findMany.mockResolvedValue(matchingHooks)
          mockPrisma.hook.count.mockResolvedValue(matchingHooks.length)

          const result = await searchHooks({ niche: requestedNiche })

          // Verify the service passed the niche filter to Prisma
          const callArgs = mockPrisma.hook.findMany.mock.calls[0][0]
          expect(callArgs.where.niches).toEqual({ has: requestedNiche })

          // Every returned hook must include the requested niche
          for (const hook of result.data) {
            expect(hook.niches).toContain(requestedNiche)
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('hooks without the requested niche are excluded from results', async () => {
    // Feature: viraly-app, Property 26: Hook niche filter correctness
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...niches),
        fc.array(
          fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 200 }),
            niches: fc.array(fc.constantFrom(...niches), { minLength: 1, maxLength: 4 }),
            relevanceScore: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (requestedNiche, allHooks) => {
          jest.clearAllMocks()

          // DB returns only matching hooks (simulating Prisma's { has } filter)
          const matchingHooks = allHooks.filter((h) => h.niches.includes(requestedNiche))
          const excludedHooks = allHooks.filter((h) => !h.niches.includes(requestedNiche))

          mockPrisma.hook.findMany.mockResolvedValue(matchingHooks)
          mockPrisma.hook.count.mockResolvedValue(matchingHooks.length)

          const result = await searchHooks({ niche: requestedNiche })
          const returnedIds = new Set(result.data.map((h) => h.id))

          // No excluded hook should appear in the results
          for (const hook of excludedHooks) {
            expect(returnedIds.has(hook.id)).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})


// ─── Property 27: Hook unfiltered results ordered by relevance ───────────────
// Feature: viraly-app, Property 27: Hook unfiltered results ordered by relevance
// For any unfiltered Hook_Library query, the returned hooks SHALL be ordered in
// non-increasing order of relevanceScore.
//
// Validates: Requirements 8.3

describe('Property 27: Hook unfiltered results ordered by relevance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('hooks are returned in non-increasing order of relevanceScore', async () => {
    // Feature: viraly-app, Property 27: Hook unfiltered results ordered by relevance
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 200 }),
            niches: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
            relevanceScore: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (hooks) => {
          jest.clearAllMocks()

          // Prisma returns hooks pre-sorted by relevanceScore desc (simulating DB ORDER BY)
          const sorted = [...hooks].sort((a, b) => b.relevanceScore - a.relevanceScore)

          mockPrisma.hook.findMany.mockResolvedValue(sorted)
          mockPrisma.hook.count.mockResolvedValue(sorted.length)

          // Unfiltered query: no niche param
          const result = await searchHooks({})

          // Verify the service requested descending relevanceScore ordering
          const callArgs = mockPrisma.hook.findMany.mock.calls[0][0]
          expect(callArgs.orderBy).toEqual({ relevanceScore: 'desc' })

          // Verify no niche filter was applied
          expect(callArgs.where.niches).toBeUndefined()

          // Verify returned data is in non-increasing relevanceScore order
          for (let i = 1; i < result.data.length; i++) {
            expect(result.data[i].relevanceScore).toBeLessThanOrEqual(
              result.data[i - 1].relevanceScore
            )
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})

// ─── Property 28: Hook pagination size invariant ─────────────────────────────
// Feature: viraly-app, Property 28: Hook pagination size invariant
// For any Hook_Library query, the number of returned results SHALL be less than
// or equal to the requested pageSize, the pageSize SHALL be capped at 100, and
// the default pageSize SHALL be 20.
//
// Validates: Requirements 8.5

describe('Property 28: Hook pagination size invariant', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('default pageSize is 20 when none is specified', async () => {
    // Feature: viraly-app, Property 28: Hook pagination size invariant
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            niches: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
            relevanceScore: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          { minLength: 0, maxLength: 25 }
        ),
        async (hooks) => {
          jest.clearAllMocks()
          const returned = hooks.slice(0, 20)
          mockPrisma.hook.findMany.mockResolvedValue(returned)
          mockPrisma.hook.count.mockResolvedValue(hooks.length)

          const result = await searchHooks({})

          expect(result.pageSize).toBe(20)
          expect(result.data.length).toBeLessThanOrEqual(20)
          const callArgs = mockPrisma.hook.findMany.mock.calls[0][0]
          expect(callArgs.take).toBe(20)
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('pageSize is capped at 100 for any requested value above 100', async () => {
    // Feature: viraly-app, Property 28: Hook pagination size invariant
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 101, max: 10_000 }),
        async (requestedPageSize) => {
          jest.clearAllMocks()
          mockPrisma.hook.findMany.mockResolvedValue([])
          mockPrisma.hook.count.mockResolvedValue(0)

          const result = await searchHooks({ pageSize: requestedPageSize })

          expect(result.pageSize).toBe(100)
          const callArgs = mockPrisma.hook.findMany.mock.calls[0][0]
          expect(callArgs.take).toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('returned results count is <= requested pageSize for any query', async () => {
    // Feature: viraly-app, Property 28: Hook pagination size invariant
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            niches: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
            relevanceScore: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          { minLength: 0, maxLength: 200 }
        ),
        async (pageSize, allHooks) => {
          jest.clearAllMocks()
          const effectiveSize = Math.min(100, pageSize)
          const returned = allHooks.slice(0, effectiveSize)
          mockPrisma.hook.findMany.mockResolvedValue(returned)
          mockPrisma.hook.count.mockResolvedValue(allHooks.length)

          const result = await searchHooks({ pageSize })

          expect(result.data.length).toBeLessThanOrEqual(effectiveSize)
          expect(result.pageSize).toBeLessThanOrEqual(100)
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('pageSize within [1, 100] is passed through as-is', async () => {
    // Feature: viraly-app, Property 28: Hook pagination size invariant
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        async (pageSize) => {
          jest.clearAllMocks()
          mockPrisma.hook.findMany.mockResolvedValue([])
          mockPrisma.hook.count.mockResolvedValue(0)

          const result = await searchHooks({ pageSize })

          expect(result.pageSize).toBe(pageSize)
          const callArgs = mockPrisma.hook.findMany.mock.calls[0][0]
          expect(callArgs.take).toBe(pageSize)
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})

// ─── Property 29: Saved hook round-trip ──────────────────────────────────────
// Feature: viraly-app, Property 29: Saved hook round-trip
// For any Creator who saves a hook, retrieving that Creator's saved hooks SHALL
// include the saved hook.
//
// Validates: Requirements 8.6

import { saveHook, getSavedHooks } from '../../services/hooks'

describe('Property 29: Saved hook round-trip', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('saved hook appears in the creator saved hooks list after saving', async () => {
    // Feature: viraly-app, Property 29: Saved hook round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.array(fc.constantFrom('fitness', 'finance', 'comedy', 'lifestyle', 'tech'), { minLength: 1, maxLength: 3 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        async (creatorId, hookId, content, niches, relevanceScore) => {
          jest.clearAllMocks()

          const hook = { id: hookId, content, niches, relevanceScore }

          // Mock upsert for saveHook — returns the saved record
          mockPrisma.savedHook.upsert.mockResolvedValue({
            id: 'saved-1',
            creatorId,
            hookId,
            savedAt: new Date(),
          })

          // Save the hook
          await saveHook(creatorId, hookId)

          // Verify upsert was called with correct composite key
          expect(mockPrisma.savedHook.upsert).toHaveBeenCalledWith({
            where: { creatorId_hookId: { creatorId, hookId } },
            create: { creatorId, hookId },
            update: {},
          })

          // Mock getSavedHooks — returns the hook we just saved
          mockPrisma.savedHook.findMany.mockResolvedValue([
            { creatorId, hookId, hook, savedAt: new Date() },
          ])

          // Retrieve saved hooks
          const saved = await getSavedHooks(creatorId)

          // The saved hook must appear in the list with matching data
          const found = saved.find((h) => h.id === hookId)
          expect(found).toBeDefined()
          expect(found!.content).toBe(content)
          expect(found!.niches).toEqual(niches)
          expect(found!.relevanceScore).toBe(relevanceScore)
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('saving the same hook twice calls upsert both times without error', async () => {
    // Feature: viraly-app, Property 29: Saved hook round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        async (creatorId, hookId) => {
          jest.clearAllMocks()

          const upsertResult = { id: 'saved-1', creatorId, hookId, savedAt: new Date() }
          mockPrisma.savedHook.upsert.mockResolvedValue(upsertResult)

          // Save twice — upsert should handle idempotency
          await saveHook(creatorId, hookId)
          await saveHook(creatorId, hookId)

          // Both calls should use the same composite unique key
          expect(mockPrisma.savedHook.upsert).toHaveBeenCalledTimes(2)
          for (const call of mockPrisma.savedHook.upsert.mock.calls) {
            expect(call[0].where).toEqual({ creatorId_hookId: { creatorId, hookId } })
          }

          // After two saves, getSavedHooks should still return only one entry
          mockPrisma.savedHook.findMany.mockResolvedValue([
            { creatorId, hookId, hook: { id: hookId, content: 'hook', niches: ['fitness'], relevanceScore: 0.5 }, savedAt: new Date() },
          ])

          const saved = await getSavedHooks(creatorId)
          const matchingHooks = saved.filter((h) => h.id === hookId)
          expect(matchingHooks).toHaveLength(1)
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('getSavedHooks filters by the correct creatorId', async () => {
    // Feature: viraly-app, Property 29: Saved hook round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (creatorId) => {
          jest.clearAllMocks()

          mockPrisma.savedHook.findMany.mockResolvedValue([])

          await getSavedHooks(creatorId)

          // Verify the query filters by the correct creatorId
          const callArgs = mockPrisma.savedHook.findMany.mock.calls[0][0]
          expect(callArgs.where).toEqual({ creatorId })
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})
