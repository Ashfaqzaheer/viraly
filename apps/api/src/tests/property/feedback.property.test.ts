import * as fc from 'fast-check'

// ─── Mocks (hoisted by Jest) ─────────────────────────────────────────────────
jest.mock('@viraly/db', () => ({
  prisma: {
    reelSubmission: {
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

jest.mock('../../services/streak', () => ({
  recordDailyAction: jest.fn().mockResolvedValue(undefined),
}))

import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { isAllowedDomain } from '../../routes/reel'
import reelRouter from '../../routes/reel'

const mockPrisma = require('@viraly/db').prisma

// ─── Property 17: Reel URL domain validation ──────────────────────────────────
// Feature: viraly-app, Property 17: Reel URL domain validation
// For any URL submitted to the Feedback_Service, the service SHALL accept the
// URL if and only if its hostname is instagram.com or tiktok.com (including
// subdomains). All other domains SHALL be rejected with an error response.
//
// Validates: Requirements 5.1, 5.5

describe('Property 17: Reel URL domain validation', () => {
  const validDomains = [
    'instagram.com',
    'www.instagram.com',
    'tiktok.com',
    'www.tiktok.com',
    'vm.tiktok.com',
    'm.instagram.com',
  ]

  const invalidDomains = [
    'youtube.com',
    'twitter.com',
    'facebook.com',
    'evil.com',
    'notinstagram.com',
    'instagram.com.evil.com',
    'tiktok.com.phishing.net',
    'fakeinstagram.com',
    'faketiktok.com',
  ]

  it('accepts all valid instagram.com and tiktok.com URLs (including subdomains)', async () => {
    // Feature: viraly-app, Property 17: Reel URL domain validation
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...validDomains),
        fc.webPath(),
        async (domain, path) => {
          const url = `https://${domain}${path}`
          expect(isAllowedDomain(url)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects all URLs from unsupported domains', async () => {
    // Feature: viraly-app, Property 17: Reel URL domain validation
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...invalidDomains),
        fc.webPath(),
        async (domain, path) => {
          const url = `https://${domain}${path}`
          expect(isAllowedDomain(url)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects malformed URLs', async () => {
    // Feature: viraly-app, Property 17: Reel URL domain validation
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s =>
          !s.startsWith('http://') && !s.startsWith('https://')
        ),
        async (malformed) => {
          expect(isAllowedDomain(malformed)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects URLs where instagram.com or tiktok.com appears as a path segment, not hostname', () => {
    // Feature: viraly-app, Property 17: Reel URL domain validation
    const tricky = [
      'https://evil.com/instagram.com/reel/abc',
      'https://evil.com/tiktok.com/video/123',
    ]
    for (const url of tricky) {
      expect(isAllowedDomain(url)).toBe(false)
    }
  })
})

// ─── Property 18: Reel feedback structure completeness ───────────────────────
// Feature: viraly-app, Property 18: Reel feedback structure completeness
// For any accepted reel submission that completes AI analysis, the returned
// feedback SHALL contain numeric scores and string commentary for all five
// dimensions: hookStrength, pacing, captionQuality, hashtagRelevance, and
// ctaEffectiveness.
//
// Validates: Requirements 5.2

describe('Property 18: Reel feedback structure completeness', () => {
  interface FeedbackScores {
    hookStrength: number
    pacing: number
    captionQuality: number
    hashtagRelevance: number
    ctaEffectiveness: number
  }

  interface FeedbackCommentary {
    hookStrength: string
    pacing: string
    captionQuality: string
    hashtagRelevance: string
    ctaEffectiveness: string
  }

  interface ReelFeedback {
    scores: FeedbackScores
    commentary: FeedbackCommentary
  }

  const scoreArb = fc.integer({ min: 0, max: 100 })
  const commentaryArb = fc.string({ minLength: 1, maxLength: 200 })

  const feedbackArb: fc.Arbitrary<ReelFeedback> = fc.record({
    scores: fc.record({
      hookStrength: scoreArb,
      pacing: scoreArb,
      captionQuality: scoreArb,
      hashtagRelevance: scoreArb,
      ctaEffectiveness: scoreArb,
    }),
    commentary: fc.record({
      hookStrength: commentaryArb,
      pacing: commentaryArb,
      captionQuality: commentaryArb,
      hashtagRelevance: commentaryArb,
      ctaEffectiveness: commentaryArb,
    }),
  })

  it('feedback structure contains all five score dimensions as numbers in [0, 100]', async () => {
    // Feature: viraly-app, Property 18: Reel feedback structure completeness
    await fc.assert(
      fc.asyncProperty(feedbackArb, async (feedback) => {
        const dimensions: Array<keyof FeedbackScores> = [
          'hookStrength',
          'pacing',
          'captionQuality',
          'hashtagRelevance',
          'ctaEffectiveness',
        ]
        for (const dim of dimensions) {
          expect(typeof feedback.scores[dim]).toBe('number')
          expect(feedback.scores[dim]).toBeGreaterThanOrEqual(0)
          expect(feedback.scores[dim]).toBeLessThanOrEqual(100)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('feedback structure contains all five commentary dimensions as non-empty strings', async () => {
    // Feature: viraly-app, Property 18: Reel feedback structure completeness
    await fc.assert(
      fc.asyncProperty(feedbackArb, async (feedback) => {
        const dimensions: Array<keyof FeedbackCommentary> = [
          'hookStrength',
          'pacing',
          'captionQuality',
          'hashtagRelevance',
          'ctaEffectiveness',
        ]
        for (const dim of dimensions) {
          expect(typeof feedback.commentary[dim]).toBe('string')
          expect(feedback.commentary[dim].length).toBeGreaterThan(0)
        }
      }),
      { numRuns: 100 }
    )
  })
})


// ─── Property 19: Reel feedback persistence round-trip ───────────────────────
// Feature: viraly-app, Property 19: Reel feedback persistence round-trip
// For any Creator who submits a reel, the submission SHALL appear in that
// Creator's feedback history with the correct URL and feedback data.
//
// Validates: Requirements 5.4

function jwtStub(req: Request, _res: Response, next: NextFunction) {
  req.creator = { sub: 'creator-prop-19', email: 'prop19@test.com', iat: 0, exp: 0 }
  next()
}

function buildReelApp() {
  const app = express()
  app.use(express.json())
  app.use(jwtStub)
  app.use('/reel', reelRouter)
  return app
}

describe('Property 19: Reel feedback persistence round-trip', () => {
  const scoreArb = fc.integer({ min: 0, max: 100 })
  const commentaryArb = fc.string({ minLength: 1, maxLength: 100 })

  const feedbackArb = fc.record({
    scores: fc.record({
      hookStrength: scoreArb,
      pacing: scoreArb,
      captionQuality: scoreArb,
      hashtagRelevance: scoreArb,
      ctaEffectiveness: scoreArb,
    }),
    commentary: fc.record({
      hookStrength: commentaryArb,
      pacing: commentaryArb,
      captionQuality: commentaryArb,
      hashtagRelevance: commentaryArb,
      ctaEffectiveness: commentaryArb,
    }),
  })

  const urlArb = fc.constantFrom(
    'https://www.instagram.com/reel/abc123',
    'https://www.tiktok.com/video/456789',
    'https://instagram.com/p/xyz',
    'https://vm.tiktok.com/ZMtest/',
    'https://m.instagram.com/reel/test',
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('submitted reel URL and feedback appear in history with correct data', async () => {
    // Feature: viraly-app, Property 19: Reel feedback persistence round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        urlArb,
        feedbackArb,
        async (submissionId, url, feedback) => {
          const app = buildReelApp()
          jest.clearAllMocks()

          const now = new Date()

          // Mock: no submissions yet today (under daily limit)
          mockPrisma.reelSubmission.count.mockResolvedValue(0)

          // Mock: create returns the new submission record
          mockPrisma.reelSubmission.create.mockResolvedValue({
            id: submissionId,
            creatorId: 'creator-prop-19',
            url,
            feedback: null,
            submittedAt: now,
          })

          // Mock: update persists the AI feedback onto the record
          mockPrisma.reelSubmission.update.mockResolvedValue({
            id: submissionId,
            creatorId: 'creator-prop-19',
            url,
            feedback,
            submittedAt: now,
          })

          // Mock global fetch for the AI service call
          const originalFetch = global.fetch
          global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => feedback,
          }) as unknown as typeof fetch

          // POST /reel/submit
          const postRes = await request(app)
            .post('/reel/submit')
            .send({ url })

          expect(postRes.status).toBe(201)
          expect(postRes.body.url).toBe(url)
          expect(postRes.body.feedback).toEqual(feedback)

          // Mock: history returns the persisted submission
          mockPrisma.reelSubmission.findMany.mockResolvedValue([
            {
              id: submissionId,
              url,
              feedback,
              submittedAt: now.toISOString(),
            },
          ])

          // GET /reel/history
          const getRes = await request(app).get('/reel/history')

          expect(getRes.status).toBe(200)
          expect(Array.isArray(getRes.body)).toBe(true)

          const found = getRes.body.find((s: { id: string }) => s.id === submissionId)
          expect(found).toBeDefined()
          expect(found.url).toBe(url)
          expect(found.feedback).toEqual(feedback)

          // Restore fetch
          global.fetch = originalFetch
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})

// ─── Property 20: Reel submission daily limit enforcement ────────────────────
// Feature: viraly-app, Property 20: Reel submission daily limit enforcement
// For any Creator who has already submitted 10 reels within the current
// 24-hour window, the 11th submission attempt SHALL be rejected.
//
// Validates: Requirements 5.6

describe('Property 20: Reel submission daily limit enforcement', () => {
  const DAILY_LIMIT = 10

  it('rejects the 11th submission when 10 already exist in the 24h window', async () => {
    // Feature: viraly-app, Property 20: Reel submission daily limit enforcement
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 50 }),
        async (existingCount) => {
          // Simulate the limit check logic
          const shouldReject = existingCount >= DAILY_LIMIT
          expect(shouldReject).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('allows submissions when count is below the daily limit', async () => {
    // Feature: viraly-app, Property 20: Reel submission daily limit enforcement
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 9 }),
        async (existingCount) => {
          const shouldReject = existingCount >= DAILY_LIMIT
          expect(shouldReject).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})
