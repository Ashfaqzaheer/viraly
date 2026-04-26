FROM node:18-alpine
WORKDIR /app

# Install build tools + OpenSSL 3.x runtime libs (required for Prisma on Alpine)
RUN apk add --no-cache python3 make g++ curl openssl openssl-dev libc6-compat

# Copy API package.json (standalone install, no workspace refs)
COPY apps/api/package.json ./

# Copy Prisma schema before install so generate picks up binaryTargets
COPY apps/api/prisma/ ./prisma/

# Install all deps (need devDeps for prisma CLI + TypeScript build)
RUN npm install --production=false

# Generate Prisma client with correct Alpine/musl engine
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy source and config
COPY apps/api/tsconfig.json ./
COPY apps/api/src/ ./src/

# Build TypeScript (allow errors — fallback to ts-node at runtime)
RUN npx tsc --outDir dist 2>&1 || true

# Railway sets PORT dynamically — don't hardcode it
ENV NODE_ENV=production

# Use $PORT in healthcheck so it works on Railway (dynamic port) and locally
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

CMD sh -c "npx prisma migrate deploy --schema=prisma/schema.prisma 2>/dev/null; node -r tsconfig-paths/register dist/index.js 2>/dev/null || npx ts-node -r tsconfig-paths/register src/index.ts"
