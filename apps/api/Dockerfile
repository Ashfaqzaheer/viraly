FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY package.json ./
COPY prisma/ ./prisma/

# Install dependencies (standalone, not workspace mode)
RUN npm init -y 2>/dev/null; \
    npm install express cors helmet cookie-parser bcrypt jsonwebtoken ioredis node-cron web-push @prisma/client && \
    npm install -D typescript @types/express @types/cors @types/cookie-parser @types/bcrypt @types/jsonwebtoken @types/node ts-node tsconfig-paths prisma

# Generate Prisma client from local schema
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npx tsc --outDir dist || true

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD sh -c "npx prisma migrate deploy --schema=prisma/schema.prisma 2>/dev/null; node -r tsconfig-paths/register dist/index.js 2>/dev/null || npx ts-node -r tsconfig-paths/register src/index.ts"
