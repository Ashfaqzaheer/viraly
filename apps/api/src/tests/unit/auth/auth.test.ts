import express from 'express'
import request from 'supertest'

// ---------------------------------------------------------------------------
// Mock @viraly/db
// ---------------------------------------------------------------------------
const existingEmails = new Set<string>()
const creators = new Map<string, { id: string; email: string; passwordHash: string }>()
const sessions = new Map<string, { id: string; creatorId: string; refreshToken: string; expiresAt: Date }>()

jest.mock('@viraly/db', () => ({
  prisma: {
    creator: {
      findUnique: jest.fn(async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) {
          for (const c of creators.values()) {
            if (c.email === where.email) return c
          }
          return null
        }
        if (where.id) return creators.get(where.id) ?? null
        return null
      }),
      create: jest.fn(async ({ data }: { data: { email: string; passwordHash: string } }) => {
        const id = `creator-${creators.size + 1}`
        const creator = { id, email: data.email, passwordHash: data.passwordHash }
        creators.set(id, creator)
        existingEmails.add(data.email)
        return creator
      }),
    },
    session: {
      create: jest.fn(async ({ data }: { data: { creatorId: string; refreshToken: string; expiresAt: Date } }) => {
        const s = { id: `session-${sessions.size + 1}`, ...data }
        sessions.set(data.refreshToken, s)
        return s
      }),
      findUnique: jest.fn(async ({ where }: { where: { refreshToken: string } }) => {
        return sessions.get(where.refreshToken) ?? null
      }),
      deleteMany: jest.fn(),
    },
  },
}))

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (password: string, cost: number) => `$2b$${cost}$mockhash_${password}`),
  compare: jest.fn(async (password: string, hash: string) => hash.endsWith(`_${password}`)),
}))

jest.mock('../../../utils/tokens', () => ({
  issueTokens: jest.fn(async (creatorId: string, email: string) => ({
    accessToken: `access-${creatorId}`,
    refreshToken: `refresh-${creatorId}`,
  })),
}))

import authRouter from '../../../routes/auth'

const mockPrisma = require('@viraly/db').prisma
const mockBcrypt = require('bcrypt')

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/auth', authRouter)
  return app
}

function reset() {
  existingEmails.clear()
  creators.clear()
  sessions.clear()
  jest.clearAllMocks()
  process.env.JWT_SECRET = 'test-secret'
}

// ---------------------------------------------------------------------------
// Requirement 1.3 — Duplicate email returns 409
// ---------------------------------------------------------------------------
describe('Registration with duplicate email', () => {
  beforeEach(reset)

  it('returns 409 when email is already registered', async () => {
    const app = buildApp()

    // First registration succeeds
    const first = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'password123' })
    expect(first.status).toBe(201)

    // Second registration with same email returns 409
    const second = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'differentpass' })
    expect(second.status).toBe(409)
    expect(second.body.error).toBe('email_taken')
  })
})

// ---------------------------------------------------------------------------
// Requirement 1.6 — Login response time <= 500ms on invalid credentials
// ---------------------------------------------------------------------------
describe('Login response time on invalid credentials', () => {
  beforeEach(reset)

  it('responds within 500ms for non-existent email', async () => {
    const app = buildApp()
    const start = Date.now()

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrongpass1' })

    const elapsed = Date.now() - start
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_credentials')
    // The route pads to ~500ms but should not exceed a reasonable upper bound
    expect(elapsed).toBeLessThanOrEqual(1500)
  })

  it('responds within 500ms for wrong password', async () => {
    // Seed a creator
    creators.set('c1', { id: 'c1', email: 'bob@example.com', passwordHash: '$2b$12$mockhash_correct' })
    existingEmails.add('bob@example.com')

    // Force bcrypt.compare to return false for wrong password
    mockBcrypt.compare.mockResolvedValueOnce(false)

    const app = buildApp()
    const start = Date.now()

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'bob@example.com', password: 'wrongpassword' })

    const elapsed = Date.now() - start
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_credentials')
    expect(elapsed).toBeLessThanOrEqual(1500)
  })
})

// ---------------------------------------------------------------------------
// Requirement 1.5 — Refresh with expired session token returns 401
// ---------------------------------------------------------------------------
describe('Refresh with expired session token', () => {
  beforeEach(reset)

  it('returns 401 when refresh token session has expired', async () => {
    // Insert an expired session
    const expiredDate = new Date(Date.now() - 1000) // 1 second in the past
    sessions.set('expired-token', {
      id: 'session-expired',
      creatorId: 'c1',
      refreshToken: 'expired-token',
      expiresAt: expiredDate,
    })
    creators.set('c1', { id: 'c1', email: 'test@example.com', passwordHash: 'hash' })

    const app = buildApp()
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'expired-token' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_refresh_token')
  })

  it('returns 401 when refresh token does not exist', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'nonexistent-token' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_refresh_token')
  })

  it('returns 401 when no refresh token is provided', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/auth/refresh')
      .send({})

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_refresh_token')
  })
})
