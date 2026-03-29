// Feature: viraly-app, Property 9: Onboarding required fields validation
import * as fc from 'fast-check'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'

// Mock @viraly/db before importing the onboarding router
jest.mock('@viraly/db', () => ({
  prisma: {
    creator: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

import onboardingRouter from '../../routes/onboarding'
const mockPrisma = require('@viraly/db').prisma

const VALID_FOLLOWER_RANGES = ['under_1k', '1k_10k', '10k_100k', 'over_100k'] as const

/**
 * Stub JWT middleware that injects req.creator with a fixed creatorId.
 */
function jwtStub(req: Request, _res: Response, next: NextFunction) {
  req.creator = { sub: 'creator-prop-test', email: 'prop@test.com', iat: 0, exp: 0 }
  next()
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(jwtStub)
  app.use('/onboarding', onboardingRouter)
  return app
}

describe('Property 9: Onboarding required fields validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Validates: Requirements 2.3
   *
   * For any onboarding form submission where one or more required fields
   * (displayName, primaryNiche, followerCountRange, primaryGoal) are absent
   * or empty, the Onboarding_Service SHALL reject the submission and SHALL
   * NOT persist any data.
   */
  it('rejects submission and does not persist when any required field is missing or empty', async () => {
    // Feature: viraly-app, Property 9: Onboarding required fields validation

    // Arbitrary for a non-empty, non-whitespace string (valid field value)
    const validString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)

    // Arbitrary for an "empty-ish" value: undefined, empty string, or whitespace-only
    const emptyValue = fc.oneof(
      fc.constant(undefined),
      fc.constant(''),
      fc.constant('   '),
      fc.constant('\t'),
      fc.constant(' \n ')
    )

    // For each of the 4 required fields, randomly choose either a valid value or an empty value,
    // but ensure at least one field is empty.
    const formWithAtLeastOneMissing = fc
      .record({
        displayName: fc.oneof(validString, emptyValue),
        primaryNiche: fc.oneof(validString, emptyValue),
        followerCountRange: fc.oneof(fc.constantFrom(...VALID_FOLLOWER_RANGES), emptyValue),
        primaryGoal: fc.oneof(validString, emptyValue),
      })
      .filter(form => {
        // At least one required field must be absent or empty
        const vals = [form.displayName, form.primaryNiche, form.followerCountRange, form.primaryGoal]
        return vals.some(v => v === undefined || (typeof v === 'string' && v.trim() === ''))
      })

    await fc.assert(
      fc.asyncProperty(formWithAtLeastOneMissing, async (form) => {
        const app = buildApp()
        jest.clearAllMocks()

        // Build the request body, omitting undefined fields entirely
        const body: Record<string, string> = {}
        if (form.displayName !== undefined) body.displayName = form.displayName
        if (form.primaryNiche !== undefined) body.primaryNiche = form.primaryNiche
        if (form.followerCountRange !== undefined) body.followerCountRange = form.followerCountRange
        if (form.primaryGoal !== undefined) body.primaryGoal = form.primaryGoal

        const res = await request(app)
          .post('/onboarding/profile')
          .send(body)

        // Must be rejected with 422
        expect(res.status).toBe(422)
        expect(res.body.error).toBe('validation_failed')
        expect(Array.isArray(res.body.fields)).toBe(true)
        expect(res.body.fields.length).toBeGreaterThan(0)

        // Data must NOT have been persisted
        expect(mockPrisma.creator.update).not.toHaveBeenCalled()
      }),
      { numRuns: 100 }
    )
  }, 60000)
})

// Feature: viraly-app, Property 10: Onboarding profile association round-trip
describe('Property 10: Onboarding profile association round-trip', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Validates: Requirements 2.4
   *
   * For any Creator who completes onboarding, retrieving the profile by that
   * Creator's ID SHALL return the exact data that was submitted.
   */
  it('saved onboarding profile is retrievable with identical data', async () => {
    // Feature: viraly-app, Property 10: Onboarding profile association round-trip

    const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)

    const profileArb = fc.record({
      displayName: nonEmptyString,
      primaryNiche: nonEmptyString,
      secondaryNiche: fc.option(nonEmptyString, { nil: undefined }),
      instagramHandle: fc.option(nonEmptyString, { nil: undefined }),
      followerCountRange: fc.constantFrom(...VALID_FOLLOWER_RANGES),
      primaryGoal: nonEmptyString,
    })

    await fc.assert(
      fc.asyncProperty(profileArb, async (profile) => {
        const app = buildApp()
        jest.clearAllMocks()

        const creatorId = 'creator-prop-test'

        // Mock update to return the persisted creator record
        const persistedCreator = {
          id: creatorId,
          displayName: profile.displayName.trim(),
          primaryNiche: profile.primaryNiche.trim(),
          secondaryNiche: profile.secondaryNiche?.trim() ?? null,
          instagramHandle: profile.instagramHandle?.trim() ?? null,
          followerCountRange: profile.followerCountRange,
          primaryGoal: profile.primaryGoal.trim(),
          onboardingComplete: true,
        }
        mockPrisma.creator.update.mockResolvedValue(persistedCreator)

        // POST the profile
        const body: Record<string, string> = {
          displayName: profile.displayName,
          primaryNiche: profile.primaryNiche,
          followerCountRange: profile.followerCountRange,
          primaryGoal: profile.primaryGoal,
        }
        if (profile.secondaryNiche !== undefined) body.secondaryNiche = profile.secondaryNiche
        if (profile.instagramHandle !== undefined) body.instagramHandle = profile.instagramHandle

        const postRes = await request(app)
          .post('/onboarding/profile')
          .send(body)

        expect(postRes.status).toBe(200)

        // Mock findUnique to return the same persisted record
        mockPrisma.creator.findUnique.mockResolvedValue(persistedCreator)

        // GET the profile
        const getRes = await request(app).get('/onboarding/profile')

        expect(getRes.status).toBe(200)

        // The retrieved profile must match the submitted data exactly
        expect(getRes.body.displayName).toBe(profile.displayName.trim())
        expect(getRes.body.primaryNiche).toBe(profile.primaryNiche.trim())
        expect(getRes.body.secondaryNiche).toBe(profile.secondaryNiche?.trim() ?? null)
        expect(getRes.body.instagramHandle).toBe(profile.instagramHandle?.trim() ?? null)
        expect(getRes.body.followerCountRange).toBe(profile.followerCountRange)
        expect(getRes.body.primaryGoal).toBe(profile.primaryGoal.trim())
        expect(getRes.body.onboardingComplete).toBe(true)

        // Verify the POST and GET responses are consistent
        expect(getRes.body.displayName).toBe(postRes.body.displayName)
        expect(getRes.body.primaryNiche).toBe(postRes.body.primaryNiche)
        expect(getRes.body.secondaryNiche).toBe(postRes.body.secondaryNiche)
        expect(getRes.body.instagramHandle).toBe(postRes.body.instagramHandle)
        expect(getRes.body.followerCountRange).toBe(postRes.body.followerCountRange)
        expect(getRes.body.primaryGoal).toBe(postRes.body.primaryGoal)
      }),
      { numRuns: 100 }
    )
  }, 60000)
})

// Feature: viraly-app, Property 11: Onboarding pre-population round-trip
describe('Property 11: Onboarding pre-population round-trip', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Validates: Requirements 2.6
   *
   * For any Creator with a saved onboarding profile, fetching the onboarding
   * form data SHALL return values that match the previously persisted profile
   * fields.
   */
  it('fetching onboarding form data returns values matching the persisted profile', async () => {
    // Feature: viraly-app, Property 11: Onboarding pre-population round-trip

    const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)

    const profileArb = fc.record({
      displayName: nonEmptyString,
      primaryNiche: nonEmptyString,
      secondaryNiche: fc.option(nonEmptyString, { nil: undefined }),
      instagramHandle: fc.option(nonEmptyString, { nil: undefined }),
      followerCountRange: fc.constantFrom(...VALID_FOLLOWER_RANGES),
      primaryGoal: nonEmptyString,
    })

    await fc.assert(
      fc.asyncProperty(profileArb, async (profile) => {
        const app = buildApp()
        jest.clearAllMocks()

        const creatorId = 'creator-prop-test'

        // Simulate a previously saved profile in the database
        const savedCreator = {
          id: creatorId,
          displayName: profile.displayName.trim(),
          primaryNiche: profile.primaryNiche.trim(),
          secondaryNiche: profile.secondaryNiche?.trim() ?? null,
          instagramHandle: profile.instagramHandle?.trim() ?? null,
          followerCountRange: profile.followerCountRange,
          primaryGoal: profile.primaryGoal.trim(),
          onboardingComplete: true,
        }
        mockPrisma.creator.findUnique.mockResolvedValue(savedCreator)

        // GET the profile — simulates revisiting the onboarding form
        const res = await request(app).get('/onboarding/profile')

        expect(res.status).toBe(200)

        // Every persisted field must be returned for pre-population
        expect(res.body.displayName).toBe(savedCreator.displayName)
        expect(res.body.primaryNiche).toBe(savedCreator.primaryNiche)
        expect(res.body.secondaryNiche).toBe(savedCreator.secondaryNiche)
        expect(res.body.instagramHandle).toBe(savedCreator.instagramHandle)
        expect(res.body.followerCountRange).toBe(savedCreator.followerCountRange)
        expect(res.body.primaryGoal).toBe(savedCreator.primaryGoal)
        expect(res.body.onboardingComplete).toBe(true)
      }),
      { numRuns: 100 }
    )
  }, 60000)

  it('pre-populates with incomplete flag when onboarding was not completed', async () => {
    // Feature: viraly-app, Property 11: Onboarding pre-population round-trip (incomplete variant)

    const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)

    const partialProfileArb = fc.record({
      displayName: fc.option(nonEmptyString, { nil: null }),
      primaryNiche: fc.option(nonEmptyString, { nil: null }),
      followerCountRange: fc.option(fc.constantFrom(...VALID_FOLLOWER_RANGES), { nil: null }),
      primaryGoal: fc.option(nonEmptyString, { nil: null }),
    })

    await fc.assert(
      fc.asyncProperty(partialProfileArb, async (partial) => {
        const app = buildApp()
        jest.clearAllMocks()

        const creatorId = 'creator-prop-test'

        const savedCreator = {
          id: creatorId,
          displayName: partial.displayName,
          primaryNiche: partial.primaryNiche,
          secondaryNiche: null,
          instagramHandle: null,
          followerCountRange: partial.followerCountRange,
          primaryGoal: partial.primaryGoal,
          onboardingComplete: false,
        }
        mockPrisma.creator.findUnique.mockResolvedValue(savedCreator)

        const res = await request(app).get('/onboarding/profile')

        expect(res.status).toBe(200)

        // Fields must match whatever was persisted
        expect(res.body.displayName).toBe(savedCreator.displayName)
        expect(res.body.primaryNiche).toBe(savedCreator.primaryNiche)
        expect(res.body.followerCountRange).toBe(savedCreator.followerCountRange)
        expect(res.body.primaryGoal).toBe(savedCreator.primaryGoal)

        // Requirement 2.5: incomplete flag must be present
        expect(res.body.onboardingComplete).toBe(false)
        expect(res.body.incomplete).toBe(true)
      }),
      { numRuns: 100 }
    )
  }, 60000)
})
