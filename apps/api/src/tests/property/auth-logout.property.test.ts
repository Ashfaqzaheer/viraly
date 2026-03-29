// Feature: viraly-app, Property 5: Logout invalidates refresh token
import * as fc from 'fast-check'
import express from 'express'
import request from 'supertest'

const TEST_JWT_SECRET = 'test-secret-for-property-5'

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
      deleteMany: jest.fn(async ({ where }: { where: { refreshToken: string } }) => {
        const existed = sessions.has(where.refreshToken)
        sessions.delete(where.refreshToken)
        return { count: existed ? 1 : 0 }
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

describe('Property 5: Logout invalidates refresh token', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET
  })

  beforeEach(() => {
    sessions.clear()
    creators.clear()
    jest.clearAllMocks()
  })

  /**
   * Validates: Requirements 1.7
   *
   * For any Creator session, after the Creator logs out, presenting the
   * previously valid refresh token SHALL return an error and SHALL NOT
   * issue a new access token.
   */
  it('invalidates refresh token after logout so refresh fails with 401', async () => {
    // Feature: viraly-app, Property 5: Logout invalidates refresh token
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        async (creatorId, email) => {
          sessions.clear()
          creators.clear()
          jest.clearAllMocks()

          // Seed creator and issue a valid session
          creators.set(creatorId, { id: creatorId, email })
          const { refreshToken } = await issueTokens(creatorId, email)

          const app = buildApp()

          // Verify the refresh token works before logout
          const preLogout = await request(app)
            .post('/auth/refresh')
            .set('Cookie', `refresh_token=${refreshToken}`)
          expect(preLogout.status).toBe(200)
          expect(preLogout.body).toHaveProperty('accessToken')

          // Logout
          const logoutRes = await request(app)
            .post('/auth/logout')
            .set('Cookie', `refresh_token=${refreshToken}`)
          expect(logoutRes.status).toBe(204)

          // After logout, the same refresh token must be rejected
          const postLogout = await request(app)
            .post('/auth/refresh')
            .set('Cookie', `refresh_token=${refreshToken}`)
          expect(postLogout.status).toBe(401)
          expect(postLogout.body.error).toBe('invalid_refresh_token')
          expect(postLogout.body).not.toHaveProperty('accessToken')
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  /**
   * Validates: Requirements 1.7
   *
   * Logout SHALL return 204 even when the refresh token is not found
   * (idempotent / no-op behavior).
   */
  it('returns 204 for logout with unknown refresh token', async () => {
    // Feature: viraly-app, Property 5: Logout invalidates refresh token
    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 64, maxLength: 64 }),
        async (bogusToken) => {
          sessions.clear()
          jest.clearAllMocks()

          const app = buildApp()
          const res = await request(app)
            .post('/auth/logout')
            .set('Cookie', `refresh_token=${bogusToken}`)

          expect(res.status).toBe(204)
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
})
