FROM node:18-alpine
WORKDIR /app

# Install build tools for bcrypt native module
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
RUN npm ci --workspace=@viraly/api --workspace=@viraly/db --include-workspace-root

COPY apps/api/ ./apps/api/
COPY packages/db/ ./packages/db/

# Generate Prisma client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build TypeScript
RUN npm run build --workspace=@viraly/api

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
