// Feature: viraly-app, Property 32: Lesson structure completeness
import * as fc from 'fast-check'
import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'

jest.mock('@viraly/db', () => ({
  prisma: {
    creator: { findUnique: jest.fn() },
    monetizationModule: { findMany: jest.fn() },
    monetizationLesson: { count: jest.fn() },
    lessonCompletion: { upsert: jest.fn(), count: jest.fn() },
  },
}))

import monetizationRouter from '../../routes/monetization'
const mockPrisma = require('@viraly/db').prisma

function jwtStub(req: Request, _res: Response, next: NextFunction) {
  req.creator = { sub: 'creator-prop-test', email: 'prop@test.com', iat: 0, exp: 0 }
  next()
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(jwtStub)
  app.use('/monetization', monetizationRouter)
  return app
}

describe('Property 32: Lesson structure completeness', () => {
  beforeEach(() => jest.clearAllMocks())

  /**
   * Validates: Requirements 10.2
   *
   * For any MonetizationLesson in the system, the lesson SHALL have a
   * non-empty title, non-empty body, and a positive estimatedReadMin value.
   */
  it('every lesson returned by getModules has non-empty title, non-empty body, and positive estimatedReadMin', async () => {
    // Feature: viraly-app, Property 32: Lesson structure completeness

    const nonEmptyString = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
    const positiveInt = fc.integer({ min: 1, max: 120 })
    const audienceLevel = fc.constantFrom('beginner', 'intermediate', 'advanced')

    const lessonArb = fc.record({
      id: fc.uuid(),
      title: nonEmptyString,
      body: nonEmptyString,
      estimatedReadMin: positiveInt,
      order: fc.integer({ min: 1, max: 50 }),
      audienceLevel,
    })

    const moduleArb = fc.record({
      id: fc.uuid(),
      title: nonEmptyString,
      order: fc.integer({ min: 1, max: 20 }),
      lessons: fc.array(lessonArb, { minLength: 1, maxLength: 10 }),
    })

    const modulesArb = fc.array(moduleArb, { minLength: 1, maxLength: 5 })

    await fc.assert(
      fc.asyncProperty(modulesArb, async (modules) => {
        const app = buildApp()
        jest.clearAllMocks()

        mockPrisma.creator.findUnique.mockResolvedValue({
          id: 'creator-prop-test',
          followerCountRange: '1k_10k',
        })

        // Shape lessons to match Prisma include format (with completions)
        const prismaModules = modules.map(mod => ({
          ...mod,
          lessons: mod.lessons.map(l => ({
            ...l,
            moduleId: mod.id,
            completions: [],
          })),
        }))

        mockPrisma.monetizationModule.findMany.mockResolvedValue(prismaModules)

        const res = await request(app).get('/monetization/modules')

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body.modules)).toBe(true)

        for (const mod of res.body.modules) {
          expect(Array.isArray(mod.lessons)).toBe(true)
          for (const lesson of mod.lessons) {
            // Title must be non-empty
            expect(typeof lesson.title).toBe('string')
            expect(lesson.title.length).toBeGreaterThan(0)

            // Body must be non-empty
            expect(typeof lesson.body).toBe('string')
            expect(lesson.body.length).toBeGreaterThan(0)

            // estimatedReadMin must be a positive number
            expect(typeof lesson.estimatedReadMin).toBe('number')
            expect(lesson.estimatedReadMin).toBeGreaterThan(0)
          }
        }
      }),
      { numRuns: 100 },
    )
  }, 60000)
})

describe('Property 35: Beginner lessons surfaced first for small creators', () => {
  beforeEach(() => jest.clearAllMocks())

  /**
   * Validates: Requirements 10.5
   *
   * For any Creator with a followerCountRange of 'under_1k', the lessons
   * returned by getModules SHALL list all lessons with audienceLevel 'beginner'
   * before any lessons with audienceLevel 'intermediate' or 'advanced'.
   */
  it('all beginner lessons appear before intermediate or advanced lessons for under_1k creators', async () => {
    // Feature: viraly-app, Property 35: Beginner lessons surfaced first for small creators

    const nonEmptyString = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
    const positiveInt = fc.integer({ min: 1, max: 120 })
    const audienceLevel = fc.constantFrom('beginner', 'intermediate', 'advanced')

    const lessonArb = fc.record({
      id: fc.uuid(),
      title: nonEmptyString,
      body: nonEmptyString,
      estimatedReadMin: positiveInt,
      order: fc.integer({ min: 1, max: 50 }),
      audienceLevel,
    })

    const moduleArb = fc.record({
      id: fc.uuid(),
      title: nonEmptyString,
      order: fc.integer({ min: 1, max: 20 }),
      lessons: fc.array(lessonArb, { minLength: 1, maxLength: 10 }),
    })

    const modulesArb = fc.array(moduleArb, { minLength: 1, maxLength: 5 })

    await fc.assert(
      fc.asyncProperty(modulesArb, async (modules) => {
        const app = buildApp()
        jest.clearAllMocks()

        mockPrisma.creator.findUnique.mockResolvedValue({
          id: 'creator-prop-test',
          followerCountRange: 'under_1k',
        })

        const prismaModules = modules.map(mod => ({
          ...mod,
          lessons: mod.lessons.map(l => ({
            ...l,
            moduleId: mod.id,
            completions: [],
          })),
        }))

        mockPrisma.monetizationModule.findMany.mockResolvedValue(prismaModules)

        const res = await request(app).get('/monetization/modules')

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body.modules)).toBe(true)

        for (const mod of res.body.modules) {
          expect(Array.isArray(mod.lessons)).toBe(true)

          let seenNonBeginner = false
          for (const lesson of mod.lessons) {
            if (lesson.audienceLevel !== 'beginner') {
              seenNonBeginner = true
            }
            if (seenNonBeginner && lesson.audienceLevel === 'beginner') {
              throw new Error(
                `Module "${mod.title}": beginner lesson "${lesson.title}" appeared after a non-beginner lesson`,
              )
            }
          }
        }
      }),
      { numRuns: 100 },
    )
  }, 60000)
})

// Feature: viraly-app, Property 33: Lesson completion progress update
describe('Property 33: Lesson completion progress update', () => {
  beforeEach(() => jest.clearAllMocks())

  /**
   * Validates: Requirements 10.3
   *
   * For any Creator who completes a lesson, the module's completionPercent
   * SHALL increase (or remain at 100% if already complete), and the lesson
   * SHALL appear in the Creator's completion records.
   */
  it('completing a lesson increases module completionPercent and marks the lesson completed', async () => {
    // Feature: viraly-app, Property 33: Lesson completion progress update

    const nonEmptyString = fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0)
    const positiveInt = fc.integer({ min: 1, max: 120 })
    const audienceLevel = fc.constantFrom('beginner', 'intermediate', 'advanced')

    const lessonArb = fc.record({
      id: fc.uuid(),
      title: nonEmptyString,
      body: nonEmptyString,
      estimatedReadMin: positiveInt,
      order: fc.integer({ min: 1, max: 50 }),
      audienceLevel,
      alreadyCompleted: fc.boolean(),
    })

    const moduleArb = fc.record({
      id: fc.uuid(),
      title: nonEmptyString,
      order: fc.integer({ min: 1, max: 20 }),
      lessons: fc.array(lessonArb, { minLength: 1, maxLength: 8 }),
    })

    // Generate 1-4 modules; we also pick which module to target
    const inputArb = fc
      .array(moduleArb, { minLength: 1, maxLength: 4 })
      .filter(modules => {
        // Ensure at least one module has at least one uncompleted lesson
        return modules.some(m => m.lessons.some(l => !l.alreadyCompleted))
      })

    await fc.assert(
      fc.asyncProperty(inputArb, async (modules) => {
        const app = buildApp()
        jest.clearAllMocks()

        mockPrisma.creator.findUnique.mockResolvedValue({
          id: 'creator-prop-test',
          followerCountRange: '1k_10k',
        })

        // Find the first module that has an uncompleted lesson
        const targetModule = modules.find(m => m.lessons.some(l => !l.alreadyCompleted))!
        const targetLesson = targetModule.lessons.find(l => !l.alreadyCompleted)!

        // Build Prisma-shaped modules with completions BEFORE the new completion
        const buildPrismaModules = (extraCompletedLessonId?: string) =>
          modules.map(mod => ({
            ...mod,
            lessons: mod.lessons.map(l => ({
              id: l.id,
              title: l.title,
              body: l.body,
              estimatedReadMin: l.estimatedReadMin,
              order: l.order,
              audienceLevel: l.audienceLevel,
              moduleId: mod.id,
              completions:
                l.alreadyCompleted || l.id === extraCompletedLessonId
                  ? [{ id: 'comp-' + l.id }]
                  : [],
            })),
          }))

        // --- Step 1: GET modules BEFORE completion to capture old completionPercent ---
        mockPrisma.monetizationModule.findMany.mockResolvedValue(buildPrismaModules())

        const resBefore = await request(app).get('/monetization/modules')
        expect(resBefore.status).toBe(200)

        const moduleBefore = resBefore.body.modules.find(
          (m: any) => m.id === targetModule.id,
        )
        const oldPercent: number = moduleBefore.completionPercent

        // --- Step 2: POST to complete the lesson ---
        mockPrisma.lessonCompletion.upsert.mockResolvedValue({})
        jest.clearAllMocks()

        const completeRes = await request(app)
          .post(`/monetization/lessons/${targetLesson.id}/complete`)
        expect(completeRes.status).toBe(200)

        // --- Step 3: GET modules AFTER completion ---
        mockPrisma.creator.findUnique.mockResolvedValue({
          id: 'creator-prop-test',
          followerCountRange: '1k_10k',
        })
        mockPrisma.monetizationModule.findMany.mockResolvedValue(
          buildPrismaModules(targetLesson.id),
        )

        const resAfter = await request(app).get('/monetization/modules')
        expect(resAfter.status).toBe(200)

        const moduleAfter = resAfter.body.modules.find(
          (m: any) => m.id === targetModule.id,
        )
        const newPercent: number = moduleAfter.completionPercent

        // Assertion 1: completionPercent increased or stayed at 100%
        if (oldPercent === 100) {
          expect(newPercent).toBe(100)
        } else {
          expect(newPercent).toBeGreaterThan(oldPercent)
        }

        // Assertion 2: the completed lesson shows completed: true
        const completedLesson = moduleAfter.lessons.find(
          (l: any) => l.id === targetLesson.id,
        )
        expect(completedLesson).toBeDefined()
        expect(completedLesson.completed).toBe(true)
      }),
      { numRuns: 100 },
    )
  }, 60000)
})

// Feature: viraly-app, Property 34: Overall completion percentage computation
describe('Property 34: Overall completion percentage computation', () => {
  beforeEach(() => jest.clearAllMocks())

  /**
   * Validates: Requirements 10.4
   *
   * For any Creator, the overall completion percentage SHALL equal
   * (total completed lessons / total lessons across all modules) × 100,
   * rounded to the nearest integer.
   */
  it('overall progress equals Math.round((completedLessons / totalLessons) * 100)', async () => {
    // Feature: viraly-app, Property 34: Overall completion percentage computation

    const totalLessonsArb = fc.integer({ min: 0, max: 200 })

    await fc.assert(
      fc.asyncProperty(
        totalLessonsArb,
        fc.integer({ min: 0, max: 200 }),
        async (totalLessons, rawCompleted) => {
          const completedLessons = Math.min(rawCompleted, totalLessons)
          const app = buildApp()
          jest.clearAllMocks()

          mockPrisma.monetizationLesson.count.mockResolvedValue(totalLessons)
          mockPrisma.lessonCompletion.count.mockResolvedValue(completedLessons)

          const res = await request(app).get('/monetization/progress')

          expect(res.status).toBe(200)

          const expected =
            totalLessons === 0
              ? 0
              : Math.round((completedLessons / totalLessons) * 100)

          expect(res.body.percent).toBe(expected)
        },
      ),
      { numRuns: 100 },
    )
  }, 60000)
})
