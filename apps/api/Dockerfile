FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++ curl

# Copy root package files first for dependency install
COPY package.json package-lock.json* ./

# Copy workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/

# Install dependencies
RUN npm ci --workspace=@viraly/api --workspace=@viraly/db --include-workspace-root 2>/dev/null || npm install

# Copy source code
COPY apps/api/ ./apps/api/
COPY packages/db/ ./packages/db/

# Generate Prisma client and build
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npm run build --workspace=@viraly/api

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD sh -c "npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma 2>/dev/null; node apps/api/dist/index.js"
