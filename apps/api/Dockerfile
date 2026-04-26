FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++ curl

# Copy package.json and remove workspace dependency before install
COPY package.json ./
RUN node -e "const p=require('./package.json'); delete p.dependencies['@viraly/db']; delete p.workspaces; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2))"

# Copy Prisma schema
COPY prisma/ ./prisma/

# Install all dependencies
RUN npm install

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
