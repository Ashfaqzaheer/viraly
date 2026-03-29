// Feature: viraly-app, Property 1: Registration validates email uniqueness and password length
import * as fc from 'fast-check'
import express, { Request, Response } from 'express'
import request from 'supertest'

// Mock @viraly/db before importing the auth router
jest.mock('@viraly/db', () => {
  const existingEmails = new Set<string>()
  let createdCount = 0

  return {
    prisma: {
      creator: {
        findUnique: jest.fn(async ({ where }: { where: { email: string } }) => {
          if (existingEmails.has(where.email)) {
            return { id: 'existing-id', email: where.email, passwordHash: 'hash' }
          }
          return null
        }),
        create: jest.fn(async ({ data }: { data: { email: string; passwordHash: string } }) => {
          createdCount++
          existingEmails.add(data.email)
          return { id: `creator-${createdCount}`, email: data.email }
        }),
      },
      session: {
        create: jest.fn(async () => ({ id: 'session-1' })),
      },
    },
    __test__: {
      existingEmails,
      getCreatedCount: () => createdCount,
      reset: () => {
        existingEmails.clear()
        createdCount = 0
      },
    },
  }
})

// Mock bcrypt — capture the cost factor passed to hash
jest.mock('bcrypt', () => ({
  hash: jest.fn(async (password: string, cost: number) => `$2b$${String(cost).padStart(2, '0')}$mockhash_${password}`),
  compare: jest.fn(),
}))

// Mock the tokens utility
jest.mock('../../utils/tokens', () => ({
  issueTokens: jest.fn(async (creatorId: string, email: string) => ({
    accessToken: `access-token-${creatorId}`,
    refreshToken: `refresh-token-${creatorId}`,
  })),
}))

import authRouter from '../../routes/auth'
import cookieParser from 'cookie-parser'
const { __test__ } = require('@viraly/db')
const mockPrisma = require('@viraly/db').prisma
const mockBcrypt = require('bcrypt')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/auth', authRouter)
  return app
}

describe('Property 1: Registration validates email uniqueness and password length', () => {
  beforeEach(() => {
    __test__.reset()
    jest.clearAllMocks()
  })

  /**
   * Validates: Requirements 1.3
   *
   * For any generated password shorter than 8 characters, registration
   * SHALL return 400 and no Creator record SHALL be created.
   */
  it('rejects registration when password is shorter than 8 characters', async () => {
    // Feature: viraly-app, Property 1: Registration validates email uniqueness and password length
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 7 }),
        async (email, shortPassword) => {
          __test__.reset()
          jest.clearAllMocks()

          const app = buildApp()
          const res = await request(app)
            .post('/auth/register')
            .send({ email, password: shortPassword })

          expect(res.status).toBe(400)
          expect(res.body.error).toBe('password_too_short')
          expect(res.body.minLength).toBe(8)
          // No creator should have been created
          expect(mockPrisma.creator.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)

  /**
   * Validates: Requirements 1.3
   *
   * For any generated email that already exists in the system,
   * registration SHALL return 409 and no new Creator record SHALL be created.
   */
  it('rejects registration when email already exists', async () => {
    // Feature: viraly-app, Property 1: Registration validates email uniqueness and password length
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (email, validPassword) => {
          __test__.reset()
          jest.clearAllMocks()

          // Pre-populate the email as existing
          __test__.existingEmails.add(email)

          const app = buildApp()
          const res = await request(app)
            .post('/auth/register')
            .send({ email, password: validPassword })

          expect(res.status).toBe(409)
          expect(res.body.error).toBe('email_taken')
          // No new creator should have been created
          expect(mockPrisma.creator.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)

  /**
   * Validates: Requirements 1.3
   *
   * For any unique email and valid password (>= 8 chars), registration
   * SHALL succeed with 201 and a new Creator record SHALL be created.
   */
  it('accepts registration with unique email and valid password', async () => {
    // Feature: viraly-app, Property 1: Registration validates email uniqueness and password length
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (email, validPassword) => {
          __test__.reset()
          jest.clearAllMocks()

          const app = buildApp()
          const res = await request(app)
            .post('/auth/register')
            .send({ email, password: validPassword })

          expect(res.status).toBe(201)
          expect(res.body).toHaveProperty('accessToken')
          expect(res.body).toHaveProperty('creator')
          // Refresh token should be in Set-Cookie header, not body
          expect(res.headers['set-cookie']).toBeDefined()
          // Exactly one creator should have been created
          expect(mockPrisma.creator.create).toHaveBeenCalledTimes(1)
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)

  /**
   * Validates: Requirements 1.3
   *
   * Registration with missing password SHALL return 400 and no Creator
   * record SHALL be created.
   */
  it('rejects registration when password is missing', async () => {
    // Feature: viraly-app, Property 1: Registration validates email uniqueness and password length
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          __test__.reset()
          jest.clearAllMocks()

          const app = buildApp()
          const res = await request(app)
            .post('/auth/register')
            .send({ email })

          expect(res.status).toBe(400)
          expect(res.body.error).toBe('password_too_short')
          expect(mockPrisma.creator.create).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)
})


// ─── Property 6: Passwords stored as bcrypt hashes with cost >= 12 ───────────
// Feature: viraly-app, Property 6: Passwords stored as bcrypt hashes with cost >= 12

describe('Property 6: Passwords stored as bcrypt hashes with cost >= 12', () => {
  beforeEach(() => {
    __test__.reset()
    jest.clearAllMocks()
  })

  /**
   * Validates: Requirements 1.8
   *
   * For any Creator registered with a password, bcrypt.hash SHALL be called
   * with a cost factor of at least 12, and the stored passwordHash SHALL NOT
   * equal the plaintext password.
   */
  it('calls bcrypt.hash with cost >= 12 and stores hash, never plaintext', async () => {
    // Feature: viraly-app, Property 6: Passwords stored as bcrypt hashes with cost >= 12
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (email, password) => {
          __test__.reset()
          jest.clearAllMocks()

          const app = buildApp()
          const res = await request(app)
            .post('/auth/register')
            .send({ email, password })

          expect(res.status).toBe(201)

          // bcrypt.hash must have been called with cost factor >= 12
          expect(mockBcrypt.hash).toHaveBeenCalledTimes(1)
          const [passedPassword, costFactor] = mockBcrypt.hash.mock.calls[0]
          expect(passedPassword).toBe(password)
          expect(costFactor).toBeGreaterThanOrEqual(12)

          // The value persisted to the database must not be the plaintext password
          const createCall = mockPrisma.creator.create.mock.calls[0][0]
          const storedHash = createCall.data.passwordHash
          expect(storedHash).not.toBe(password)
          expect(storedHash).toContain('$2b$')
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)
})


// ─── Property 4: Invalid credential error indistinguishability ───────────────
// Feature: viraly-app, Property 4: Invalid credential error indistinguishability

describe('Property 4: Invalid credential error indistinguishability', () => {
  /**
   * Validates: Requirements 1.6
   *
   * For any login attempt with an unrecognized email and for any login attempt
   * with a recognized email but wrong password, the error response body SHALL
   * be identical — neither response SHALL indicate which field was incorrect.
   */
  it('returns identical error response for non-existent email and wrong password', async () => {
    // Feature: viraly-app, Property 4: Invalid credential error indistinguishability
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (unknownEmail, knownEmail, passwordForUnknown, wrongPassword) => {
          __test__.reset()
          jest.clearAllMocks()

          // Ensure the two emails are distinct so we have a real unknown vs known case
          fc.pre(unknownEmail !== knownEmail)

          // Set up the known email so findUnique returns a creator for it
          __test__.existingEmails.add(knownEmail)

          // For the wrong-password case, bcrypt.compare should return false
          mockBcrypt.compare.mockResolvedValue(false)

          const app = buildApp()

          // Case 1: Login with a completely unknown email
          const unknownEmailRes = await request(app)
            .post('/auth/login')
            .send({ email: unknownEmail, password: passwordForUnknown })

          // Case 2: Login with a known email but wrong password
          const wrongPasswordRes = await request(app)
            .post('/auth/login')
            .send({ email: knownEmail, password: wrongPassword })

          // Both must return the same status code
          expect(unknownEmailRes.status).toBe(wrongPasswordRes.status)

          // Both must return identical response bodies
          expect(unknownEmailRes.body).toEqual(wrongPasswordRes.body)

          // Verify they are 401 with the generic error
          expect(unknownEmailRes.status).toBe(401)
          expect(unknownEmailRes.body).toEqual({ error: 'invalid_credentials' })
        }
      ),
      { numRuns: 20 }
    )
  }, 60000)
})
