# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Сборка фронтенда (React + Vite)
# ==============================================================================
FROM node:22-bookworm-slim AS builder-client
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Сборка бэкенда (Express + TypeScript)
# ==============================================================================
FROM node:22-bookworm-slim AS builder-server
WORKDIR /app/server

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# ==============================================================================
# Stage 3: Финальный продакшн образ
# ==============================================================================
FROM node:22-bookworm-slim AS runner

# Установка curl для встроенного healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/app/data/pomodoro.db \
    CLIENT_DIST_PATH=/app/client/dist

# Создание директории для базы данных SQLite и назначение прав
RUN mkdir -p /app/data && chown -R node:node /app

# Установка только production-зависимостей сервера
WORKDIR /app/server
COPY --chown=node:node server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Копирование скомпилированного сервера
COPY --from=builder-server --chown=node:node /app/server/dist ./dist

# Копирование скомпилированного фронтенда
COPY --from=builder-client --chown=node:node /app/client/dist /app/client/dist

# Том для персистентного хранения данных SQLite
VOLUME ["/app/data"]

EXPOSE 3000

USER node

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.js"]
