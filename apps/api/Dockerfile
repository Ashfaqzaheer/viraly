FROM node:18-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++ curl openssl openssl-dev libc6-compat

# Copy package files for workspace install
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/

# Install all workspace deps
RUN npm ci --workspace=@viraly/api --workspace=@viraly/db --include-workspace-root

# Install tsc-alias for path rewriting
RUN npm install -D tsc-alias --workspace=@viraly/api

# Copy source
COPY apps/api/ ./apps/api/
COPY packages/db/ ./packages/db/

# Generate Prisma client
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build API: compile TS then rewrite @viraly/db → ./db in dist
RUN cd apps/api && npx tsc --outDir dist && npx tsc-alias -p tsconfig.json

ENV NODE_ENV=production

# Startup: push schema to DB (creates tables), then start server
CMD sh -c "\
  npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma || \
  npx prisma db push --schema=packages/db/prisma/schema.prisma --accept-data-loss; \
  node apps/api/dist/index.js"
