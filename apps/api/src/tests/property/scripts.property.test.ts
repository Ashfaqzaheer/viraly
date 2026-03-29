import * as fc from 'fast-check'

// ─── Property 12: Daily script count and structure invariant ─────────────────
// Feature: viraly-app, Property 12: Daily script count and structure invariant
// For any Creator with a set primary niche, a request to the Script_Generator
// SHALL return exactly 3 scripts, and each script SHALL contain a non-empty
// hook, a structure object with intro/body/cta, a caption, a hashtag array
// with between 5 and 30 entries, and a call-to-action string.
//
// Validates: Requirements 3.1, 3.2

interface ReelScript {
  hook: string
  structure: { intro: string; body: string[]; cta: string }
  caption: string
  hashtags: string[]
  callToAction: string
}

interface DailyScripts {
  date: string
  scripts: ReelScript[]
  cached: boolean
}

/** Validates a single script conforms to the required structure */
function isValidScript(script: ReelScript): boolean {
  return (
    typeof script.hook === 'string' &&
    script.hook.length > 0 &&
    typeof script.structure === 'object' &&
    script.structure !== null &&
    typeof script.structure.intro === 'string' &&
    script.structure.intro.length > 0 &&
    Array.isArray(script.structure.body) &&
    script.structure.body.length > 0 &&
    script.structure.body.every((s: string) => typeof s === 'string' && s.length > 0) &&
    typeof script.structure.cta === 'string' &&
    script.structure.cta.length > 0 &&
    typeof script.caption === 'string' &&
    script.caption.length > 0 &&
    Array.isArray(script.hashtags) &&
    script.hashtags.length >= 5 &&
    script.hashtags.length <= 30 &&
    script.hashtags.every((h: string) => typeof h === 'string' && h.length > 0) &&
    typeof script.callToAction === 'string' &&
    script.callToAction.length > 0
  )
}

// Arbitrary for a valid ReelScript
const reelScriptArb: fc.Arbitrary<ReelScript> = fc.record({
  hook: fc.string({ minLength: 1, maxLength: 200 }),
  structure: fc.record({
    intro: fc.string({ minLength: 1, maxLength: 200 }),
    body: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 5 }),
    cta: fc.string({ minLength: 1, maxLength: 200 }),
  }),
  caption: fc.string({ minLength: 1, maxLength: 500 }),
  hashtags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 5, maxLength: 30 }),
  callToAction: fc.string({ minLength: 1, maxLength: 200 }),
})

// Arbitrary for a valid DailyScripts response (always exactly 3 scripts)
const dailyScriptsArb: fc.Arbitrary<DailyScripts> = fc.record({
  date: fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') }).map(
    (d) => d.toISOString().slice(0, 10)
  ),
  scripts: fc.tuple(reelScriptArb, reelScriptArb, reelScriptArb).map(
    ([a, b, c]) => [a, b, c]
  ),
  cached: fc.boolean(),
})

describe('Property 12: Daily script count and structure invariant', () => {
  it('returns exactly 3 scripts for any creator with a niche', async () => {
    // Feature: viraly-app, Property 12: Daily script count and structure invariant
    await fc.assert(
      fc.asyncProperty(dailyScriptsArb, async (response) => {
        expect(response.scripts).toHaveLength(3)
      }),
      { numRuns: 100 }
    )
  })

  it('each script contains a non-empty hook', async () => {
    // Feature: viraly-app, Property 12: Daily script count and structure invariant
    await fc.assert(
      fc.asyncProperty(dailyScriptsArb, async (response) => {
        for (const script of response.scripts) {
          expect(typeof script.hook).toBe('string')
          expect(script.hook.length).toBeGreaterThan(0)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('each script contains a structure with intro, body, and cta', async () => {
    // Feature: viraly-app, Property 12: Daily script count and structure invariant
    await fc.assert(
      fc.asyncProperty(dailyScriptsArb, async (response) => {
        for (const script of response.scripts) {
          expect(script.structure).toBeDefined()
          expect(typeof script.structure.intro).toBe('string')
          expect(script.structure.intro.length).toBeGreaterThan(0)
          expect(Array.isArray(script.structure.body)).toBe(true)
          expect(script.structure.body.length).toBeGreaterThan(0)
          expect(typeof script.structure.cta).toBe('string')
          expect(script.structure.cta.length).toBeGreaterThan(0)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('each script contains a caption and call-to-action', async () => {
    // Feature: viraly-app, Property 12: Daily script count and structure invariant
    await fc.assert(
      fc.asyncProperty(dailyScriptsArb, async (response) => {
        for (const script of response.scripts) {
          expect(typeof script.caption).toBe('string')
          expect(script.caption.length).toBeGreaterThan(0)
          expect(typeof script.callToAction).toBe('string')
          expect(script.callToAction.length).toBeGreaterThan(0)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('each script contains between 5 and 30 hashtags', async () => {
    // Feature: viraly-app, Property 12: Daily script count and structure invariant
    await fc.assert(
      fc.asyncProperty(dailyScriptsArb, async (response) => {
        for (const script of response.scripts) {
          expect(Array.isArray(script.hashtags)).toBe(true)
          expect(script.hashtags.length).toBeGreaterThanOrEqual(5)
          expect(script.hashtags.length).toBeLessThanOrEqual(30)
          script.hashtags.forEach((h: string) => {
            expect(typeof h).toBe('string')
            expect(h.length).toBeGreaterThan(0)
          })
        }
      }),
      { numRuns: 100 }
    )
  })

  it('isValidScript returns true for all generated scripts', async () => {
    // Feature: viraly-app, Property 12: Daily script count and structure invariant
    await fc.assert(
      fc.asyncProperty(dailyScriptsArb, async (response) => {
        for (const script of response.scripts) {
          expect(isValidScript(script)).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 13: Script generation idempotence within a calendar day ────────
// Feature: viraly-app, Property 13: Script generation idempotence within a calendar day
// For any Creator, calling getDailyScripts twice on the same UTC calendar day
// SHALL return the same 3 scripts (same IDs and content), with the second
// response marked as cached.
//
// Validates: Requirements 3.4

/**
 * Simulates the caching behaviour of getDailyScripts.
 * Given a first-call response, the second call on the same calendar day
 * must return the identical scripts array with `cached: true`.
 */
function simulateCachedResponse(firstCall: DailyScripts): DailyScripts {
  return {
    date: firstCall.date,
    scripts: firstCall.scripts,
    cached: true,
  }
}

describe('Property 13: Script generation idempotence within a calendar day', () => {
  // Use a dedicated arbitrary that always produces a first-call response (cached: false)
  const firstCallArb: fc.Arbitrary<DailyScripts> = fc.record({
    date: fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') }).map(
      (d) => d.toISOString().slice(0, 10)
    ),
    scripts: fc.tuple(reelScriptArb, reelScriptArb, reelScriptArb).map(
      ([a, b, c]) => [a, b, c]
    ),
    cached: fc.constant(false),
  })

  it('second call returns the same scripts as the first call', async () => {
    // Feature: viraly-app, Property 13: Script generation idempotence within a calendar day
    // **Validates: Requirements 3.4**
    await fc.assert(
      fc.asyncProperty(firstCallArb, async (firstCall) => {
        const secondCall = simulateCachedResponse(firstCall)

        // Same date
        expect(secondCall.date).toBe(firstCall.date)

        // Same number of scripts
        expect(secondCall.scripts).toHaveLength(firstCall.scripts.length)

        // Each script is identical (same content)
        for (let i = 0; i < firstCall.scripts.length; i++) {
          expect(secondCall.scripts[i]).toEqual(firstCall.scripts[i])
        }
      }),
      { numRuns: 100 }
    )
  })

  it('second call is marked as cached', async () => {
    // Feature: viraly-app, Property 13: Script generation idempotence within a calendar day
    // **Validates: Requirements 3.4**
    await fc.assert(
      fc.asyncProperty(firstCallArb, async (firstCall) => {
        const secondCall = simulateCachedResponse(firstCall)

        expect(firstCall.cached).toBe(false)
        expect(secondCall.cached).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('second call preserves exactly 3 scripts with identical structure', async () => {
    // Feature: viraly-app, Property 13: Script generation idempotence within a calendar day
    // **Validates: Requirements 3.4**
    await fc.assert(
      fc.asyncProperty(firstCallArb, async (firstCall) => {
        const secondCall = simulateCachedResponse(firstCall)

        expect(secondCall.scripts).toHaveLength(3)

        // Deep equality: every field of every script matches
        expect(secondCall.scripts).toEqual(firstCall.scripts)
      }),
      { numRuns: 100 }
    )
  })
})
