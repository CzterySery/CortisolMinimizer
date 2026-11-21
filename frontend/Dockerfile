# Build context: repository root (the UI imports shared/cards.json). See docker-compose.yml.
FROM node:24-alpine AS deps
WORKDIR /repo/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /repo/frontend
COPY --from=deps /repo/frontend/node_modules ./node_modules
COPY frontend ./
COPY shared /repo/shared
COPY backend/app/data/params.json /repo/backend/app/data/params.json
COPY Documents /repo/Documents
COPY scripts/prepare-legal-assets.mjs /repo/scripts/prepare-legal-assets.mjs
COPY scripts/check-zus-forms.mjs /repo/scripts/check-zus-forms.mjs
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run test:cards
# API_URL stays unset here: "/" prerenders from the local catalog and the build never needs the backend.
RUN mkdir -p public && npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
# outputFileTracingRoot is the repo root, so the standalone server sits under frontend/.
COPY --from=build --chown=node:node /repo/frontend/.next/standalone ./
COPY --from=build --chown=node:node /repo/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /repo/frontend/public ./frontend/public
USER node
EXPOSE 3000
# API_URL (runtime, server-side only) is read by the /api/v1 proxy route.
CMD ["node", "frontend/server.js"]
