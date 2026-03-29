/**
 * Integration tests for critical paths.
 * Requirements: 1.1–1.7, 5.1–5.4, 12.4
 *
 * 1. Full auth flow: register → login → refresh → logout
 * 2. Full reel flow: submit → feedback → predict
 * 3. Cascade delete: create creator with all relations → delete → verify all gone
 */
import express from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { prisma } from '@viraly/db'
import { jwtVerification } from '../../middleware/jwt'
import authRouter from '../../routes/auth'
import reelRouter from '../../routes/reel'
import viralityRouter from '../../routes/virality'

const JWT_SECRET = 'integration-test-secret'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Express app with JWT middleware and the given routers. */
function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use(jwtVerification)
  app.use('/auth', authRouter)
  app.use('/reel', reelRouter)
  app.use('/virality', viralityRouter)
  return app
}

function uniqueEmail() {
  return `integ-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET
})

// ═══════════════════════════════════════════════════════════════════════════
// 1. Full Auth Flow: register → login → refresh → logout
// Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7
// ═══════════════════════════════════════════════════════════════════════════

describe('Full auth flow (Requirements 1.1–1.7)', () => {
  const app = buildApp()
  const email = uniqueEmail()
  const password = 'securePass123'

  let accessToken: string
  let refreshToken: string

  it('register → creates account and returns tokens', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password })

    expect(res.status).toBe(201)
    expect(res.body.accessToken).toBeDefined()
    expect(res.body.creator.email).toBe(email)

    // Extract refresh token from Set-Cookie header
    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies).toBeDefined()
    const rtCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) => c.startsWith('refresh_token='))
    expect(rtCookie).toBeDefined()
    refreshToken = rtCookie!.split(';')[0].split('=')[1]

    // Verify JWT payload
    const payload = jwt.verify(res.body.accessToken, JWT_SECRET) as { sub: string; email: string; exp: number }
    expect(payload.email).toBe(email)
    expect(payload.sub).toBe(res.body.creator.id)

    // Verify password is stored as bcrypt hash (Req 1.8)
    const creator = await prisma.creator.findUnique({ where: { email } })
    expect(creator).not.toBeNull()
    expect(creator!.passwordHash).not.toBe(password)
    const hashValid = await bcrypt.compare(password, creator!.passwordHash!)
    expect(hashValid).toBe(true)
  })

  it('register → rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('email_taken')
  })

  it('login → authenticates and returns tokens', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password })

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()

    // Extract refresh token from cookie
    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies).toBeDefined()
    const rtCookie = (Array.isArray(cookies) ? cookies : [cookies]).find((c: string) => c.startsWith('refresh_token='))
    expect(rtCookie).toBeDefined()

    accessToken = res.body.accessToken
    refreshToken = rtCookie!.split(';')[0].split('=')[1]
  })

  it('login → returns identical error for wrong email and wrong password (Req 1.6)', async () => {
    const [wrongEmail, wrongPass] = await Promise.all([
      request(app).post('/auth/login').send({ email: 'nobody@test.com', password }),
      request(app).post('/auth/login').send({ email, password: 'wrongPassword' }),
    ])

    expect(wrongEmail.status).toBe(401)
    expect(wrongPass.status).toBe(401)
    // Response bodies must be indistinguishable
    expect(wrongEmail.body).toEqual(wrongPass.body)
  })

  it('refresh → issues new access token from refresh token', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${refreshToken}`)

    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeDefined()

    // New access token should be valid
    const payload = jwt.verify(res.body.accessToken, JWT_SECRET) as { sub: string }
    expect(payload.sub).toBeDefined()
  })

  it('logout → invalidates refresh token', async () => {
    const logoutRes = await request(app)
      .post('/auth/logout')
      .set('Cookie', `refresh_token=${refreshToken}`)

    expect(logoutRes.status).toBe(204)

    // Refresh token should no longer work
    const refreshRes = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${refreshToken}`)

    expect(refreshRes.status).toBe(401)
    expect(refreshRes.body.error).toBe('invalid_refresh_token')
  })

  // Cleanup
  afterAll(async () => {
    await prisma.creator.deleteMany({ where: { email } })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. Full Reel Flow: submit → feedback → predict
// Requirements: 5.1–5.4, 6.5
// ═══════════════════════════════════════════════════════════════════════════

describe('Full reel flow (Requirements 5.1–5.4)', () => {
  const app = buildApp()
  let creatorId: string
  let token: string
  let reelSubmissionId: string

  // We need a real creator in the DB for the reel routes
  beforeAll(async () => {
    const creator = await prisma.creator.create({
      data: { email: uniqueEmail(), passwordHash: 'not-used' },
    })
    creatorId = creator.id
    token = jwt.sign({ sub: creatorId, email: creator.email }, JWT_SECRET, { expiresIn: '15m' })
  })

  afterAll(async () => {
    await prisma.creator.delete({ where: { id: creatorId } }).catch(() => {})
  })

  it('rejects unsupported domain with 400 (Req 5.1, 5.5)', async () => {
    const res = await request(app)
      .post('/reel/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://youtube.com/watch?v=abc' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('unsupported_domain')
  })

  it('submit → stores reel and returns feedback (Req 5.1, 5.2, 5.4)', async () => {
    // Mock the AI service by intercepting fetch
    const mockFeedback = {
      scores: {
        hookStrength: 85,
        pacing: 72,
        captionQuality: 90,
        hashtagRelevance: 65,
        ctaEffectiveness: 78,
      },
      commentary: {
        hookStrength: 'Strong opening',
        pacing: 'Good rhythm',
        captionQuality: 'Engaging caption',
        hashtagRelevance: 'Could improve hashtag selection',
        ctaEffectiveness: 'Clear call to action',
      },
    }

    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeedback,
    } as Response)

    const res = await request(app)
      .post('/reel/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://www.instagram.com/reel/abc123' })

    global.fetch = originalFetch

    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.url).toBe('https://www.instagram.com/reel/abc123')
    expect(res.body.feedback).toEqual(mockFeedback)

    reelSubmissionId = res.body.id

    // Verify persisted in DB (Req 5.4)
    const stored = await prisma.reelSubmission.findUnique({ where: { id: reelSubmissionId } })
    expect(stored).not.toBeNull()
    expect(stored!.creatorId).toBe(creatorId)
    expect(stored!.feedback).toEqual(mockFeedback)
  })

  it('history → returns submitted reel in feedback history (Req 5.4)', async () => {
    const res = await request(app)
      .get('/reel/history')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const found = res.body.find((r: { id: string }) => r.id === reelSubmissionId)
    expect(found).toBeDefined()
    expect(found.url).toBe('https://www.instagram.com/reel/abc123')
  })

  it('predict → returns virality prediction linked to reel (Req 6.5)', async () => {
    const mockPrediction = {
      score: 55,
      reachMin: 1000,
      reachMax: 5000,
      suggestions: ['Improve hook', 'Add trending audio', 'Shorten intro'],
    }

    const originalFetch = global.fetch
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockPrediction,
    } as Response)

    const res = await request(app)
      .post(`/virality/predict/${reelSubmissionId}`)
      .set('Authorization', `Bearer ${token}`)

    global.fetch = originalFetch

    expect(res.status).toBe(201)
    expect(res.body.score).toBe(55)
    expect(res.body.reachRange).toEqual({ min: 1000, max: 5000 })
    expect(res.body.suggestions).toHaveLength(3)

    // Verify persisted and linked (Req 6.5)
    const stored = await prisma.viralityPrediction.findUnique({
      where: { reelSubmissionId },
    })
    expect(stored).not.toBeNull()
    expect(stored!.creatorId).toBe(creatorId)
    expect(stored!.score).toBe(55)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. Cascade Delete: create creator with all relations → delete → verify gone
// Requirements: 12.4
// ═══════════════════════════════════════════════════════════════════════════

describe('Cascade delete (Requirement 12.4)', () => {
  let creatorId: string
  let hookId: string
  let moduleId: string
  let lessonId: string

  beforeAll(async () => {
    // Create a creator with every possible relation type
    const creator = await prisma.creator.create({
      data: { email: uniqueEmail(), passwordHash: 'hash' },
    })
    creatorId = creator.id

    // Session
    await prisma.session.create({
      data: {
        creatorId,
        refreshToken: `rt-${creatorId}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Script
    await prisma.script.create({
      data: {
        creatorId,
        date: '2025-01-01',
        scripts: [{ hook: 'test', structure: {}, caption: '', hashtags: [], callToAction: '' }],
      },
    })

    // Streak
    await prisma.streak.create({
      data: { creatorId, current: 5, highest: 10 },
    })

    // ReelSubmission + ViralityPrediction
    const reel = await prisma.reelSubmission.create({
      data: { creatorId, url: 'https://instagram.com/reel/test' },
    })
    await prisma.viralityPrediction.create({
      data: {
        creatorId,
        reelSubmissionId: reel.id,
        score: 80,
        reachMin: 500,
        reachMax: 5000,
        suggestions: ['tip1', 'tip2', 'tip3'],
      },
    })

    // Hook + SavedHook
    const hook = await prisma.hook.create({
      data: { content: 'Test hook', niches: ['fitness'], relevanceScore: 0.9 },
    })
    hookId = hook.id
    await prisma.savedHook.create({
      data: { creatorId, hookId },
    })

    // AnalyticsSnapshot
    await prisma.analyticsSnapshot.create({
      data: {
        creatorId,
        followerCount: 1000,
        followerGrowth7d: 50,
        followerGrowth30d: 200,
        postingConsistency30d: 80.0,
      },
    })

    // MonetizationModule + Lesson + LessonCompletion
    const mod = await prisma.monetizationModule.create({
      data: { title: 'Test Module', order: 1 },
    })
    moduleId = mod.id
    const lesson = await prisma.monetizationLesson.create({
      data: {
        moduleId,
        title: 'Test Lesson',
        body: 'Content',
        estimatedReadMin: 5,
        order: 1,
        audienceLevel: 'beginner',
      },
    })
    lessonId = lesson.id
    await prisma.lessonCompletion.create({
      data: { creatorId, lessonId },
    })
  })

  it('deleting a creator removes all associated records', async () => {
    // Verify records exist before delete
    expect(await prisma.session.count({ where: { creatorId } })).toBeGreaterThan(0)
    expect(await prisma.script.count({ where: { creatorId } })).toBeGreaterThan(0)
    expect(await prisma.streak.count({ where: { creatorId } })).toBeGreaterThan(0)
    expect(await prisma.reelSubmission.count({ where: { creatorId } })).toBeGreaterThan(0)
    expect(await prisma.viralityPrediction.count({ where: { creatorId } })).toBeGreaterThan(0)
    expect(await prisma.savedHook.count({ where: { creatorId } })).toBeGreaterThan(0)
    expect(await prisma.analyticsSnapshot.count({ where: { creatorId } })).toBeGreaterThan(0)
    expect(await prisma.lessonCompletion.count({ where: { creatorId } })).toBeGreaterThan(0)

    // Delete the creator
    await prisma.creator.delete({ where: { id: creatorId } })

    // Verify all associated records are gone
    expect(await prisma.session.count({ where: { creatorId } })).toBe(0)
    expect(await prisma.script.count({ where: { creatorId } })).toBe(0)
    expect(await prisma.streak.count({ where: { creatorId } })).toBe(0)
    expect(await prisma.reelSubmission.count({ where: { creatorId } })).toBe(0)
    expect(await prisma.viralityPrediction.count({ where: { creatorId } })).toBe(0)
    expect(await prisma.savedHook.count({ where: { creatorId } })).toBe(0)
    expect(await prisma.analyticsSnapshot.count({ where: { creatorId } })).toBe(0)
    expect(await prisma.lessonCompletion.count({ where: { creatorId } })).toBe(0)

    // Creator itself is gone
    expect(await prisma.creator.findUnique({ where: { id: creatorId } })).toBeNull()
  })

  afterAll(async () => {
    // Clean up non-cascaded records (Hook and Module are independent)
    await prisma.hook.delete({ where: { id: hookId } }).catch(() => {})
    await prisma.monetizationLesson.deleteMany({ where: { moduleId } }).catch(() => {})
    await prisma.monetizationModule.delete({ where: { id: moduleId } }).catch(() => {})
  })
})
