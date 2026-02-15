FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# Copy source
COPY . .

# Build
RUN npm run build

# ─── Test stage (used by CI) ─────────────────────────────
FROM base AS test
RUN npm test -- --ci

# ─── Production stage ────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl wget

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY --from=base /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]
