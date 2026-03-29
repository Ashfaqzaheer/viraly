/**
 * Monetization Coach service — getModules, completeLesson, getOverallProgress.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
import { prisma } from '@viraly/db'

const AUDIENCE_LEVEL_ORDER: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
}

export interface LessonWithCompletion {
  id: string
  title: string
  body: string
  estimatedReadMin: number
  order: number
  audienceLevel: string
  completed: boolean
}

export interface ModuleWithProgress {
  id: string
  title: string
  order: number
  lessons: LessonWithCompletion[]
  completionPercent: number
}

/**
 * Returns all modules with lessons and per-module completion percent.
 * For creators with followerCountRange = 'under_1k', lessons within each
 * module are sorted: beginner → intermediate → advanced.
 * Requirements: 10.1, 10.2, 10.5
 */
export async function getModules(creatorId: string): Promise<ModuleWithProgress[]> {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { followerCountRange: true },
  })

  const isUnder1k = creator?.followerCountRange === 'under_1k'

  const modules = await prisma.monetizationModule.findMany({
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        include: {
          completions: {
            where: { creatorId },
            select: { id: true },
          },
        },
      },
    },
  })

  return modules.map((mod) => {
    let lessons = mod.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      body: lesson.body,
      estimatedReadMin: lesson.estimatedReadMin,
      order: lesson.order,
      audienceLevel: lesson.audienceLevel,
      completed: lesson.completions.length > 0,
    }))

    if (isUnder1k) {
      lessons = lessons.sort((a, b) => {
        const levelDiff =
          (AUDIENCE_LEVEL_ORDER[a.audienceLevel] ?? 99) -
          (AUDIENCE_LEVEL_ORDER[b.audienceLevel] ?? 99)
        if (levelDiff !== 0) return levelDiff
        return a.order - b.order
      })
    } else {
      lessons = lessons.sort((a, b) => a.order - b.order)
    }

    const completedCount = lessons.filter((l) => l.completed).length
    const completionPercent =
      lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0

    return {
      id: mod.id,
      title: mod.title,
      order: mod.order,
      lessons,
      completionPercent,
    }
  })
}

/**
 * Upserts a LessonCompletion record for the given creator and lesson.
 * Idempotent — safe to call multiple times.
 * Requirements: 10.3
 */
export async function completeLesson(creatorId: string, lessonId: string): Promise<void> {
  await prisma.lessonCompletion.upsert({
    where: { creatorId_lessonId: { creatorId, lessonId } },
    create: { creatorId, lessonId },
    update: {},
  })
}

/**
 * Computes overall progress as (completed lessons / total lessons) * 100,
 * rounded to the nearest integer. Returns 0 when there are no lessons.
 * Requirements: 10.4
 */
export async function getOverallProgress(creatorId: string): Promise<number> {
  const [totalCount, completedCount] = await Promise.all([
    prisma.monetizationLesson.count(),
    prisma.lessonCompletion.count({ where: { creatorId } }),
  ])

  if (totalCount === 0) return 0
  return Math.round((completedCount / totalCount) * 100)
}
