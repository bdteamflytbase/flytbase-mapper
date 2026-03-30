# Stage 1: Build React frontend
FROM node:20-alpine AS web-builder
WORKDIR /web
COPY apps/web/package*.json ./
RUN npm install
COPY apps/web/ ./
RUN npm run build

# Stage 2: Build NestJS API
FROM node:20-alpine AS api-builder
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm install
COPY apps/api/ ./
RUN npm run build

# Stage 3: Runtime
FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=api-builder /app/dist ./dist
COPY --from=api-builder /app/node_modules ./node_modules
COPY apps/api/package*.json ./
# Web dist served at /app/web/dist (matches ServeStaticModule path)
COPY --from=web-builder /web/dist ./web/dist
EXPOSE 3000
CMD ["node", "dist/main"]
