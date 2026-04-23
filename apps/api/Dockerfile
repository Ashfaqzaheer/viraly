FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++ curl

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
RUN npm ci --workspace=@viraly/api --workspace=@viraly/db --include-workspace-root

COPY apps/api/ ./apps/api/
COPY packages/db/ ./packages/db/

RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npm run build --workspace=@viraly/api

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Auto-migrate + seed on startup, then run server
CMD sh -c "npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma && node -e \"const{execSync}=require('child_process');try{execSync('npx ts-node --compiler-options {\\\"module\\\":\\\"commonjs\\\"} packages/db/prisma/seed.ts',{stdio:'inherit',env:{...process.env}})}catch(e){console.log('Seed skipped (may already exist)');}\" && node apps/api/dist/index.js"
