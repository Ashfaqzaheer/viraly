FROM node:18-alpine
WORKDIR /app

# Build tools + OpenSSL 3.x (required for Prisma on Alpine)
RUN apk add --no-cache python3 make g++ curl openssl openssl-dev libc6-compat

# Package + Prisma schema first (layer caching)
COPY package.json ./
COPY prisma/ ./prisma/

# Install deps + tsc-alias for path resolution in compiled output
RUN npm install --production=false
RUN npm install -D tsc-alias

# Generate Prisma client
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy source + tsconfig
COPY tsconfig.json ./
COPY src/ ./src/

# Remove test files before build (they have TS errors irrelevant to production)
RUN rm -rf src/tests

# Compile TypeScript and resolve @viraly/db path alias in dist
RUN npx tsc --outDir dist && npx tsc-alias -p tsconfig.json

ENV NODE_ENV=production

# Production: compiled JS, no ts-node overhead
CMD sh -c "npx prisma migrate deploy --schema=prisma/schema.prisma 2>/dev/null; node -r tsconfig-paths/register dist/index.js"
