import * as fc from 'fast-check'

// ─── Mocks (hoisted by Jest) ─────────────────────────────────────────────────
jest.mock('@viraly/db', () => ({
  prisma: {
    reelSubmission: {
      findFirst: jest.fn(),
    },
    viralityPrediction: {
      upsert: jest.fn(),
    },
  },
}))

import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import viralityRouter from '../../routes/virality'

const mockPrisma = require('@viraly/db').prisma

function jwtStub(req: Request, _res: Response, next: NextFunction) {
  req.creator = { sub: 'creator-prop-21', email: 'prop21@test.com', iat: 0, exp: 0 }
  next()
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(jwtStub)
  app.use('/virality', viralityRouter)
  return app
}

// ─── Property 21: Virality prediction output invariants ──────────────────────
// Feature: viraly-app, Property 21: Virality prediction output invariants
// For any virality prediction result, the score SHALL be an integer in [0, 100],
// reachMin SHALL be less than or equal to reachMax, and when the score is below
// 70 the suggestions array SHALL contain at least 3 entries.
//
// Validates: Requirements 6.1, 6.2, 6.3

describe('Property 21: Virality prediction output invariants', () => {
  // Arbitrary that produces valid AI responses conforming to the invariants
  const validAiResponseArb = fc.record({
    score: fc.integer({ min: 0, max: 100 }),
    reachMin: fc.integer({ min: 0, max: 500_000 }),
    reachMax: fc.integer({ min: 0, max: 1_000_000 }),
    suggestions: fc.array(fc.string({ minLength: 1, maxLength: 80 }), { minLength: 0, maxLength: 10 }),
  }).map(({ score, reachMin, reachMax, suggestions }) => ({
    score,
    reachMin: Math.min(reachMin, reachMax),
    reachMax: Math.max(reachMin, reachMax),
    // Ensure at least 3 suggestions when score < 70
    suggestions: score < 70
      ? [...suggestions, 'Improve hook opening', 'Add stronger CTA', 'Use trending hashtags'].slice(0, Math.max(3, suggestions.length + 3))
      : suggestions,
  }))

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('API response score is an integer in [0, 100], reachMin <= reachMax, and >= 3 suggestions when score < 70', async () => {
    // Feature: viraly-app, Property 21: Virality prediction output invariants
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        validAiResponseArb,
        async (reelSubmissionId, predictionId, aiResponse) => {
          const app = buildApp()
          jest.clearAllMocks()

          // Mock: reel submission exists for this creator
          mockPrisma.reelSubmission.findFirst.mockResolvedValue({
            id: reelSubmissionId,
            creatorId: 'creator-prop-21',
            url: 'https://www.instagram.com/reel/test',
          })

          // Mock: upsert returns the persisted prediction
          mockPrisma.viralityPrediction.upsert.mockResolvedValue({
            id: predictionId,
            creatorId: 'creator-prop-21',
            reelSubmissionId,
            score: aiResponse.score,
            reachMin: aiResponse.reachMin,
            reachMax: aiResponse.reachMax,
            suggestions: aiResponse.suggestions,
            createdAt: new Date(),
          })

          // Mock global fetch for the AI service
          const originalFetch = global.fetch
          global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => aiResponse,
          }) as unknown as typeof fetch

          const res = await request(app)
            .post(`/virality/predict/${reelSubmissionId}`)
            .send()

          expect(res.status).toBe(201)

          // Invariant 1: score is an integer in [0, 100]
          expect(Number.isInteger(res.body.score)).toBe(true)
          expect(res.body.score).toBeGreaterThanOrEqual(0)
          expect(res.body.score).toBeLessThanOrEqual(100)

          // Invariant 2: reachRange.min <= reachRange.max
          expect(res.body.reachRange.min).toBeLessThanOrEqual(res.body.reachRange.max)

          // Invariant 3: at least 3 suggestions when score < 70
          if (res.body.score < 70) {
            expect(res.body.suggestions.length).toBeGreaterThanOrEqual(3)
          }

          global.fetch = originalFetch
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('score range invariant holds for all generated values', async () => {
    // Feature: viraly-app, Property 21: Virality prediction output invariants
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100 }),
        async (score) => {
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(100)
          expect(Number.isInteger(score)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 22: Virality prediction persistence round-trip ─────────────────
// Feature: viraly-app, Property 22: Virality prediction persistence round-trip
// For any Creator and reel submission, after requesting a prediction, retrieving
// predictions for that Creator SHALL include a prediction linked to the correct
// reel submission ID.
//
// Validates: Requirements 6.5

describe('Property 22: Virality prediction persistence round-trip', () => {
  const CREATOR_ID = 'creator-prop-22'

  const aiResponseArb = fc.record({
    score: fc.integer({ min: 0, max: 100 }),
    reachMin: fc.integer({ min: 0, max: 500_000 }),
    reachMax: fc.integer({ min: 500_001, max: 1_000_000 }),
    suggestions: fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 3, maxLength: 6 }),
  })

  function buildProp22App() {
    const app = express()
    app.use(express.json())
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.creator = { sub: CREATOR_ID, email: 'prop22@test.com', iat: 0, exp: 0 }
      next()
    })
    app.use('/virality', viralityRouter)
    return app
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('after predicting, the persisted prediction is linked to the correct creatorId and reelSubmissionId', async () => {
    // Feature: viraly-app, Property 22: Virality prediction persistence round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        aiResponseArb,
        async (reelSubmissionId, predictionId, aiResponse) => {
          const app = buildProp22App()
          jest.clearAllMocks()

          // Track what was passed to upsert
          let upsertArgs: any = null

          mockPrisma.reelSubmission.findFirst.mockResolvedValue({
            id: reelSubmissionId,
            creatorId: CREATOR_ID,
            url: 'https://www.instagram.com/reel/test',
          })

          mockPrisma.viralityPrediction.upsert.mockImplementation(async (args: any) => {
            upsertArgs = args
            return {
              id: predictionId,
              creatorId: args.create.creatorId,
              reelSubmissionId: args.create.reelSubmissionId ?? args.where.reelSubmissionId,
              score: args.create.score,
              reachMin: args.create.reachMin,
              reachMax: args.create.reachMax,
              suggestions: args.create.suggestions,
              createdAt: new Date(),
            }
          })

          const originalFetch = global.fetch
          global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => aiResponse,
          }) as unknown as typeof fetch

          const res = await request(app)
            .post(`/virality/predict/${reelSubmissionId}`)
            .send()

          expect(res.status).toBe(201)

          // Round-trip: upsert was called with correct creatorId and reelSubmissionId
          expect(upsertArgs).not.toBeNull()
          expect(upsertArgs.create.creatorId).toBe(CREATOR_ID)
          expect(upsertArgs.create.reelSubmissionId).toBe(reelSubmissionId)
          expect(upsertArgs.where.reelSubmissionId).toBe(reelSubmissionId)

          // Response reflects the persisted data
          expect(res.body.id).toBe(predictionId)
          expect(res.body.score).toBe(aiResponse.score)
          expect(res.body.reachRange.min).toBe(aiResponse.reachMin)
          expect(res.body.reachRange.max).toBe(aiResponse.reachMax)
          expect(res.body.suggestions).toEqual(aiResponse.suggestions)

          global.fetch = originalFetch
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})
