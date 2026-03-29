import * as fc from 'fast-check'
import express, { Request, Response } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { jwtVerification } from '../../middleware/jwt'
import { inputValidator } from '../../middleware/inputValidator'
import { rateLimiter, _resetRedisClient } from '../../middleware/rateLimiter'

// We mock ioredis so the rateLimiter middleware uses an in-memory sorted set
// instead of a real Redis connection.
// Shared store across ALL mock instances so _reset() clears the same data
// the rateLimiter middleware's singleton uses.
const _sharedStore: Record<string, Array<{ member: string; score: number }>> = {}

function _getSet(key: string) {
  if (!_sharedStore[key]) _sharedStore[key] = []
  return _sharedStore[key]
}

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const pipelineOps: Array<() => [null, unknown]> = []

    const pipelineApi = {
      zremrangebyscore(key: string, _min: string | number, max: number) {
        pipelineOps.push(() => {
          const set = _getSet(key)
          _sharedStore[key] = set.filter(e => e.score > max)
          return [null, 0]
        })
        return pipelineApi
      },
      zadd(key: string, score: number, member: string) {
        pipelineOps.push(() => {
          _getSet(key).push({ member, score })
          return [null, 1]
        })
        return pipelineApi
      },
      zcard(key: string) {
        pipelineOps.push(() => [null, _getSet(key).length])
        return pipelineApi
      },
      expire(_key: string, _ttl: number) {
        pipelineOps.push(() => [null, 1])
        return pipelineApi
      },
      async exec() {
        const results = pipelineOps.map(op => op())
        pipelineOps.length = 0
        return results
      },
    }

    return {
      pipeline: () => {
        pipelineOps.length = 0
        return pipelineApi
      },
      zrange(key: string, start: number, stop: number, _withScores?: string) {
        const set = _getSet(key).sort((a, b) => a.score - b.score)
        const entry = set[start]
        return entry ? [entry.member, String(entry.score)] : []
      },
      // Allow tests to reset state between runs
      _reset() {
        for (const k of Object.keys(_sharedStore)) delete _sharedStore[k]
      },
    }
  })
})

const JWT_SECRET = 'property-test-secret'

function buildApp(middlewares: express.RequestHandler[]) {
  const app = express()
  app.use(express.json())
  middlewares.forEach(m => app.use(m))
  app.get('/protected', (_req: Request, res: Response) => res.json({ ok: true }))
  app.post('/data', (req: Request, res: Response) => res.json({ received: req.body }))
  app.get('/auth/login', (_req: Request, res: Response) => res.json({ public: true }))
  app.get('/auth/register', (_req: Request, res: Response) => res.json({ public: true }))
  app.get('/auth/google', (_req: Request, res: Response) => res.json({ public: true }))
  app.get('/auth/google/callback', (_req: Request, res: Response) => res.json({ public: true }))
  return app
}

/**
 * Build an Express app with JWT injection (simulates authenticated creator)
 * followed by the real rateLimiter middleware.
 */
function buildRateLimitApp(creatorId: string) {
  const app = express()
  app.use(express.json())
  // Inject creator identity so rateLimiter sees an authenticated request
  app.use((req: Request, _res: Response, next) => {
    ;(req as any).creator = { sub: creatorId }
    next()
  })
  app.use(rateLimiter)
  app.get('/test', (_req: Request, res: Response) => res.json({ ok: true }))
  return app
}

// ─── Property 36: Rate limit enforcement ─────────────────────────────────────
// Feature: viraly-app, Property 36: Rate limit enforcement
// For any Creator who sends more than 100 requests within a 60-second sliding
// window, every request beyond the 100th SHALL receive an HTTP 429 response
// containing a Retry-After header.

describe('Property 36: Rate limit enforcement', () => {
  /**
   * Validates: Requirements 11.1, 11.2
   *
   * Uses the real rateLimiter middleware with a mocked ioredis in-memory
   * sorted set. For each generated creatorId and request count (101–110),
   * we fire that many requests and assert every request beyond the 100th
   * returns 429 with a Retry-After header.
   *
   * Each iteration uses a unique creatorId so rate-limit keys never collide.
   * We reset the shared store and singleton between runs to keep memory bounded.
   * A persistent HTTP server is used to avoid file descriptor exhaustion.
   */
  it('returns 429 with Retry-After for every request beyond the 100th', async () => {
    // Feature: viraly-app, Property 36: Rate limit enforcement

    // Use a single app with dynamic creatorId set per-request via header
    const app = express()
    app.use(express.json())
    app.use((req: Request, _res: Response, next) => {
      const cid = req.headers['x-test-creator-id'] as string
      if (cid) (req as any).creator = { sub: cid }
      next()
    })
    app.use(rateLimiter)
    app.get('/test', (_req: Request, res: Response) => res.json({ ok: true }))

    const server = app.listen(0)
    const agent = request.agent(server)

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 101, max: 110 }),
          async (creatorId, totalRequests) => {
            // Reset shared store and rateLimiter singleton so each run starts clean
            for (const k of Object.keys(_sharedStore)) delete _sharedStore[k]
            _resetRedisClient()

            for (let i = 1; i <= totalRequests; i++) {
              const res = await agent.get('/test').set('x-test-creator-id', creatorId)
              if (i <= 100) {
                expect(res.status).toBe(200)
              } else {
                expect(res.status).toBe(429)
                expect(res.headers['retry-after']).toBeDefined()
                expect(res.body.error).toBe('rate_limit_exceeded')
                expect(typeof res.body.retryAfterSeconds).toBe('number')
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    } finally {
      server.close()
    }
  }, 120000)

  /**
   * For any request count at or below 100, all requests should succeed.
   */
  it('allows up to 100 requests within the window', async () => {
    // Feature: viraly-app, Property 36: Rate limit enforcement

    const app = express()
    app.use(express.json())
    app.use((req: Request, _res: Response, next) => {
      const cid = req.headers['x-test-creator-id'] as string
      if (cid) (req as any).creator = { sub: cid }
      next()
    })
    app.use(rateLimiter)
    app.get('/test', (_req: Request, res: Response) => res.json({ ok: true }))

    const server = app.listen(0)
    const agent = request.agent(server)

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 100 }),
          async (creatorId, totalRequests) => {
            // Reset shared store and rateLimiter singleton so each run starts clean
            for (const k of Object.keys(_sharedStore)) delete _sharedStore[k]
            _resetRedisClient()

            for (let i = 1; i <= totalRequests; i++) {
              const res = await agent.get('/test').set('x-test-creator-id', creatorId)
              expect(res.status).toBe(200)
            }
          }
        ),
        { numRuns: 100 }
      )
    } finally {
      server.close()
    }
  }, 120000)
})

// ─── Property 37: Injection pattern rejection ─────────────────────────────────
// Feature: viraly-app, Property 37: Injection pattern rejection
// For any request payload containing SQL injection patterns or script injection
// patterns, the Input_Validator SHALL return an HTTP 400 response and SHALL NOT
// pass the payload to any service handler.

describe('Property 37: Injection pattern rejection', () => {
  const app = buildApp([inputValidator])
  let server: ReturnType<typeof app.listen>
  let agent: ReturnType<typeof request.agent>

  beforeAll(() => {
    server = app.listen(0)
    agent = request.agent(server)
  })

  afterAll(() => {
    server.close()
  })

  const sqlInjectionExamples = [
    "'; DROP TABLE creators",
    "' OR 1=1 --",
    "' OR 'a'='a",
    "1; DROP TABLE users",
    "UNION SELECT * FROM creators",
    "'; INSERT INTO creators VALUES",
    "'; DELETE FROM sessions",
    "'; UPDATE creators SET",
    "'; EXEC xp_cmdshell",
  ]

  const scriptInjectionExamples = [
    '<script>alert(1)</script>',
    '<script src="evil.js">',
    'javascript:alert(1)',
    '<iframe src="evil.com">',
    '<object data="evil.swf">',
    'onclick="evil()"',
    'onerror="evil()"',
    'data:text/html,<script>',
  ]

  it('rejects all SQL injection patterns with HTTP 400', async () => {
    // Feature: viraly-app, Property 37: Injection pattern rejection
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...sqlInjectionExamples),
        async (injection) => {
          const res = await agent
            .post('/data')
            .send({ input: injection })
          expect(res.status).toBe(400)
          expect(res.body.error).toBe('validation_failed')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects all script injection patterns with HTTP 400', async () => {
    // Feature: viraly-app, Property 37: Injection pattern rejection
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...scriptInjectionExamples),
        async (injection) => {
          const res = await agent
            .post('/data')
            .send({ input: injection })
          expect(res.status).toBe(400)
          expect(res.body.error).toBe('validation_failed')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('passes clean payloads through to the handler', async () => {
    // Feature: viraly-app, Property 37: Injection pattern rejection
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }).filter(s =>
            !/<script/i.test(s) &&
            !/javascript:/i.test(s) &&
            !/'.*DROP/i.test(s) &&
            !/'.*OR.*=/i.test(s) &&
            !/UNION.*SELECT/i.test(s)
          ),
          value: fc.integer({ min: 0, max: 1000 }),
        }),
        async ({ name, value }) => {
          const res = await agent
            .post('/data')
            .send({ name, value })
          expect(res.status).toBe(200)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 38: JWT required on protected endpoints ─────────────────────────
// Feature: viraly-app, Property 38: JWT required on protected endpoints
// For any request to a non-public endpoint that lacks a valid JWT access token,
// the API_Gateway SHALL return an HTTP 401 response.

describe('Property 38: JWT required on protected endpoints', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET
  })

  const app = buildApp([jwtVerification])
  let server: ReturnType<typeof app.listen>
  let agent: ReturnType<typeof request.agent>

  beforeAll(() => {
    server = app.listen(0)
    agent = request.agent(server)
  })

  afterAll(() => {
    server.close()
  })

  const publicPaths = ['/auth/login', '/auth/register', '/auth/google', '/auth/google/callback']
  const protectedPaths = ['/protected']

  it('returns 401 for any protected endpoint without a token', async () => {
    // Feature: viraly-app, Property 38: JWT required on protected endpoints
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...protectedPaths),
        async (path) => {
          const res = await agent.get(path)
          expect(res.status).toBe(401)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('returns 401 for any protected endpoint with a malformed token', async () => {
    // Feature: viraly-app, Property 38: JWT required on protected endpoints
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...protectedPaths),
        fc.string({ minLength: 10, maxLength: 100 }).filter(s => !s.includes(' ')),
        async (path, badToken) => {
          const res = await agent
            .get(path)
            .set('Authorization', `Bearer ${badToken}`)
          expect(res.status).toBe(401)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('allows access to public endpoints without a token', async () => {
    // Feature: viraly-app, Property 38: JWT required on protected endpoints
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...publicPaths),
        async (path) => {
          const res = await agent.get(path)
          expect(res.status).toBe(200)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('allows access to protected endpoints with a valid JWT', async () => {
    // Feature: viraly-app, Property 38: JWT required on protected endpoints
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...protectedPaths),
        fc.uuid(),
        fc.emailAddress(),
        async (path, creatorId, email) => {
          const token = jwt.sign(
            { sub: creatorId, email },
            JWT_SECRET,
            { expiresIn: '15m' } as jwt.SignOptions
          )
          const res = await agent
            .get(path)
            .set('Authorization', `Bearer ${token}`)
          expect(res.status).toBe(200)
        }
      ),
      { numRuns: 100 }
    )
  })
})
