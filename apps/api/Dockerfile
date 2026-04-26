FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++ curl openssl openssl-dev

# Copy package.json (no @viraly/db dependency)
COPY package.json ./

# Copy Prisma schema
COPY prisma/ ./prisma/

# Install dependencies
RUN npm install --production=false

# Generate Prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy source and config
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npx tsc --outDir dist 2>&1 || true

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD sh -c "npx prisma migrate deploy --schema=prisma/schema.prisma 2>/dev/null; node -r tsconfig-paths/register dist/index.js 2>/dev/null || npx ts-node -r tsconfig-paths/register src/index.ts"
