# Build stage
FROM node:24-alpine AS builder

COPY App/package.json ./
COPY App/package-lock.json ./

RUN npm ci

COPY ./App .

RUN npm run build

# Production stage
FROM node:24-alpine AS runner

ENV NODE_ENV=production

COPY --from=builder /public ./public
COPY --from=builder /.next/standalone ./
COPY --from=builder /.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"] 