import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import viralityRouter from '../../../routes/virality'

// ---------------------------------------------------------------------------
// Mock Prisma so tests don't need a real database
// ---------------------------------------------------------------------------
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

import { prisma } from '@viraly/db'

const JWT_SECRET = 'test-secret'
const CREATOR_ID = 'creator-test-123'
const REEL_ID = 'reel-test-456'

function makeToken(creatorId = CREATOR_ID) {
  return jwt.sign({ sub: creatorId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '15m' })
}

function jwtMiddleware(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string }
    req.creator = { sub: payload.sub, email: payload.email, iat: 0, exp: 0 }
  }
  next()
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(jwtMiddleware)
  app.use('/virality', viralityRouter)
  return app
}

const mockSubmission = {
  id: REEL_ID,
  creatorId: CREATOR_ID,
  url: 'https://www.instagram.com/reel/abc123',
  feedback: null,
  submittedAt: new Date(),
}

const mockPrediction = {
  id: 'pred-test-789',
  creatorId: CREATOR_ID,
  reelSubmissionId: REEL_ID,
  score: 75,
  reachMin: 10000,
  reachMax: 50000,
  suggestions: [],
  createdAt: new Date(),
}

// Use a short retry delay for tests
beforeAll(() => {
  process.env.VIRALITY_RETRY_DELAY_MS = '10'
})

// ---------------------------------------------------------------------------
// POST /virality/predict/:reelSubmissionId
// ---------------------------------------------------------------------------
describe('POST /virality/predict/:reelSubmissionId', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fetch mock
    global.fetch = jest.fn()
  })

  it('returns 401 when no JWT is provided', async () => {
    const app = buildApp()
    const res = await request(app).post(`/virality/predict/${REEL_ID}`)
    expect(res.status).toBe(401)
  })

  it('returns 404 when reel submission does not belong to creator', async () => {
    ;(prisma.reelSubmission.findFirst as jest.Mock).mockResolvedValue(null)

    const app = buildApp()
    const res = await request(app)
      .post(`/virality/predict/${REEL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('not_found')
  })

  it('returns 502 when AI service is unreachable', async () => {
    ;(prisma.reelSubmission.findFirst as jest.Mock).mockResolvedValue(mockSubmission)
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const app = buildApp()
    const res = await request(app)
      .post(`/virality/predict/${REEL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(502)
    expect(res.body.error).toBe('ai_service_unavailable')
  })

  it('returns 502 when AI service returns non-OK response', async () => {
    ;(prisma.reelSubmission.findFirst as jest.Mock).mockResolvedValue(mockSubmission)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'AI error' }),
    })

    const app = buildApp()
    const res = await request(app)
      .post(`/virality/predict/${REEL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(502)
    expect(res.body.error).toBe('ai_service_unavailable')
  })

  it('returns 201 with prediction data on success', async () => {
    ;(prisma.reelSubmission.findFirst as jest.Mock).mockResolvedValue(mockSubmission)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        score: 75,
        reachMin: 10000,
        reachMax: 50000,
        suggestions: ['Improve hook', 'Add CTA', 'Better hashtags'],
      }),
    })
    ;(prisma.viralityPrediction.upsert as jest.Mock).mockResolvedValue(mockPrediction)

    const app = buildApp()
    const res = await request(app)
      .post(`/virality/predict/${REEL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(201)
    expect(res.body.score).toBe(75)
    expect(res.body.reachRange).toEqual({ min: 10000, max: 50000 })
  })

  it('persists prediction with correct creatorId and reelSubmissionId', async () => {
    ;(prisma.reelSubmission.findFirst as jest.Mock).mockResolvedValue(mockSubmission)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        score: 60,
        reachMin: 5000,
        reachMax: 20000,
        suggestions: ['Tip 1', 'Tip 2', 'Tip 3'],
      }),
    })
    ;(prisma.viralityPrediction.upsert as jest.Mock).mockResolvedValue({
      ...mockPrediction,
      score: 60,
    })

    const app = buildApp()
    await request(app)
      .post(`/virality/predict/${REEL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(prisma.viralityPrediction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reelSubmissionId: REEL_ID },
        create: expect.objectContaining({
          creatorId: CREATOR_ID,
          reelSubmissionId: REEL_ID,
        }),
      })
    )
  })
})

// ---------------------------------------------------------------------------
// Requirement 6.6: AI provider failure triggers retry then descriptive error
// ---------------------------------------------------------------------------
describe('POST /virality/predict/:reelSubmissionId — AI retry logic (Requirement 6.6)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('returns success when first call fails but retry succeeds', async () => {
    ;(prisma.reelSubmission.findFirst as jest.Mock).mockResolvedValue(mockSubmission)

    const mockFetch = global.fetch as jest.Mock
    // First call: network error
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    // Retry: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        score: 82,
        reachMin: 15000,
        reachMax: 60000,
        suggestions: ['Great hook', 'Strong CTA'],
      }),
    })

    ;(prisma.viralityPrediction.upsert as jest.Mock).mockResolvedValue({
      ...mockPrediction,
      score: 82,
      reachMin: 15000,
      reachMax: 60000,
    })

    const app = buildApp()
    const res = await request(app)
      .post(`/virality/predict/${REEL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(201)
    expect(res.body.score).toBe(82)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('returns 502 with descriptive error when both attempts fail', async () => {
    ;(prisma.reelSubmission.findFirst as jest.Mock).mockResolvedValue(mockSubmission)

    const mockFetch = global.fetch as jest.Mock
    // Both calls: network error
    mockFetch.mockRejectedValue(new Error('Network error'))

    const app = buildApp()
    const res = await request(app)
      .post(`/virality/predict/${REEL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(502)
    expect(res.body.error).toBe('ai_service_unavailable')
    expect(res.body.message).toBe('Could not reach AI service')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('retries when AI service returns non-OK response on first attempt', async () => {
    ;(prisma.reelSubmission.findFirst as jest.Mock).mockResolvedValue(mockSubmission)

    const mockFetch = global.fetch as jest.Mock
    // First call: non-OK response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'AI model overloaded' }),
    })
    // Retry: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        score: 55,
        reachMin: 3000,
        reachMax: 12000,
        suggestions: ['Improve hook', 'Add CTA', 'Better hashtags'],
      }),
    })

    ;(prisma.viralityPrediction.upsert as jest.Mock).mockResolvedValue({
      ...mockPrediction,
      score: 55,
    })

    const app = buildApp()
    const res = await request(app)
      .post(`/virality/predict/${REEL_ID}`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(201)
    expect(res.body.score).toBe(55)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
