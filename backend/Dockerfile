# ==========================================
# Backend Dockerfile — multi-stage build
# Stage 1: compile TypeScript
# Stage 2: lean runtime image
# ==========================================

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output
COPY --from=builder /app/dist ./dist

EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
