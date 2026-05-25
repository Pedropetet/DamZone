# ────────────────────────────────────────────────
# Stage 1: bouw de React-frontend
# ────────────────────────────────────────────────
FROM node:22-slim AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Bouw de frontend (laadt .env.acceptance of .env.production via --mode)
ARG VITE_MODE=production
RUN npm run build -- --mode ${VITE_MODE}

# ────────────────────────────────────────────────
# Stage 2: Express-server (API + Socket.io)
# ────────────────────────────────────────────────
FROM node:22-slim AS server
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY server/   ./server/
COPY prisma/   ./prisma/

# Gebruik het PostgreSQL-schema
RUN cp prisma/schema.postgresql.prisma prisma/schema.prisma && \
    npx prisma generate

EXPOSE 3001

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

# ────────────────────────────────────────────────
# Stage 3: Nginx serveert de frontend + proxyt API
# ────────────────────────────────────────────────
FROM nginx:alpine AS frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
