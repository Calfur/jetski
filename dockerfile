FROM node:24-alpine AS base
# Deps stage
FROM base AS deps

RUN apk add --no-cache libc6-compat

ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

COPY App/package.json ./
COPY App/package-lock.json ./

RUN npm ci

# Build stage
FROM base AS builder

ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY App/ .

# Build both Next.js app and TypeScript server
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy our custom server
COPY --from=builder --chown=nextjs:nodejs /app/dist/server.js ./server.js

# Install only the production dependencies our custom server needs
COPY --from=builder /app/package.json ./
RUN npm install --production --ignore-scripts ws uuid

USER nextjs

EXPOSE 3000

ENV PORT=3000

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]