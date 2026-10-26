# Multi-stage production build for GlovaCRM Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source code and build TypeScript
COPY . .
RUN npx prisma generate
RUN npx tsc

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install runtime dependencies (OpenSSL needed for Prisma)
RUN apk add --no-cache openssl

# Copy package manifests and install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Copy built code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public 2>/dev/null || true

EXPOSE 5000

# Run database push and start backend
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
