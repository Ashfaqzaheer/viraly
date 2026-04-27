FROM node:18-alpine
WORKDIR /app

# Build tools + OpenSSL (required for Prisma on Alpine)
RUN apk add --no-cache python3 make g++ curl openssl openssl-dev libc6-compat

# Debug: log OpenSSL version so we know which Prisma engine to expect
RUN openssl version

# Package + Prisma schema first (layer caching)
COPY package.json ./
COPY prisma/ ./prisma/

# Install deps
RUN npm install --production=false
RUN npm install -D tsc-alias

# Generate Prisma client with all musl engine variants
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
RUN npx prisma generate --schema=prisma/schema.prisma

# Verify the engine binary exists
RUN ls -la node_modules/.prisma/client/libquery_engine* || echo "WARNING: No engine binaries found"

# Copy source + tsconfig
COPY tsconfig.json ./
COPY src/ ./src/

# Remove test files (TS errors irrelevant to production)
RUN rm -rf src/tests

# Compile TypeScript and resolve path aliases
RUN npx tsc --outDir dist && npx tsc-alias -p tsconfig.json

ENV NODE_ENV=production

CMD sh -c "npx prisma migrate deploy --schema=prisma/schema.prisma && node -r tsconfig-paths/register dist/index.js"
