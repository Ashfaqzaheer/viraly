import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import onboardingRouter from '../../../routes/onboarding'

// ---------------------------------------------------------------------------
// Mock Prisma so tests don't need a real database
// ---------------------------------------------------------------------------
jest.mock('@viraly/db', () => ({
  prisma: {
    creator: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

import { prisma } from '@viraly/db'

const JWT_SECRET = 'test-secret'
const CREATOR_ID = 'creator-test-123'

function makeToken(creatorId = CREATOR_ID) {
  return jwt.sign({ sub: creatorId, email: 'test@example.com' }, JWT_SECRET, { expiresIn: '15m' })
}

// Minimal JWT middleware for tests
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
  app.use('/onboarding', onboardingRouter)
  return app
}

const validProfile = {
  displayName: 'Alice Creator',
  primaryNiche: 'fitness',
  followerCountRange: 'under_1k',
  primaryGoal: 'grow my audience',
}

// ---------------------------------------------------------------------------
// POST /onboarding/profile — saveProfile
// ---------------------------------------------------------------------------
describe('POST /onboarding/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 and saved profile on valid input', async () => {
    const mockCreator = {
      id: CREATOR_ID,
      ...validProfile,
      secondaryNiche: null,
      instagramHandle: null,
      onboardingComplete: true,
    }
    ;(prisma.creator.update as jest.Mock).mockResolvedValue(mockCreator)

    const app = buildApp()
    const res = await request(app)
      .post('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(validProfile)

    expect(res.status).toBe(200)
    expect(res.body.onboardingComplete).toBe(true)
    expect(res.body.displayName).toBe('Alice Creator')
    expect(res.body.primaryNiche).toBe('fitness')
  })

  it('sets onboardingComplete = true on save', async () => {
    const mockCreator = { id: CREATOR_ID, ...validProfile, secondaryNiche: null, instagramHandle: null, onboardingComplete: true }
    ;(prisma.creator.update as jest.Mock).mockResolvedValue(mockCreator)

    const app = buildApp()
    await request(app)
      .post('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(validProfile)

    expect(prisma.creator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ onboardingComplete: true }),
      })
    )
  })

  it('persists optional fields when provided', async () => {
    const withOptionals = { ...validProfile, secondaryNiche: 'finance', instagramHandle: '@alice' }
    const mockCreator = { id: CREATOR_ID, ...withOptionals, onboardingComplete: true }
    ;(prisma.creator.update as jest.Mock).mockResolvedValue(mockCreator)

    const app = buildApp()
    const res = await request(app)
      .post('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(withOptionals)

    expect(res.status).toBe(200)
    expect(res.body.secondaryNiche).toBe('finance')
    expect(res.body.instagramHandle).toBe('@alice')
  })

  it('returns 422 when displayName is missing', async () => {
    const app = buildApp()
    const { displayName: _, ...body } = validProfile
    const res = await request(app)
      .post('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(body)

    expect(res.status).toBe(422)
    expect(res.body.error).toBe('validation_failed')
    expect(res.body.fields).toEqual(expect.arrayContaining([{ field: 'displayName', message: 'required' }]))
  })

  it('returns 422 when primaryNiche is missing', async () => {
    const app = buildApp()
    const { primaryNiche: _, ...body } = validProfile
    const res = await request(app)
      .post('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(body)

    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual(expect.arrayContaining([{ field: 'primaryNiche', message: 'required' }]))
  })

  it('returns 422 when followerCountRange is missing', async () => {
    const app = buildApp()
    const { followerCountRange: _, ...body } = validProfile
    const res = await request(app)
      .post('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(body)

    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual(expect.arrayContaining([{ field: 'followerCountRange', message: 'required' }]))
  })

  it('returns 422 when primaryGoal is missing', async () => {
    const app = buildApp()
    const { primaryGoal: _, ...body } = validProfile
    const res = await request(app)
      .post('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(body)

    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual(expect.arrayContaining([{ field: 'primaryGoal', message: 'required' }]))
  })

  it('returns 422 with all missing field errors when all required fields absent', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({})

    expect(res.status).toBe(422)
    expect(res.body.error).toBe('validation_failed')
    expect(res.body.fields).toHaveLength(4)
  })

  it('does NOT persist data when validation fails', async () => {
    const app = buildApp()
    await request(app)
      .post('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ displayName: 'Alice' }) // missing required fields

    expect(prisma.creator.update).not.toHaveBeenCalled()
  })

  it('returns 422 when displayName is empty string', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...validProfile, displayName: '   ' })

    expect(res.status).toBe(422)
    expect(res.body.fields).toEqual(expect.arrayContaining([{ field: 'displayName', message: 'required' }]))
  })
})

// ---------------------------------------------------------------------------
// GET /onboarding/profile — getProfile
// ---------------------------------------------------------------------------
describe('GET /onboarding/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns saved profile data for a creator with completed onboarding', async () => {
    const mockCreator = {
      id: CREATOR_ID,
      ...validProfile,
      secondaryNiche: null,
      instagramHandle: null,
      onboardingComplete: true,
    }
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue(mockCreator)

    const app = buildApp()
    const res = await request(app)
      .get('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.displayName).toBe('Alice Creator')
    expect(res.body.primaryNiche).toBe('fitness')
    expect(res.body.onboardingComplete).toBe(true)
    // No incomplete flag when onboarding is complete
    expect(res.body.incomplete).toBeUndefined()
  })

  it('includes incomplete = true when onboardingComplete is false', async () => {
    const mockCreator = {
      id: CREATOR_ID,
      displayName: null,
      primaryNiche: null,
      secondaryNiche: null,
      instagramHandle: null,
      followerCountRange: null,
      primaryGoal: null,
      onboardingComplete: false,
    }
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue(mockCreator)

    const app = buildApp()
    const res = await request(app)
      .get('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.onboardingComplete).toBe(false)
    expect(res.body.incomplete).toBe(true)
  })

  it('does NOT include incomplete flag when onboardingComplete is true', async () => {
    const mockCreator = { id: CREATOR_ID, ...validProfile, secondaryNiche: null, instagramHandle: null, onboardingComplete: true }
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue(mockCreator)

    const app = buildApp()
    const res = await request(app)
      .get('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.body.incomplete).toBeUndefined()
  })

  it('returns 404 when creator is not found', async () => {
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue(null)

    const app = buildApp()
    const res = await request(app)
      .get('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(404)
  })

  // Requirement 2.5: skip flow keeps onboardingComplete = false and prompts
  it('skip flow sets onboardingComplete = false and returns incomplete flag', async () => {
    // Simulates a creator who registered but never submitted the onboarding form
    const skippedCreator = {
      id: CREATOR_ID,
      displayName: null,
      primaryNiche: null,
      secondaryNiche: null,
      instagramHandle: null,
      followerCountRange: null,
      primaryGoal: null,
      onboardingComplete: false,
    }
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue(skippedCreator)

    const app = buildApp()
    const res = await request(app)
      .get('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.onboardingComplete).toBe(false)
    expect(res.body.incomplete).toBe(true)
    // Profile fields should be null — nothing was saved
    expect(res.body.displayName).toBeNull()
    expect(res.body.primaryNiche).toBeNull()
    expect(res.body.followerCountRange).toBeNull()
    expect(res.body.primaryGoal).toBeNull()
  })

  // Requirement 2.1: multi-step form presents on first login (newly registered creator)
  it('presents incomplete-profile prompt on first login for a new creator', async () => {
    // A freshly registered creator has onboardingComplete = false by default
    const freshCreator = {
      id: CREATOR_ID,
      displayName: null,
      primaryNiche: null,
      secondaryNiche: null,
      instagramHandle: null,
      followerCountRange: null,
      primaryGoal: null,
      onboardingComplete: false,
    }
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue(freshCreator)

    const app = buildApp()
    const res = await request(app)
      .get('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)

    // The response should signal that onboarding is incomplete so the
    // frontend can present the multi-step onboarding form
    expect(res.status).toBe(200)
    expect(res.body.incomplete).toBe(true)
    expect(res.body.onboardingComplete).toBe(false)
  })

  it('pre-populates all saved fields in the response', async () => {
    const mockCreator = {
      id: CREATOR_ID,
      displayName: 'Bob',
      primaryNiche: 'comedy',
      secondaryNiche: 'lifestyle',
      instagramHandle: '@bob',
      followerCountRange: '1k_10k',
      primaryGoal: 'monetize',
      onboardingComplete: true,
    }
    ;(prisma.creator.findUnique as jest.Mock).mockResolvedValue(mockCreator)

    const app = buildApp()
    const res = await request(app)
      .get('/onboarding/profile')
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body.displayName).toBe('Bob')
    expect(res.body.primaryNiche).toBe('comedy')
    expect(res.body.secondaryNiche).toBe('lifestyle')
    expect(res.body.instagramHandle).toBe('@bob')
    expect(res.body.followerCountRange).toBe('1k_10k')
    expect(res.body.primaryGoal).toBe('monetize')
  })
})
