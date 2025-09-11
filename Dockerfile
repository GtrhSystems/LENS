# Eliminar líneas duplicadas y optimizar para Ubuntu 24.04
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat dumb-init

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Build backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY src ./src
COPY prisma ./prisma
COPY tsconfig.json ./

RUN npx prisma generate
RUN npm run build

# Production image
FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init curl

WORKDIR /app

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Copiar dependencias
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copiar código compilado
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Crear directorios necesarios
RUN mkdir -p logs uploads backups && \
    chown -R nextjs:nodejs logs uploads backups

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

CMD ["dumb-init", "node", "dist/server.js"]