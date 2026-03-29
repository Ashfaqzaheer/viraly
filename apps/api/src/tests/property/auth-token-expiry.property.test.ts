// Feature: viraly-app, Property 2: Issued tokens have correct expiry
import * as fc from 'fast-check'
import jwt from 'jsonwebtoken'

const TEST_JWT_SECRET = 'test-secret-for-property-2'

// Mock @viraly/db — capture the session creation call to verify refresh token expiry
let capturedSessionData: { creatorId: string; refreshToken: string; expiresAt: Date } | null = null

jest.mock('@viraly/db', () => ({
  prisma: {
    session: {
      create: jest.fn(async ({ data }: { data: { creatorId: string; refreshToken: string; expiresAt: Date } }) => {
        capturedSessionData = data
        return { id: 'session-1', ...data }
      }),
    },
  },
}))

import { issueTokens } from '../../utils/tokens'

describe('Property 2: Issued tokens have correct expiry', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET
  })

  beforeEach(() => {
    capturedSessionData = null
    jest.clearAllMocks()
  })

  /**
   * Validates: Requirements 1.4
   *
   * For any successful authentication, the returned JWT access token SHALL
   * have an expiry of exactly 15 minutes (900 seconds) from issuance.
   */
  it('JWT access token has an expiry of exactly 15 minutes from issuance', async () => {
    // Feature: viraly-app, Property 2: Issued tokens have correct expiry
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        async (creatorId, email) => {
          capturedSessionData = null
          jest.clearAllMocks()

          const { accessToken } = await issueTokens(creatorId, email)

          const decoded = jwt.verify(accessToken, TEST_JWT_SECRET) as jwt.JwtPayload
          expect(decoded.sub).toBe(creatorId)
          expect(decoded.email).toBe(email)
          expect(typeof decoded.iat).toBe('number')
          expect(typeof decoded.exp).toBe('number')

          // Access token expiry must be exactly 900 seconds (15 minutes) after issuance
          const diff = decoded.exp! - decoded.iat!
          expect(diff).toBe(900)
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)

  /**
   * Validates: Requirements 1.4
   *
   * For any successful authentication, the refresh token session stored in
   * the database SHALL have an expiresAt that is approximately 7 days from creation.
   */
  it('refresh token session has an expiry of approximately 7 days from creation', async () => {
    // Feature: viraly-app, Property 2: Issued tokens have correct expiry
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.emailAddress(),
        async (creatorId, email) => {
          capturedSessionData = null
          jest.clearAllMocks()

          const beforeCall = Date.now()
          await issueTokens(creatorId, email)
          const afterCall = Date.now()

          expect(capturedSessionData).not.toBeNull()
          expect(capturedSessionData!.creatorId).toBe(creatorId)

          const expiresAtMs = capturedSessionData!.expiresAt.getTime()
          const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

          // The expiresAt should be ~7 days from now.
          // Allow a 5-second tolerance window to account for execution time.
          const expectedMin = beforeCall + sevenDaysMs - 5000
          const expectedMax = afterCall + sevenDaysMs + 5000

          expect(expiresAtMs).toBeGreaterThanOrEqual(expectedMin)
          expect(expiresAtMs).toBeLessThanOrEqual(expectedMax)
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
})
