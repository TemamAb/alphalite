# AlphaPro Sovereign Unified Dockerfile
# Optimized for Render.com Production Deployment

# --- STAGE 1: Build Dashboard ---
FROM node:18-alpine AS dashboard-builder
WORKDIR /usr/src/app

# Copy root manifest for workspace resolution
COPY package.json package-lock.json* ./
COPY modules/dashboard/package.json ./modules/dashboard/

# Install dependencies (using workspaces)
RUN npm install

# Copy dashboard source and build
COPY modules/dashboard/ ./modules/dashboard/
WORKDIR /usr/src/app/modules/dashboard
RUN npm run build

# --- STAGE 2: Build Backend & Engine ---
FROM node:18-alpine AS backend-builder
WORKDIR /usr/src/app

# Copy root manifest and api manifest
COPY package.json package-lock.json* ./
COPY modules/api/package.json ./modules/api/

# Install production dependencies
RUN npm install --only=production

# Copy all modules needed for runtime
COPY modules/ ./modules/
COPY config/ ./config/

# Generate Prisma Client (CRITICAL for production)
WORKDIR /usr/src/app/modules/api
RUN npx prisma generate

# --- STAGE 3: Final Optimized Runtime ---
FROM node:18-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules from backend-builder
COPY --from=backend-builder /usr/src/app/node_modules ./node_modules
COPY --from=backend-builder /usr/src/app/modules/api/node_modules ./modules/api/node_modules

# Copy source code and built dashboard
COPY --from=backend-builder /usr/src/app/modules ./modules
COPY --from=backend-builder /usr/src/app/config ./config
COPY --from=dashboard-builder /usr/src/app/modules/dashboard/dist ./modules/api/client/dist

EXPOSE 3000

# Healthcheck to ensure the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "modules/api/app.js"]