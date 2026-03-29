// Feature: viraly-app, Property 8: Authenticated request context always contains Creator identity
import * as fc from 'fast-check'
import express, { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { jwtVerification } from '../../middleware/jwt'

const TEST_SECRET = 'test-jwt-secret-for-property-8'

/**
 * Build a minimal Express app with JWT middleware and a probe endpoint
 * that returns whatever `req.creator` contains after verification.
 */
function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(jwtVerification)

  // Protected probe endpoint — returns the creator context set by JWT middleware
  app.get('/probe', (req: Request, res: Response) => {
    res.json({ creator: req.creator ?? null })
  })

  return app
}

describe('Property 8: Authenticated request context always contains Creator identity', () => {
  const originalEnv = process.env.JWT_SECRET

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET
  })

  afterAll(() => {
    process.env.JWT_SECRET = originalEnv
  })

  /**
   * Validates: Requirements 1.10
   *
   * For any request that passes JWT verification, the request context
   * SHALL contain the Creator's ID matching the `sub` claim of the JWT.
   */
  it('sets req.creator with sub matching the JWT sub claim for any valid token', async () => {
    // Feature: viraly-app, Property 8: Authenticated request context always contains Creator identity
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        async (creatorId, email) => {
          const token = jwt.sign({ sub: creatorId, email }, TEST_SECRET, { expiresIn: '15m' })

          const app = buildApp()
          const res = await request(app)
            .get('/probe')
            .set('Authorization', `Bearer ${token}`)

          expect(res.status).toBe(200)
          expect(res.body.creator).toBeDefined()
          expect(res.body.creator).not.toBeNull()
          expect(res.body.creator.sub).toBe(creatorId)
          expect(res.body.creator.email).toBe(email)
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)

  /**
   * Validates: Requirements 1.10 (negative case)
   *
   * For any request without a valid JWT, the probe endpoint SHALL NOT
   * have a creator context — the middleware rejects the request with 401.
   */
  it('rejects requests without a valid JWT and does not set creator context', async () => {
    // Feature: viraly-app, Property 8: Authenticated request context always contains Creator identity
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        async (garbage) => {
          const app = buildApp()
          const res = await request(app)
            .get('/probe')
            .set('Authorization', `Bearer ${garbage}`)

          expect(res.status).toBe(401)
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
})
