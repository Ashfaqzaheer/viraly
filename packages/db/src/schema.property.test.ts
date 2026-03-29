import * as fc from 'fast-check'
import { Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// Read migration SQL for structural assertions
const migrationSql = fs.readFileSync(
  path.join(__dirname, '../prisma/migrations/0001_init/migration.sql'),
  'utf-8'
)

// DMMF gives us the full schema metadata without a DB connection
const dmmf = Prisma.dmmf

const modelNames = dmmf.datamodel.models.map((m) => m.name)

// ─── Property 39: Cascade delete removes all associated records ───────────────
// Feature: viraly-app, Property 39: Cascade delete removes all associated records
// Validates: Requirements 12.4
describe('Property 39: Cascade delete removes all associated records', () => {
  // Models that must have a CASCADE FK back to Creator
  const creatorRelatedModels = [
    'Session',
    'Script',
    'Streak',
    'ReelSubmission',
    'ViralityPrediction',
    'SavedHook',
    'AnalyticsSnapshot',
    'LessonCompletion',
  ]

  it('migration SQL defines ON DELETE CASCADE for all Creator-related foreign keys', () => {
    // For each related model, the migration must contain a CASCADE FK to Creator
    fc.assert(
      fc.property(fc.constantFrom(...creatorRelatedModels), (modelName) => {
        // Look for the FK constraint referencing Creator with CASCADE
        const pattern = new RegExp(
          `ALTER TABLE "${modelName}" ADD CONSTRAINT .* FOREIGN KEY \\("creatorId"\\) REFERENCES "Creator"\\("id"\\) ON DELETE CASCADE`,
          's'
        )
        return pattern.test(migrationSql)
      }),
      { numRuns: 100 }
    )
  })

  it('Prisma schema defines onDelete: Cascade on all Creator relations', () => {
    fc.assert(
      fc.property(fc.constantFrom(...creatorRelatedModels), (modelName) => {
        const model = dmmf.datamodel.models.find((m) => m.name === modelName)
        if (!model) return false

        const creatorField = model.fields.find(
          (f) => f.name === 'creator' && f.relationName
        )
        if (!creatorField) return false

        // The relation must have onDelete: Cascade
        return creatorField.relationOnDelete === 'Cascade'
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 40: Creator email uniqueness at database level ──────────────────
// Feature: viraly-app, Property 40: Creator email uniqueness at database level
// Validates: Requirements 12.5
describe('Property 40: Creator email uniqueness at database level', () => {
  it('migration SQL defines a unique index on Creator.email', () => {
    fc.assert(
      fc.property(fc.constant('Creator_email_key'), (indexName) => {
        return migrationSql.includes(`CREATE UNIQUE INDEX "${indexName}" ON "Creator"("email")`)
      }),
      { numRuns: 100 }
    )
  })

  it('Prisma DMMF marks Creator.email as unique', () => {
    fc.assert(
      fc.property(fc.constant('email'), (fieldName) => {
        const creator = dmmf.datamodel.models.find((m) => m.name === 'Creator')
        if (!creator) return false
        const emailField = creator.fields.find((f) => f.name === fieldName)
        if (!emailField) return false
        return emailField.isUnique === true
      }),
      { numRuns: 100 }
    )
  })

  it('all composite unique constraints are present in migration SQL', () => {
    const compositeIndexes = [
      { table: 'Script', index: 'Script_creatorId_date_key', cols: '("creatorId", "date")' },
      { table: 'SavedHook', index: 'SavedHook_creatorId_hookId_key', cols: '("creatorId", "hookId")' },
      { table: 'LessonCompletion', index: 'LessonCompletion_creatorId_lessonId_key', cols: '("creatorId", "lessonId")' },
    ]

    fc.assert(
      fc.property(fc.constantFrom(...compositeIndexes), ({ table, index, cols }) => {
        return migrationSql.includes(
          `CREATE UNIQUE INDEX "${index}" ON "${table}"${cols}`
        )
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 41: All timestamps stored in UTC ────────────────────────────────
// Feature: viraly-app, Property 41: All timestamps stored in UTC
// Validates: Requirements 12.6
describe('Property 41: All timestamps stored in UTC', () => {
  // Collect all DateTime fields across all models
  const timestampFields: Array<{ model: string; field: string }> = []
  for (const model of dmmf.datamodel.models) {
    for (const field of model.fields) {
      if (field.type === 'DateTime') {
        timestampFields.push({ model: model.name, field: field.name })
      }
    }
  }

  it('all DateTime fields use TIMESTAMP(3) (UTC) in migration SQL — no TIMESTAMPTZ', () => {
    // PostgreSQL TIMESTAMP(3) stores without timezone (UTC by convention via Prisma)
    // TIMESTAMPTZ would store with timezone offset — we must NOT have that
    expect(migrationSql).not.toMatch(/TIMESTAMPTZ/)
  })

  it('every model with a DateTime field has it represented as TIMESTAMP(3) in migration SQL', () => {
    fc.assert(
      fc.property(fc.constantFrom(...timestampFields), ({ model, field }) => {
        // The column definition should use TIMESTAMP(3) NOT TIMESTAMPTZ
        const colPattern = new RegExp(`"${field}" TIMESTAMP\\(3\\)`)
        return colPattern.test(migrationSql)
      }),
      { numRuns: 100 }
    )
  })

  it('Prisma schema has no explicit timezone configuration (defaults to UTC)', () => {
    const schemaContent = fs.readFileSync(
      path.join(__dirname, '../prisma/schema.prisma'),
      'utf-8'
    )
    // Prisma stores DateTime as UTC by default; no @db.Timestamptz annotations
    expect(schemaContent).not.toContain('@db.Timestamptz')
  })
})

// ─── Structural sanity: all 13 required models exist ─────────────────────────
describe('Schema structural completeness', () => {
  const requiredModels = [
    'Creator',
    'Session',
    'Script',
    'Streak',
    'ReelSubmission',
    'ViralityPrediction',
    'Trend',
    'Hook',
    'SavedHook',
    'AnalyticsSnapshot',
    'MonetizationModule',
    'MonetizationLesson',
    'LessonCompletion',
  ]

  it('all 13 required Prisma models are defined', () => {
    fc.assert(
      fc.property(fc.constantFrom(...requiredModels), (modelName) => {
        return modelNames.includes(modelName)
      }),
      { numRuns: 100 }
    )
  })
})
