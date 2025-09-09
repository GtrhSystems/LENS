# Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/frontend/package*.json ./src/frontend/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force
RUN cd src/frontend && npm ci --only=production && npm cache clean --force

# Build frontend
FROM base AS frontend-builder
WORKDIR /app
COPY src/frontend/package*.json ./src/frontend/
RUN cd src/frontend && npm ci
COPY src/frontend ./src/frontend
RUN cd src/frontend && npm run build

# Build backend
FROM base AS backend-builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
COPY prisma ./prisma
RUN npm run build
RUN npx prisma generate

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=backend-builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=backend-builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=frontend-builder --chown=nextjs:nodejs /app/src/frontend/build ./src/frontend/build
COPY --chown=nextjs:nodejs package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Create logs directory
RUN mkdir -p logs && chown nextjs:nodejs logs

USER nextjs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["npm", "start"]