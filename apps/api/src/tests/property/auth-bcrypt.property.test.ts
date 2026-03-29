// Feature: viraly-app, Property 6: Passwords stored as bcrypt hashes with cost >= 12
import * as fc from 'fast-check'
import bcrypt from 'bcrypt'
import express from 'express'
import request from 'supertest'

// Mock @viraly/db — capture the passwordHash passed to prisma.creator.create
let capturedPasswordHash: string | null = null

jest.mock('@viraly/db', () => {
  let createdCount = 0
  return {
    prisma: {
      creator: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: { data: { email: string; passwordHash: string } }) => {
          createdCount++
          capturedPasswordHash = data.passwordHash
          return { id: `creator-${createdCount}`, email: data.email }
        }),
      },
      session: {
        create: jest.fn(async () => ({ id: 'session-1' })),
      },
    },
  }
})

// Mock the tokens utility to avoid JWT/session side effects
jest.mock('../../utils/tokens', () => ({
  issueTokens: jest.fn(async (creatorId: string, _email: string) => ({
    accessToken: `access-${creatorId}`,
    refreshToken: `refresh-${creatorId}`,
  })),
}))

import authRouter from '../../routes/auth'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/auth', authRouter)
  return app
}

describe('Property 6: Passwords stored as bcrypt hashes with cost >= 12', () => {
  beforeEach(() => {
    capturedPasswordHash = null
    jest.clearAllMocks()
  })

  /**
   * Validates: Requirements 1.8
   *
   * For any Creator registered with a password, the stored credential SHALL be
   * a valid bcrypt hash with a cost factor of at least 12, and the plaintext
   * password SHALL NOT appear anywhere in the database.
   */
  it('stores passwords as valid bcrypt hashes with cost >= 12 and no plaintext leakage', async () => {
    // Feature: viraly-app, Property 6: Passwords stored as bcrypt hashes with cost >= 12
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (email, password) => {
          capturedPasswordHash = null
          jest.clearAllMocks()

          const app = buildApp()
          const res = await request(app)
            .post('/auth/register')
            .send({ email, password })

          // Registration should succeed
          expect(res.status).toBe(201)

          // A hash must have been captured
          expect(capturedPasswordHash).not.toBeNull()
          const hash = capturedPasswordHash as unknown as string

          // 1. Valid bcrypt hash prefix ($2b$ or $2a$)
          expect(hash).toMatch(/^\$2[ab]\$/)

          // 2. Cost factor >= 12
          const cost = parseInt(hash.split('$')[2], 10)
          expect(cost).toBeGreaterThanOrEqual(12)

          // 3. Plaintext password does NOT appear in the stored hash
          expect(hash).not.toContain(password)

          // 4. Round-trip: bcrypt.compare(original, hash) returns true
          const matches = await bcrypt.compare(password, hash)
          expect(matches).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  }, 120000)
})
