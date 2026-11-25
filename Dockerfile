FROM node:24-bookworm-slim AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app/frontend
ARG INTERNAL_API_URL=http://127.0.0.1:3001
ENV INTERNAL_API_URL=${INTERNAL_API_URL} \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=frontend-deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=backend-deps --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node backend/ ./backend/
COPY --from=frontend-build --chown=node:node /app/frontend/.next/standalone ./frontend
COPY --from=frontend-build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-build --chown=node:node /app/frontend/public ./frontend/public
COPY --chown=node:node scripts/docker-start.js ./scripts/docker-start.js
RUN mkdir -p /app/backend/data && chown -R node:node /app/backend

VOLUME ["/app/backend/data"]
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "scripts/docker-start.js"]
