FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++ curl openssl openssl-dev libc6-compat

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
RUN npm ci --workspace=@viraly/api --workspace=@viraly/db --include-workspace-root

COPY apps/api/ ./apps/api/
COPY packages/db/ ./packages/db/

RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npm run build --workspace=@viraly/api

EXPOSE 8080
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

CMD sh -c "npx prisma db push --schema=packages/db/prisma/schema.prisma && node apps/api/dist/index.js"
