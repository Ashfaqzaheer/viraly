# Implementation Plan: Viraly App

## Overview

Incremental implementation of the Viraly AI creator growth coach SaaS. The plan follows the monorepo structure: `apps/web` (Next.js 14), `apps/api` (Express/TypeScript), `apps/ai` (FastAPI/Python), `packages/db` (Prisma). Each task builds on the previous, ending with full integration.

## Tasks

- [x] 1. Initialize monorepo structure and database schema
  - Create monorepo with `apps/web`, `apps/api`, `apps/ai`, `packages/db` directories
  - Initialize `packages/db` with Prisma, configure PostgreSQL connection
  - Define all Prisma models: Creator, Session, Script, Streak, ReelSubmission, ViralityPrediction, Trend, Hook, SavedHook, AnalyticsSnapshot, MonetizationModule, MonetizationLesson, LessonCompletion
  - Add unique constraints on Creator.email and composite unique indexes (Script[creatorId,date], SavedHook[creatorId,hookId], LessonCompletion[creatorId,lessonId])
  - Configure cascade deletes on all Creator-related relations
  - Run initial Prisma migration
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 1.1 Write property test for cascade delete (Property 39)
    - **Property 39: Cascade delete removes all associated records**
    - **Validates: Requirements 12.4**

  - [x] 1.2 Write property test for email uniqueness constraint (Property 40)
    - **Property 40: Creator email uniqueness at database level**
    - **Validates: Requirements 12.5**

  - [x] 1.3 Write property test for UTC timestamp storage (Property 41)
    - **Property 41: All timestamps stored in UTC**
    - **Validates: Requirements 12.6**

- [x] 2. Set up Express API gateway with middleware stack
  - Initialize `apps/api` with Express, TypeScript, and ts-node
  - Implement HTTPS enforcement middleware
  - Implement CORS middleware restricted to configured frontend domain
  - Implement JWT verification middleware (skip for `/auth/register`, `/auth/login`, `/auth/google/callback`)
  - Implement rate limiter middleware using Redis sliding window (100 req/min per creator)
  - Implement input validation/sanitization middleware with SQL and script injection detection
  - Wire middleware in order: HTTPS → CORS → JWT → Rate Limiter → Input Validator → Route Handler
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 2.1 Write property test for rate limit enforcement (Property 36)
    - **Property 36: Rate limit enforcement**
    - **Validates: Requirements 11.1, 11.2**

  - [x] 2.2 Write property test for injection pattern rejection (Property 37)
    - **Property 37: Injection pattern rejection**
    - **Validates: Requirements 11.4**

  - [x] 2.3 Write property test for JWT required on protected endpoints (Property 38)
    - **Property 38: JWT required on protected endpoints**
    - **Validates: Requirements 11.5**

  - [x] 2.4 Write unit tests for middleware stack
    - Test CORS header presence and origin restriction
    - Test that public endpoints bypass JWT check
    - Test 429 response includes Retry-After header
    - _Requirements: 11.2, 11.5, 11.7_

- [x] 3. Implement Auth Service
  - [x] 3.1 Implement email/password registration
    - Hash password with bcrypt cost factor 12
    - Validate email uniqueness and password length >= 8 before insert
    - Return 409 on duplicate email, 400 on short password
    - _Requirements: 1.1, 1.3, 1.8_

  - [x] 3.2 Write property test for registration validation (Property 1)
    - **Property 1: Registration validates email uniqueness and password length**
    - **Validates: Requirements 1.3**

  - [x] 3.3 Write property test for bcrypt storage (Property 6)
    - **Property 6: Passwords stored as bcrypt hashes with cost >= 12**
    - **Validates: Requirements 1.8**

  - [x] 3.4 Implement login and JWT issuance
    - Verify bcrypt hash, issue JWT (15min) and refresh token (7 days) on success
    - Return identical generic error for wrong email or wrong password
    - Store refresh token in Session table
    - _Requirements: 1.4, 1.6_

  - [x] 3.5 Write property test for token expiry (Property 2)
    - **Property 2: Issued tokens have correct expiry**
    - **Validates: Requirements 1.4**

  - [x] 3.6 Write property test for invalid credential indistinguishability (Property 4)
    - **Property 4: Invalid credential error indistinguishability**
    - **Validates: Requirements 1.6**

  - [x] 3.7 Implement token refresh endpoint
    - Accept refresh token, validate against Session table, issue new access token
    - _Requirements: 1.5_

  - [x] 3.8 Write property test for refresh token round-trip (Property 3)
    - **Property 3: Refresh token round-trip**
    - **Validates: Requirements 1.5**

  - [x] 3.9 Implement logout endpoint
    - Delete Session record for the provided refresh token
    - _Requirements: 1.7_

  - [x] 3.10 Write property test for logout invalidation (Property 5)
    - **Property 5: Logout invalidates refresh token**
    - **Validates: Requirements 1.7**

  - [x] 3.11 Implement Google OAuth 2.0 flow
    - Handle OAuth callback, upsert Creator with googleId, issue tokens
    - _Requirements: 1.2_

  - [x] 3.12 Implement AES-256 API key encryption utility
    - Encrypt on write, decrypt on read; plaintext never persisted
    - _Requirements: 1.9_

  - [x] 3.13 Write property test for API key encryption (Property 7)
    - **Property 7: API keys stored encrypted**
    - **Validates: Requirements 1.9**

  - [x] 3.14 Write property test for authenticated request context (Property 8)
    - **Property 8: Authenticated request context always contains Creator identity**
    - **Validates: Requirements 1.10**

  - [x] 3.15 Write unit tests for auth edge cases
    - Test registration with duplicate email returns 409
    - Test login response time <= 500ms on invalid credentials
    - Test refresh with expired session token returns 401
    - _Requirements: 1.3, 1.6, 1.5_

- [x] 4. Checkpoint — Ensure all auth and middleware tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Onboarding Service
  - [x] 5.1 Implement `saveProfile` endpoint
    - Validate required fields (displayName, primaryNiche, followerCountRange, primaryGoal)
    - Persist to Creator record, set onboardingComplete = true
    - Return 422 with field errors on missing required fields
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 5.2 Write property test for onboarding required fields validation (Property 9)
    - **Property 9: Onboarding required fields validation**
    - **Validates: Requirements 2.3**

  - [x] 5.3 Write property test for onboarding profile association round-trip (Property 10)
    - **Property 10: Onboarding profile association round-trip**
    - **Validates: Requirements 2.4**

  - [x] 5.4 Implement `getProfile` endpoint and incomplete-profile prompt
    - Return saved profile data for pre-population
    - If onboardingComplete = false, include incomplete flag in response
    - _Requirements: 2.5, 2.6_

  - [x] 5.5 Write property test for onboarding pre-population round-trip (Property 11)
    - **Property 11: Onboarding pre-population round-trip**
    - **Validates: Requirements 2.6**

  - [x] 5.6 Write unit tests for onboarding
    - Test skip flow sets onboardingComplete = false
    - Test multi-step form presents on first login
    - _Requirements: 2.1, 2.5_

- [x] 6. Implement Script Generator Service
  - [x] 6.1 Implement `getDailyScripts` handler in Express
    - Check Redis cache key `scripts:{creatorId}:{date}`; return cached if hit
    - Reject with 422 if creator has no primaryNiche
    - Forward to AI service if cache miss
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 6.2 Implement script generation endpoint in FastAPI (`POST /generate-scripts`)
    - Call AI provider to generate 3 scripts per niche
    - Each script must include hook, structure (intro/body/cta), caption, hashtags (5–30), callToAction
    - Implement retry-once on AI provider error
    - Enforce 10-second total response time
    - _Requirements: 3.1, 3.2, 3.6, 3.7_

  - [x] 6.3 Persist generated scripts to Script table and populate Redis cache
    - Store with `@@unique([creatorId, date])` to prevent duplicates
    - Set cache TTL to expire at midnight UTC
    - _Requirements: 3.4_

  - [x] 6.4 Write property test for daily script count and structure invariant (Property 12)
    - **Property 12: Daily script count and structure invariant**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 6.5 Write property test for script generation idempotence (Property 13)
    - **Property 13: Script generation idempotence within a calendar day**
    - **Validates: Requirements 3.4**

  - [x] 6.6 Write unit tests for script generator
    - Test returns error when no niche set
    - Test AI provider failure triggers retry then returns descriptive error
    - _Requirements: 3.5, 3.7_

- [x] 7. Implement Streak Service
  - [x] 7.1 Implement `recordDailyAction` logic
    - If lastActionDate != today UTC: increment current, update lastActionDate
    - If lastActionDate == today UTC: no-op (idempotent)
    - If no action yesterday: reset current to 1
    - Always update highest = max(highest, current)
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.2 Write property test for streak increment on first daily action (Property 14)
    - **Property 14: Streak increment on first daily action**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 7.3 Write property test for streak highest count never decreases (Property 15)
    - **Property 15: Streak highest count never decreases**
    - **Validates: Requirements 4.6**

  - [x] 7.4 Implement milestone detection
    - After incrementing, check if current ∈ {7, 30, 60, 100} and milestone not already recorded
    - Append milestone to milestones JSON array with timestamp
    - _Requirements: 4.4_

  - [x] 7.5 Write property test for milestone recorded at threshold crossings (Property 16)
    - **Property 16: Milestone recorded at threshold crossings**
    - **Validates: Requirements 4.4**

  - [x] 7.6 Implement midnight UTC streak reset job
    - Scheduled job (cron) that resets current = 0 for creators where lastActionDate < today UTC
    - _Requirements: 4.3_

  - [x] 7.7 Write unit tests for streak service
    - Test streak reset preserves highest count
    - Test same-day action is idempotent
    - _Requirements: 4.3, 4.6_

- [x] 8. Checkpoint — Ensure all onboarding, script, and streak tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Reel Feedback Service
  - [x] 9.1 Implement URL domain validation
    - Accept only hostnames matching `instagram.com` or `tiktok.com` (including subdomains)
    - Return 400 with `unsupported_domain` error within 5 seconds for invalid domains
    - _Requirements: 5.1, 5.5_

  - [x] 9.2 Write property test for reel URL domain validation (Property 17)
    - **Property 17: Reel URL domain validation**
    - **Validates: Requirements 5.1, 5.5**

  - [x] 9.3 Implement daily submission limit check
    - Count ReelSubmissions for creatorId in last 24h; reject 11th with 429
    - _Requirements: 5.6_

  - [x] 9.4 Write property test for reel submission daily limit enforcement (Property 20)
    - **Property 20: Reel submission daily limit enforcement**
    - **Validates: Requirements 5.6**

  - [x] 9.5 Implement feedback generation in FastAPI (`POST /analyze-reel`)
    - Call AI provider to score hookStrength, pacing, captionQuality, hashtagRelevance, ctaEffectiveness (0–100 each) with commentary
    - Implement retry-once on AI provider error
    - Enforce 30-second response time
    - _Requirements: 5.2, 5.3, 5.5_

  - [x] 9.6 Write property test for reel feedback structure completeness (Property 18)
    - **Property 18: Reel feedback structure completeness**
    - **Validates: Requirements 5.2**

  - [x] 9.7 Persist feedback to ReelSubmission and implement `getFeedbackHistory`
    - Store feedback JSON on ReelSubmission record
    - _Requirements: 5.4_

  - [x] 9.8 Write property test for reel feedback persistence round-trip (Property 19)
    - **Property 19: Reel feedback persistence round-trip**
    - **Validates: Requirements 5.4**

- [x] 10. Implement Virality Prediction Engine
  - [x] 10.1 Implement `predict` endpoint in FastAPI (`POST /predict-virality`)
    - Return score (0–100 integer), reachRange (min <= max), suggestions (>= 3 when score < 70)
    - Implement retry-once on AI provider error
    - Enforce 15-second response time
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [x] 10.2 Write property test for virality prediction output invariants (Property 21)
    - **Property 21: Virality prediction output invariants**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 10.3 Persist prediction to ViralityPrediction table via Express handler
    - Link to creatorId and reelSubmissionId
    - _Requirements: 6.5_

  - [x] 10.4 Write property test for virality prediction persistence round-trip (Property 22)
    - **Property 22: Virality prediction persistence round-trip**
    - **Validates: Requirements 6.5**

  - [x] 10.5 Write unit tests for virality engine
    - Test AI provider failure triggers retry then descriptive error
    - _Requirements: 6.6_

- [x] 11. Implement Trend Radar Service
  - [x] 11.1 Implement `getTrends` handler
    - Query Trend table, filter out records where updatedAt > 48h ago (stale)
    - Apply niche filter when provided
    - Serve from Redis cache key `trends:{niche|all}` with 1-hour TTL
    - _Requirements: 7.1, 7.3, 7.4, 7.5_

  - [x] 11.2 Write property test for trend default view excludes stale data (Property 23)
    - **Property 23: Trend default view excludes stale data**
    - **Validates: Requirements 7.1, 7.4**

  - [x] 11.3 Write property test for trend structure completeness (Property 24)
    - **Property 24: Trend structure completeness**
    - **Validates: Requirements 7.2**

  - [x] 11.4 Write property test for trend niche filter correctness (Property 25)
    - **Property 25: Trend niche filter correctness**
    - **Validates: Requirements 7.3**

  - [x] 11.5 Implement `refreshTrends` scheduled job
    - Fetch new trends from AI/external source, upsert into Trend table, invalidate cache
    - _Requirements: 7.1, 7.5_

- [x] 12. Implement Hook Library Service
  - [x] 12.1 Implement `searchHooks` with niche filter and free-text search
    - Filter by niche (must be in niches array), full-text search on content
    - Default ordering by relevanceScore descending when no niche filter
    - Paginate with default pageSize=20, max pageSize=100
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 12.2 Write property test for hook niche filter correctness (Property 26)
    - **Property 26: Hook niche filter correctness**
    - **Validates: Requirements 8.1, 8.2**

  - [x] 12.3 Write property test for hook unfiltered results ordered by relevance (Property 27)
    - **Property 27: Hook unfiltered results ordered by relevance**
    - **Validates: Requirements 8.3**

  - [x] 12.4 Write property test for hook pagination size invariant (Property 28)
    - **Property 28: Hook pagination size invariant**
    - **Validates: Requirements 8.5**

  - [x] 12.5 Implement `saveHook` and `getSavedHooks` endpoints
    - Insert SavedHook record (unique[creatorId, hookId]), return saved hooks list
    - _Requirements: 8.6_

  - [x] 12.6 Write property test for saved hook round-trip (Property 29)
    - **Property 29: Saved hook round-trip**
    - **Validates: Requirements 8.6**

- [x] 13. Checkpoint — Ensure all feedback, virality, trend, and hook tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement Analytics Dashboard Service
  - [x] 14.1 Implement `getDashboard` handler
    - Aggregate followerCount, followerGrowth7d, followerGrowth30d from AnalyticsSnapshot
    - Compute postingConsistency30d: distinct action days in last 30 / 30 * 100
    - Include streak state and reel summaries with virality scores
    - Serve from Redis cache `analytics:{creatorId}` with 5-minute TTL
    - Return empty state when no reels submitted
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 14.2 Write property test for posting consistency computation (Property 30)
    - **Property 30: Posting consistency computation correctness**
    - **Validates: Requirements 9.2**

  - [x] 14.3 Implement `exportCSV` endpoint
    - Serialize all dashboard data points to CSV rows, no data omitted
    - _Requirements: 9.7_

  - [x] 14.4 Write property test for analytics CSV export round-trip (Property 31)
    - **Property 31: Analytics CSV export round-trip**
    - **Validates: Requirements 9.7**

  - [x] 14.5 Write unit tests for analytics dashboard
    - Test empty state when no reels exist
    - Test cache returns stale data within 5-minute window
    - Test follower growth calculations
    - _Requirements: 9.1, 9.5, 9.6_

- [x] 15. Implement Monetization Coach Service
  - [x] 15.1 Implement `getModules` with lesson ordering
    - For creators with followerCountRange = 'under_1k', sort lessons: beginner first, then intermediate, then advanced
    - Attach completionPercent per module based on LessonCompletion records
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 15.2 Write property test for lesson structure completeness (Property 32)
    - **Property 32: Lesson structure completeness**
    - **Validates: Requirements 10.2**

  - [x] 15.3 Write property test for beginner lessons surfaced first (Property 35)
    - **Property 35: Beginner lessons surfaced first for small creators**
    - **Validates: Requirements 10.5**

  - [x] 15.4 Implement `completeLesson` endpoint
    - Upsert LessonCompletion record (unique[creatorId, lessonId])
    - _Requirements: 10.3_

  - [x] 15.5 Write property test for lesson completion progress update (Property 33)
    - **Property 33: Lesson completion progress update**
    - **Validates: Requirements 10.3**

  - [x] 15.6 Implement `getOverallProgress` computation
    - (completed lessons / total lessons) * 100, rounded to nearest integer
    - _Requirements: 10.4_

  - [x] 15.7 Write property test for overall completion percentage computation (Property 34)
    - **Property 34: Overall completion percentage computation**
    - **Validates: Requirements 10.4**

- [x] 16. Checkpoint — Ensure all analytics and monetization tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Build Next.js frontend — Auth and Onboarding
  - [x] 17.1 Implement registration and login pages
    - Email/password form and Google OAuth button
    - Handle JWT storage (httpOnly cookie or memory), auto-refresh on expiry
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 17.2 Implement multi-step onboarding flow
    - Collect displayName, primaryNiche, secondaryNiche, instagramHandle, followerCountRange, primaryGoal
    - Pre-populate from saved profile on revisit
    - Show incomplete-profile prompt on login if onboardingComplete = false
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

- [x] 18. Build Next.js frontend — Core Feature Pages
  - [x] 18.1 Implement daily scripts page
    - Fetch and display 3 scripts; show cached badge when served from cache
    - Show onboarding prompt if niche not set
    - _Requirements: 3.1, 3.3, 3.5_

  - [x] 18.2 Implement streak display component
    - Show current streak, highest streak, and milestone badges
    - _Requirements: 4.1, 4.4, 4.5_

  - [x] 18.3 Implement reel submission and feedback page
    - URL input form, display structured feedback scores and commentary
    - Show submission count remaining (10/day limit)
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 18.4 Implement virality prediction UI
    - Display score, reach range, and improvement suggestions
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 18.5 Implement Trend Radar page
    - List trends with niche filter; visually distinguish stale trends
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 18.6 Implement Hook Library page
    - Search input, niche filter, paginated results, save hook button
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

  - [x] 18.7 Implement Analytics Dashboard page
    - Display follower metrics, posting consistency, streak, reel list
    - Empty state when no reels; CSV export button
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_

  - [x] 18.8 Implement Monetization Coach page
    - Module list with progress bars, lesson reader, completion tracking
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 19. Wire all services together and integration validation
  - [x] 19.1 Connect streak recording to script generation, reel submission, and hook library access
    - Call `recordDailyAction` on each of these three events
    - _Requirements: 4.2_

  - [x] 19.2 Connect virality prediction to reel submission flow
    - After feedback is stored, allow creator to trigger prediction on the same ReelSubmission
    - _Requirements: 6.5_

  - [x] 19.3 Validate end-to-end request flow through middleware stack
    - Confirm rate limiter, JWT check, and input validator all fire in correct order
    - _Requirements: 11.1, 11.3, 11.5_

  - [x] 19.4 Write integration tests for critical paths
    - Full auth flow: register → login → refresh → logout
    - Full reel flow: submit → feedback → predict
    - Cascade delete: create creator with all relations → delete → verify all gone
    - _Requirements: 1.1–1.7, 5.1–5.4, 12.4_

- [x] 20. Final checkpoint — Ensure all 41 property tests and all unit/integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use fast-check (TypeScript, `apps/api` and `apps/web`) and Hypothesis (Python, `apps/ai`)
- Each property test must run a minimum of 100 iterations and include the comment `// Feature: viraly-app, Property N: <property_text>`
- All 41 correctness properties defined in the design document must be covered by property-based tests
- Checkpoints at tasks 4, 8, 13, 16, and 20 ensure incremental validation throughout the build
