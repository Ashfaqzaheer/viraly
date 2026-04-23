# Viraly — AI Content Creation System

> Don't guess your next reel. We decide it.

Viraly is a full-stack SaaS platform that helps Instagram creators generate trend-aware viral scripts, analyze reel performance, and build consistent posting habits through gamification.

## Features

- **Script Generator** — 2-step flow: Light Script (idea level) → Full Shooting Guide (execution level) with scene-by-scene breakdown, camera angles, lighting tips, and trending audio
- **Trend-Aware Engine** — Scripts are generated based on real trending patterns (TrendSignals, TrendPatterns, TrendClusters), not generic AI output
- **Virality Improvement Engine** — Analyze reels with sub-score breakdown (Hook Strength, Retention, Shareability, Trend Alignment), actionable fixes, and "How to Make This 9/10" step-by-step guide
- **Generate Improved Script** — One-click flow from virality analysis to an improved script that addresses all weaknesses
- **Generate From Trend** — Click any trend to auto-generate a script based on that trending pattern
- **Today's Mission** — Daily mission system that generates a trend-based task each day
- **Streak System** — Gamified streak with reward milestones (Day 3: unlock 2nd script, Day 7: advanced hooks, Day 14: trend scripts, Day 30: monetization)
- **Script Scarcity** — Free users see 1 script; scripts 2 and 3 are locked behind streak/premium gates
- **Reel Feedback** — Submit reels for AI-powered analysis with scores across 5 dimensions
- **Trend Radar** — Browse trending content formats by niche with growth percentages and actionable "Generate Script" buttons
- **Hook Library** — 61 proven viral hooks across 10 niches
- **Monetization Academy** — 4 modules with 13 lessons, India-specific platform recommendations (Topmate, Instamojo, Graphy)
- **Analytics Dashboard** — Growth metrics and posting consistency tracking
- **Auth System** — Email/password + Google OAuth (dev mock mode when credentials aren't configured)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, TypeScript |
| API | Express.js, TypeScript, JWT auth, Redis rate limiting |
| AI Service | FastAPI, Python, OpenAI GPT-4o-mini |
| Database | PostgreSQL (Prisma ORM) |
| Cache | Redis |
| Infra | Docker (Postgres + Redis containers) |

## Project Structure

```
apps/
  web/          → Next.js frontend (port 3000)
  api/          → Express API server (port 3001)
  ai/           → FastAPI AI service (port 8000)
packages/
  db/           → Prisma schema, migrations, seed data
```

## Installation

### Prerequisites

- Node.js 18+
- Python 3.12+
- Docker Desktop
- npm

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Ashfaqzaheer/viraly.git
cd viraly

# 2. Install Node dependencies
npm install

# 3. Install Python dependencies
pip install -r apps/ai/requirements.txt

# 4. Start Docker containers (Postgres + Redis)
docker run -d --name viraly-postgres -e POSTGRES_USER=viraly -e POSTGRES_PASSWORD=viraly -e POSTGRES_DB=viraly -p 5433:5432 postgres:15
docker run -d --name viraly-redis -p 6379:6379 redis:7

# 5. Setup database
cd packages/db
echo 'DATABASE_URL="postgresql://viraly:viraly@localhost:5433/viraly"' > .env
npx prisma migrate dev
npx ts-node prisma/seed.ts
cd ../..

# 6. Setup frontend env
echo 'NEXT_PUBLIC_API_URL=http://localhost:3001' > apps/web/.env.local
```

### Run the App

```bash
# Terminal 1 — AI Service
cd apps/ai && python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8000

# Terminal 2 — API Server
cd apps/api && JWT_SECRET=your-secret REDIS_URL=redis://localhost:6379 DATABASE_URL=postgresql://viraly:viraly@localhost:5433/viraly FRONTEND_URL=http://localhost:3000 PORT=3001 npx ts-node-dev --respawn src/index.ts

# Terminal 3 — Frontend
cd apps/web && npx next dev --port 3000
```

Open http://localhost:3000

## Testing

```bash
# Run API tests
cd apps/api && npx jest --forceExit --detectOpenHandles

# Run specific test suites
npx jest --testPathPattern="scripts"    # Script generation tests
npx jest --testPathPattern="streak"     # Streak system tests
npx jest --testPathPattern="middleware" # Auth & security tests
npx jest --testPathPattern="virality"  # Virality prediction tests
```

### Manual Testing Flows

1. **Script Generation**: Register → Complete onboarding → Go to Scripts → Enter idea → See Light Script → Click "View Full Guide"
2. **Generate From Trend**: Go to Trends → Click "Generate Script" on any trend → Script auto-generates
3. **Virality Analysis**: Go to Reels → Submit a URL → Go to Virality → Click "Analyze" → See breakdown → Click "Generate Improved Script" → Script auto-generates
4. **Daily Mission**: Go to Dashboard → See Today's Mission → Click "I Posted This" → Streak increments

## Git Workflow

- Never push directly to `main`
- Create feature branches: `feature/description`
- All changes require Pull Request review
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `FRONTEND_URL` | Yes | Frontend URL for CORS |
| `AI_PROVIDER_KEY` | No | OpenAI API key (mock mode if absent) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth (dev mock if absent) |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth |
| `GOOGLE_REDIRECT_URI` | No | Google OAuth callback URL |

## License

Private — All rights reserved.

## Run with Docker (One-Command Setup)

Run the entire system with zero manual setup:

```bash
docker-compose up --build
```

That's it. Database migrations and seed data run automatically on first start.

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js app |
| API | http://localhost:3001 | Express server |
| AI | http://localhost:8000 | FastAPI service |
| PostgreSQL | localhost:5433 | Database |
| Redis | localhost:6379 | Cache |

What happens automatically:
- PostgreSQL and Redis start with healthchecks
- API waits for DB to be healthy, then runs `prisma migrate deploy` + seed
- All 61 hooks, 12 trends, 44 trend signals, 14 clusters, 33 patterns, and 4 monetization modules are seeded
- Frontend connects to API on port 3001

To stop:

```bash
docker-compose down
```

To stop and wipe all data:

```bash
docker-compose down -v
```

Optional env vars (create `.env` in project root for real API keys):

```env
AI_PROVIDER_KEY=sk-your-openai-key
JWT_SECRET=your-production-secret
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
```

Notes:
- Without `AI_PROVIDER_KEY`, AI features run in mock mode (realistic fake data)
- Without `RAZORPAY_KEY_ID`, payment routes return "not configured" gracefully
- Without `VAPID_*` keys, push notifications are disabled (no crash)

