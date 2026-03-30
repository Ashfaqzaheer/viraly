FROM node:18-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
RUN npm ci --workspace=@viraly/web --workspace=@viraly/db --include-workspace-root

COPY apps/web/ ./apps/web/
COPY packages/db/ ./packages/db/

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@viraly/web

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
CMD ["npm", "run", "start", "--workspace=@viraly/web"]
