/**
 * Hook Library service — searchHooks, saveHook, getSavedHooks.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
import { prisma } from '@viraly/db'

export interface Hook {
  id: string
  content: string
  niches: string[]
  relevanceScore: number
}

export interface HookSearchParams {
  niche?: string
  query?: string
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

/**
 * Searches hooks with optional niche filter and free-text query.
 * Orders by relevanceScore desc when no niche filter is applied.
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export async function searchHooks(params: HookSearchParams): Promise<PaginatedResult<Hook>> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))
  const skip = (page - 1) * pageSize

  // Build where clause
  const where: {
    niches?: { has: string }
    content?: { contains: string; mode: 'insensitive' }
  } = {}

  if (params.niche) {
    // Requirement 8.2: filter by niche — niches array must contain the value
    where.niches = { has: params.niche }
  }

  if (params.query) {
    // Requirement 8.3: case-insensitive full-text search on content
    where.content = { contains: params.query, mode: 'insensitive' }
  }

  const [records, total] = await Promise.all([
    prisma.hook.findMany({
      where,
      orderBy: { relevanceScore: 'desc' },
      skip,
      take: pageSize,
      select: { id: true, content: true, niches: true, relevanceScore: true },
    }),
    prisma.hook.count({ where }),
  ])

  return { data: records, total, page, pageSize }
}

/**
 * Saves a hook for a creator. Ignores duplicate saves gracefully.
 * Requirement: 8.6
 */
export async function saveHook(creatorId: string, hookId: string): Promise<void> {
  await prisma.savedHook.upsert({
    where: { creatorId_hookId: { creatorId, hookId } },
    create: { creatorId, hookId },
    update: {}, // no-op on duplicate
  })
}

/**
 * Returns all hooks saved by a creator.
 * Requirement: 8.6
 */
export async function getSavedHooks(creatorId: string): Promise<Hook[]> {
  const saved = await prisma.savedHook.findMany({
    where: { creatorId },
    include: {
      hook: {
        select: { id: true, content: true, niches: true, relevanceScore: true },
      },
    },
    orderBy: { savedAt: 'desc' },
  })

  return saved.map((s) => s.hook)
}
