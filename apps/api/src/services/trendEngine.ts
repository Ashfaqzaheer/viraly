/**
 * Trend Engine Service
 * Fetches trend patterns, clusters, and signals from DB
 * and builds a trend context object for AI prompt injection.
 */
import { prisma } from '@viraly/db'

export interface TrendContext {
  topPatterns: Array<{
    hookTemplate: string
    hookType: string
    structureType: string
    emotionType: string
    formatType: string
    trendScore: number
  }>
  topClusters: Array<{
    name: string
    description: string | null
    strength: number
    growthPercent: number
    exampleHooks: string[]
  }>
  topHooks: string[]
  topStructures: string[]
  topFormats: string[]
  topEmotions: string[]
}

/**
 * Build trend context for a given niche.
 * Returns the top patterns, clusters, hooks, structures, and formats
 * that the AI should use as inspiration (not copy).
 */
export async function buildTrendContext(niche: string): Promise<TrendContext> {
  // Fetch top patterns for this niche, ordered by trend score
  const patterns = await prisma.trendPattern.findMany({
    where: { niche },
    orderBy: { trendScore: 'desc' },
    take: 10,
  })

  // Fetch top clusters for this niche
  const clusters = await prisma.trendCluster.findMany({
    where: { niche },
    orderBy: { strength: 'desc' },
    take: 5,
  })

  // Fetch top signals for hook examples
  const signals = await prisma.trendSignal.findMany({
    where: { niche },
    orderBy: { engagementScore: 'desc' },
    take: 8,
  })

  const topHooks = signals.map(s => s.hook)

  // Extract unique structures, formats, emotions from patterns
  const topStructures = [...new Set(patterns.map(p => p.structureType))]
  const topFormats = [...new Set(patterns.map(p => p.formatType))]
  const topEmotions = [...new Set(patterns.map(p => p.emotionType))]

  return {
    topPatterns: patterns.map(p => ({
      hookTemplate: p.hookTemplate,
      hookType: p.hookType,
      structureType: p.structureType,
      emotionType: p.emotionType,
      formatType: p.formatType,
      trendScore: p.trendScore,
    })),
    topClusters: clusters.map(c => ({
      name: c.name,
      description: c.description,
      strength: c.strength,
      growthPercent: c.growthPercent,
      exampleHooks: c.exampleHooks,
    })),
    topHooks,
    topStructures,
    topFormats,
    topEmotions,
  }
}
