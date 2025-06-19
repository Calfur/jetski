FROM node:24-alpine AS base
# Deps stage
FROM base AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY App/package.json ./
COPY App/package-lock.json ./

RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY App/ .

RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"] 