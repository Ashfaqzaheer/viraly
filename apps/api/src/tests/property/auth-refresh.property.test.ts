// Feature: viraly-app, Property 3: Refresh token round-trip
import * as fc from 'fast-check'
import jwt from 'jsonwebtoken'
import express from 'express'
import request from 'supertest'

const TEST_JWT_SECRET = 'test-secret-for-property-3'

// In-memory session store for the mock
const sessions = new Map<string, { id: string; creatorId: string; refreshToken: string; expiresAt: Date }>()
const creators = new Map<string, { id: string; email: string }>()

jest.mock('@viraly/db', () => ({
  prisma: {
    creator: {
      findUnique: jest.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) return creators.get(where.id) ?? null
        return null
      }),
    },
    session: {
      create: jest.fn(async ({ data }: { data: { creatorId: string; refreshToken: string; expiresAt: Date } }) => {
        const session = { id: `sess-${sessions.size + 1}`, ...data }
        sessions.set(data.refreshToken, session)
        return session
      }),
      findUnique: jest.fn(async ({ where }: { where: { refreshToken: string } }) => {
        return sessions.get(where.refreshToken) ?? null
      }),
    },
  },
}))

import authRouter from '../../routes/auth'
import cookieParser from 'cookie-parser'
import { issueTokens } from '../../utils/tokens'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/auth', authRouter)
  return app
}

describe('Property 3: Refresh token round-trip', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET
  })

  beforeEach(() => {
    sessions.clear()
    creators.clear()
    jest.clearAllMocks()
  })

  /**
   * Validates: Requirements 1.5
   *
   * For any valid Creator session, presenting the refresh token to the
   * token refresh endpoint SHALL return a new valid access token with
   * the correct Creator identity.
   */
  it('returns a new valid access token when a valid refresh token is presented', async () => {
    // Feature: viraly-app, Property 3: Refresh token round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        async (creatorId, email) => {
          sessions.clear()
          creators.clear()
          jest.clearAllMocks()

          // Seed the creator in the mock store
          creators.set(creatorId, { id: creatorId, email })

          // Issue tokens — this stores a session in our mock
          const { refreshToken } = await issueTokens(creatorId, email)

          const app = buildApp()
          const res = await request(app)
            .post('/auth/refresh')
            .set('Cookie', `refresh_token=${refreshToken}`)

          expect(res.status).toBe(200)
          expect(res.body).toHaveProperty('accessToken')

          // The new access token must be a valid JWT with the correct identity
          const decoded = jwt.verify(res.body.accessToken, TEST_JWT_SECRET) as jwt.JwtPayload
          expect(decoded.sub).toBe(creatorId)
          expect(decoded.email).toBe(email)

          // It must have a 15-minute expiry
          expect(decoded.exp! - decoded.iat!).toBe(900)
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  /**
   * Validates: Requirements 1.5
   *
   * For any refresh token that does not exist in the session store,
   * the endpoint SHALL return 401 and SHALL NOT issue a new access token.
   */
  it('rejects an invalid refresh token with 401', async () => {
    // Feature: viraly-app, Property 3: Refresh token round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 64, maxLength: 64 }),
        async (bogusToken) => {
          sessions.clear()
          creators.clear()
          jest.clearAllMocks()

          const app = buildApp()
          const res = await request(app)
            .post('/auth/refresh')
            .set('Cookie', `refresh_token=${bogusToken}`)

          expect(res.status).toBe(401)
          expect(res.body.error).toBe('invalid_refresh_token')
          expect(res.body).not.toHaveProperty('accessToken')
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)

  /**
   * Validates: Requirements 1.5
   *
   * For any expired session, presenting the refresh token SHALL return 401
   * and SHALL NOT issue a new access token.
   */
  it('rejects an expired refresh token with 401', async () => {
    // Feature: viraly-app, Property 3: Refresh token round-trip
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        async (creatorId, email) => {
          sessions.clear()
          creators.clear()
          jest.clearAllMocks()

          creators.set(creatorId, { id: creatorId, email })

          // Issue tokens then manually expire the session
          const { refreshToken } = await issueTokens(creatorId, email)
          const session = sessions.get(refreshToken)!
          session.expiresAt = new Date(Date.now() - 1000) // expired 1s ago

          const app = buildApp()
          const res = await request(app)
            .post('/auth/refresh')
            .set('Cookie', `refresh_token=${refreshToken}`)

          expect(res.status).toBe(401)
          expect(res.body.error).toBe('invalid_refresh_token')
          expect(res.body).not.toHaveProperty('accessToken')
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)
})
