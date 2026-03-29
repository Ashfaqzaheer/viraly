import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import scriptsRouter from '../../../routes/scripts'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('@viraly/db', () => ({
  prisma: {
    creator: { findUnique: jest.fn() },
    script: { upsert: jest.fn() },
  },
}))

jest.mock('../../../services/streak', () => ({
  recordDailyAction: jest.fn().mockResolvedValue({}),
}))

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  }))
})

import { prisma } from '@viraly/db'

const JWT_SECRET = 'test-secret'
const CREATOR_ID = 'creator-scripts-123'

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
  app.use('/scripts', scriptsRouter)
  return app
}

// ---------------------------------------------------------------------------
// Requirement 3.5: returns error when no niche set
// ---------------------------------------------------------------------------
describe('GET /scripts/daily — no niche set (Requirement 3.5)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 422 with onboarding_incomplete when creator has no primaryNiche', async () => {
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue({ primaryNiche: null })

    const app = buildApp()
    const res = await request(app)
      .get('/scripts/daily')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(422)
    expect(res.body.error).toBe('onboarding_incomplete')
    expect(res.body.message).toMatch(/complete your profile/i)
  })

  it('returns 422 when creator record does not exist', async () => {
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue(null)

    const app = buildApp()
    const res = await request(app)
      .get('/scripts/daily')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(422)
    expect(res.body.error).toBe('onboarding_incomplete')
  })
})

// ---------------------------------------------------------------------------
// Requirement 3.7: AI provider failure triggers retry then descriptive error
// ---------------------------------------------------------------------------
describe('GET /scripts/daily — AI provider failure (Requirement 3.7)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 502 with descriptive error when AI service responds with an error', async () => {
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue({ primaryNiche: 'fitness' })

    // Mock global fetch to simulate AI service failure
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'AI model overloaded' }),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    const app = buildApp()
    const res = await request(app)
      .get('/scripts/daily')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(502)
    expect(res.body.error).toBe('ai_service_unavailable')
    expect(res.body.message).toBe('AI model overloaded')
  })

  it('returns generic message when AI service error has no body', async () => {
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue({ primaryNiche: 'comedy' })

    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('no json')),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    const app = buildApp()
    const res = await request(app)
      .get('/scripts/daily')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(502)
    expect(res.body.error).toBe('ai_service_unavailable')
    expect(res.body.message).toBe('Script generation failed')
  })
})
