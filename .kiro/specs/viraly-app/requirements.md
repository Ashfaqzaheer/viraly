# Requirements Document

## Introduction

Viraly is an AI creator growth coach SaaS application that helps Instagram creators grow their audience by providing viral reel scripts, trend intelligence, AI-powered reel feedback, and growth analytics. The platform serves as a daily operating system for content creators — from beginners to established influencers — enabling them to produce high-performing content consistently using AI guidance, trend detection, and viral content systems.

The application is built on Next.js, TypeScript, TailwindCSS, Node.js, Express, FastAPI, PostgreSQL, and Prisma. It must be modern, secure, scalable, and straightforward to deploy.

## Glossary

- **System**: The Viraly SaaS application as a whole
- **Auth_Service**: The authentication and session management service
- **Onboarding_Service**: The service responsible for collecting and storing creator profile data during initial setup
- **Script_Generator**: The AI service that produces daily viral reel scripts
- **Streak_Service**: The service that tracks and rewards consistent daily posting activity
- **Feedback_Service**: The AI service that analyzes submitted reels and returns structured feedback
- **Virality_Engine**: The AI service that predicts reel performance and produces a virality score and expected reach range
- **Trend_Radar**: The service that detects and surfaces trending content formats and styles
- **Hook_Library**: The database-backed service that stores and serves viral hooks filterable by niche
- **Analytics_Dashboard**: The service that aggregates and displays creator growth metrics and performance insights
- **Monetization_Coach**: The service that delivers monetization education content to creators
- **API_Gateway**: The backend gateway that routes requests between the frontend and internal services
- **Rate_Limiter**: The middleware component that enforces request rate limits per user and endpoint
- **Input_Validator**: The middleware component that validates and sanitizes all incoming request payloads
- **Creator**: A registered user of the Viraly platform
- **Reel**: A short-form video submitted by a Creator for analysis
- **Virality_Score**: A numeric score (0–100) representing the predicted viral potential of a Reel
- **Streak**: A count of consecutive days a Creator has posted or engaged with the platform
- **Hook**: A short, attention-grabbing opening line used at the start of a Reel
- **Niche**: A content category (e.g., fitness, finance, comedy) associated with a Creator's profile

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a new visitor, I want to register and log in securely, so that my account and data are protected.

#### Acceptance Criteria

1. THE Auth_Service SHALL support Creator registration using email and password.
2. THE Auth_Service SHALL support Creator registration and login using Google OAuth 2.0.
3. WHEN a Creator submits a registration form, THE Auth_Service SHALL validate that the email is unique and the password meets a minimum length of 8 characters before creating the account.
4. WHEN a Creator successfully authenticates, THE Auth_Service SHALL issue a signed JWT access token with an expiry of 15 minutes and a refresh token with an expiry of 7 days.
5. WHEN a Creator's JWT access token expires, THE Auth_Service SHALL accept a valid refresh token and issue a new access token without requiring re-login.
6. IF a Creator submits invalid credentials, THEN THE Auth_Service SHALL return an error response within 500ms without revealing whether the email or password was incorrect.
7. WHEN a Creator logs out, THE Auth_Service SHALL invalidate the active refresh token.
8. THE Auth_Service SHALL store passwords using bcrypt with a minimum cost factor of 12.
9. THE Auth_Service SHALL encrypt all stored API keys using AES-256 encryption.
10. WHILE a Creator session is active, THE Auth_Service SHALL include the Creator's identity in every authenticated request context.

---

### Requirement 2: Creator Onboarding

**User Story:** As a new Creator, I want to complete a personalized onboarding flow, so that the platform can tailor content and recommendations to my niche and goals.

#### Acceptance Criteria

1. WHEN a Creator completes registration for the first time, THE Onboarding_Service SHALL present a multi-step onboarding form.
2. THE Onboarding_Service SHALL collect the Creator's display name, primary niche, secondary niche (optional), Instagram handle (optional), follower count range, and primary growth goal.
3. WHEN a Creator submits the onboarding form, THE Onboarding_Service SHALL validate that all required fields are present and non-empty before persisting the data.
4. WHEN onboarding data is persisted, THE Onboarding_Service SHALL associate the profile with the authenticated Creator's account in the database.
5. IF a Creator skips the onboarding flow, THEN THE Onboarding_Service SHALL mark the profile as incomplete and prompt the Creator to complete it on subsequent logins.
6. WHEN a Creator revisits the onboarding form, THE Onboarding_Service SHALL pre-populate fields with previously saved values.

---

### Requirement 3: Daily Viral Script Generator

**User Story:** As a Creator, I want to receive 3 AI-generated viral reel scripts each day, so that I always have ready-to-use content ideas tailored to my niche.

#### Acceptance Criteria

1. WHEN a Creator requests daily scripts, THE Script_Generator SHALL produce exactly 3 reel scripts per Creator per calendar day.
2. THE Script_Generator SHALL generate each script to include a Hook, a video structure (intro, body, CTA steps), a caption, a set of hashtags (minimum 5, maximum 30), and a call-to-action.
3. THE Script_Generator SHALL tailor each script to the Creator's primary niche stored in the Creator's profile.
4. WHEN a Creator has already received 3 scripts for the current calendar day, THE Script_Generator SHALL return the cached scripts rather than generating new ones.
5. WHEN a Creator requests scripts and no profile niche is set, THE Script_Generator SHALL return an error instructing the Creator to complete onboarding before generating scripts.
6. THE Script_Generator SHALL generate all 3 scripts within 10 seconds of the request being received.
7. IF the underlying AI provider returns an error, THEN THE Script_Generator SHALL retry the request once and, if the retry fails, return a descriptive error to the Creator.

---

### Requirement 4: Streak System

**User Story:** As a Creator, I want to be rewarded for posting consistently every day, so that I stay motivated to maintain a regular content schedule.

#### Acceptance Criteria

1. THE Streak_Service SHALL maintain a Streak count for each Creator representing the number of consecutive days the Creator has engaged with the platform.
2. WHEN a Creator completes a daily action (script generation, reel submission, or hook library access) for the first time on a given calendar day, THE Streak_Service SHALL increment the Creator's Streak count by 1.
3. WHEN a Creator does not complete any daily action within a 24-hour calendar day, THE Streak_Service SHALL reset the Creator's Streak count to 0 at midnight UTC.
4. WHEN a Creator's Streak count reaches a milestone (7, 30, 60, or 100 days), THE Streak_Service SHALL record a milestone achievement for the Creator.
5. THE Analytics_Dashboard SHALL display the Creator's current Streak count and all earned milestone achievements.
6. IF a Creator's Streak is reset, THEN THE Streak_Service SHALL preserve the Creator's historical highest Streak count.

---

### Requirement 5: Reel Submission and AI Feedback

**User Story:** As a Creator, I want to submit a reel for AI analysis, so that I can receive structured feedback to improve my content quality.

#### Acceptance Criteria

1. WHEN a Creator submits a Reel URL for analysis, THE Feedback_Service SHALL accept URLs from Instagram and TikTok domains only.
2. THE Feedback_Service SHALL return structured feedback containing scores and commentary for hook strength, pacing, caption quality, hashtag relevance, and call-to-action effectiveness.
3. WHEN a Reel is submitted, THE Feedback_Service SHALL return the structured feedback within 30 seconds.
4. THE Feedback_Service SHALL store each feedback result associated with the Creator's account for later retrieval.
5. IF a submitted URL is not reachable or is from an unsupported domain, THEN THE Feedback_Service SHALL return a descriptive error within 5 seconds without attempting AI analysis.
6. THE Feedback_Service SHALL limit each Creator to 10 Reel submissions per 24-hour period.

---

### Requirement 6: Virality Prediction Engine

**User Story:** As a Creator, I want to know the predicted viral potential of my reel before posting, so that I can decide whether to refine it further.

#### Acceptance Criteria

1. WHEN a Creator requests a virality prediction for a Reel, THE Virality_Engine SHALL return a Virality_Score between 0 and 100.
2. THE Virality_Engine SHALL return an expected reach range (minimum and maximum estimated views) alongside the Virality_Score.
3. THE Virality_Engine SHALL return a list of at least 3 specific improvement suggestions when the Virality_Score is below 70.
4. WHEN a virality prediction is requested, THE Virality_Engine SHALL return results within 15 seconds.
5. THE Virality_Engine SHALL store each prediction result associated with the Creator's account and the corresponding Reel submission.
6. IF the underlying AI provider returns an error during prediction, THEN THE Virality_Engine SHALL retry once and, if the retry fails, return a descriptive error to the Creator.

---

### Requirement 7: Trend Radar

**User Story:** As a Creator, I want to see what content formats are currently trending, so that I can align my content with what audiences are engaging with most.

#### Acceptance Criteria

1. THE Trend_Radar SHALL surface a list of trending content formats and styles updated at least once every 24 hours.
2. WHEN a Creator views the Trend_Radar, THE Trend_Radar SHALL display each trend with a title, description, example format, and an estimated engagement lift percentage.
3. THE Trend_Radar SHALL allow Creators to filter trends by Niche.
4. WHEN trend data is older than 48 hours, THE Trend_Radar SHALL mark the trend as stale and exclude it from the default view.
5. THE Trend_Radar SHALL store trend data in the database and serve it from cache with a maximum cache age of 1 hour.

---

### Requirement 8: Viral Hook Library

**User Story:** As a Creator, I want to browse a library of proven viral hooks, so that I can find compelling opening lines for my reels without starting from scratch.

#### Acceptance Criteria

1. THE Hook_Library SHALL store a collection of Hooks each associated with one or more Niches.
2. WHEN a Creator queries the Hook_Library, THE Hook_Library SHALL return results filtered by the specified Niche.
3. WHEN no Niche filter is provided, THE Hook_Library SHALL return Hooks across all Niches ordered by a relevance score.
4. THE Hook_Library SHALL support free-text search across Hook content, returning results ranked by match relevance.
5. THE Hook_Library SHALL return paginated results with a default page size of 20 and a maximum page size of 100.
6. WHEN a Creator saves a Hook, THE Hook_Library SHALL associate the saved Hook with the Creator's account for later retrieval.

---

### Requirement 9: Creator Analytics Dashboard

**User Story:** As a Creator, I want to view my growth metrics and performance insights in one place, so that I can understand how my content strategy is working.

#### Acceptance Criteria

1. THE Analytics_Dashboard SHALL display the Creator's current follower count, follower growth over the last 7 days, and follower growth over the last 30 days.
2. THE Analytics_Dashboard SHALL display the Creator's posting consistency as a percentage of days posted in the last 30 days.
3. THE Analytics_Dashboard SHALL display the Creator's current Streak count and highest historical Streak count.
4. THE Analytics_Dashboard SHALL display a list of the Creator's submitted Reels with their associated Virality_Score and feedback summary.
5. WHEN a Creator has no submitted Reels, THE Analytics_Dashboard SHALL display an empty state with a prompt to submit a first Reel.
6. THE Analytics_Dashboard SHALL refresh displayed data at most once every 5 minutes to avoid excessive API calls.
7. THE Analytics_Dashboard SHALL allow the Creator to export their analytics data as a CSV file.

---

### Requirement 10: Monetization Coach

**User Story:** As a Creator, I want to learn how to monetize my audience, so that I can turn my content into a sustainable income stream.

#### Acceptance Criteria

1. THE Monetization_Coach SHALL provide educational content covering affiliate marketing, brand deal negotiation, and digital product creation.
2. THE Monetization_Coach SHALL organize content into structured modules, each containing lessons with a title, body text, and estimated read time.
3. WHEN a Creator completes a lesson, THE Monetization_Coach SHALL record the completion and update the Creator's progress within the module.
4. THE Monetization_Coach SHALL display the Creator's overall completion percentage across all modules.
5. WHEN a Creator's follower count range is below 1,000, THE Monetization_Coach SHALL surface beginner-appropriate monetization lessons first.

---

### Requirement 11: API Security and Rate Limiting

**User Story:** As a platform operator, I want all API endpoints to be protected against abuse and injection attacks, so that the platform remains secure and available for all Creators.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL enforce a maximum of 100 requests per minute per authenticated Creator across all API endpoints.
2. WHEN a Creator exceeds the rate limit, THE Rate_Limiter SHALL return an HTTP 429 response with a Retry-After header indicating when the limit resets.
3. THE Input_Validator SHALL validate and sanitize all incoming request payloads before passing them to any service handler.
4. IF a request payload contains SQL injection patterns or script injection patterns, THEN THE Input_Validator SHALL reject the request with an HTTP 400 response.
5. THE API_Gateway SHALL require a valid JWT access token on all endpoints except registration, login, and Google OAuth callback.
6. THE API_Gateway SHALL enforce HTTPS for all client-to-server communication.
7. THE API_Gateway SHALL include CORS headers restricting allowed origins to the configured frontend domain.

---

### Requirement 12: Data Persistence and Schema

**User Story:** As a developer, I want a well-structured database schema managed by Prisma, so that data integrity is maintained and migrations are reproducible.

#### Acceptance Criteria

1. THE System SHALL use PostgreSQL as the primary relational database.
2. THE System SHALL manage all database schema changes through Prisma migrations.
3. THE System SHALL define Prisma models for: Creator, Session, Script, Streak, ReelSubmission, ViralityPrediction, Trend, Hook, SavedHook, AnalyticsSnapshot, MonetizationModule, MonetizationLesson, and LessonCompletion.
4. WHEN a Creator account is deleted, THE System SHALL cascade-delete all associated records across all related models.
5. THE System SHALL enforce unique constraints on Creator email addresses at the database level.
6. THE System SHALL store all timestamps in UTC.
