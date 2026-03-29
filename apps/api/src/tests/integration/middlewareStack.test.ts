/**
 * Integration test: Validate end-to-end request flow through middleware stack.
 * Confirms rate limiter, JWT check, and input validator all fire in correct order.
 * Requirements: 11.1, 11.3, 11.5
 *
 * Middleware order: HTTPS → CORS → JWT → Rate Limiter → Input Validator → Route Handler
 *
 * Key validations:
 * 1. JWT check fires before rate limiter (unauthenticated requests get 401, not 429)
 * 2. Rate limiter fires before input validator (rate-limited requests get 429, not 400)
 * 3. Input validator fires before route handler (injection payloads never reach handler)
 */
import express, { Request, Response } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { jwtVerification } from '../../middleware/jwt'
import { inputValidator } from '../../middleware/inputValidator'

const JWT_SECRET = 'integration-test-secret'

function makeToken(overrides: object = {}, expiresIn: string | number = '15m') {
  return jwt.sign(
    { sub: 'creator-1', email: 'test@example.com', ...overrides },
    JWT_SECRET,
    { expiresIn } as jwt.SignOptions,
  )
}

/**
 * Build a test app that mirrors the real middleware order from index.ts:
 * JWT → Rate Limiter (simulated) → Input Validator → Route Handler
 *
 * We use a lightweight rate limiter stub so we don't need Redis in tests.
 */
function buildFullStackApp(options: { rateLimitExceeded?: boolean } = {}) {
  const app = express()
  app.use(express.json())

  // Track which middleware ran, in order
  const executionLog: string[] = []

  // 1. JWT verification (real middleware)
  app.use((req: Request, res: Response, next) => {
    executionLog.length = 0 // reset per request
    executionLog.push('jwt')
    jwtVerification(req, res, next)
  })

  // 2. Rate limiter (stub — avoids Redis dependency)
  app.use((req: Request, res: Response, next) => {
    executionLog.push('rateLimiter')
    if (options.rateLimitExceeded) {
      res.set('Retry-After', '30')
      res.status(429).json({ error: 'rate_limit_exceeded', retryAfterSeconds: 30 })
      return
    }
    next()
  })

  // 3. Input validator (real middleware)
  app.use((req: Request, res: Response, next) => {
    executionLog.push('inputValidator')
    inputValidator(req, res, next)
  })

  // Route handler
  app.post('/data', (req: Request, res: Response) => {
    executionLog.push('handler')
    res.json({ ok: true, executionLog: [...executionLog] })
  })

  app.get('/protected', (_req: Request, res: Response) => {
    executionLog.push('handler')
    res.json({ ok: true, executionLog: [...executionLog] })
  })

  // Public endpoints
  app.post('/auth/login', (_req: Request, res: Response) => {
    executionLog.push('handler')
    res.json({ ok: true, executionLog: [...executionLog] })
  })

  return { app, getLog: () => [...executionLog] }
}

describe('Middleware stack order validation (Requirements 11.1, 11.3, 11.5)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET
  })

  // ─── JWT fires before rate limiter ────────────────────────────────────────

  it('rejects unauthenticated request with 401 before rate limiter runs', async () => {
    const { app, getLog } = buildFullStackApp()
    const res = await request(app).get('/protected')

    expect(res.status).toBe(401)
    // JWT ran but rate limiter and input validator did NOT run
    const log = getLog()
    expect(log).toContain('jwt')
    expect(log).not.toContain('rateLimiter')
    expect(log).not.toContain('inputValidator')
    expect(log).not.toContain('handler')
  })

  // ─── Rate limiter fires before input validator ────────────────────────────

  it('returns 429 before input validator runs when rate limit exceeded', async () => {
    const { app, getLog } = buildFullStackApp({ rateLimitExceeded: true })
    const token = makeToken()
    const res = await request(app)
      .post('/data')
      .set('Authorization', `Bearer ${token}`)
      .send({ input: "'; DROP TABLE creators" }) // injection payload

    expect(res.status).toBe(429)
    expect(res.headers['retry-after']).toBe('30')
    const log = getLog()
    expect(log).toEqual(['jwt', 'rateLimiter'])
    expect(log).not.toContain('inputValidator')
    expect(log).not.toContain('handler')
  })

  // ─── Input validator fires before route handler ───────────────────────────

  it('rejects injection payload with 400 before route handler runs', async () => {
    const { app, getLog } = buildFullStackApp()
    const token = makeToken()
    const res = await request(app)
      .post('/data')
      .set('Authorization', `Bearer ${token}`)
      .send({ input: '<script>alert(1)</script>' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_failed')
    const log = getLog()
    expect(log).toEqual(['jwt', 'rateLimiter', 'inputValidator'])
    expect(log).not.toContain('handler')
  })

  // ─── Full happy path: all middleware fires in order ───────────────────────

  it('runs all middleware in correct order for valid authenticated request', async () => {
    const { app } = buildFullStackApp()
    const token = makeToken()
    const res = await request(app)
      .post('/data')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Alice' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.executionLog).toEqual([
      'jwt',
      'rateLimiter',
      'inputValidator',
      'handler',
    ])
  })

  // ─── Public endpoints skip JWT but still run remaining middleware ──────────

  it('public endpoints skip JWT rejection but still run rate limiter and input validator', async () => {
    const { app } = buildFullStackApp()
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.executionLog).toEqual([
      'jwt',
      'rateLimiter',
      'inputValidator',
      'handler',
    ])
  })

  // ─── Expired token returns 401 before other middleware ────────────────────

  it('expired JWT returns 401 before rate limiter or input validator', async () => {
    const { app, getLog } = buildFullStackApp()
    const expiredToken = makeToken({}, '-1s')
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('token_expired')
    const log = getLog()
    expect(log).toContain('jwt')
    expect(log).not.toContain('rateLimiter')
  })
})
