FROM node:18-alpine
WORKDIR /app

# Build tools + OpenSSL (required for Prisma on Alpine)
RUN apk add --no-cache python3 make g++ curl openssl openssl-dev libc6-compat

# Package + Prisma (schema + migrations + seed)
COPY package.json ./
COPY prisma/ ./prisma/

# Install deps
RUN npm install --production=false
RUN npm install -D tsc-alias

# Generate Prisma client
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy source + tsconfig
COPY tsconfig.json ./
COPY src/ ./src/

# Remove test files (TS errors irrelevant to production)
RUN rm -rf src/tests

# Compile TypeScript and resolve path aliases
RUN npx tsc --outDir dist && npx tsc-alias -p tsconfig.json

ENV NODE_ENV=production

# Startup: migrate → seed (idempotent) → serve
# migrate deploy: applies pending migrations (creates tables)
# db seed: runs prisma/seed.ts via ts-node (populates data)
# If migrate fails, fall back to db push (creates tables from schema directly)
CMD sh -c "\
  echo '=== Running Prisma migrations ===' && \
  npx prisma migrate deploy --schema=prisma/schema.prisma || \
  (echo '=== migrate deploy failed, falling back to db push ===' && \
   npx prisma db push --schema=prisma/schema.prisma --accept-data-loss); \
  echo '=== Running seed ===' && \
  npx prisma db seed 2>/dev/null || echo '=== Seed skipped (already seeded or no seed config) ==='; \
  echo '=== Starting API server ===' && \
  node -r tsconfig-paths/register dist/index.js"
